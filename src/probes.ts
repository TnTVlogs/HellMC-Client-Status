import { resolveSrv } from 'node:dns/promises'
import net from 'node:net'
import type { Assertion, ComponentConfig, HttpComponent, ProbeResult } from './types.js'

// Comprovacions de disponibilitat. Cada sonda retorna el resultat i el temps; mai llança errors:
// una fallada és un resultat (`ok: false`) amb el motiu a `detail`.

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err))

// --- HTTP ---------------------------------------------------------------------------------------------

function pick(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc !== null && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), value)
}

/** Comprova una asserció sobre el JSON de la resposta; retorna el motiu del fracàs o `null` si compleix. */
export function checkAssertion(json: unknown, a: Assertion): string | null {
  const value = pick(json, a.path)
  if (a.equals !== undefined && value !== a.equals) return `«${a.path}» és ${JSON.stringify(value)}, s'esperava ${JSON.stringify(a.equals)}`
  if (a.type) {
    const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
    if (actual !== a.type) return `«${a.path}» és de tipus ${actual}, s'esperava ${a.type}`
  }
  if (a.minLength !== undefined) {
    const len = Array.isArray(value) || typeof value === 'string' ? value.length : -1
    if (len < a.minLength) return `«${a.path}» és massa curt (${len} < ${a.minLength})`
  }
  return null
}

async function probeHttp(c: HttpComponent, timeoutMs: number): Promise<ProbeResult> {
  const started = performance.now()
  try {
    const res = await fetch(c.url, {
      method: c.method ?? 'GET',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'hellmc-status/1.0', Accept: 'application/json,*/*' },
    })
    const status = res.status
    const accepted = c.expectStatus ? c.expectStatus.includes(status) : status >= 200 && status < 300

    let json: unknown
    if (c.assertions?.length && accepted) {
      try {
        json = await res.json()
      } catch {
        return { ok: false, latencyMs: Math.round(performance.now() - started), detail: `HTTP ${status}: resposta no és JSON` }
      }
    } else {
      // Es llegeix el cos igualment: així la latència inclou la descàrrega completa.
      await res.arrayBuffer().catch(() => undefined)
    }
    const latencyMs = Math.round(performance.now() - started)

    if (!accepted) return { ok: false, latencyMs, detail: `HTTP ${status}` }
    for (const a of c.assertions ?? []) {
      const failure = checkAssertion(json, a)
      if (failure) return { ok: false, latencyMs, detail: failure }
    }
    return { ok: true, latencyMs, detail: `HTTP ${status}` }
  } catch (err) {
    const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    return { ok: false, latencyMs: Math.round(performance.now() - started), detail: timeout ? `Sense resposta en ${timeoutMs} ms` : message(err) }
  }
}

// --- TCP ----------------------------------------------------------------------------------------------

function probeTcp(host: string, port: number, timeoutMs: number): Promise<ProbeResult> {
  const started = performance.now()
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (ok: boolean, detail: string) => {
      socket.destroy()
      resolve({ ok, latencyMs: Math.round(performance.now() - started), detail })
    }
    socket.setTimeout(timeoutMs, () => done(false, `Sense resposta en ${timeoutMs} ms`))
    socket.once('connect', () => done(true, `Connectat a ${host}:${port}`))
    socket.once('error', (err) => done(false, message(err)))
  })
}

// --- Minecraft: Server List Ping ------------------------------------------------------------------------

function writeVarInt(value: number): Buffer {
  const bytes: number[] = []
  let v = value >>> 0
  do {
    let byte = v & 0x7f
    v >>>= 7
    if (v !== 0) byte |= 0x80
    bytes.push(byte)
  } while (v !== 0)
  return Buffer.from(bytes)
}

/** Llegeix un VarInt de `buf` a partir de `offset`; `null` si encara no hi ha prou bytes. */
function readVarInt(buf: Buffer, offset: number): { value: number; next: number } | null {
  let value = 0
  let shift = 0
  for (let i = offset; i < buf.length; i++) {
    const byte = buf[i]!
    value |= (byte & 0x7f) << shift
    if ((byte & 0x80) === 0) return { value, next: i + 1 }
    shift += 7
    if (shift > 35) throw new Error('VarInt massa llarg')
  }
  return null
}

const packet = (id: number, payload: Buffer): Buffer => {
  const body = Buffer.concat([writeVarInt(id), payload])
  return Buffer.concat([writeVarInt(body.length), body])
}

/** Aplica la resolució SRV (`_minecraft._tcp.host`) si no s'ha indicat port, com fa el client oficial. */
async function resolveMinecraftTarget(host: string, port: number | undefined): Promise<{ host: string; port: number }> {
  if (port !== undefined) return { host, port }
  if (!net.isIP(host)) {
    try {
      const [srv] = await resolveSrv(`_minecraft._tcp.${host}`)
      if (srv) return { host: srv.name, port: srv.port }
    } catch {
      // Sense registre SRV: port per defecte.
    }
  }
  return { host, port: 25565 }
}

type PingResponse = {
  version?: { name?: string }
  players?: { online?: number; max?: number }
}

async function probeMinecraft(hostname: string, portIn: number | undefined, timeoutMs: number): Promise<ProbeResult> {
  const started = performance.now()
  const { host, port } = await resolveMinecraftTarget(hostname, portIn)

  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    let received = Buffer.alloc(0)
    let finished = false

    const finish = (result: ProbeResult) => {
      if (finished) return
      finished = true
      socket.destroy()
      resolve(result)
    }
    const fail = (detail: string) => finish({ ok: false, latencyMs: Math.round(performance.now() - started), detail })

    socket.setTimeout(timeoutMs, () => fail(`Sense resposta en ${timeoutMs} ms`))
    socket.once('error', (err) => fail(message(err)))
    socket.once('close', () => fail('Connexió tancada sense resposta'))

    socket.once('connect', () => {
      const hostBytes = Buffer.from(hostname, 'utf8')
      const portBuf = Buffer.alloc(2)
      portBuf.writeUInt16BE(port)
      // Handshake: protocol -1 (sondeig), adreça, port, estat 1 (status). Després, petició d'estat.
      const handshake = packet(0x00, Buffer.concat([writeVarInt(-1), writeVarInt(hostBytes.length), hostBytes, portBuf, writeVarInt(1)]))
      socket.write(Buffer.concat([handshake, packet(0x00, Buffer.alloc(0))]))
    })

    socket.on('data', (chunk: Buffer) => {
      received = Buffer.concat([received, chunk])
      try {
        const length = readVarInt(received, 0)
        if (!length || received.length < length.next + length.value) return // paquet incomplet
        const id = readVarInt(received, length.next)
        const strLen = id && readVarInt(received, id.next)
        if (!id || !strLen) return
        if (id.value !== 0x00) return fail(`Paquet inesperat (${id.value})`)
        const end = strLen.next + strLen.value
        if (received.length < end) return
        const info = JSON.parse(received.subarray(strLen.next, end).toString('utf8')) as PingResponse
        const extra: Record<string, string | number> = {}
        if (info.players?.online !== undefined) extra.players = info.players.online
        if (info.players?.max !== undefined) extra.maxPlayers = info.players.max
        if (info.version?.name) extra.version = info.version.name
        finish({
          ok: true,
          latencyMs: Math.round(performance.now() - started),
          detail: `${info.players?.online ?? '?'}/${info.players?.max ?? '?'} jugadors`,
          extra,
        })
      } catch (err) {
        fail(`Resposta invàlida: ${message(err)}`)
      }
    })
  })
}

// --- Entrada ------------------------------------------------------------------------------------------

export async function runProbe(c: ComponentConfig, timeoutMs: number): Promise<ProbeResult> {
  switch (c.kind) {
    case 'http':
      return probeHttp(c, timeoutMs)
    case 'tcp':
      return probeTcp(c.host, c.port, timeoutMs)
    case 'minecraft':
      return probeMinecraft(c.host, c.port, timeoutMs)
  }
}
