# Despliegue reproducible

Requisitos: un servidor con HTTPS y disco persistente (los webhooks de Chatwoot y el OAuth de Google necesitan una URL pública).
Todo corre en un solo contenedor: API, worker en segundo plano, programador y frontend. No depende de que tu navegador o una conversación de Claude estén abiertos.

## Opción rápida — Render, todo desde el celular (~10 minutos)

1. Subí este código a un repositorio de GitHub (privado). Si me pasás el nombre de un repositorio vacío, lo subo yo.
2. En render.com → **New → Blueprint** → elegí el repositorio. Render lee `render.yaml` y crea el servicio con disco persistente.
3. Completá 2 campos: `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 10 caracteres). `ANTHROPIC_API_KEY` es opcional ahí.
4. Esperá el primer deploy y abrí la URL `https://demian-os-XXXX.onrender.com`. Entrás con ese email y contraseña.
5. En la app: **Integraciones → Credenciales** cargás Claude, Chatwoot, Google y Metricool (se guardan cifradas). **Ajustes → Tu contraseña** para cambiarla.

No hace falta generar secretos a mano: la URL pública se detecta sola y las claves internas se generan y guardan en el disco del servidor.
Costo de Render: plan Starter + disco (el disco persistente exige plan pago; revisá el precio vigente en render.com/pricing).

Railway también sirve: New Project → Deploy from GitHub repo (usa `railway.json` y el `Dockerfile`), agregá un **Volume** montado en `/data` y las mismas dos variables.

Si no cargás `ADMIN_EMAIL`/`ADMIN_PASSWORD`, la primera pantalla pide un **código de instalación** que aparece en los logs del servicio.

## Opción gratis para probar — Render Free (sin tarjeta)

New → Web Service → elegí `demian-os` → Language **Docker** → Instance Type **Free** → variables `ADMIN_EMAIL` y `ADMIN_PASSWORD` → Deploy.
Limitaciones: sin disco (los datos se borran cuando el servicio se duerme tras 15 minutos sin uso), 512 MB de memoria
(los reels se renderizan en modo de poca memoria, más lento) y la primera visita después de dormir tarda alrededor de un minuto.
La app muestra una franja de "Modo prueba" mientras no haya disco. Para operar en serio, pasá al plan con disco.

## Opción A — Docker (recomendada)

```bash
cp .env.example .env          # completá secretos (ver abajo)
docker compose up -d --build
docker compose logs -f
```

Los datos quedan en el volumen `demian-data` (`/data`: base SQLite + archivos + videos). Respaldo:

```bash
docker run --rm -v demian-os_demian-data:/data -v $PWD:/b alpine tar czf /b/backup-$(date +%F).tgz /data
```

> El `Dockerfile` está escrito pero **no pude construirlo en este entorno** (no hay daemon de Docker). Es estándar (node:22-bookworm-slim + ffmpeg); si falla algo al construir, es un ajuste menor.

## Opción B — Node directo (VPS)

```bash
sudo apt install -y ffmpeg
npm ci && (cd web && npm ci && npm run build)
cp .env.example .env && nano .env
npm run create-admin          # pide la contraseña por consola
npm start                     # usar systemd o pm2 para que reinicie solo
```

Poné un proxy HTTPS adelante (Caddy: `tu-dominio.com { reverse_proxy localhost:8787 }`).
Importante para SSE: desactivar buffering (Caddy lo hace bien por defecto; en nginx `proxy_buffering off`).

## Secretos (nunca en el frontend ni en git)

| Variable | Dónde se obtiene | Qué habilita |
|---|---|---|
| `SESSION_SECRET`, `APP_ENCRYPTION_KEY` | Opcionales: si faltan se generan solos y se guardan en `/data/secrets.json` | Sesiones y cifrado de credenciales |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (requiere saldo prepago o facturación API; la suscripción de claude.ai no sirve) | Director para pedidos libres, redacción, análisis, búsqueda web |
| `CHATWOOT_*` | Chatwoot → Perfil (token de usuario) y Ajustes → Bots (token y secreto del bot) | Circuito WhatsApp |
| `GOOGLE_CLIENT_ID/SECRET` | console.cloud.google.com → APIs: Gmail, Calendar, Drive → Credenciales → OAuth Web, redirect `https://tu-dominio/oauth/google/callback` | Emails, eventos, importar fotos de Drive |
| `METRICOOL_API_TOKEN/USER_ID` | Metricool → Ajustes de cuenta → API (plan Advanced/Custom) | Lectura; programación solo tras verificar endpoint |

Todas las credenciales de integraciones también se pueden cargar desde la app (Integraciones → Credenciales), cifradas en la base. Si una variable existe en el servidor, tiene prioridad.

## Configurar Chatwoot

1. Inbox **WhatsApp (Cloud API)** conectado a un número (ver `docs/WHATSAPP.md` antes de usar tu número actual).
2. Ajustes → Bots → **Agregar bot** con URL `https://tu-dominio/webhooks/chatwoot/<CHATWOOT_URL_TOKEN>`; copiá el secreto a `CHATWOOT_WEBHOOK_SECRET`. Conectalo al inbox (las conversaciones nuevas entran en "pendiente" para el bot).
3. Ajustes → Integraciones → **Webhooks**: misma URL, eventos `message_created`, `message_updated`, `conversation_updated`, `conversation_status_changed` (para detectar cuando vos tomás una conversación). Los duplicados entre bot y webhook se descartan solos.
4. `CHATWOOT_INBOX_COMPANY_MAP=id_inbox:elite-hunters,...` para que cada inbox quede en su empresa.

## Verificación después de desplegar

1. `GET /healthz` → `{"ok":true}`.
2. Entrá, Integraciones → Probar cada una.
3. Mandá un WhatsApp de prueba desde un número tuyo (no de un cliente) y mirá Conversaciones.
4. Ajustes → verificá tu número de dirección y escribí `estado`.
