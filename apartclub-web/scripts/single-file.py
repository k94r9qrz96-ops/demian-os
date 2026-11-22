"""Genera dist-single/apart-club-san-pedro.html: un único archivo con JS, CSS e imágenes embebidas,
para abrir la demo en el iPhone sin servidor. Correr después de `npm run build`."""
import base64, json, os, re
DIST, OUT = 'dist', 'dist-single'
os.makedirs(OUT, exist_ok=True)
html = open(f'{DIST}/index.html', encoding='utf-8').read()
skip = {'logo-original.jpg', 'logo.png', 'logo.webp'}
mime = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg'}
assets = {}
for f in sorted(os.listdir(f'{DIST}/img')):
    ext = os.path.splitext(f)[1]
    if f in skip or ext not in mime:
        continue
    b = base64.b64encode(open(f'{DIST}/img/{f}', 'rb').read()).decode()
    assets[f'./img/{f}'] = f'data:{mime[ext]};base64,{b}'

def inline_css(m):
    css = open(f"{DIST}/{m.group(1).lstrip('./')}", encoding='utf-8').read()
    return f'<style>{css}</style>'

def inline_js(m):
    js = open(f"{DIST}/{m.group(1).lstrip('./')}", encoding='utf-8').read().replace('</script', '<\\/script')
    return f'<script type="module">{js}</script>'

html = re.sub(r'<link rel="stylesheet"[^>]*href="(\./assets/[^"]+\.css)"[^>]*>', inline_css, html)
html = re.sub(r'<script type="module"[^>]*src="(\./assets/[^"]+\.js)"[^>]*></script>', inline_js, html)
html = re.sub(r'<link rel="preload"[^>]*>\s*', '', html)
html = re.sub(r'<link rel="icon"[^>]*>\s*', '', html)
html = html.replace('<div id="root"></div>', '<script>window.__AC_ASSETS=' + json.dumps(assets) + '</script>\n  <div id="root"></div>')
# el módulo debe ir después del mapa de assets (los módulos se ejecutan diferidos, igual lo movemos al final)
mod = re.search(r'<script type="module">.*?</script>', html, re.S).group(0)
html = html.replace(mod, '').replace('</body>', mod + '\n</body>')
p = f'{OUT}/apart-club-san-pedro.html'
open(p, 'w', encoding='utf-8').write(html)
print(p, round(os.path.getsize(p) / 1e6, 2), 'MB')
