# HellMC Estat

Pàgina d'estat **pública i autònoma** de HellMC: monitoratge automàtic, historial de 90 dies i incidències.
Està pensada per córrer a **una altra màquina** que el panell d'administració: així, si el panell o el servidor
principal cauen, la pàgina d'estat continua funcionant i ho pot dir.

- **Monitoratge automàtic:** comprova cada servei cada 30-60 s (HTTP amb aserció sobre el JSON, TCP i *Server List Ping*
  de Minecraft amb jugadors, versió i latència). Un error puntual no canvia l'estat: calen diverses comprovacions
  seguides (llindars configurables). En caure un servei s'obre **sola** una incidència, i es resol sola en recuperar-se.
- **Historial:** disponibilitat diària dels darrers 90 dies per servei, agregada per hores.
- **Incidències:** cronologia d'actualitzacions (investigant → identificat → monitoratge → resolt). Les publica un
  administrador des del panell (pestanya *Incidències*); el panell parla amb aquest servei per API.
- **Servidors de joc:** els envia el panell automàticament; en crear o arxivar un servidor, apareix o desapareix
  de la pàgina sol.
- **Sense base de dades:** l'històric viu a `DATA_DIR/status.json` (escriptura atòmica). Només cal Node 22+.

## Instal·lació

```bash
git clone <url-d-aquest-repo> ~/status
cd ~/status
npm ci
npm run build

cp .env.example .env
cp components.example.json components.json
nano .env                # API_TOKEN (openssl rand -hex 32), TRUST_PROXY_HOPS, títol...
nano components.json     # els teus serveis; ajusta les URLs
```

`API_TOKEN` és el secret compartit amb el panell: el **mateix valor** ha d'anar al `backend/.env` del panell com a
`STATUS_API_TOKEN` (i la URL d'aquest servei com a `STATUS_URL`).

### Arrencar amb pm2

```bash
npm i -g pm2            # o: sudo npm i -g pm2
pm2 start npm --name hellmc-status -- start
pm2 save && pm2 startup   # executa la comanda que imprimeix
```

Escolta a `127.0.0.1:4100` (`PORT`/`HOST`). Posa-hi al davant Apache o Nginx amb HTTPS.

### Apache (reverse proxy)

```apache
<VirtualHost *:443>
    ServerName estat.exemple.com
    # SSLEngine on ... (certificats)

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPass        / http://127.0.0.1:4100/
    ProxyPassReverse / http://127.0.0.1:4100/
</VirtualHost>
```

Amb `a2enmod proxy proxy_http headers`. Si va darrere Cloudflare + Apache, posa `TRUST_PROXY_HOPS=2`.
`/api/admin/*` requereix el token; si vols, limita-hi l'accés per IP (només la del panell) a Apache.

## Components (`components.json`)

Cada component és un objecte amb `id` (minúscules, números i guions), `name`, `group` opcional i un `kind`:

| kind | Camps | Comprova |
|---|---|---|
| `http` | `url`, `method?`, `expectStatus?`, `assertions?` | Codi HTTP (per defecte 2xx) i, opcionalment, el JSON (`path`, `equals`, `type`, `minLength`) |
| `tcp` | `host`, `port` | Que el port accepti connexions |
| `minecraft` | `host`, `port?` | *Server List Ping* (respecta el registre SRV si no hi ha port) |

Camps comuns opcionals: `description`, `intervalSeconds` (mín. 10), `timeoutMs`, `slowMs` (latència a partir de la qual
es considera «degradat»). Veure `components.example.json`.

## Estat i incidències automàtiques

| Estat | Quan |
|---|---|
| **Operatiu** | Respon bé i dins del llindar de latència |
| **Degradat** | `DEGRADED_THRESHOLD` comprovacions seguides lentes (> `slowMs`) |
| **No disponible** | `FAIL_THRESHOLD` comprovacions seguides fallides |

Per tornar a operatiu calen `RECOVER_THRESHOLD` comprovacions bones seguides. L'estat mostrat és el **pitjor** entre el
detectat i l'impacte de les incidències obertes que afecten el component (una incidència manual amb impacte *important*
marca el servei com a no disponible encara que respongui).

## API

Pública (sense autenticació, amb límit per IP): `GET /api/status`, `GET /api/incidents?days=30`, `GET /api/config`,
`GET /healthz`.

Administració (`Authorization: Bearer <API_TOKEN>`): `GET /api/admin/summary`, `POST /api/admin/incidents`,
`POST /api/admin/incidents/:id/updates`, `PATCH|DELETE /api/admin/incidents/:id`, `PUT /api/admin/managed-components`,
`POST /api/admin/components/:id/check`.

## Còpia de seguretat i actualització

- Copia la carpeta `data/` (o només `data/status.json`) per conservar l'historial.
- Actualitzar: `git pull && npm ci && npm run build && pm2 restart hellmc-status`.
