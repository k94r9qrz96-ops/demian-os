"""Genera WebP responsive, máscaras de agua y variantes del logo a partir de media-src/."""
import glob, os, colorsys
from PIL import Image, ImageFilter, ImageOps
SRC, OUT = 'media-src', 'public/img'
os.makedirs(OUT, exist_ok=True)

for f in sorted(glob.glob(f'{SRC}/*.jpg')):
    name = os.path.splitext(os.path.basename(f))[0]
    if name == 'logo':
        continue
    im = Image.open(f).convert('RGB')
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=80, method=6)
    sm = im.copy(); sm.thumbnail((720, 2000), Image.LANCZOS)
    sm.save(f'{OUT}/{name}-720.webp', 'WEBP', quality=76, method=6)
    if name in ('piscina-hero', 'piscina-mirador'):
        im.save(f'{OUT}/{name}.jpg', 'JPEG', quality=84, optimize=True, progressive=True)

def water_mask(name, ymin, close=31, extra=None):
    im = Image.open(f'{SRC}/{name}.jpg').convert('RGB')
    w, h = im.size
    small = im.resize((w // 2, h // 2))
    sw, sh = small.size
    m = Image.new('L', small.size, 0)
    px, mp = small.load(), m.load()
    for y in range(sh):
        for x in range(sw):
            if y < ymin * sh:
                continue
            r, g, b = [c / 255 for c in px[x, y]]
            hh, s, v = colorsys.rgb_to_hsv(r, g, b)
            hue = hh * 360
            if 175 <= hue <= 225 and s > 0.30 and v > 0.25:
                mp[x, y] = 255
            elif extra and extra(x / sw, y / sh, hue, s, v):
                mp[x, y] = 255
    # cerrar huecos (reflejos dentro del agua) y suavizar bordes
    m = m.filter(ImageFilter.MaxFilter(close)).filter(ImageFilter.MinFilter(close))
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(6))
    m = m.resize((512, int(512 * h / w)), Image.LANCZOS)
    m.save(f'{OUT}/{name}-mask.png', optimize=True)

water_mask('piscina-hero', 0.44, close=21)
water_mask('piscina-mirador', 0.47, close=41,
           extra=lambda x, y, hue, s, v: y > 0.58 and x < 0.56 + (y - 0.58) * 1.1 and v < 0.75)

# Logo: recorte, fondo transparente y versión invertida (trazo marfil) para fondos oscuros
lg = Image.open(f'{SRC}/logo.jpg').convert('RGB')
gray = ImageOps.grayscale(lg)
bbox = gray.point(lambda p: 255 if p < 200 else 0).getbbox()
pad = 18
lg = lg.crop((bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad))
W, H = lg.size
dark = Image.new('RGBA', lg.size); light = Image.new('RGBA', lg.size)
src, dp, lp = lg.load(), dark.load(), light.load()
# círculo del isotipo: se conserva intacto (incluido el brillo blanco del sol)
hsv = lambda p: colorsys.rgb_to_hsv(*[c / 255 for c in p])
cols = [x for x in range(int(W * 0.6), W) if hsv(src[x, H // 2])[1] > 0.35 and hsv(src[x, H // 2])[2] > 0.45]
cx = (min(cols) + max(cols)) / 2; cr = (max(cols) - min(cols)) / 2; cy = H / 2
for y in range(H):
    for x in range(W):
        r, g, b = src[x, y]
        hh, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        inside = (x - cx) ** 2 + (y - cy) ** 2 < (cr * 0.94) ** 2
        if inside or (s > 0.28 and v > 0.25):          # color de marca (sol, agua, pasto, guiones)
            dp[x, y] = (r, g, b, 255); lp[x, y] = (r, g, b, 255)
        else:                               # trazo negro sobre blanco -> alfa por luminancia
            a = int(max(0, min(255, (1 - v) * 255 * 1.15)))
            dp[x, y] = (12, 12, 12, a)
            lp[x, y] = (246, 243, 235, a)
dark.save(f'{OUT}/logo.png', optimize=True)
light.save(f'{OUT}/logo-light.png', optimize=True)
dark.save(f'{OUT}/logo.webp', 'WEBP', quality=90)
light.save(f'{OUT}/logo-light.webp', 'WEBP', quality=90)
lg.save(f'{OUT}/logo-original.jpg', quality=90)
print('ok', lg.size)
