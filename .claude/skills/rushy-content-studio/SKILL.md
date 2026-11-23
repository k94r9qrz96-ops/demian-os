---
name: rushy-content-studio
description: Fábrica de contenido de Rushy AI. Usala para cualquier trabajo de contenido para un cliente de la agencia (o para Rushy AI misma) — onboarding de un cliente nuevo, análisis de su negocio o de sus métricas en Metricool, ideas y guiones semanales (7 por semana), storyboards, reels verticales 15–30 s con motion graphics (Remotion) exportados en MP4 1080×1920, portadas, copys y hashtags, borradores en Metricool, y el informe de resultados para mejorar la semana siguiente. También cuando el usuario diga "reel", "guion", "storyboard", "semana de contenido", "programar", "borrador en Metricool", "métricas de <cliente>" o nombre a un cliente que esté en studio/clients/.
---

# Rushy Content Studio

Sistema de producción de contenido por cliente. Código en `studio/`, un directorio por cliente en `studio/clients/<slug>/`.

## Reglas que nunca se rompen

1. **Aprobación humana antes de cualquier cosa pública.** No se programa ni se publica nada sin un "aprobado" explícito del fundador para ESA pieza. Nunca uses `createScheduledPost` sin `"draft": true` salvo que el usuario haya aprobado esa publicación puntual con fecha y red.
2. **Un cliente a la vez.** Antes de leer, escribir, renderizar o llamar a Metricool, confirmá el `slug` y que `brand.json.metricool.brandId` coincide con la marca que devuelve `getBrandSettings`. Nunca mezcles assets, guiones ni brandIds entre carpetas. `render.mjs` ya bloquea rutas fuera de la carpeta del cliente: no lo esquives.
3. **Nada inventado.** Ni estadísticas, ni testimonios, ni clientes, ni resultados, ni precios. Las métricas salen de Metricool (o de datos que entregue el cliente) y se citan con período y fuente. Si un dato no existe, se dice "sin datos".
4. **Material autorizado.** Solo se usan fotos/videos listados en `assets/AUTORIZACIONES.md`. IA generativa (imagen/video) solo si `brand.json.ia.permitida` lo habilita para ese uso. Si implica Higgsfield o Canva IA: avisá que consume créditos, mostrá el costo (`estimate_*_cost` / `balance`) y pedí OK antes.
5. **Sin gastos sin permiso.** No compres, no actives planes, no uses créditos pagos sin autorización explícita.
6. **No borrar ni pisar** archivos de clientes existentes. Versioná: `reels/<id>-v2.json`, no sobrescribas un guion aprobado.

## Estructura de un cliente

```
studio/clients/<slug>/
  brand.json              perfil de marca (copiar de _plantilla/brand.json)
  marca/fuentes|logo      tipografías y logo (con licencia)
  assets/                 fotos y videos AUTORIZADOS + AUTORIZACIONES.md
  analisis/               AAAA-MM-DD-<tema>.md (negocio, competencia, métricas)
  guiones/                semana-AAAA-Www.md (7 guiones + storyboards)
  reels/<id>.json         guion técnico que consume la plantilla de video
  publicaciones/<id>.json copy, hashtags, red, fecha propuesta, estado
  exports/                MP4, portadas, hojas de contacto (no se versiona)
```

## Flujo (seguí el paso que pida el usuario; el ciclo completo está en references/flujo.md)

| # | Paso | Detalle |
|---|---|---|
| 0 | Onboarding | `references/flujo.md#onboarding` |
| 1–3 | Negocio, métricas reales, ideas | `references/flujo.md` + `references/metricool.md` |
| 4 | 7 guiones semanales | `references/guiones.md` |
| 5–6, 9 | Reels con motion graphics, export MP4 | `references/motion.md` |
| 7 | Material real vs IA | regla 4 |
| 8 | Portada, copy, hashtags | `references/guiones.md#copy` |
| 10–11 | Borradores en Metricool → esperar aprobación | `references/metricool.md` |
| 12 | Resultados y mejora | `references/flujo.md#ciclo` |

**Puertas de aprobación** (pará y mostrá el entregable en cada una):
A) guiones + storyboard → B) video borrador (con marca de agua) → C) versión final + copy → D) creación del borrador en Metricool → E) programación (solo si el usuario lo pide).

## Comandos

```bash
cd studio
node render.mjs --cliente <slug> --reel <id> --storyboard # solo cuadros por escena (puerta A)
node render.mjs --cliente <slug> --reel <id> --borrador   # con marca de agua "BORRADOR"
node render.mjs --cliente <slug> --reel <id>              # final (solo tras aprobación B)
npx remotion studio src/index.ts --public-dir clients/<slug>   # vista previa interactiva (en tu compu)
```
El render imprime un QA (1080×1920, h264 yuv420p, 30 fps, 15–30 s, < 100 MB) y genera portada y hoja de contacto. Mirá la hoja de contacto antes de mostrar el video.

Para trabajo avanzado en Remotion (subtítulos, audio, efectos) cargá la skill `remotion-best-practices`.
