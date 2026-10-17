# Demian OS

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/k94r9qrz96-ops/demian-os)

Oficina virtual de agentes para dirigir **Elite Hunters HR**, **Rushy AI** y **Yazak Media** desde el celular.
Le das una instrucción al director, él identifica empresa y cliente, reparte tareas entre 36 roles, ejecuta lo permitido,
y te muestra entregables y las acciones que necesitan tu aprobación. Nada externo (WhatsApp, email, Calendar, publicaciones)
se ejecuta sin tu aprobación o una regla tuya, y nada se declara "enviado" sin la confirmación del servicio.

## Qué hay adentro

| Pieza | Implementación |
|---|---|
| Backend | Node 22 + Fastify, un solo proceso (API + worker + programador) |
| Base de datos | SQLite (WAL) persistente — esquema en `server/migrations/001_init.sql` |
| Cola | Durable en SQLite: deduplicación, leases que se recuperan tras reinicios, reintentos con backoff, tiempo máximo, cancelación, límites de concurrencia, pausa general |
| Tiempo real | Registro de eventos + SSE. La oficina anima solo lo que llega del backend |
| Auth | Sesión con cookie HttpOnly, scrypt, límite de intentos, anti-CSRF, roles dueño/admin/lectura y alcance por empresa |
| Archivos | Disco del servidor (`DATA_DIR/files`), con huella SHA-256 |
| IA | API de Claude con herramientas y búsqueda web; rutinas deterministas para lo que no necesita modelo |
| Video | ffmpeg: reels MP4 1080×1920 con Ken Burns, transiciones, textos animados y audio autorizado; control de calidad automático |
| Frontend | React + Vite, PWA instalable, oficina isométrica SVG con zoom, pellizco, filtros y búsqueda; vista lista/tablero para el celular |

```
WhatsApp ─► API oficial de Meta ─► Chatwoot ─► /webhooks/chatwoot (HMAC + dedupe)
                                                   │
                                     cola durable ─┤─► director / agentes ─► Claude + herramientas
                                                   │                          │
                       oficina (SSE) ◄─ eventos ◄──┘     aprobaciones ◄───────┘
                                                              │ (vos, desde el celular o “APROBAR código” por WhatsApp)
                                                              ▼
                                  Chatwoot / Gmail / Calendar  ──► confirmación con id externo verificable
```

## Arranque rápido

```bash
npm install && (cd web && npm install && npm run build)
npm run demo            # base de demostración separada: demo@demian-os.local / demo-demian-os
npm test                # 30 pruebas
```

Producción en Render en ~10 minutos desde el celular: ver `docs/DESPLIEGUE.md` (`render.yaml` incluido). Operación desde el teléfono: `docs/TELEFONO.md`.

## Documentos

- `docs/TELEFONO.md` — guía breve para operar desde el celular
- `docs/DESPLIEGUE.md` — despliegue reproducible (Docker o Node)
- `docs/WHATSAPP.md` — circuito, coexistencia con tu número actual, reglas de Meta
- `docs/COSTOS.md` — costos fijos y variables con fuentes y supuestos
- `docs/PRUEBAS.md` — evidencias de pruebas (simuladas vs reales) y bloqueos reales

## Estructura

```
server/
  index.js, app.js, worker.js, config.js, db.js, demo.js
  migrations/           esquema SQL
  lib/                  cola, eventos, auth, gasto, utilidades (cifrado, ajustes, auditoría)
  agents/               roster (36 roles), director, runner, herramientas, aprobaciones, rutinas
  channels/             manejador del webhook de Chatwoot (dirección vs externo)
  integrations/         Chatwoot, Google, Metricool, registro de estados
  content/reel.js       render y QA de video
  routes/api.js         API REST
web/src/                interfaz (Office.jsx = oficina isométrica)
tests/                  pruebas automáticas + Chatwoot/Claude simulados
```
