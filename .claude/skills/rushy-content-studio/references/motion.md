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
