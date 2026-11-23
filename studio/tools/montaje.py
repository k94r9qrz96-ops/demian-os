#!/usr/bin/env python3
"""Montaje de un reel ReelPro: línea de tiempo + música original + sound design + mezcla con la voz.

Uso:  python3 -I tools/montaje.py clients/<slug>/reels/<id>.json   (después de tools/voz.py)

Fuente única de verdad: todas las animaciones (Remotion) y todos los efectos de sonido se anclan a
las MISMAS marcas de tiempo, que salen de las palabras de la voz en off. Si cambia la voz, todo se
re-sincroniza solo.

Salida en clients/<slug>/audio/:
  <id>-timeline.json   escenas, eventos y subtítulos con tiempos absolutos (lo lee el render)
  <id>-mezcla.wav      48 kHz estéreo, -14 LUFS (estándar de Instagram/TikTok)
La música se genera acá mismo (síntesis), así que no tiene derechos de terceros.
"""
import json, re, subprocess, sys, unicodedata
from pathlib import Path
import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(7)


def norm(w):
    w = unicodedata.normalize('NFD', w.lower())
    return re.sub(r'[^a-z0-9ñ]', '', ''.join(c for c in w if unicodedata.category(c) != 'Mn'))


# ───────────────────────── línea de tiempo ─────────────────────────
def build_timeline(reel, words):
    v = reel['voz']
    t = v.get('inicio', 0.15)
    lines, absw = {}, {}
    for ln in v['lineas']:
        w = words[ln['id']]
        lines[ln['id']] = {'desde': round(t, 3), 'hasta': round(t + w['duracion'], 3), 'archivo': w['archivo']}
        absw[ln['id']] = [{**x, 'desde': round(t + x['desde'], 3), 'hasta': round(t + x['hasta'], 3)} for x in w['palabras']]
        t += w['duracion'] + v.get('pausa', 0.18)
    total = reel.get('duracion') or round(t + 0.3, 2)

    def at(ref):
        lid, word = ref.split(':', 1)
        k = norm(word)
        for x in absw[lid]:
            if norm(x['palabra']) == k or norm(x['palabra']).startswith(k):
                return x['desde']
        raise KeyError(f'No encuentro la palabra "{word}" en {lid}')

    esc = reel['escenas']
    starts = [0.0] + [max(0.0, lines[s['linea']]['desde'] - 0.12) for s in esc[1:]]
    scenes, ev = [], {}
    for i, s in enumerate(esc):
        a, b = starts[i], (starts[i + 1] if i + 1 < len(esc) else total)
        scenes.append({**s, 'desde': round(a, 3), 'hasta': round(b, 3)})
        p = f's{i}.'
        ty = s['tipo']
        ev[p + 'inicio'] = a
        if ty == 'pregunta':
            for k, g in enumerate(s['golpes']): ev[f'{p}golpe{k}'] = at(g['en']) - 0.04
        elif ty == 'problema':
            ev[p + 'titulo'] = at(s['en_titulo'])
        elif ty == 'transformacion':
            for k in ('marca', 'transforma', 'reel', 'historias'): ev[p + k] = at(s['en_' + k])
        elif ty == 'pilares':
            for k, it in enumerate(s['items']): ev[f'{p}item{k}'] = at(it['en']) - 0.05
            ev[p + 'cierre'] = at(s['cierre']['en']) - 0.05
        elif ty == 'beneficio':
            ev[p + 'nosotros'] = at(s['en_nosotros'])
            for k in range(len(s['grilla'])): ev[f'{p}tile{k}'] = ev[p + 'nosotros'] + 0.2 + k * 0.11
        elif ty == 'cta':
            ev[p + 'grande'] = at(s['en_grande']) - 0.05
            ev[p + 'dm'] = at(s['en_dm']) - 0.1
            kw = s['palabraClave']
            for k in range(len(kw)): ev[f'{p}tecla{k}'] = ev[p + 'dm'] + 0.3 + k * 0.1
            ev[p + 'enviar'] = ev[f'{p}tecla{len(kw) - 1}'] + 0.28
    ev = {k: round(x, 3) for k, x in ev.items()}

    # subtítulos: bloques de hasta N palabras, se corta en puntuación
    mx = (reel.get('subtitulos') or {}).get('maxPalabras', 4)
    caps = []
    for lid, ws in absw.items():
        seg = []
        for k, w in enumerate(ws):  # segmentos por puntuación, luego bloques parejos de hasta N palabras
            seg.append(w)
            if re.search(r'[.,?!…:]$', w['palabra']) or k == len(ws) - 1:
                n = -(-len(seg) // mx); size = -(-len(seg) // n)
                for j in range(0, len(seg), size): caps.append({'palabras': seg[j:j + size]})
                seg = []
    for c in caps: c['desde'] = c['palabras'][0]['desde']
    for k, c in enumerate(caps):
        nxt = caps[k + 1]['desde'] if k + 1 < len(caps) else total
        c['hasta'] = round(min(nxt, c['palabras'][-1]['hasta'] + 0.5), 3)
    return {'duracion': total, 'lineas': lines, 'escenas': scenes, 'eventos': ev, 'subtitulos': caps}


# ───────────────────────── síntesis ─────────────────────────
def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def add(buf, t, x, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= buf.shape[1] or i + len(x) <= 0: return
    j0 = max(0, -i); x = x[j0:]; i = max(0, i)
    n = min(len(x), buf.shape[1] - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + n] += x[:n] * gain * l * 1.414
    buf[1, i:i + n] += x[:n] * gain * r * 1.414


def kick(dur=0.45, f0=150, f1=44):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.16)
    x[:200] += RNG.standard_normal(200) * np.linspace(0.6, 0, 200)
    return np.tanh(x * 1.6)


def clap():
    n = int(0.25 * SR); x = np.zeros(n)
    for d in (0, 0.011, 0.022):
        i = int(d * SR); m = n - i
        x[i:] += RNG.standard_normal(m) * env_exp(m, 0.012 if d < 0.02 else 0.07)
    return bp(x, 900, 5000) * 0.9


def hat(open_=False):
    n = int((0.18 if open_ else 0.04) * SR)
    return hp(RNG.standard_normal(n), 7000, 4) * env_exp(n, 0.05 if open_ else 0.012)


def tone(freq, dur, shape='saw', harm=12):
    n = int(dur * SR); tt = np.arange(n) / SR
    if shape == 'sine': return np.sin(2 * np.pi * freq * tt)
    x = np.zeros(n)
    for h in range(1, harm + 1):
        if freq * h > 16000: break
        x += np.sin(2 * np.pi * freq * h * tt) / h * (1 if shape == 'saw' else (h % 2))
    return x * 0.6


def adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n, s, dtype=float)
    e[:a] = np.linspace(0, 1, a) if a else e[:a]
    e[a:a + d] = np.linspace(1, s, len(e[a:a + d]))
    if r: e[-r:] *= np.linspace(1, 0, len(e[-r:]))
    return e


def whoosh(dur=0.55, up=True):
    n = int(dur * SR); x = RNG.standard_normal(n)
    out = np.zeros(n); seg = 512
    for k in range(0, n, seg):
        p = k / n; fc = 300 + (5000 if up else 3000) * (p if up else 1 - p) ** 1.5
        out[k:k + seg] = bp(x[k:k + seg + 0], max(80, fc * 0.6), min(20000, fc * 1.6), 1)[:len(out[k:k + seg])]
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return lp(out * e, 9000) * 1.4


def impact(big=True):
    n = int((2.2 if big else 0.9) * SR)
    b = kick(n / SR, 90, 32) * 1.2
    c = hp(RNG.standard_normal(n), 2500) * env_exp(n, 0.35 if big else 0.12) * 0.35
    sub = np.sin(2 * np.pi * 41 * np.arange(n) / SR) * env_exp(n, 0.5 if big else 0.2) * 0.7
    return np.tanh((b + c + sub) * 1.2)


def riser(dur=1.4):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = 200 * (8 ** (tt / dur))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    nz = whoosh(dur, True) * 0.6
    return (s + nz) * (tt / dur) ** 2


def pop(f=1400):
    n = int(0.06 * SR); tt = np.arange(n) / SR
    fs = f * (1 + 0.6 * np.exp(-tt * 60))
    return np.sin(2 * np.pi * np.cumsum(fs) / SR) * env_exp(n, 0.015)


def click():
    n = int(0.02 * SR)
    return bp(RNG.standard_normal(n), 2000, 8000) * env_exp(n, 0.004) * 0.8


def shimmer():
    out = np.zeros(int(1.6 * SR))
    for k, f in enumerate((1318.5, 1760, 2093, 2637, 3136)):
        x = tone(f, 1.2, 'sine') * env_exp(int(1.2 * SR), 0.35)
        i = int(k * 0.05 * SR); out[i:i + len(x)] += x * 0.18
    return out


def glitch(dur=0.28):
    n = int(dur * SR); g = np.zeros(n); seg = int(0.035 * SR)
    src = tone(220, 0.04, 'square') * 0.5 + RNG.standard_normal(int(0.04 * SR)) * 0.2
    for k in range(0, n, seg):
        if RNG.random() < 0.7: g[k:k + seg] = np.round(src[:len(g[k:k + seg])] * 6) / 6
    return g


def reverb(x, dur=1.8, mix=0.25):
    n = int(dur * SR)
    ir = RNG.standard_normal(n) * env_exp(n, dur / 5)
    ir = lp(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
    wet = np.vstack([signal.fftconvolve(x[c], ir)[:x.shape[1]] for c in range(2)])
    return x * (1 - mix) + wet * mix


# ───────────────────────── música ─────────────────────────
CHORDS = [  # La menor – Fa – Do – Sol
    (110.0, (220.0, 261.63, 329.63)), (87.31, (174.61, 220.0, 261.63)),
    (130.81, (261.63, 329.63, 392.0)), (98.0, (196.0, 246.94, 293.66)),
]


def music(tl, bpm):
    total = tl['duracion']; N = int(total * SR) + SR
    beat = 60 / bpm
    sc = tl['escenas']
    drop = next((s['desde'] for s in sc if s['tipo'] == 'transformacion'), sc[min(1, len(sc) - 1)]['hasta'])
    end_groove = next((tl['eventos'][k] for k in tl['eventos'] if k.endswith('.enviar')), total)
    section = lambda t: next((s['tipo'] for s in sc if s['desde'] <= t < s['hasta']), sc[-1]['tipo'])
    drums, bass, pad, arp, fx = (np.zeros((2, N)) for _ in range(5))
    kfirst = int(np.floor(-drop / beat)) - 1
    for k in range(kfirst, int((total - drop) / beat) + 2):
        t = drop + k * beat
        if t < 0 or t > total: continue
        bar, b4 = k // 4, k % 4
        root, triad = CHORDS[bar % 4]
        sec = section(t)
        groove = t >= drop - 1e-3 and t < end_groove
        if sec == 'pregunta':
            add(drums, t, kick(0.3, 90, 40), 0.55)  # pulso de tensión
            for h in range(2): add(drums, t + h * beat / 2, hat(), 0.18, 0.3)
            if b4 == 0: add(pad, t, lp(tone(root / 2, beat * 4, 'saw') * adsr(int(beat * 4 * SR), 0.3, 0.5, 0.7, 0.4), 500), 0.25)
        elif sec == 'problema':
            add(drums, t, lp(kick(0.4, 70, 36), 300), 0.6)
            if b4 == 0: add(pad, t, lp(sum(tone(f / 2, beat * 4) for f in triad) * adsr(int(beat * 4 * SR), 0.2, 0.3, 0.6, 0.5), 350), 0.18)
        elif groove:
            add(drums, t, kick(), 0.85)
            if b4 in (1, 3): add(drums, t, clap(), 0.5, -0.05)
            for h in range(4):
                add(drums, t + h * beat / 4, hat(open_=(h == 2)), (0.16 if h % 2 else 0.1) * (1.3 if sec in ('pilares', 'cta') else 1), 0.35)
            for h in range(2):  # bajo en corcheas, sidechain al bombo
                n = int(beat / 2 * SR)
                b = lp(tone(root / 2, beat / 2, 'saw'), 420) * adsr(n, 0.005, 0.1, 0.7, 0.04)
                b *= np.minimum(1, np.linspace(0.2, 1.4, n)) if h == 0 else 1
                add(bass, t + h * beat / 2, b, 0.5)
            if b4 == 0:
                n = int(beat * 4 * SR)
                ch = sum(tone(f * d, beat * 4) for f in triad for d in (1, 1.004))
                add(pad, t, lp(ch, 2600 if sec != 'beneficio' else 3600) * adsr(n, 0.05, 0.6, 0.55, 0.5), 0.10, -0.25)
                add(pad, t, lp(sum(tone(f * 1.003, beat * 4) for f in triad), 2600) * adsr(n, 0.05, 0.6, 0.55, 0.5), 0.10, 0.25)
            notes = [triad[0] * 2, triad[1] * 2, triad[2] * 2, triad[1] * 2]
            for h in range(4):
                n = int(beat / 4 * SR)
                p = tone(notes[h], beat / 4, 'square', 6) * env_exp(n, 0.06)
                add(arp, t + h * beat / 4, lp(p, 3500), 0.08 if sec != 'transformacion' or t > drop + 2 else 0.04, 0.4 if h % 2 else -0.4)
    # cola final: acorde largo
    root, triad = CHORDS[0]
    n = int(2.5 * SR)
    add(pad, end_groove, lp(sum(tone(f, 2.5) for f in triad), 2200) * adsr(n, 0.01, 0.3, 0.5, 1.5), 0.16)
    m = drums + bass + reverb(pad, 2.2, 0.35) + reverb(arp, 1.4, 0.3) + fx
    return m, drop, end_groove


def sfx(tl):
    N = int(tl['duracion'] * SR) + SR
    b = np.zeros((2, N)); ev = tl['eventos']
    for s in tl['escenas'][1:]:
        add(b, s['desde'] - 0.28, whoosh(0.5), 0.35, -0.6)
    for k, t in ev.items():
        kind = k.split('.', 1)[1]
        if kind.startswith('golpe'):
            add(b, t, impact(kind == 'golpe0'), 0.55)
            if kind != 'golpe0': add(b, t + 0.35, glitch(), 0.25)
        elif kind == 'titulo': add(b, t, impact(False), 0.5)
        elif kind == 'marca':
            add(b, t - 0.02, impact(True), 0.7); add(b, t, shimmer(), 0.6, 0.2)
        elif kind == 'transforma': add(b, t, whoosh(0.9, True), 0.3, 0.5)
        elif kind in ('reel', 'historias', 'nosotros', 'grande'): add(b, t, pop(1100), 0.35); add(b, t - 0.2, whoosh(0.35), 0.2, 0.6)
        elif kind.startswith('item'): add(b, t, impact(False), 0.3); add(b, t, pop(900 + 120 * int(kind[4:])), 0.25)
        elif kind == 'cierre': add(b, t - 0.6, riser(0.6), 0.35); add(b, t, impact(True), 0.5)
        elif kind.startswith('tile'): add(b, t, pop(1500 + 90 * int(kind[4:])), 0.14, (int(kind[4:]) % 3 - 1) * 0.5)
        elif kind.startswith('tecla'): add(b, t, click(), 0.5, 0.2)
        elif kind == 'enviar': add(b, t, whoosh(0.4, True), 0.4, 0.6); add(b, t + 0.12, pop(1700), 0.4); add(b, t + 0.12, impact(True), 0.45)
    # subida antes del drop
    drop = next((s['desde'] for s in tl['escenas'] if s['tipo'] == 'transformacion'), None)
    if drop: add(b, drop - 1.2, riser(1.2), 0.5)
    return reverb(b, 1.2, 0.18)


def main():
    rp = Path(sys.argv[1]).resolve(); cli = rp.parent.parent; rid = rp.stem
    reel = json.loads(rp.read_text())
    words = json.loads((cli / 'audio' / 'vo' / f'{rid}-palabras.json').read_text())
    tl = build_timeline(reel, words)
    (cli / 'audio').mkdir(exist_ok=True)
    (cli / 'audio' / f'{rid}-timeline.json').write_text(json.dumps(tl, ensure_ascii=False, indent=1))
    N = int(tl['duracion'] * SR) + SR

    # voz
    vo = np.zeros((2, N))
    for lid, ln in tl['lineas'].items():
        import wave
        with wave.open(str(cli / ln['archivo'])) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768; sr = w.getframerate()
        a = signal.resample_poly(a, SR, sr)
        a = hp(a, 85)
        a = a + bp(a, 2500, 6000) * 0.35  # presencia
        add(vo, ln['desde'], a, 0.9)
    vo = reverb(vo, 0.6, 0.06)
    env = np.abs(vo).max(0)
    env = signal.lfilter([1 - 0.9995], [1, -0.9995], (env > 0.02).astype(float))
    env = np.clip(env * 3, 0, 1)

    m, drop, end = music(tl, (reel.get('musica') or {}).get('bpm', 120))
    m *= 1 - 0.55 * env  # ducking de la música bajo la voz
    fx = sfx(tl)
    mix = m * 0.55 + fx * 0.7 + vo * 1.0
    mix = mix[:, :int(tl['duracion'] * SR)]
    fade = int(0.4 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade)
    mix = np.tanh(mix * 1.1) / 1.1
    raw = cli / 'audio' / f'.{rid}-raw.wav'
    out = cli / 'audio' / f'{rid}-mezcla.wav'
    from scipy.io import wavfile
    wavfile.write(raw, SR, (mix.T * 0.8).astype(np.float32))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', str(SR), '-c:a', 'pcm_s16le', str(out)], check=True)
    raw.unlink()
    print(f"✔ timeline {len(tl['escenas'])} escenas, {len(tl['eventos'])} eventos, {len(tl['subtitulos'])} subtítulos, {tl['duracion']} s")
    print(f"✔ mezcla {out}  (drop en {drop:.2f} s)")


if __name__ == '__main__':
    main()
