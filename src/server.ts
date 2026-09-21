import { timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express, { type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import { env } from './config.js'
import { addUpdate, createIncident, deleteIncident, patchIncident } from './incidents.js'
import { allComponents, checkNow, reconcile, startMonitor, stopMonitor } from './monitor.js'
import { store } from './store.js'
import { buildSummary } from './summary.js'
import type { ComponentConfig } from './types.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', env.TRUST_PROXY_HOPS)

app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors *",
  })
  next()
})
app.use(express.json({ limit: '200kb' }))

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } })

// --- Límit de peticions a l'API pública (per IP) -------------------------------------------------------

const hits = new Map<string, { count: number; reset: number }>()
setInterval(() => {
  const t = Date.now()
  for (const [ip, h] of hits) if (h.reset < t) hits.delete(ip)
}, 60_000).unref()

function publicLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? 'unknown'
  const t = Date.now()
  const h = hits.get(ip)
  if (!h || h.reset < t) {
    hits.set(ip, { count: 1, reset: t + 60_000 })
    return next()
  }
  h.count += 1
  if (h.count > 120) return void fail(res, 429, 'RATE_LIMITED', 'Massa peticions.')
  next()
}

// --- API pública ---------------------------------------------------------------------------------------

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, components: allComponents().length })
})

app.get('/api/config', publicLimiter, (_req, res) => {
  res.json({
    title: env.SITE_TITLE,
    subtitle: env.SITE_SUBTITLE,
    controllerName: env.PRIVACY_CONTROLLER_NAME ?? null,
    contactEmail: env.PRIVACY_CONTACT_EMAIL ?? null,
    controllerAddress: env.PRIVACY_CONTROLLER_ADDRESS ?? null,
  })
})

app.get('/api/status', publicLimiter, (_req, res) => {
  res.set('Cache-Control', `public, max-age=${env.PUBLIC_CACHE_SECONDS}`)
  res.json(buildSummary())
})

app.get('/api/incidents', publicLimiter, (req, res) => {
  const days = z.coerce.number().int().min(1).max(90).catch(30).parse(req.query.days)
  res.set('Cache-Control', `public, max-age=${env.PUBLIC_CACHE_SECONDS}`)
  res.json({ incidents: buildSummary({ incidentDays: days }).incidents })
})

// --- API d'administració (el panell) --------------------------------------------------------------------

const admin = express.Router()

admin.use((req, res, next) => {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const expected = Buffer.from(env.API_TOKEN)
  const given = Buffer.from(token)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return void fail(res, 401, 'UNAUTHORIZED', 'Token invàlid.')
  }
  next()
})

const impact = z.enum(['none', 'minor', 'major', 'critical'])
const status = z.enum(['investigating', 'identified', 'monitoring', 'resolved'])
const by = z.string().trim().min(1).max(64)
const knownComponents = (ids: string[]): boolean => {
  const known = new Set(allComponents().map((c) => c.id))
  return ids.every((id) => known.has(id))
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  impact,
  status: status.default('investigating'),
  componentIds: z.array(z.string()).max(50).default([]),
  body: z.string().trim().min(1).max(4000),
  by,
})

admin.get('/summary', (_req, res) => {
  res.json(buildSummary({ admin: true, incidentDays: 90 }))
})

admin.post('/incidents', (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return void fail(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Dades invàlides.')
  if (!knownComponents(parsed.data.componentIds)) return void fail(res, 400, 'UNKNOWN_COMPONENT', 'Algun component no existeix.')
  res.status(201).json(createIncident(parsed.data))
})

admin.post('/incidents/:id/updates', (req, res) => {
  const parsed = z.object({ status, body: z.string().trim().min(1).max(4000), by, impact: impact.optional() }).safeParse(req.body)
  if (!parsed.success) return void fail(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Dades invàlides.')
  const incident = addUpdate(String(req.params.id), parsed.data)
  if (!incident) return void fail(res, 404, 'NOT_FOUND', 'Incidència no trobada.')
  res.json(incident)
})

admin.patch('/incidents/:id', (req, res) => {
  const parsed = z
    .object({ title: z.string().trim().min(1).max(120), impact, componentIds: z.array(z.string()).max(50) })
    .partial()
    .strict()
    .safeParse(req.body)
  if (!parsed.success) return void fail(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Dades invàlides.')
  if (parsed.data.componentIds && !knownComponents(parsed.data.componentIds)) return void fail(res, 400, 'UNKNOWN_COMPONENT', 'Algun component no existeix.')
  const incident = patchIncident(String(req.params.id), parsed.data)
  if (!incident) return void fail(res, 404, 'NOT_FOUND', 'Incidència no trobada.')
  res.json(incident)
})

admin.delete('/incidents/:id', (req, res) => {
  if (!deleteIncident(String(req.params.id))) return void fail(res, 404, 'NOT_FOUND', 'Incidència no trobada.')
  res.json({ ok: true })
})

// El panell envia la llista completa de servidors de Minecraft a vigilar (substitueix l'anterior).
const managedSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
      name: z.string().trim().min(1).max(80),
      host: z.string().trim().min(1).max(253),
      port: z.number().int().min(1).max(65535).optional(),
      description: z.string().max(200).optional(),
    }),
  )
  .max(200)

admin.put('/managed-components', (req, res) => {
  const parsed = managedSchema.safeParse(req.body)
  if (!parsed.success) return void fail(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Dades invàlides.')
  store.data.managed = parsed.data.map(
    (s): ComponentConfig => ({
      kind: 'minecraft',
      id: s.id,
      name: s.name,
      host: s.host,
      ...(s.port ? { port: s.port } : {}),
      ...(s.description ? { description: s.description } : {}),
      group: 'Servidors de joc',
      intervalSeconds: 30,
    }),
  )
  reconcile()
  res.json({ ok: true, count: store.data.managed.length })
})

admin.post('/components/:id/check', async (req, res) => {
  if (!(await checkNow(String(req.params.id)))) return void fail(res, 404, 'NOT_FOUND', 'Component no trobat.')
  res.json(buildSummary({ admin: true }).components.find((c) => c.id === req.params.id))
})

app.use('/api/admin', admin)

// --- Pàgina pública ------------------------------------------------------------------------------------

app.use(express.static(fileURLToPath(new URL('../public', import.meta.url)), { maxAge: '5m', index: 'index.html' }))

app.use('/api', (_req, res) => fail(res, 404, 'NOT_FOUND', 'Ruta desconeguda.'))

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  fail(res, 500, 'INTERNAL_ERROR', 'Error inesperat.')
})

// --- Arrencada ------------------------------------------------------------------------------------------

await store.load()
startMonitor()

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`Estat: escoltant a http://${env.HOST}:${env.PORT} (${allComponents().length} components)`)
})

async function shutdown(): Promise<void> {
  stopMonitor()
  server.close()
  await store.flush()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
