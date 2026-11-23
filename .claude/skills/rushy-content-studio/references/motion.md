# Reels con motion graphics (Remotion)

Plantilla: `studio/src/reel/` (composición `Reel`, 1080×1920, 30 fps). Se alimenta con `clients/<slug>/brand.json` + `clients/<slug>/reels/<id>.json`.

## Guion técnico `reels/<id>.json`
```json
{
  "cliente": "<slug>",
  "transicion": 12,
  "portada": 1.2,
  "escenas": [
    {"tipo": "hook", "duracion": 2.6, "kicker": "opcional", "lineas": ["Línea 1", "Línea 2"], "resaltar": "palabra"},
    {"tipo": "contraste", "duracion": 3.2, "antes": "…", "despues": "…", "etiquetaAntes": "Hoy", "etiquetaDespues": "Con X"},
    {"tipo": "media", "duracion": 3, "src": "assets/foto.jpg", "video": false, "titulo": "…", "texto": "…", "movimiento": "zoomin|zoomout|panizq|pander"},
    {"tipo": "lista", "duracion": 3.5, "titulo": "…", "items": ["…", "…", "…"]},
    {"tipo": "proceso", "duracion": 3.5, "titulo": "…", "pasos": ["…", "…", "…"]},
    {"tipo": "frase", "duracion": 2.5, "texto": "Línea 1\nLínea 2", "resaltar": "palabra"},
    {"tipo": "cta", "duracion": 3, "titulo": "…", "boton": "…", "sub": "…"}
  ],
  "subtitulos": [{"texto": "…", "desde": 0.4, "hasta": 2.0}],
  "musica": {"src": "assets/musica.mp3", "volumen": 0.5, "licencia": "origen y licencia"}
}
```
Duración final = suma de duraciones − transiciones (12 frames = 0,4 s cada una). Apuntá a 15–30 s.

## Criterios de calidad premium
- Gancho visual en los primeros 0,5 s: tipografía grande con palabra resaltada, flash y escala.
- Texto dentro de la zona segura (deja libre la interfaz de IG/TikTok: ~230 px arriba, ~400 px abajo, ~150 px a la derecha). La plantilla ya lo respeta.
- Máximo 7 palabras por pantalla; tamaño mínimo de título 84 px.
- Variar el tipo de escena cada 2–4 s para sostener la retención.
- Música solo con licencia anotada. Sin música, el reel se publica mudo y se elige audio en la app (o `audioConfiguration` en Metricool para IG Business).

## Subtítulos desde un video del cliente
whisper.cpp local (gratis). Instalación una sola vez en `studio/.whisper/`:
```bash
node -e "import('@remotion/install-whisper-cpp').then(m=>m.installWhisperCpp({to:'.whisper',version:'1.5.5'}))"
curl -L -o .whisper/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
ffmpeg -i clients/<slug>/assets/video.mp4 -ar 16000 -ac 1 /tmp/a.wav
.whisper/main -m .whisper/ggml-base.bin -f /tmp/a.wav -l es -oj -of clients/<slug>/analisis/transcripcion-<id>
```
Convertí el JSON a `subtitulos` (bloques de 2–5 palabras) y revisá ortografía antes de renderizar. Detalle avanzado: skill `remotion-best-practices` → captions.

## Render y revisión
```bash
node render.mjs --cliente <slug> --reel <id> --borrador
```
Revisá `exports/<id>-contacto.jpg` (8 frames) antes de entregar. Si el QA marca ❌, corregí antes de mostrar.

## Entrega de archivos
El contenedor de Claude Code web es temporal: subí MP4 y portada a Google Drive (carpeta del cliente) o descargalos. Para Metricool, el `media` debe ser una URL pública o de Google Drive vinculado a Metricool.

## Alternativas (solo con aprobación, consumen créditos)
- Higgsfield: video/imagen generativa. Consultar `balance` y `estimate_video_cost` primero.
- Canva: `import-claude-motion-from-url` / `create-video` para que el cliente edite en Canva.

---

# ReelPro: reels premium con voz, música y sound design (recomendado para anuncios)

Plantilla `ReelPro` (`studio/src/pro/`). Todo se sincroniza con la voz: animaciones, efectos de sonido y subtítulos usan las mismas marcas de tiempo.

## Pipeline (todo local y gratis)
```bash
cd studio
python3 -I tools/voz.py     clients/<slug>/reels/<id>.json   # voz Piper es_AR + tiempos por palabra (whisper.cpp)
python3 -I tools/montaje.py clients/<slug>/reels/<id>.json   # línea de tiempo + música original + SFX + mezcla -14 LUFS
node render.mjs --cliente <slug> --reel <id> --borrador --storyboard   # 2 cuadros por escena para revisar
node render.mjs --cliente <slug> --reel <id> --borrador --storyboard --cuadros 6.5,9.9   # cuadros puntuales
node render.mjs --cliente <slug> --reel <id> --borrador                # MP4 completo con marca de agua (~3 min)
```
Requisitos una sola vez: `pip install piper-tts==1.8.0 scipy`, voz en `studio/.voces/` (huggingface.co/rhasspy/piper-voices → es/es_AR/daniela/high), whisper.cpp + `ggml-small.bin` en `studio/.whisper/`.
Ejemplo completo: `clients/rushy-ai/reels/demo-premium.json`.

## Estructura del JSON
- `voz.lineas[]`: una línea por bloque narrativo (id, texto exacto que se subtitula).
- `voz.fonetica`: reemplazos SOLO para la síntesis. Si una palabra suena mal, forzá fonemas IPA: `"Rushy AI": "[[ rˈaʃi ˈeɪ ˈaɪ ]]"`. Evitá puntos en medio de una línea (cada oración se sintetiza aparte): usá comas vía `fonetica`.
- Revisá la `transcripcion_control` que imprime `voz.py`: si una palabra en español sale mal, corregila con fonemas. Nombres en inglés suelen transcribirse mal aunque suenen bien: escuchá antes de corregir.
- `escenas[]`: cada una se ancla a una `linea`; los momentos clave se anclan a palabras (`"en_marca": "l3:Rushy"`).

## Escenas disponibles (genéricas, sirven para cualquier rubro)
| tipo | Para qué | Campos |
|---|---|---|
| `pregunta` | Gancho con tipografía cinética sobre un feed 3D | `feed[]` fotos, `golpes[]` {en, kicker, titulo, resalte, tachar} |
| `problema` | El dolor: contenido gris que se desploma | `kicker`, `titulo`, `en_titulo`, `imagenes[]` |
| `transformacion` | Demostración antes → después: foto cruda → escáner → reel en teléfono → historias | `foto`, `tituloPieza`, `subPieza`, `negocioEjemplo`, `historias[]`, anclas `en_marca/en_transforma/en_reel/en_historias` |
| `pilares` | 3–4 diferenciales con íconos animados que se fusionan | `items[]` {texto, icono: estrategia/creatividad/edicion/calendario, en}, `cierre` |
| `beneficio` | "Vos / Nosotros" con foto del negocio y grilla que se llena | `foto`, `vos[2]`, `nosotros[2]`, `en_nosotros`, `grilla[9]` |
| `cta` | Oferta gigante + chat privado tipeando la palabra clave | `kicker`, `grande`, `en_grande`, `palabraClave`, `en_dm`, `handle` |

## Adaptar a otro rubro (gastronomía, hotel, cafetería, turismo, deco, retail)
1. Fotos/videos reales autorizados del cliente en su `assets/` (o stock rotulado EJEMPLO, nunca presentado como real).
2. `brand.json`: colores (`fondo`, `primario`, `acento`, `calido`), tipografías (`titulos` y `acento` en `marca/fuentes/`, Google Fonts OFL), `handle`.
3. Guion propio del cliente en `voz.lineas`; `musica.bpm` (100–110 para hotelería/deco, 120–128 para gastronomía/retail).
4. Misma cadena de comandos. Costo: $0 (solo CPU).

Rotular "EJEMPLO" todo material que no sea del cliente. No usar oferta (p. ej. "7 días de prueba") sin que el cliente la confirme.

## Portadas (Still "Portada")
`clients/<slug>/portadas/<id>.json` → `node portada.mjs --cliente <slug> --portada <id>` → PNG 1080×1920 + recorte de grilla 4:5.
Fórmula: pregunta-gancho en serif + palabra gigante en color de marca + palabra tachada (el dolor) + antes/después con flecha + botón "Mirá…". Todo lo esencial dentro de la franja central 1080×1350 (lo que muestra la grilla). Ejemplo: `clients/rushy-ai/portadas/demo-premium.json`.
