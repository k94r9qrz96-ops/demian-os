# Costos

Precios consultados el 17/10/2026. Lo que dice "estimado" es un cálculo mío con los supuestos indicados, no una cotización.

## Fijos (mensuales)

| Concepto | Costo | Fuente / supuesto |
|---|---|---|
| Servidor (VPS 2 vCPU / 4 GB + disco) | ~US$ 6–15 **estimado** | Supuesto de mercado, no verificado; el render de video es lo que más CPU usa |
| Chatwoot Cloud | US$ 19 (Startups) o US$ 39 (Business) **por agente/mes**; Hacker gratis (2 agentes, solo live chat) | chatwoot.com/pricing |
| Chatwoot autoalojado | US$ 0 de licencia (Community) + el servidor | Alternativa: más mantenimiento |
| Metricool con API | Requiere plan Advanced o Custom | help.metricool.com (precio del plan: consultalo en tu cuenta) |
| Dominio + HTTPS | ~US$ 10–15/año **estimado**; HTTPS gratis con Caddy/Let's Encrypt | Supuesto |

## Variables

| Concepto | Precio | Fuente |
|---|---|---|
| Claude Sonnet 5.5 (director y agentes) | US$ 2 / millón de tokens de entrada · US$ 10 / millón de salida | platform.claude.com/docs/en/about-claude/pricing |
| Claude Haiku 5.5 (atención WhatsApp, pruebas) | US$ 0,10 entrada · US$ 0,50 salida (prompts ≤ 100K) | ídem |
| Búsqueda web de Claude | US$ 10 por 1.000 búsquedas + tokens del contenido | ídem |
| WhatsApp (API) | Por mensaje entregado según categoría y país. **Desde 1/10/2026 también los de servicio** (a la tarifa de utilidad del mercado). La tarifa de Argentina está en el rate card de Meta (CSV/PDF), no la transcribo para no inventar | developers.facebook.com/documentation/business-messaging/whatsapp/pricing |
| Render de video | US$ 0 (ffmpeg local) | — |

## Estimaciones por tarea (con Sonnet 5.5)

Supuesto: ~3 turnos por agente, ~8.000 tokens de entrada y ~1.500 de salida por turno → ~US$ 0,03 por turno.

| Pedido | Estimado |
|---|---|
| Semana de contenido (6 agentes + reel) | ~US$ 0,40–0,70 |
| Prospectos con evidencia (búsqueda web + 3 agentes) | ~US$ 0,50–1,20 |
| Seguimientos pendientes (1 llamada con borradores) | ~US$ 0,02–0,05 |
| Entrevistas / prioridades / reel rápido / QA | US$ 0 (rutinas sin modelo) |
| Respuesta automática a un cliente (Haiku) | ~US$ 0,0005 de Claude **+ el costo del mensaje de WhatsApp** |

Cada tarea registra su costo real (tokens × precio) y hay límites configurables: por tarea (US$ 1,5), diario (US$ 10) y mensual (US$ 120) por defecto, con alerta al 80% y pausa automática al superar el diario o el mensual.
