// Pàgina d'estat pública. JavaScript pla, sense dependències ni build. Tot el text de l'API es pinta
// amb textContent (mai innerHTML), així que cap dada pot injectar HTML. Els textos de la interfície
// venen de i18n.js (català, castellà i anglès).

const REFRESH_MS = 30000
const I = window.HellI18n
const t = (key, params) => I.t(key, params)

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

const fmtDateTime = (iso) => new Date(iso).toLocaleString(I.locale, { dateStyle: 'medium', timeStyle: 'short' })
const fmtDay = (iso) => new Date(iso).toLocaleDateString(I.locale, { dateStyle: 'full' })
const fmtUptime = (n) => (n === null ? '—' : `${n.toLocaleString(I.locale, { maximumFractionDigits: 2 })} %`)

function dayClass(uptime) {
  if (uptime === null) return 'none'
  if (uptime >= 99.5) return 'up'
  if (uptime >= 95) return 'warn'
  return 'down'
}

/** Els grups per defecte estan escrits en català a la configuració; si són coneguts, es tradueixen. */
const groupLabel = (name) => (I.t(`group.${name}`) === `group.${name}` ? name : t(`group.${name}`))

/** Text d'un servei en l'idioma actiu (si la configuració en defineix), o el de reserva. */
const localText = (c, field) => c.i18n?.[field]?.[I.lang] ?? c[field]

/** Els paràmetres de les incidències automàtiques porten el nom del servei en cada idioma (name_ca, name_es…). */
const localParams = (params) => (params ? { ...params, name: params[`name_${I.lang}`] ?? params.name } : params)

const incidentTitle = (i) => (i.titleKey ? t(`auto.${i.titleKey}`, localParams(i.params)) : i.title)
const updateBody = (u) => (u.bodyKey ? t(`auto.${u.bodyKey}`, localParams(u.params)) : u.body)

function overallMessage(data) {
  if (data.components.length === 0) return t('page.noComponents')
  const status = data.overall.status
  if (status === 'operational') return t('overall.operational')
  if (status === 'degraded') return t('overall.degraded')
  return data.components.every((c) => c.status === 'outage') ? t('overall.outage') : t('overall.partialOutage')
}

function renderComponent(c) {
  const extra = []
  if (c.extra?.players !== undefined) extra.push(t('page.players', { online: c.extra.players, max: c.extra.maxPlayers ?? '?' }))
  if (c.extra?.version) extra.push(String(c.extra.version))

  const bars = h(
    'div',
    { class: 'bars', role: 'img', 'aria-label': localText(c, 'name') },
    c.days.map((d) =>
      h('div', {
        class: `day ${dayClass(d.uptime)}`,
        title: t('page.dayTitle', { date: d.date, value: d.uptime === null ? t('page.noData') : fmtUptime(d.uptime) }),
      }),
    ),
  )

  return h(
    'div',
    { class: 'component' },
    h(
      'div',
      { class: 'component-head' },
      h('span', { class: 'component-name' }, localText(c, 'name')),
      h('span', { class: `pill ${c.status}` }, t(`status.${c.status}`)),
      h(
        'span',
        { class: 'component-meta' },
        extra.length ? h('span', {}, extra.join(' · ')) : null,
        c.latencyMs !== null ? h('span', {}, `${c.latencyMs} ms`) : null,
        h('span', {}, t('page.uptime', { value: fmtUptime(c.uptime) })),
      ),
      localText(c, 'description') ? h('span', { class: 'component-desc' }, localText(c, 'description')) : null,
    ),
    bars,
    h('div', { class: 'bars-legend' }, h('span', {}, t('page.daysAgo', { n: c.days.length })), h('span', {}, t('page.today'))),
  )
}

function renderIncident(i) {
  const resolved = i.status === 'resolved'
  return h(
    'article',
    { class: `incident impact-${i.impact}${resolved ? ' resolved' : ''}` },
    h('h4', {}, incidentTitle(i)),
    h('p', { class: 'incident-meta' }, `${t(`inc.${i.status}`)} · ${t(`impact.${i.impact}`)} · ${fmtDateTime(i.createdAt)}`, i.auto ? ` · ${t('inc.auto')}` : ''),
    h(
      'ul',
      { class: 'timeline' },
      [...i.updates].reverse().map((u) =>
        h(
          'li',
          {},
          h('span', { class: 'status' }, t(`inc.${u.status}`)),
          ' — ',
          h('time', { datetime: u.at }, fmtDateTime(u.at)),
          h('p', { class: 'body' }, updateBody(u)),
        ),
      ),
    ),
  )
}

let lastData = null
/** Estat de la barra general: es guarda aquí perquè en canviar d'idioma es torni a pintar amb el text correcte. */
let overallState = 'loading' // 'loading' | 'error' | 'ok'

function renderOverall() {
  const overall = $('overall')
  overall.removeAttribute('data-i18n') // el text l'escriu sempre aquesta funció, no la traducció automàtica del DOM
  if (overallState === 'ok' && lastData) {
    overall.className = `overall ${lastData.components.length === 0 ? 'loading' : lastData.overall.status}`
    overall.textContent = overallMessage(lastData)
  } else {
    overall.className = 'overall loading'
    overall.textContent = overallState === 'error' ? t('page.loadError') : t('page.loading')
  }
}

function render(data) {
  lastData = data
  overallState = 'ok'
  renderOverall()

  const groups = new Map()
  for (const c of data.components) {
    if (!groups.has(c.group)) groups.set(c.group, [])
    groups.get(c.group).push(c)
  }
  $('components').replaceChildren(
    ...[...groups].map(([name, list]) => h('div', { class: 'group' }, h('h3', {}, groupLabel(name)), list.map(renderComponent))),
  )

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
      ? [h('p', { class: 'empty' }, t('page.noIncidents'))]
      : [...byDay].flatMap(([day, list]) => [h('div', { class: 'history-day' }, fmtDay(day)), ...list.map(renderIncident)])),
  )

  $('updated').textContent = t('page.updated', { time: fmtDateTime(data.generatedAt) })
}

async function load() {
  try {
    const res = await fetch('api/status', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    render(await res.json())
  } catch (err) {
    console.error(err)
    // Si ja teníem dades, es continuen mostrant (poden ser velles uns segons); només s'avisa si no n'hi ha cap.
    if (!lastData) {
      overallState = 'error'
      renderOverall()
    }
  }
}

async function init() {
  // Primer el que no depèn de la xarxa: així el canvi d'idioma sempre funciona, encara que /api/config trigui.
  renderOverall()
  I.onChange(() => {
    if (lastData) render(lastData)
    else renderOverall()
  })
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
