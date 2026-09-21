// Idiomes (català, castellà, anglès) i consentiment de galetes de la pàgina d'estat pública.
// JavaScript pla, sense dependències. L'estat es mostra sense cap galeta: només, si l'usuari ho accepta,
// es recorda l'idioma triat al navegador (localStorage). Es carrega abans de app.js / privacy.js.

;(() => {
  const LANGS = [
    { code: 'ca', label: 'Català', locale: 'ca-ES' },
    { code: 'es', label: 'Español', locale: 'es-ES' },
    { code: 'en', label: 'English', locale: 'en-GB' },
  ]

  const LANG_KEY = 'hellmc.lang'
  const CONSENT_KEY = 'hellmc.consent'
  const CONSENT_VERSION = 1

  const DICT = {
    ca: {
      'page.services': 'Serveis',
      'page.history': "Historial d'incidències",
      'page.active': 'Incidències actives',
      'page.loading': "Carregant l'estat…",
      'page.loadError': "No es pot obtenir l'estat ara mateix. Es tornarà a provar automàticament.",
      'page.noComponents': 'Encara no hi ha serveis monitoritzats',
      'page.noIncidents': 'Cap incidència en els darrers 30 dies.',
      'page.updated': 'Actualitzat {time}',
      'page.legend': 'Disponibilitat dels darrers 90 dies (dies en UTC).',
      'page.legendUp': '≥ 99,5 %',
      'page.legendWarn': '≥ 95 %',
      'page.legendDown': '< 95 %',
      'page.legendNone': 'sense dades',
      'page.daysAgo': 'fa {n} dies',
      'page.today': 'avui',
      'page.uptime': '{value} en 90 dies',
      'page.players': '{online}/{max} jugadors',
      'page.dayTitle': '{date} · {value}',
      'page.noData': 'sense dades',
      'overall.operational': 'Tots els sistemes funcionen amb normalitat',
      'overall.degraded': 'Alguns serveis van més lents del normal',
      'overall.partialOutage': 'Alguns serveis no estan disponibles',
      'overall.outage': 'Interrupció general del servei',
      'status.operational': 'Operatiu',
      'status.degraded': 'Degradat',
      'status.outage': 'No disponible',
      'inc.investigating': 'Investigant',
      'inc.identified': 'Identificat',
      'inc.monitoring': 'Monitoratge',
      'inc.resolved': 'Resolt',
      'impact.none': 'Sense impacte',
      'impact.minor': 'Impacte menor',
      'impact.major': 'Impacte important',
      'impact.critical': 'Impacte crític',
      'inc.auto': 'detectat automàticament',
      'group.Serveis': 'Serveis',
      'group.Servidors de joc': 'Servidors de joc',
      'group.Dependències externes': 'Dependències externes',
      'auto.outageTitle': '{name}: no disponible',
      'auto.degradedTitle': '{name}: lent o degradat',
      'auto.outageBody': 'El monitoratge automàtic ha detectat que {name} no respon ({detail}).',
      'auto.degradedBody': 'El monitoratge automàtic ha detectat que {name} respon amb lentitud o de manera parcial ({detail}).',
      'auto.recovered': '{name} torna a respondre amb normalitat. Resolt automàticament.',
      'auto.worse': 'La situació ha empitjorat: {detail}.',
      'auto.better': 'La situació ha millorat, però continua degradada: {detail}.',
      'footer.privacy': 'Privacitat',
      'footer.cookies': 'Galetes i preferències',
      'lang.label': 'Idioma',
      'consent.title': 'Galetes i preferències',
      'consent.settingsTitle': 'Ajustos de galetes',
      'consent.text':
        "Aquesta pàgina no fa servir cap galeta. Podem recordar el teu idioma en aquest navegador, però només ho farem si ho acceptes. No hi ha publicitat, analítica ni tercers.",
      'consent.accept': 'Accepta',
      'consent.reject': 'Rebutja',
      'consent.more': 'Més informació',
      'consent.close': 'Tanca',
      'footer.legal': 'Enllaços legals',
      'consent.current': 'Elecció actual: {value}',
      'consent.accepted': 'preferències acceptades',
      'consent.rejected': 'preferències rebutjades',
      'privacy.back': 'Enrere',
      'privacy.settings': 'Canvia les meves preferències de galetes',
    },
    es: {
      'page.services': 'Servicios',
      'page.history': 'Historial de incidencias',
      'page.active': 'Incidencias activas',
      'page.loading': 'Cargando el estado…',
      'page.loadError': 'No se puede obtener el estado ahora mismo. Se volverá a intentar automáticamente.',
      'page.noComponents': 'Todavía no hay servicios monitorizados',
      'page.noIncidents': 'Ninguna incidencia en los últimos 30 días.',
      'page.updated': 'Actualizado {time}',
      'page.legend': 'Disponibilidad de los últimos 90 días (días en UTC).',
      'page.legendUp': '≥ 99,5 %',
      'page.legendWarn': '≥ 95 %',
      'page.legendDown': '< 95 %',
      'page.legendNone': 'sin datos',
      'page.daysAgo': 'hace {n} días',
      'page.today': 'hoy',
      'page.uptime': '{value} en 90 días',
      'page.players': '{online}/{max} jugadores',
      'page.dayTitle': '{date} · {value}',
      'page.noData': 'sin datos',
      'overall.operational': 'Todos los sistemas funcionan con normalidad',
      'overall.degraded': 'Algunos servicios van más lentos de lo normal',
      'overall.partialOutage': 'Algunos servicios no están disponibles',
      'overall.outage': 'Interrupción general del servicio',
      'status.operational': 'Operativo',
      'status.degraded': 'Degradado',
      'status.outage': 'No disponible',
      'inc.investigating': 'Investigando',
      'inc.identified': 'Identificado',
      'inc.monitoring': 'Monitorización',
      'inc.resolved': 'Resuelto',
      'impact.none': 'Sin impacto',
      'impact.minor': 'Impacto menor',
      'impact.major': 'Impacto importante',
      'impact.critical': 'Impacto crítico',
      'inc.auto': 'detectado automáticamente',
      'group.Serveis': 'Servicios',
      'group.Servidors de joc': 'Servidores de juego',
      'group.Dependències externes': 'Dependencias externas',
      'auto.outageTitle': '{name}: no disponible',
      'auto.degradedTitle': '{name}: lento o degradado',
      'auto.outageBody': 'La monitorización automática ha detectado que {name} no responde ({detail}).',
      'auto.degradedBody': 'La monitorización automática ha detectado que {name} responde con lentitud o de forma parcial ({detail}).',
      'auto.recovered': '{name} vuelve a responder con normalidad. Resuelto automáticamente.',
      'auto.worse': 'La situación ha empeorado: {detail}.',
      'auto.better': 'La situación ha mejorado, pero sigue degradada: {detail}.',
      'footer.privacy': 'Privacidad',
      'footer.cookies': 'Cookies y preferencias',
      'lang.label': 'Idioma',
      'consent.title': 'Cookies y preferencias',
      'consent.settingsTitle': 'Ajustes de cookies',
      'consent.text':
        'Esta página no usa ninguna cookie. Podemos recordar tu idioma en este navegador, pero solo lo haremos si lo aceptas. No hay publicidad, analítica ni terceros.',
      'consent.accept': 'Aceptar',
      'consent.reject': 'Rechazar',
      'consent.more': 'Más información',
      'consent.close': 'Cerrar',
      'footer.legal': 'Enlaces legales',
      'consent.current': 'Elección actual: {value}',
      'consent.accepted': 'preferencias aceptadas',
      'consent.rejected': 'preferencias rechazadas',
      'privacy.back': 'Atrás',
      'privacy.settings': 'Cambiar mis preferencias de cookies',
    },
    en: {
      'page.services': 'Services',
      'page.history': 'Incident history',
      'page.active': 'Active incidents',
      'page.loading': 'Loading status…',
      'page.loadError': 'Cannot get the status right now. It will be retried automatically.',
      'page.noComponents': 'No services are being monitored yet',
      'page.noIncidents': 'No incidents in the last 30 days.',
      'page.updated': 'Updated {time}',
      'page.legend': 'Availability over the last 90 days (days in UTC).',
      'page.legendUp': '≥ 99.5 %',
      'page.legendWarn': '≥ 95 %',
      'page.legendDown': '< 95 %',
      'page.legendNone': 'no data',
      'page.daysAgo': '{n} days ago',
      'page.today': 'today',
      'page.uptime': '{value} over 90 days',
      'page.players': '{online}/{max} players',
      'page.dayTitle': '{date} · {value}',
      'page.noData': 'no data',
      'overall.operational': 'All systems operational',
      'overall.degraded': 'Some services are slower than usual',
      'overall.partialOutage': 'Some services are unavailable',
      'overall.outage': 'General service outage',
      'status.operational': 'Operational',
      'status.degraded': 'Degraded',
      'status.outage': 'Unavailable',
      'inc.investigating': 'Investigating',
      'inc.identified': 'Identified',
      'inc.monitoring': 'Monitoring',
      'inc.resolved': 'Resolved',
      'impact.none': 'No impact',
      'impact.minor': 'Minor impact',
      'impact.major': 'Major impact',
      'impact.critical': 'Critical impact',
      'inc.auto': 'detected automatically',
      'group.Serveis': 'Services',
      'group.Servidors de joc': 'Game servers',
      'group.Dependències externes': 'External dependencies',
      'auto.outageTitle': '{name}: unavailable',
      'auto.degradedTitle': '{name}: slow or degraded',
      'auto.outageBody': 'Automatic monitoring has detected that {name} is not responding ({detail}).',
      'auto.degradedBody': 'Automatic monitoring has detected that {name} is responding slowly or partially ({detail}).',
      'auto.recovered': '{name} is responding normally again. Resolved automatically.',
      'auto.worse': 'The situation has got worse: {detail}.',
      'auto.better': 'The situation has improved, but it is still degraded: {detail}.',
      'footer.privacy': 'Privacy',
      'footer.cookies': 'Cookies and preferences',
      'lang.label': 'Language',
      'consent.title': 'Cookies and preferences',
      'consent.settingsTitle': 'Cookie settings',
      'consent.text':
        'This page does not use any cookies. We can remember your language in this browser, but only if you accept. There is no advertising, analytics or third parties.',
      'consent.accept': 'Accept',
      'consent.reject': 'Reject',
      'consent.more': 'More information',
      'consent.close': 'Close',
      'footer.legal': 'Legal links',
      'consent.current': 'Current choice: {value}',
      'consent.accepted': 'preferences accepted',
      'consent.rejected': 'preferences rejected',
      'privacy.back': 'Back',
      'privacy.settings': 'Change my cookie preferences',
    },
  }

  const isLang = (v) => LANGS.some((l) => l.code === v)

  function readConsent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null')
      return parsed && parsed.v === CONSENT_VERSION && typeof parsed.preferences === 'boolean' ? parsed : null
    } catch {
      return null
    }
  }

  function initialLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang')
    if (isLang(fromUrl)) return fromUrl
    try {
      const saved = localStorage.getItem(LANG_KEY)
      if (isLang(saved)) return saved
    } catch {
      /* sense accés a l'emmagatzematge */
    }
    for (const tag of navigator.languages ?? [navigator.language]) {
      const code = String(tag).toLowerCase().slice(0, 2)
      if (isLang(code)) return code
    }
    return 'ca'
  }

  let lang = initialLang()
  let consent = readConsent()
  const listeners = new Set()

  // Sense consentiment per a preferències, no es conserva cap idioma emmagatzemat.
  if (consent && !consent.preferences) {
    try {
      localStorage.removeItem(LANG_KEY)
    } catch {
      /* res a fer */
    }
  }

  function t(key, params) {
    const text = DICT[lang][key] ?? DICT.ca[key] ?? key
    return params ? text.replace(/\{(\w+)\}/g, (_, n) => String(params[n] ?? `{${n}}`)) : text
  }

  /** Tradueix els elements amb data-i18n / data-i18n-aria i actualitza l'idioma del document. */
  function applyDom(root = document) {
    document.documentElement.lang = lang
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n)
    for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria))
  }

  function setLang(next) {
    if (!isLang(next) || next === lang) return
    lang = next
    if (consent?.preferences) {
      try {
        localStorage.setItem(LANG_KEY, lang)
      } catch {
        /* res a fer */
      }
    }
    applyDom()
    renderSelector()
    renderBanner()
    for (const fn of listeners) fn(lang)
  }

  function choose(preferences) {
    consent = { preferences, at: new Date().toISOString(), v: CONSENT_VERSION }
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
      if (preferences) localStorage.setItem(LANG_KEY, lang)
      else localStorage.removeItem(LANG_KEY)
    } catch {
      /* res a fer */
    }
    bannerOpen = false
    renderBanner()
  }

  // --- Selector d'idioma (desplegable propi, accessible amb teclat) ------------------------------------

  let selectorOpen = false
  let selectorActive = 0

  function globeIcon() {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'dropdown-icon' })) {
      svg.setAttribute(k, v)
    }
    for (const d of ['M3 12h18', 'M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z']) {
      const path = document.createElementNS(ns, 'path')
      path.setAttribute('d', d)
      svg.append(path)
    }
    const circle = document.createElementNS(ns, 'circle')
    circle.setAttribute('cx', '12')
    circle.setAttribute('cy', '12')
    circle.setAttribute('r', '9')
    svg.prepend(circle)
    return svg
  }

  function renderSelector(refocus = false) {
    const host = document.getElementById('lang-select')
    if (!host) return

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = selectorOpen ? 'dropdown-trigger open' : 'dropdown-trigger'
    trigger.setAttribute('aria-haspopup', 'listbox')
    trigger.setAttribute('aria-expanded', String(selectorOpen))
    trigger.setAttribute('aria-label', t('lang.label'))
    const chevron = document.createElement('span')
    chevron.className = 'dropdown-chevron'
    chevron.setAttribute('aria-hidden', 'true')
    const label = document.createElement('span')
    label.textContent = LANGS.find((l) => l.code === lang).label
    trigger.append(globeIcon(), label, chevron)

    const openList = () => {
      selectorActive = Math.max(0, LANGS.findIndex((l) => l.code === lang))
      selectorOpen = true
      renderSelector(true)
    }
    const closeList = () => {
      selectorOpen = false
      renderSelector(true)
    }
    const pick = (index) => {
      selectorOpen = false
      const chosen = LANGS[index]
      if (chosen && chosen.code !== lang) setLang(chosen.code)
      else renderSelector(true)
    }

    trigger.addEventListener('click', () => (selectorOpen ? closeList() : openList()))
    trigger.addEventListener('keydown', (e) => {
      if (!selectorOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          openList()
        }
        return
      }
      const move = (i) => {
        selectorActive = Math.min(Math.max(i, 0), LANGS.length - 1)
        renderSelector(true)
      }
      if (e.key === 'ArrowDown') (e.preventDefault(), move(selectorActive + 1))
      else if (e.key === 'ArrowUp') (e.preventDefault(), move(selectorActive - 1))
      else if (e.key === 'Home') (e.preventDefault(), move(0))
      else if (e.key === 'End') (e.preventDefault(), move(LANGS.length - 1))
      else if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), pick(selectorActive))
      else if (e.key === 'Escape') (e.preventDefault(), closeList())
      else if (e.key === 'Tab') (selectorOpen = false, renderSelector())
    })

    const nodes = [trigger]
    if (selectorOpen) {
      const list = document.createElement('ul')
      list.className = 'dropdown-list'
      list.setAttribute('role', 'listbox')
      list.setAttribute('aria-label', t('lang.label'))
      LANGS.forEach((l, i) => {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.setAttribute('aria-selected', String(l.code === lang))
        li.className = [i === selectorActive ? 'active' : '', l.code === lang ? 'selected' : ''].join(' ').trim()
        const name = document.createElement('span')
        name.textContent = l.label
        li.append(name)
        if (l.code === lang) {
          const tick = document.createElement('span')
          tick.textContent = '✓'
          tick.setAttribute('aria-hidden', 'true')
          li.append(tick)
        }
        li.addEventListener('mousedown', (e) => {
          e.preventDefault()
          pick(i)
        })
        li.addEventListener('mouseenter', () => {
          selectorActive = i
          for (const [j, el] of [...list.children].entries()) el.classList.toggle('active', j === i)
        })
        list.append(li)
      })
      nodes.push(list)
    }
    host.replaceChildren(...nodes)
    if (refocus) trigger.focus()
  }

  // Un clic fora del desplegable el tanca.
  document.addEventListener('mousedown', (e) => {
    const host = document.getElementById('lang-select')
    if (selectorOpen && host && !host.contains(e.target)) {
      selectorOpen = false
      renderSelector()
    }
  })

  // --- Bàner de galetes -----------------------------------------------------------------------------

  let bannerOpen = consent === null

  function renderBanner() {
    let banner = document.getElementById('cookie-banner')
    let backdrop = document.getElementById('cookie-backdrop')
    if (!bannerOpen) {
      banner?.remove()
      backdrop?.remove()
      return
    }
    // Reobert des del peu de pàgina (canviar o retirar l'elecció): finestra centrada amb fons enfosquit i tancable.
    const reopened = consent !== null
    if (!banner) {
      banner = document.createElement('aside')
      banner.id = 'cookie-banner'
      banner.setAttribute('role', 'dialog')
      document.body.append(banner)
    }
    banner.className = reopened ? 'cookie-banner cookie-modal' : 'cookie-banner'
    banner.setAttribute('aria-modal', String(reopened))
    if (reopened && !backdrop) {
      backdrop = document.createElement('div')
      backdrop.id = 'cookie-backdrop'
      backdrop.className = 'cookie-backdrop'
      backdrop.addEventListener('click', closeConsent)
      document.body.append(backdrop)
    } else if (!reopened) {
      backdrop?.remove()
    }
    const h = (tag, props, ...kids) => {
      const el = document.createElement(tag)
      Object.assign(el, props)
      el.append(...kids)
      return el
    }
    const reject = h('button', { type: 'button', textContent: t('consent.reject') })
    reject.addEventListener('click', () => choose(false))
    const accept = h('button', { type: 'button', className: 'primary', textContent: t('consent.accept') })
    accept.addEventListener('click', () => choose(true))
    const more = h('a', { href: 'privacy.html', textContent: t('consent.more') })
    const close = reopened ? h('button', { type: 'button', className: 'ghost', textContent: t('consent.close') }) : ''
    if (reopened) close.addEventListener('click', closeConsent)

    banner.replaceChildren(
      h('h2', {}, reopened ? t('consent.settingsTitle') : t('consent.title')),
      h('p', {}, t('consent.text')),
      reopened ? h('p', { className: 'muted small' }, t('consent.current', { value: consent.preferences ? t('consent.accepted') : t('consent.rejected') })) : '',
      h('div', { className: 'cookie-actions' }, reject, accept, close, more),
    )
  }

  function closeConsent() {
    if (!consent) return // sense elecció prèvia no es pot tancar: cal triar
    bannerOpen = false
    renderBanner()
  }

  function openConsent() {
    bannerOpen = true
    renderBanner()
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bannerOpen) closeConsent()
  })

  window.HellI18n = {
    LANGS,
    get lang() {
      return lang
    },
    get locale() {
      return LANGS.find((l) => l.code === lang).locale
    },
    t,
    setLang,
    applyDom,
    openConsent,
    /** Registra una funció que s'executa en canviar d'idioma. */
    onChange: (fn) => listeners.add(fn),
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyDom()
    renderSelector()
    renderBanner()
    for (const el of document.querySelectorAll('[data-open-consent]')) {
      el.addEventListener('click', (e) => {
        e.preventDefault()
        openConsent()
      })
    }
  })
})()
