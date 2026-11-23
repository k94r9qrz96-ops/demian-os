# Metricool (MCP oficial, conector "Metricool Social Media Management")

Verificado funcionando el 2026-11-23. Herramientas `mcp__Metricool_Social_Media_Management__*`.

## Lectura (seguras, sin efectos)
| Herramienta | Uso |
|---|---|
| `getBrandSettings` | Lista de marcas: `id` (= brandId/blogId), redes conectadas, `timezone`. Primer paso siempre. |
| `getAnalyticsAvailableMetrics` | Métricas por red y conector (p. ej. instagram + reels → IGRE01…IGRE30). Revisá deprecadas. |
| `getAnalyticsDataByMetrics` | Datos por brandId, rango y lista de fieldIds. |
| `getBestTimeToPostByNetwork` | Mejores horarios (máx. 1 semana por consulta). |
| `getScheduledPosts` | Publicaciones pendientes (no publicadas) en un rango. |

Métricas clave de reels IG: IGRE11 reach, IGRE23 views, IGRE27 retention, IGRE28 reelsViewRate, IGRE30 reelsSkipRate, IGRE12 saved, IGRE21 shares, IGRE07 comments, IGRE24 averageWatchTime. No uses IGRE13/IGRE15 (deprecadas). Para TikTok, el conector de videos es `posts`.

## Escritura (requiere aprobación)
| Herramienta | Cuándo |
|---|---|
| `createScheduledPost` con `"draft": true` en `info` | **Puerta D**: crear borrador. No se publica. |
| `updateScheduledPost` | Editar un borrador/pendiente (mantener todos los campos de `getScheduledPosts`). |
| `createScheduledPostForReview` / `sendScheduledPostForReview` | Flujo de aprobación de Metricool. Requiere plan con gestión de equipo y **envía emails** a revisores → pedir OK. |
| `createScheduledPost` sin draft | **Puerta E**: solo con aprobación explícita de pieza, red, fecha y hora. |

### Plantilla de `info` para un reel (borrador)
```json
{
  "draft": true,
  "autoPublish": false,
  "text": "<copy + hashtags>",
  "media": ["<URL pública o de Google Drive del MP4>"],
  "videoCoverMilliseconds": 1200,
  "providers": [{"network": "instagram"}],
  "publicationDate": {"dateTime": "AAAA-MM-DDTHH:mm:ss", "timezone": "<timezone de getBrandSettings>"},
  "instagramData": {"type": "REEL", "showReelOnFeed": true, "isAiGenerated": false},
  "firstCommentText": "",
  "shortener": false,
  "smartLinkData": {"ids": []},
  "hasNotReadNotes": false,
  "descendants": []
}
```
- `isAiGenerated` / `isAigc` (TikTok) = true si hubo IA generativa significativa (imagen/video IA). Motion graphics hechos por código no cuentan como IA generativa.
- La fecha no puede estar en el pasado.
- Facebook Reel: `facebookData: {"type": "REEL"}`. TikTok: `tiktokData` con `privacyOption`.
- Antes de crear: verificá que la red esté conectada en esa marca (`getBrandSettings.networksData`).

## Aislamiento
Siempre `brandId` desde `brand.json` del cliente activo y cruzado con `getBrandSettings` (nombre/handle). Si no coincide, frená.
