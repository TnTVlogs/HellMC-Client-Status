// Pàgina d'estat pública. JavaScript pla, sense dependències ni build. Tot el text de l'API es pinta
// amb textContent (mai innerHTML), així que cap dada pot injectar HTML.

const REFRESH_MS = 30000

const STATUS_LABEL = { operational: 'Operatiu', degraded: 'Degradat', outage: 'No disponible' }
const INCIDENT_STATUS = { investigating: 'Investigant', identified: 'Identificat', monitoring: 'Monitoratge', resolved: 'Resolt' }
const IMPACT_LABEL = { none: 'Sense impacte', minor: 'Impacte menor', major: 'Impacte important', critical: 'Impacte crític' }

const $ = (id) => document.getElementById(id)

/** Crea un element: h('div', {class:'x', title:'y'}, 'text', altreNode) */
function h(tag, props, ...children) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue
    if (key === 'class') el.className = value
    else el.setAttribute(key, value === true ? '' : String(value))
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    el.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return el
}

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('ca-ES', { dateStyle: 'medium', timeStyle: 'short' })

const fmtDay = (iso) => new Date(iso).toLocaleDateString('ca-ES', { dateStyle: 'full' })

const fmtUptime = (n) => (n === null ? '—' : `${n.toLocaleString('ca-ES', { maximumFractionDigits: 2 })} %`)

function dayClass(uptime) {
  if (uptime === null) return 'none'
  if (uptime >= 99.5) return 'up'
  if (uptime >= 95) return 'warn'
  return 'down'
}

function renderComponent(c) {
  const extra = []
  if (c.extra?.players !== undefined) extra.push(`${c.extra.players}/${c.extra.maxPlayers ?? '?'} jugadors`)
  if (c.extra?.version) extra.push(String(c.extra.version))

  const bars = h(
    'div',
    { class: 'bars', role: 'img', 'aria-label': `Disponibilitat diària de ${c.name}` },
    c.days.map((d) =>
      h('div', {
        class: `day ${dayClass(d.uptime)}`,
        title: `${d.date} · ${d.uptime === null ? 'sense dades' : fmtUptime(d.uptime)}`,
      }),
    ),
  )

  return h(
    'div',
    { class: 'component' },
    h(
      'div',
      { class: 'component-head' },
      h('span', { class: 'component-name' }, c.name),
      h('span', { class: `pill ${c.status}` }, STATUS_LABEL[c.status] ?? c.status),
      h(
        'span',
        { class: 'component-meta' },
        extra.length ? h('span', {}, extra.join(' · ')) : null,
        c.latencyMs !== null ? h('span', {}, `${c.latencyMs} ms`) : null,
        h('span', {}, `${fmtUptime(c.uptime)} en 90 dies`),
      ),
      c.description ? h('span', { class: 'component-desc' }, c.description) : null,
    ),
    bars,
    h('div', { class: 'bars-legend' }, h('span', {}, `fa ${c.days.length} dies`), h('span', {}, 'avui')),
  )
}

function renderIncident(i) {
  const resolved = i.status === 'resolved'
  return h(
    'article',
    { class: `incident impact-${i.impact}${resolved ? ' resolved' : ''}` },
    h('h4', {}, i.title),
    h(
      'p',
      { class: 'incident-meta' },
      `${INCIDENT_STATUS[i.status]} · ${IMPACT_LABEL[i.impact]} · ${fmtDateTime(i.createdAt)}`,
      i.auto ? ' · detectat automàticament' : '',
    ),
    h(
      'ul',
      { class: 'timeline' },
      [...i.updates].reverse().map((u) =>
        h(
          'li',
          {},
          h('span', { class: 'status' }, INCIDENT_STATUS[u.status] ?? u.status),
          ' — ',
          h('time', { datetime: u.at }, fmtDateTime(u.at)),
          h('p', { class: 'body' }, u.body),
        ),
      ),
    ),
  )
}

function render(data) {
  const overall = $('overall')
  overall.className = `overall ${data.components.length === 0 ? 'loading' : data.overall.status}`
  overall.textContent = data.components.length === 0 ? 'Encara no hi ha serveis monitoritzats' : data.overall.message

  // Serveis agrupats
  const groups = new Map()
  for (const c of data.components) {
    if (!groups.has(c.group)) groups.set(c.group, [])
    groups.get(c.group).push(c)
  }
  $('components').replaceChildren(
    ...[...groups].map(([name, list]) => h('div', { class: 'group' }, h('h3', {}, name), list.map(renderComponent))),
  )

  // Incidències actives i historial
  const active = data.incidents.filter((i) => i.status !== 'resolved')
  $('active-section').hidden = active.length === 0
  $('active').replaceChildren(...active.map(renderIncident))

  const past = data.incidents.filter((i) => i.status === 'resolved')
  const byDay = new Map()
  for (const i of past) {
    const day = i.createdAt.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(i)
  }
  $('history').replaceChildren(
    ...(past.length === 0
      ? [h('p', { class: 'empty' }, 'Cap incidència en els darrers 30 dies.')]
      : [...byDay].flatMap(([day, list]) => [h('div', { class: 'history-day' }, fmtDay(day)), ...list.map(renderIncident)])),
  )

  $('updated').textContent = `Actualitzat ${fmtDateTime(data.generatedAt)}`
}

async function load() {
  try {
    const res = await fetch('api/status', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    render(await res.json())
  } catch (err) {
    console.error(err)
    const overall = $('overall')
    overall.className = 'overall loading'
    overall.textContent = "No es pot obtenir l'estat ara mateix. Es tornarà a provar automàticament."
  }
}

async function init() {
  try {
    const cfg = await (await fetch('api/config')).json()
    document.title = cfg.title
    $('title').textContent = cfg.title
    $('subtitle').textContent = cfg.subtitle
  } catch {
    // Sense configuració: es queda el títol per defecte.
  }
  await load()
  setInterval(load, REFRESH_MS)
}

void init()
