# Rushy Content Studio

Fábrica de reels por cliente con Remotion (código abierto; licencia gratuita para individuos y empresas de hasta 3 personas).
Instrucciones completas para Claude: `.claude/skills/rushy-content-studio/`.

```bash
npm install
node render.mjs --cliente rushy-ai --reel demo-sistema --storyboard   # cuadros por escena
node render.mjs --cliente rushy-ai --reel demo-sistema --borrador     # MP4 con marca de agua
npx remotion studio src/index.ts --public-dir clients/rushy-ai        # vista previa interactiva
```
Navegador: usa Chromium headless de `/opt/pw-browsers` si existe; en tu compu Remotion descarga el suyo (o `REMOTION_CHROME=/ruta`).
