import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type { ComponentConfig } from './types.js'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4100),
  HOST: z.string().default('127.0.0.1'),
  /** Carpeta on es guarda l'històric (status.json). */
  DATA_DIR: z.string().default('./data'),
  /** Components fixos (servei, distribution.json…). Els servidors de Minecraft els envia el panell. */
  COMPONENTS_FILE: z.string().default('./components.json'),
  /** Token amb què el panell gestiona incidències i servidors (Authorization: Bearer). */
  API_TOKEN: z.string().min(32, 'API_TOKEN ha de tenir almenys 32 caràcters (openssl rand -hex 32)'),
  /** Proxies de confiança davant el servei (Apache/Cloudflare = 1-2). */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  SITE_TITLE: z.string().default('HellMC Estat'),
  SITE_SUBTITLE: z.string().default('Estat dels serveis de HellMC'),
  DEFAULT_INTERVAL_SECONDS: z.coerce.number().int().min(10).default(60),
  DEFAULT_TIMEOUT_MS: z.coerce.number().int().min(500).default(8000),
  DEFAULT_SLOW_MS: z.coerce.number().int().min(100).default(2500),
  /** Comprovacions seguides que han de fallar / anar lentes / anar bé per canviar d'estat (evita parpelleigs). */
  FAIL_THRESHOLD: z.coerce.number().int().min(1).default(3),
  DEGRADED_THRESHOLD: z.coerce.number().int().min(1).default(3),
  RECOVER_THRESHOLD: z.coerce.number().int().min(1).default(2),
  RETENTION_DAYS: z.coerce.number().int().min(7).default(90),
  PUBLIC_CACHE_SECONDS: z.coerce.number().int().min(0).default(15),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Configuració invàlida:')
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}
export const env = parsed.data

// --- Components fixos -------------------------------------------------------------------------------

const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/, 'id: minúscules, números i guions')

const common = {
  id: idSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  group: z.string().max(60).optional(),
  intervalSeconds: z.number().int().min(10).optional(),
  timeoutMs: z.number().int().min(500).optional(),
  slowMs: z.number().int().min(100).optional(),
}

const assertion = z.object({
  path: z.string().min(1),
  equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
  type: z.enum(['array', 'object', 'string', 'number', 'boolean']).optional(),
  minLength: z.number().int().min(0).optional(),
})

export const componentSchema = z.discriminatedUnion('kind', [
  z.object({
    ...common,
    kind: z.literal('http'),
    url: z.string().url(),
    method: z.enum(['GET', 'HEAD']).optional(),
    expectStatus: z.array(z.number().int()).optional(),
    assertions: z.array(assertion).optional(),
  }),
  z.object({ ...common, kind: z.literal('tcp'), host: z.string().min(1), port: z.number().int().min(1).max(65535) }),
  z.object({ ...common, kind: z.literal('minecraft'), host: z.string().min(1), port: z.number().int().min(1).max(65535).optional() }),
])

export function loadFixedComponents(): ComponentConfig[] {
  let raw: string
  try {
    raw = readFileSync(env.COMPONENTS_FILE, 'utf8')
  } catch {
    console.warn(`No es pot llegir ${env.COMPONENTS_FILE}: només hi haurà els components enviats pel panell.`)
    return []
  }
  const result = z.array(componentSchema).safeParse(JSON.parse(raw))
  if (!result.success) {
    console.error(`${env.COMPONENTS_FILE} invàlid:`)
    for (const issue of result.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    process.exit(1)
  }
  return result.data
}
