export type ComponentStatus = 'operational' | 'degraded' | 'outage'

export type Assertion = {
  /** Camí dins el JSON de la resposta, amb punts: `servers`, `data.ok`. */
  path: string
  equals?: string | number | boolean
  type?: 'array' | 'object' | 'string' | 'number' | 'boolean'
  /** Longitud mínima (arrays i cadenes). */
  minLength?: number
}

/** Noms i descripcions en cada idioma. Si falta un idioma, es fa servir `name` / `description`. */
export type ComponentI18n = {
  name?: Partial<Record<'ca' | 'es' | 'en', string>>
  description?: Partial<Record<'ca' | 'es' | 'en', string>>
}

type Common = {
  id: string
  name: string
  description?: string
  i18n?: ComponentI18n
  /** Agrupa components a la pàgina (p.ex. «Servei», «Servidors de joc»). */
  group?: string
  intervalSeconds?: number
  timeoutMs?: number
  /** Latència a partir de la qual la comprovació compta com a «degradada». */
  slowMs?: number
}

export type HttpComponent = Common & {
  kind: 'http'
  url: string
  method?: 'GET' | 'HEAD'
  /** Codis HTTP acceptats. Per defecte, qualsevol 2xx. */
  expectStatus?: number[]
  assertions?: Assertion[]
}

export type TcpComponent = Common & { kind: 'tcp'; host: string; port: number }

/** Server List Ping de Minecraft (jugadors, versió, latència). */
export type MinecraftComponent = Common & { kind: 'minecraft'; host: string; port?: number }

export type ComponentConfig = HttpComponent | TcpComponent | MinecraftComponent

/** Resultat d'una comprovació, abans de valorar-lo. */
export type ProbeResult = {
  ok: boolean
  latencyMs: number
  detail: string
  /** Dades extra del servei (jugadors, versió…). */
  extra?: Record<string, string | number>
}

export type Sample = { t: number; ok: boolean; degraded: boolean; latencyMs: number; detail: string }

export type ComponentState = {
  status: ComponentStatus
  /** Des de quan té aquest estat (ms). */
  since: number
  failStreak: number
  degradedStreak: number
  okStreak: number
  lastCheck: (Sample & { extra?: Record<string, string | number> }) | null
}

/** Agregat per hora: comprovacions totals, disponibles, degradades i suma de latències. */
export type Bucket = { n: number; up: number; deg: number; lat: number }

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'
export type IncidentImpact = 'none' | 'minor' | 'major' | 'critical'

/** Text traduïble d'una incidència automàtica: clau + paràmetres (la UI el mostra en l'idioma de qui mira). `title`/`body` en són el text de reserva. */
export type Translatable = { key: string; params: Record<string, string | number> }

export type IncidentUpdate = {
  id: string
  status: IncidentStatus
  body: string
  bodyKey?: string
  params?: Record<string, string | number>
  at: string
  by: string | null
}

export type Incident = {
  id: string
  title: string
  titleKey?: string
  params?: Record<string, string | number>
  impact: IncidentImpact
  status: IncidentStatus
  componentIds: string[]
  /** Creada pel monitoratge automàtic (no per una persona). */
  auto: boolean
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  createdBy: string | null
  updates: IncidentUpdate[]
}

export type StoreData = {
  version: 1
  /** Components gestionats des del panell (servidors de Minecraft). */
  managed: ComponentConfig[]
  states: Record<string, ComponentState>
  hourly: Record<string, Record<string, Bucket>>
  recent: Record<string, Sample[]>
  incidents: Incident[]
}
