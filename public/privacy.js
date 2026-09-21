// Política de privacitat i de galetes de la pàgina d'estat pública (català, castellà, anglès).
// És una plantilla honesta del que fa aquest programari; l'ha de revisar i completar el responsable del
// tractament (PRIVACY_* al servidor) abans de fer-lo servir en producció.

const UPDATED = '2026-09-22'
const I = window.HellI18n

const DOCS = {
  ca: {
    title: 'Política de privacitat i galetes',
    updated: 'Darrera actualització: {date}',
    contact: 'Contacte',
    missing: '(sense configurar: cal definir PRIVACY_CONTROLLER_NAME i PRIVACY_CONTACT_EMAIL al servidor)',
    sections: [
      {
        title: '1. Qui és el responsable',
        p: ["El responsable del tractament de les dades d'aquesta pàgina és qui figura a l'apartat «Contacte»."],
      },
      {
        title: '2. Quines dades tractem',
        p: [
          "Aquesta pàgina és pública i no té comptes d'usuari ni formularis: no ens demana dades personals i no fa servir galetes.",
          "Quan la visites, el servidor web (Apache) i Cloudflare poden registrar la teva adreça IP i la pàgina sol·licitada als seus registres d'accés. L'aplicació només conserva la teva IP a la memòria durant un minut per limitar el nombre de peticions, i no la desa.",
        ],
      },
      {
        title: '3. Per a què i amb quina base legal',
        l: [
          'Mostrar-te l’estat dels serveis i mantenir-ne la seguretat i la disponibilitat (interès legítim, art. 6.1.f RGPD).',
          'Recordar el teu idioma en aquest navegador, només si ho acceptes (consentiment, art. 6.1.a RGPD).',
        ],
      },
      {
        title: '4. Galetes i emmagatzematge local',
        p: ["No fem servir cap galeta. Fem servir l'emmagatzematge local del navegador per a dues coses:"],
        table: {
          head: ['Nom', 'Tipus', 'Finalitat', 'Durada'],
          rows: [
            ['hellmc.consent', 'Emmagatzematge local (necessari)', 'Recordar la teva elecció sobre preferències.', "Fins que l'esborris"],
            ['hellmc.lang', 'Emmagatzematge local (preferències)', "Recordar l'idioma. Només si ho acceptes.", "Fins que l'esborris o ho rebutgis"],
          ],
        },
      },
      {
        title: '5. Destinataris',
        l: [
          "Proveïdor d'allotjament del servidor.",
          'Cloudflare (proxy i CDN), que pot processar adreces IP i trànsit i pot implicar transferències fora de l’Espai Econòmic Europeu amb les garanties adequades.',
        ],
      },
      {
        title: '6. Quant de temps les conservem',
        p: ["Els registres d'accés del servidor web es conserven el termini que tingui configurat l'administrador (normalment unes setmanes)."],
      },
      {
        title: '7. Els teus drets',
        p: [
          "Pots exercir els drets d'accés, rectificació, supressió, limitació, portabilitat i oposició escrivint al correu de contacte.",
          "Si creus que no hem tractat bé les teves dades, pots reclamar davant l'autoritat de protecció de dades del teu país (a Espanya, l'AEPD: www.aepd.es).",
        ],
      },
      {
        title: '8. Canvis en aquesta política',
        p: ["Si canvia el que fem amb les teves dades, actualitzarem aquesta pàgina i la data d'actualització."],
      },
    ],
  },
  es: {
    title: 'Política de privacidad y cookies',
    updated: 'Última actualización: {date}',
    contact: 'Contacto',
    missing: '(sin configurar: hay que definir PRIVACY_CONTROLLER_NAME y PRIVACY_CONTACT_EMAIL en el servidor)',
    sections: [
      {
        title: '1. Quién es el responsable',
        p: ['El responsable del tratamiento de los datos de esta página es quien figura en el apartado «Contacto».'],
      },
      {
        title: '2. Qué datos tratamos',
        p: [
          'Esta página es pública y no tiene cuentas de usuario ni formularios: no nos pide datos personales y no usa cookies.',
          'Cuando la visitas, el servidor web (Apache) y Cloudflare pueden registrar tu dirección IP y la página solicitada en sus registros de acceso. La aplicación solo conserva tu IP en memoria durante un minuto para limitar el número de peticiones, y no la guarda.',
        ],
      },
      {
        title: '3. Para qué y con qué base legal',
        l: [
          'Mostrarte el estado de los servicios y mantener su seguridad y disponibilidad (interés legítimo, art. 6.1.f RGPD).',
          'Recordar tu idioma en este navegador, solo si lo aceptas (consentimiento, art. 6.1.a RGPD).',
        ],
      },
      {
        title: '4. Cookies y almacenamiento local',
        p: ['No usamos ninguna cookie. Usamos el almacenamiento local del navegador para dos cosas:'],
        table: {
          head: ['Nombre', 'Tipo', 'Finalidad', 'Duración'],
          rows: [
            ['hellmc.consent', 'Almacenamiento local (necesario)', 'Recordar tu elección sobre preferencias.', 'Hasta que lo borres'],
            ['hellmc.lang', 'Almacenamiento local (preferencias)', 'Recordar el idioma. Solo si lo aceptas.', 'Hasta que lo borres o lo rechaces'],
          ],
        },
      },
      {
        title: '5. Destinatarios',
        l: [
          'Proveedor de alojamiento del servidor.',
          'Cloudflare (proxy y CDN), que puede procesar direcciones IP y tráfico y puede implicar transferencias fuera del Espacio Económico Europeo con las garantías adecuadas.',
        ],
      },
      {
        title: '6. Cuánto tiempo los conservamos',
        p: ['Los registros de acceso del servidor web se conservan el plazo que tenga configurado el administrador (normalmente unas semanas).'],
      },
      {
        title: '7. Tus derechos',
        p: [
          'Puedes ejercer los derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición escribiendo al correo de contacto.',
          'Si crees que no hemos tratado bien tus datos, puedes reclamar ante la autoridad de protección de datos de tu país (en España, la AEPD: www.aepd.es).',
        ],
      },
      {
        title: '8. Cambios en esta política',
        p: ['Si cambia lo que hacemos con tus datos, actualizaremos esta página y la fecha de actualización.'],
      },
    ],
  },
  en: {
    title: 'Privacy and cookie policy',
    updated: 'Last updated: {date}',
    contact: 'Contact',
    missing: '(not configured: PRIVACY_CONTROLLER_NAME and PRIVACY_CONTACT_EMAIL must be set on the server)',
    sections: [
      {
        title: '1. Who is responsible',
        p: ['The controller of the data processed on this page is the party listed under “Contact”.'],
      },
      {
        title: '2. What data we process',
        p: [
          'This page is public and has no user accounts or forms: it does not ask for personal data and does not use cookies.',
          'When you visit it, the web server (Apache) and Cloudflare may record your IP address and the requested page in their access logs. The application only keeps your IP in memory for one minute to limit the number of requests, and does not store it.',
        ],
      },
      {
        title: '3. Purposes and legal basis',
        l: [
          'Showing you the status of the services and keeping them secure and available (legitimate interest, Art. 6(1)(f) GDPR).',
          'Remembering your language in this browser, only if you accept (consent, Art. 6(1)(a) GDPR).',
        ],
      },
      {
        title: '4. Cookies and local storage',
        p: ['We do not use any cookies. We use the browser’s local storage for two things:'],
        table: {
          head: ['Name', 'Type', 'Purpose', 'Duration'],
          rows: [
            ['hellmc.consent', 'Local storage (necessary)', 'Remember your choice about preferences.', 'Until you delete it'],
            ['hellmc.lang', 'Local storage (preferences)', 'Remember the language. Only if you accept.', 'Until you delete it or reject'],
          ],
        },
      },
      {
        title: '5. Recipients',
        l: [
          'The hosting provider of the server.',
          'Cloudflare (proxy and CDN), which may process IP addresses and traffic; this may involve transfers outside the European Economic Area with appropriate safeguards.',
        ],
      },
      {
        title: '6. How long we keep it',
        p: ['Web server access logs are kept for the period set by the administrator (usually a few weeks).'],
      },
      {
        title: '7. Your rights',
        p: [
          'You can exercise your rights of access, rectification, erasure, restriction, portability and objection by writing to the contact email.',
          'If you believe we have not handled your data properly, you can lodge a complaint with the data protection authority of your country (in Spain, the AEPD: www.aepd.es).',
        ],
      },
      {
        title: '8. Changes to this policy',
        p: ['If what we do with your data changes, we will update this page and the update date.'],
      },
    ],
  },
}

let controller = null

function h(tag, props, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props ?? {})) if (v !== undefined && v !== null) el.setAttribute(k, String(v))
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)))
  return el
}

function render() {
  const doc = DOCS[I.lang]
  document.title = doc.title
  const date = new Date(UPDATED).toLocaleDateString(I.locale, { dateStyle: 'long' })

  const sections = doc.sections.map((s) =>
    h(
      'section',
      { class: 'legal-section' },
      h('h2', {}, s.title),
      (s.p ?? []).map((p) => h('p', {}, p)),
      s.l ? h('ul', {}, s.l.map((item) => h('li', {}, item))) : null,
      s.table
        ? h(
            'div',
            { class: 'table-scroll' },
            h(
              'table',
              { class: 'legal-table' },
              h('thead', {}, h('tr', {}, s.table.head.map((c) => h('th', {}, c)))),
              h('tbody', {}, s.table.rows.map((row) => h('tr', {}, row.map((c, i) => h('td', { class: i === 0 ? 'mono' : '' }, c))))),
            ),
          )
        : null,
    ),
  )

  const configured = controller?.controllerName && controller?.contactEmail
  const contact = h(
    'section',
    { class: 'legal-section' },
    h('h2', {}, doc.contact),
    controller === null
      ? h('p', {}, '…')
      : configured
        ? h(
            'p',
            {},
            h('strong', {}, controller.controllerName),
            controller.controllerAddress ? ` — ${controller.controllerAddress}` : '',
            h('br'),
            h('a', { href: `mailto:${controller.contactEmail}` }, controller.contactEmail),
          )
        : h('p', { class: 'error' }, doc.missing),
  )

  document.getElementById('legal').replaceChildren(h('h1', {}, doc.title), h('p', { class: 'muted' }, doc.updated.replace('{date}', date)), ...sections, contact)
}

I.onChange(render)
render()
fetch('api/config')
  .then((r) => r.json())
  .then((cfg) => {
    controller = cfg
    render()
  })
  .catch(() => {
    controller = { controllerName: null, contactEmail: null, controllerAddress: null }
    render()
  })
