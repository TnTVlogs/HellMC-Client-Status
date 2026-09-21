import { env } from './config.js'
import { isOpen } from './incidents.js'
import { allComponents, worse } from './monitor.js'
import { hourKey, store } from './store.js'
import type { ComponentConfig, ComponentI18n, ComponentStatus, Incident, IncidentImpact } from './types.js'

// Construeix el que mostra la pàgina d'estat (i el panell): estat actual de cada component, disponibilitat
// diària dels darrers 90 dies i incidències. L'estat efectiu és el pitjor entre el detectat pel monitoratge
// i l'impacte de les incidències obertes que afecten el component.

const DAY_MS = 86_400_000
const IMPACT_STATUS: Record<IncidentImpact, ComponentStatus> = { none: 'operational', minor: 'degraded', major: 'outage', critical: 'outage' }

export type DayInfo = { date: string; uptime: number | null; checks: number }

export type ComponentSummary = {
  id: string
  name: string
  description: string | null
  /** Noms i descripcions traduïts (si la configuració en defineix). */
  i18n: ComponentI18n | null
  group: string
  status: ComponentStatus
  /** Estat detectat pel monitoratge (sense comptar incidències manuals). */
  detectedStatus: ComponentStatus
  since: string | null
  latencyMs: number | null
  lastCheckAt: string | null
  uptime: number | null
  days: DayInfo[]
  extra: Record<string, string | number> | null
  /** Només a la vista d'administració. */
  admin?: { kind: string; target: string; detail: string | null; intervalSeconds: number; recent: { t: number; ok: boolean; latencyMs: number }[] }
}

export type StatusSummary = {
  generatedAt: string
  overall: { status: ComponentStatus; message: string }
  components: ComponentSummary[]
  incidents: Incident[]
}

const targetOf = (c: ComponentConfig): string => (c.kind === 'http' ? c.url : c.kind === 'tcp' ? `${c.host}:${c.port}` : c.port ? `${c.host}:${c.port}` : c.host)

const dayString = (t: number): string => new Date(t).toISOString().slice(0, 10)

/** Disponibilitat diària (dies UTC) dels darrers `days` dies, del més antic al més recent. */
function dailyUptime(componentId: string, days: number): DayInfo[] {
  const buckets = store.data.hourly[componentId] ?? {}
  const today = Math.floor(Date.now() / DAY_MS) * DAY_MS
  const result: DayInfo[] = []

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = today - d * DAY_MS
    const firstHour = Number(hourKey(dayStart))
    let n = 0
    let up = 0
    for (let h = 0; h < 24; h++) {
      const b = buckets[String(firstHour + h)]
      if (b) {
        n += b.n
        up += b.up
      }
    }
    result.push({ date: dayString(dayStart), uptime: n === 0 ? null : Math.round((up / n) * 10000) / 100, checks: n })
  }
  return result
}

function overallOf(components: ComponentSummary[]): StatusSummary['overall'] {
  const worst = components.reduce<ComponentStatus>((acc, c) => worse(acc, c.status), 'operational')
  if (worst === 'operational') return { status: 'operational', message: 'Tots els sistemes funcionen amb normalitat' }
  const outages = components.filter((c) => c.status === 'outage').length
  if (worst === 'outage') {
    return { status: 'outage', message: outages === components.length ? 'Interrupció general del servei' : 'Alguns serveis no estan disponibles' }
  }
  return { status: 'degraded', message: 'Alguns serveis van més lents del normal' }
}

export function buildSummary(options: { admin?: boolean; incidentDays?: number } = {}): StatusSummary {
  const open = store.data.incidents.filter(isOpen)
  const components: ComponentSummary[] = allComponents().map((c) => {
    const state = store.state(c.id)
    const detected = state?.status ?? 'operational'
    const fromIncidents = open
      .filter((i) => i.componentIds.includes(c.id))
      .reduce<ComponentStatus>((acc, i) => worse(acc, IMPACT_STATUS[i.impact]), 'operational')

    const days = dailyUptime(c.id, Math.min(90, env.RETENTION_DAYS))
    const withData = days.filter((d) => d.uptime !== null)
    const totalChecks = withData.reduce((s, d) => s + d.checks, 0)
    const uptime = totalChecks === 0 ? null : Math.round((withData.reduce((s, d) => s + (d.uptime! * d.checks) / 100, 0) / totalChecks) * 10000) / 100

    const goodRecent = (store.data.recent[c.id] ?? []).filter((s) => s.ok).slice(-10)
    const latency = goodRecent.length ? Math.round(goodRecent.reduce((s, x) => s + x.latencyMs, 0) / goodRecent.length) : null

    const summary: ComponentSummary = {
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      i18n: c.i18n ?? null,
      group: c.group ?? 'Serveis',
      status: worse(detected, fromIncidents),
      detectedStatus: detected,
      since: state ? new Date(state.since).toISOString() : null,
      latencyMs: latency,
      lastCheckAt: state?.lastCheck ? new Date(state.lastCheck.t).toISOString() : null,
      uptime,
      days,
      extra: state?.lastCheck?.extra ?? null,
    }
    if (options.admin) {
      summary.admin = {
        kind: c.kind,
        target: targetOf(c),
        detail: state?.lastCheck?.detail ?? null,
        intervalSeconds: c.intervalSeconds ?? env.DEFAULT_INTERVAL_SECONDS,
        recent: (store.data.recent[c.id] ?? []).slice(-60).map((s) => ({ t: s.t, ok: s.ok, latencyMs: s.latencyMs })),
      }
    }
    return summary
  })

  const cutoff = Date.now() - (options.incidentDays ?? 30) * DAY_MS
  const incidents = store.data.incidents
    .filter((i) => isOpen(i) || new Date(i.createdAt).getTime() >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { generatedAt: new Date().toISOString(), overall: overallOf(components), components, incidents }
}
