# Flujo completo por cliente

## Onboarding
1. `cp -r studio/clients/_plantilla studio/clients/<slug>` (slug: minúsculas, números y guiones). Nunca reutilices la carpeta de otro cliente.
2. Completá `brand.json` con lo que dé el cliente. Lo que no se sepa queda vacío o con `"POR CONFIRMAR"`; no lo inventes.
3. `getBrandSettings` (Metricool) → buscá la marca del cliente, anotá `metricool.brandId`, redes conectadas y `timezone`. Si la marca no existe en Metricool, dejalo en `null` y avisá: sin brandId no hay análisis ni borradores.
4. Pedí al cliente fotos/videos y registralos en `assets/AUTORIZACIONES.md` (quién autorizó, fecha, uso).
5. Tipografía y colores: fuentes con licencia en `marca/fuentes/` (Google Fonts = OFL, se puede). Logo en `marca/logo.png` (fondo transparente).

## 1. Análisis del negocio → `analisis/AAAA-MM-DD-negocio.md`
- Qué vende, a quién, diferencial, objeciones, estacionalidad.
- Competencia: Metricool permite competidores en Instagram/Facebook/YouTube/X/Twitch/Bluesky (`getAnalyticsAvailableMetrics` con connector `competitors`). Si no hay competidores cargados, analizá perfiles públicos que indique el usuario, sin inventar números.

## 2. Rendimiento real → `analisis/AAAA-MM-DD-metricas.md`
Ver `metricool.md`. Mínimo: últimos 30–90 días de reels/posts. Top 5 y bottom 5 por retención, compartidos y guardados; mejores horarios (`getBestTimeToPostByNetwork`). Cada número con período y fuente.

## 3. Ideas
De los patrones del top 5 + dolores/deseos de `brand.json` + calendario (fechas comerciales). 10–15 ideas, cada una con: ángulo, gancho, por qué debería funcionar (citando el dato que lo respalda o "hipótesis sin datos").

## 4–8. Producción
Guiones → `guiones.md`. Video → `motion.md`. Copy/portada/hashtags → `guiones.md#copy`.

## 10–11. Borradores y aprobación
Ver `metricool.md`. Estado de cada pieza en `publicaciones/<id>.json`: `idea → guion_aprobado → video_borrador → aprobado → borrador_metricool → programado → publicado → medido`.

## <a id="ciclo"></a>12. Ciclo de mejora (semanal)
1. 7 días después de publicar: traé métricas de cada pieza (reach, views, retention, reelsSkipRate, saved, shares, comments).
2. Compará contra la mediana de los 30 días anteriores del mismo cliente (no contra otros clientes).
3. Anotá en `analisis/AAAA-Www-resultados.md`: qué gancho/formato ganó, qué se descarta, 3 hipótesis para la semana siguiente.
4. Los guiones de la semana siguiente citan explícitamente qué aprendizaje aplican.
