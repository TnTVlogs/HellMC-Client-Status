import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { env } from './config.js'
import type { Bucket, ComponentState, Incident, Sample, StoreData } from './types.js'

// Emmagatzematge en un fitxer JSON: sense base de dades ni dependències natives. L'històric es guarda
// agregat per hores (una entrada per component i hora), així 90 dies són uns pocs MB. Escriptura atòmica
// (fitxer temporal + rename) i diferida, perquè no s'escrigui a cada comprovació.

const HOUR_MS = 3_600_000
const SAVE_DELAY_MS = 5_000
const MAX_RECENT = 120

const emptyData = (): StoreData => ({ version: 1, managed: [], states: {}, hourly: {}, recent: {}, incidents: [] })

export const hourKey = (t: number): string => String(Math.floor(t / HOUR_MS))

class Store {
  data: StoreData = emptyData()
  private path = resolve(env.DATA_DIR, 'status.json')
  private timer: NodeJS.Timeout | null = null
  private writing: Promise<void> = Promise.resolve()

  async load(): Promise<void> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as StoreData
      if (parsed.version === 1) this.data = { ...emptyData(), ...parsed }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.error('No es pot llegir status.json; es comença de zero:', err)
    }
  }

  /** Programa un desat en uns segons (agrupa canvis seguits). */
  save(): void {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, SAVE_DELAY_MS)
  }

  /** Desa ara mateix (esperant les escriptures en curs). */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.path), { recursive: true })
      const tmp = `${this.path}.tmp`
      await writeFile(tmp, JSON.stringify(this.data))
      await rename(tmp, this.path)
    })
    return this.writing.catch((err) => console.error('No s\'ha pogut desar status.json:', err))
  }

  // --- Mostres i agregats ----------------------------------------------------------------------

  record(componentId: string, sample: Sample): void {
    const buckets = (this.data.hourly[componentId] ??= {})
    const key = hourKey(sample.t)
    const bucket: Bucket = (buckets[key] ??= { n: 0, up: 0, deg: 0, lat: 0 })
    bucket.n += 1
    if (sample.ok) bucket.up += 1
    if (sample.ok && sample.degraded) bucket.deg += 1
    if (sample.ok) bucket.lat += sample.latencyMs

    const recent = (this.data.recent[componentId] ??= [])
    recent.push(sample)
    if (recent.length > MAX_RECENT) recent.splice(0, recent.length - MAX_RECENT)
  }

  state(componentId: string): ComponentState | undefined {
    return this.data.states[componentId]
  }

  /** Esborra agregats i incidències resoltes més velles que la retenció, i estat de components que ja no existeixen. */
  prune(activeIds: Set<string>): void {
    const cutoffHour = Number(hourKey(Date.now() - env.RETENTION_DAYS * 24 * HOUR_MS))
    for (const [id, buckets] of Object.entries(this.data.hourly)) {
      if (!activeIds.has(id) && !this.data.states[id]) {
        delete this.data.hourly[id]
        continue
      }
      for (const key of Object.keys(buckets)) if (Number(key) < cutoffHour) delete buckets[key]
    }
    const cutoff = Date.now() - env.RETENTION_DAYS * 24 * HOUR_MS
    this.data.incidents = this.data.incidents.filter((i) => !i.resolvedAt || new Date(i.resolvedAt).getTime() >= cutoff)
    for (const id of Object.keys(this.data.recent)) if (!activeIds.has(id)) delete this.data.recent[id]
    for (const id of Object.keys(this.data.states)) {
      if (!activeIds.has(id)) {
        const hasHistory = Object.keys(this.data.hourly[id] ?? {}).length > 0
        if (!hasHistory) delete this.data.states[id]
      }
    }
  }

  incident(id: string): Incident | undefined {
    return this.data.incidents.find((i) => i.id === id)
  }
}

export const store = new Store()
