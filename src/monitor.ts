import { env, loadFixedComponents } from './config.js'
import { addUpdate, createIncident, openAutoIncident, patchIncident } from './incidents.js'
import { runProbe } from './probes.js'
import { store } from './store.js'
import type { ComponentConfig, ComponentState, ComponentStatus, ProbeResult, Sample } from './types.js'

// Monitoratge automàtic: cada component es comprova al seu ritme. L'estat només canvia després de
// diverses comprovacions seguides (llindars a la configuració) perquè un error puntual no faci
// parpellejar la pàgina. En passar a «degradat» o «no disponible» s'obre sola una incidència, i es
// resol sola quan el servei es recupera.

const RANK: Record<ComponentStatus, number> = { operational: 0, degraded: 1, outage: 2 }

export const worse = (a: ComponentStatus, b: ComponentStatus): ComponentStatus => (RANK[a] >= RANK[b] ? a : b)

let fixed: ComponentConfig[] = []
const timers = new Map<string, NodeJS.Timeout>()
const running = new Set<string>()
let stopped = false

/** Components actius: els fixos del fitxer + els gestionats pel panell (els fixos manen si l'id coincideix). */
export function allComponents(): ComponentConfig[] {
  const byId = new Map<string, ComponentConfig>()
  for (const c of store.data.managed) byId.set(c.id, c)
  for (const c of fixed) byId.set(c.id, c)
  return [...byId.values()]
}

const intervalMs = (c: ComponentConfig) => (c.intervalSeconds ?? env.DEFAULT_INTERVAL_SECONDS) * 1000

function initialState(): ComponentState {
  return { status: 'operational', since: Date.now(), failStreak: 0, degradedStreak: 0, okStreak: 0, lastCheck: null }
}

/** Transició d'estat a partir d'un resultat. Pura respecte al comportament de llindars (fàcil de provar). */
export function nextStatus(prev: ComponentStatus, s: Pick<ComponentState, 'failStreak' | 'degradedStreak' | 'okStreak'>): ComponentStatus {
  if (s.failStreak >= env.FAIL_THRESHOLD) return 'outage'
  if (prev === 'outage') {
    // Sortir d'una caiguda exigeix recuperar-se de manera sostinguda.
    if (s.okStreak >= env.RECOVER_THRESHOLD) return s.degradedStreak >= env.DEGRADED_THRESHOLD ? 'degraded' : 'operational'
    return s.degradedStreak >= env.RECOVER_THRESHOLD ? 'degraded' : 'outage'
  }
  if (s.degradedStreak >= env.DEGRADED_THRESHOLD) return 'degraded'
  if (prev === 'degraded') return s.okStreak >= env.RECOVER_THRESHOLD ? 'operational' : 'degraded'
  return prev
}

function handleTransition(c: ComponentConfig, from: ComponentStatus, to: ComponentStatus, detail: string): void {
  const open = openAutoIncident(c.id)
  const params = { name: c.name, detail }

  if (to === 'operational') {
    if (open) {
      addUpdate(open.id, {
        status: 'resolved',
        by: null,
        body: `${c.name} torna a respondre amb normalitat. Resolt automàticament.`,
        bodyI18n: { key: 'recovered', params },
      })
    }
    return
  }

  const outage = to === 'outage'
  const impact = outage ? 'major' : 'minor'
  const title = `${c.name}: ${outage ? 'no disponible' : 'lent o degradat'}`
  const titleI18n = { key: outage ? 'outageTitle' : 'degradedTitle', params }
  const body = outage
    ? `El monitoratge automàtic ha detectat que ${c.name} no respon (${detail}).`
    : `El monitoratge automàtic ha detectat que ${c.name} respon amb lentitud o de manera parcial (${detail}).`
  const bodyI18n = { key: outage ? 'outageBody' : 'degradedBody', params }

  if (!open) {
    createIncident({ title, impact, status: 'investigating', componentIds: [c.id], body, by: null, auto: true, titleI18n, bodyI18n })
  } else if (open.impact !== impact) {
    patchIncident(open.id, { title, impact, titleI18n })
    const worse = from === 'degraded'
    addUpdate(open.id, {
      status: 'investigating',
      by: null,
      impact,
      body: worse ? `La situació ha empitjorat: ${detail}.` : `La situació ha millorat, però continua degradada: ${detail}.`,
      bodyI18n: { key: worse ? 'worse' : 'better', params },
    })
  }
}

/** Valora un resultat de sonda, actualitza l'estat, l'historial i les incidències. */
export function applyResult(c: ComponentConfig, result: ProbeResult): ComponentState {
  const slowMs = c.slowMs ?? env.DEFAULT_SLOW_MS
  const degraded = result.ok && result.latencyMs > slowMs
  const sample: Sample = { t: Date.now(), ok: result.ok, degraded, latencyMs: result.latencyMs, detail: result.detail }
  store.record(c.id, sample)

  const state = (store.data.states[c.id] ??= initialState())
  if (!result.ok) {
    state.failStreak += 1
    state.degradedStreak = 0
    state.okStreak = 0
  } else if (degraded) {
    state.degradedStreak += 1
    state.failStreak = 0
    state.okStreak = 0
  } else {
    state.okStreak += 1
    state.failStreak = 0
    state.degradedStreak = 0
  }
  state.lastCheck = { ...sample, ...(result.extra ? { extra: result.extra } : {}) }

  const previous = state.status
  const next = nextStatus(previous, state)
  if (next !== previous) {
    state.status = next
    state.since = Date.now()
    handleTransition(c, previous, next, degraded && result.ok ? `${result.latencyMs} ms, llindar ${slowMs} ms` : result.detail)
  }
  store.save()
  return state
}

async function checkOnce(c: ComponentConfig): Promise<void> {
  if (running.has(c.id)) return
  running.add(c.id)
  try {
    const result = await runProbe(c, c.timeoutMs ?? env.DEFAULT_TIMEOUT_MS)
    applyResult(c, result)
  } catch (err) {
    applyResult(c, { ok: false, latencyMs: 0, detail: err instanceof Error ? err.message : String(err) })
  } finally {
    running.delete(c.id)
  }
}

function schedule(c: ComponentConfig, delay: number): void {
  timers.set(
    c.id,
    setTimeout(() => {
      if (stopped) return
      void checkOnce(c).finally(() => {
        // Es torna a llegir la configuració actual: si el component s'ha retirat, el bucle s'atura.
        const current = allComponents().find((x) => x.id === c.id)
        if (current && !stopped) schedule(current, intervalMs(current))
        else timers.delete(c.id)
      })
    }, delay),
  )
}

/** Sincronitza els bucles de comprovació amb la llista actual de components (afegeix els nous, atura els retirats). */
export function reconcile(): void {
  const active = allComponents()
  const ids = new Set(active.map((c) => c.id))

  for (const [id, timer] of timers) {
    if (!ids.has(id)) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }
  for (const c of active) {
    if (!timers.has(c.id)) schedule(c, Math.floor(Math.random() * 3000)) // esglaonat perquè no ho comprovi tot alhora
  }
  store.prune(ids)
  store.save()
}

export function startMonitor(): void {
  fixed = loadFixedComponents()
  reconcile()
}

export function stopMonitor(): void {
  stopped = true
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
}

/** Comprova un component ara mateix (botó «comprova ara» del panell). */
export async function checkNow(id: string): Promise<boolean> {
  const c = allComponents().find((x) => x.id === id)
  if (!c) return false
  await checkOnce(c)
  return true
}
