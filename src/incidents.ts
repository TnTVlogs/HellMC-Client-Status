import { randomUUID } from 'node:crypto'
import { store } from './store.js'
import type { Incident, IncidentImpact, IncidentStatus, Translatable } from './types.js'

// Incidències: les crea una persona (des del panell) o el monitoratge automàtic. Cada una té una
// cronologia d'actualitzacions com a les pàgines d'estat habituals (investigant → identificat →
// monitoratge → resolta).

const now = () => new Date().toISOString()

export type NewIncident = {
  title: string
  impact: IncidentImpact
  status: IncidentStatus
  componentIds: string[]
  body: string
  by: string | null
  auto?: boolean
  titleI18n?: Translatable
  bodyI18n?: Translatable
}

export function createIncident(input: NewIncident): Incident {
  const at = now()
  const incident: Incident = {
    id: randomUUID(),
    title: input.title,
    ...(input.titleI18n ? { titleKey: input.titleI18n.key, params: input.titleI18n.params } : {}),
    impact: input.impact,
    status: input.status,
    componentIds: [...new Set(input.componentIds)],
    auto: input.auto ?? false,
    createdAt: at,
    updatedAt: at,
    resolvedAt: input.status === 'resolved' ? at : null,
    createdBy: input.by,
    updates: [
      {
        id: randomUUID(),
        status: input.status,
        body: input.body,
        ...(input.bodyI18n ? { bodyKey: input.bodyI18n.key, params: input.bodyI18n.params } : {}),
        at,
        by: input.by,
      },
    ],
  }
  store.data.incidents.push(incident)
  store.save()
  return incident
}

/** Afegeix una actualització a la cronologia i n'aplica l'estat (resoldre / reobrir). */
export function addUpdate(
  id: string,
  input: { status: IncidentStatus; body: string; by: string | null; impact?: IncidentImpact; bodyI18n?: Translatable },
): Incident | null {
  const incident = store.incident(id)
  if (!incident) return null
  const at = now()
  incident.updates.push({
    id: randomUUID(),
    status: input.status,
    body: input.body,
    ...(input.bodyI18n ? { bodyKey: input.bodyI18n.key, params: input.bodyI18n.params } : {}),
    at,
    by: input.by,
  })
  incident.status = input.status
  incident.updatedAt = at
  incident.resolvedAt = input.status === 'resolved' ? at : null
  if (input.impact) incident.impact = input.impact
  store.save()
  return incident
}

export function patchIncident(
  id: string,
  patch: { title?: string; impact?: IncidentImpact; componentIds?: string[]; titleI18n?: Translatable },
): Incident | null {
  const incident = store.incident(id)
  if (!incident) return null
  if (patch.title !== undefined) {
    incident.title = patch.title
    // Un títol escrit a mà ja no és el generat automàticament.
    if (!patch.titleI18n) {
      delete incident.titleKey
      delete incident.params
    }
  }
  if (patch.titleI18n) {
    incident.titleKey = patch.titleI18n.key
    incident.params = patch.titleI18n.params
  }
  if (patch.impact !== undefined) incident.impact = patch.impact
  if (patch.componentIds !== undefined) incident.componentIds = [...new Set(patch.componentIds)]
  incident.updatedAt = now()
  store.save()
  return incident
}

export function deleteIncident(id: string): boolean {
  const before = store.data.incidents.length
  store.data.incidents = store.data.incidents.filter((i) => i.id !== id)
  const removed = store.data.incidents.length !== before
  if (removed) store.save()
  return removed
}

export const isOpen = (i: Incident): boolean => i.status !== 'resolved'

/** Incidència automàtica oberta d'un component (n'hi ha com a molt una). */
export function openAutoIncident(componentId: string): Incident | undefined {
  return store.data.incidents.find((i) => i.auto && isOpen(i) && i.componentIds.includes(componentId))
}
