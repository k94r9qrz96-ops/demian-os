# Apart Club San Pedro — The Art of Escaping

Nueva web (demo funcional) para Apart Club San Pedro. React + TypeScript + Vite, GSAP/ScrollTrigger y un shader WebGL propio para el agua de la piscina.

**Por qué Vite y no Next.js:** es un sitio de una sola página, sin backend ni contenido dinámico propio (la disponibilidad vive en el motor Pxsol). Vite genera archivos estáticos que se suben a cualquier hosting, y se puede abrir sin servidor (ver versión de archivo único). Si más adelante hay blog, varios idiomas o CMS, conviene migrar a Next.js.

## Ejecutar

```bash
cd apartclub-web
npm install
npm run dev        # http://localhost:5173 (también accesible desde el celular en la misma red: --host)
npm run build      # genera dist/
npm run preview    # sirve dist/ en http://localhost:4173
python3 scripts/single-file.py   # dist-single/apart-club-san-pedro.html (todo embebido, ~4 MB)
```

Imágenes: `media-src/` tiene las fotos originales; `python3 scripts/images.py` regenera los WebP (720 px y 1290 px), las máscaras del agua y las versiones del logo en `public/img/`.

## Desplegar

`dist/` es estático. Opciones:
- **Netlify / Vercel / Cloudflare Pages:** directorio de build `apartclub-web`, comando `npm run build`, salida `dist`.
- **Hosting tradicional:** subir el contenido de `dist/` por FTP.
- Antes de publicar en el dominio real, actualizar `canonical`, `og:image` (URL absoluta) y `sitemap.xml`.

## Escenas

| # | Escena | Archivo |
|---|---|---|
| 01 | Intro con revelado líquido del logo (omitible, 1 vez por sesión) | `components/Intro.tsx` |
| 02–03 | Hero con agua WebGL interactiva + película pinneada (piscina → río → parque) | `Hero.tsx`, `lib/water.ts` |
| 04 | Complejo: capas con parallax, pin corto en desktop | `Discover.tsx` |
| 05 | Lofts en primera persona (swipe, teclado, pestañas) | `Lofts.tsx` |
| 06 | Experience Explorer: 10 experiencias, 6 transiciones distintas, color por experiencia | `Experiences.tsx` |
| 07 | Reflejo: se entra por el agua invertida y se sale a El Mirador | `Mirror.tsx` |
| 08 | Gastronomía editorial + carta explorable | `Gastro.tsx` |
| 09 | Mapa ilustrativo de San Pedro (no a escala) | `MapExplorer.tsx` |
| 10 | Reservas: fechas, personas, alojamiento, mascotas, extras → motor oficial o WhatsApp precargado | `Booking.tsx`, `lib/booking.ts` |
| 11 | Políticas, contacto, opiniones | `Trust.tsx` |
| 12 | Cierre al atardecer + footer con aviso legal | `Finale.tsx` |

**Agua:** la foto real se dibuja intacta; solo la superficie de la piscina (máscara generada desde la misma foto) recibe ondas, refracción, cáusticas y brillos. Tocar el agua genera ondas. Sin WebGL, con "reducir movimiento" o "ahorro de datos" queda la foto estática con un Ken Burns suave (o nada, con reducir movimiento). El shader se pausa fuera de pantalla y con la pestaña oculta; en celular limita la resolución.

**Accesibilidad:** foco visible, navegación por teclado (carrusel con flechas, Escape cierra menú e intro), ARIA en carrusel/pestañas/formulario, `prefers-reduced-motion` respetado, botones táctiles ≥ 44 px, enlace "Ir a reservas".

## Qué está verificado y qué no

Fuente: sitio oficial (leído el 22/11/2026) y fotos provistas.

Verificado en el sitio oficial: dirección (Lucio Mansilla 7300), teléfono/WhatsApp +54 9 3329 56 5896, email reservas@apartclubsanpedro.com.ar, check-in 13:00 / check-out 10:30, equipamiento de los lofts, Instagram/Facebook/YouTube, coordenadas del mapa, motor de reservas Pxsol en `/lp.html`, aviso legal (texto literal).

**A validar con el establecimiento antes de publicar** (el sitio carga estos datos por API y no se pudieron leer; se tomaron del brief):
- Servicios: botes laguneros, pesca, canchas, desayunos/media pensión, masajes, visitas guiadas, celebraciones (`verify: true` en `src/data/content.ts`).
- Nombres y cantidad de tipos de loft (solo se usa "Loft" y "Loft Deluxe"), capacidades y tarifas: no se muestran, se derivan al motor oficial.
- Platos de El Mirador (sin precios) y horarios.
- Política de mascotas para lofts que no son Deluxe.
- Algunas fotos provistas parecen generadas o retocadas (pesca con dorado, desayuno, balcón con parrilla). Confirmar que representan el lugar real o reemplazarlas.

## Pendientes que requieren datos, claves o aprobación

- **Motor de reservas con fechas precargadas:** Pxsol no documenta públicamente el formato de parámetros. Hoy "Ver disponibilidad" abre el motor oficial y el formulario muestra las fechas para reingresarlas; WhatsApp sí va con fechas, personas y extras precargados. Pedir a Pxsol el deep-link (o el widget `ebx-widget`) y completarlo en `openOfficialBooking()` (`src/lib/booking.ts`).
- **Reseñas verificadas:** no se publicaron reseñas inventadas. Integrar Google Reviews (API de Places, requiere clave) o el módulo de reseñas de Pxsol, con autor, fecha y puntaje.
- **Analítica:** `track()` empuja eventos a `window.dataLayer` (reserva, WhatsApp, teléfono, email, mapa, lofts, experiencias, carta). Falta crear el contenedor de Google Tag Manager / GA4 y pegar su snippet.
- **Medios faltantes:** fotos reales de masajes, visitas guiadas, canchas y platos (hoy hay composiciones gráficas marcadas `MEDIA SLOT`). Video real de la piscina si existe (reemplazaría o complementaría el shader).
- **Aviso legal:** se conserva el texto del operador actual; revisar si corresponde a quien publique la nueva web. Enlaces de términos/privacidad apuntan al sitio oficial.
- **Rendimiento:** objetivo LCP < 2,5 s, INP < 200 ms, CLS < 0,1. Verificar con Lighthouse/PageSpeed y en un iPhone real una vez publicado.

## Video de presentación

`video/showreel.html` + `video/record.cjs` generan un video vertical 1080×1920 grabando la web real cuadro a cuadro dentro de un iPhone, con títulos por escena.

```bash
npm run build
python3 -m http.server 4180 &          # desde apartclub-web/
node video/record.cjs /tmp/frames
ffmpeg -framerate 30 -i /tmp/frames/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart showreel.mp4
```
