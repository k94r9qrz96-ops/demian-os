#!/usr/bin/env python3
"""Voz en off local y gratuita (Piper) + subtítulos sincronizados palabra por palabra (whisper.cpp).

Uso:  python3 -I tools/voz.py clients/<slug>/reels/<id>.json
Lee  "voz": {"modelo": "es_AR-daniela-high", "velocidad": 0.86, "lineas": [{"id": "l1", "texto": "...", "fonetica": {"Rushy AI": "[[ rˈaʃi ˈeɪ ˈaɪ ]]"}}]}
Escribe clients/<slug>/audio/vo/<id>-<lineaId>.wav y clients/<slug>/audio/vo/<id>-palabras.json
(tiempos relativos al inicio de cada línea; el reel decide en qué segundo empieza cada línea).
"""
import json, re, subprocess, sys, unicodedata, wave, difflib
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
VOCES = ROOT / '.voces'
WHISPER = ROOT / '.whisper'


def norm(w):
    w = unicodedata.normalize('NFD', w.lower())
    return re.sub(r'[^a-z0-9ñ]', '', ''.join(c for c in w if unicodedata.category(c) != 'Mn'))


def synth(voice, text, length):
    """Sintetiza con Piper (un bloque por oración), recorta silencios extremos y normaliza a -1 dBFS.
    Si una palabra suena mal, forzá su pronunciación en "fonetica" con fonemas IPA: "[[ tˈu ]]"."""
    from piper import SynthesisConfig
    chunks = list(voice.synthesize(text, syn_config=SynthesisConfig(length_scale=length)))
    sr = chunks[0].sample_rate
    gap = np.zeros(int(sr * 0.06), np.int16)
    a = np.concatenate([x for c in chunks for x in (c.audio_int16_array, gap)][:-1]).astype(np.float32)
    hop = sr // 100
    env = np.array([np.abs(a[i:i + hop]).max() for i in range(0, len(a), hop)])
    on = np.where(env > 300)[0]
    a = a[max(0, on[0] - 3) * hop:(on[-1] + 6) * hop]
    a *= 0.89 * 32767 / max(1, np.abs(a).max())
    fade = min(len(a), sr // 200)
    a[:fade] *= np.linspace(0, 1, fade); a[-fade:] *= np.linspace(1, 0, fade)
    return a.astype(np.int16), sr


def align(wav16, texto):
    """Palabras del guion con tiempos: whisper da tiempos por palabra, difflib los asigna al texto exacto."""
    out = subprocess.run([str(WHISPER / 'main'), '-m', str(WHISPER / 'ggml-small.bin'), '-f', str(wav16), '-l', 'es', '-t', '4',
                          '-ml', '1', '-sow', '-oj', '-of', str(wav16.with_suffix(''))], capture_output=True, text=True)
    if out.returncode: raise RuntimeError(out.stderr[-500:])
    segs = json.loads(wav16.with_suffix('.json').read_text())['transcription']
    rec = [(norm(s['text']), s['offsets']['from'] / 1000, s['offsets']['to'] / 1000) for s in segs if norm(s['text'])]
    words = texto.split()
    a, b = [norm(w) for w in words], [r[0] for r in rec]
    times = [None] * len(words)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        tag, i1, i2, j1, j2 = blk
        if tag == 'equal' or (tag == 'replace' and i2 - i1 == j2 - j1):
            for k in range(i2 - i1): times[i1 + k] = [rec[j1 + k][1], rec[j1 + k][2]]
        elif tag == 'replace':  # n palabras ↔ m reconocidas: repartir el tramo por longitud
            t0, t1 = rec[j1][1], rec[j2 - 1][2]
            lens = np.cumsum([0] + [len(w) for w in words[i1:i2]]); tot = lens[-1] or 1
            for k in range(i2 - i1): times[i1 + k] = [t0 + (t1 - t0) * lens[k] / tot, t0 + (t1 - t0) * lens[k + 1] / tot]
    # huecos sin match: interpolar entre vecinos
    for k, t in enumerate(times):
        if t is None:
            prev = next((times[p][1] for p in range(k - 1, -1, -1) if times[p]), 0.0)
            nxt = next((times[n][0] for n in range(k + 1, len(times)) if times[n]), prev + 0.35)
            times[k] = [prev, max(prev + 0.12, nxt)]
    return [{'palabra': w, 'desde': round(t[0], 3), 'hasta': round(t[1], 3)} for w, t in zip(words, times)], ' '.join(r[0] for r in rec)


def main():
    reel_path = Path(sys.argv[1]).resolve()
    reel = json.loads(reel_path.read_text())
    cli = reel_path.parent.parent
    cfg = reel['voz']
    from piper import PiperVoice
    voice = PiperVoice.load(str(VOCES / f"{cfg.get('modelo', 'es_AR-daniela-high')}.onnx"))
    outdir = cli / 'audio' / 'vo'; outdir.mkdir(parents=True, exist_ok=True)
    rid = reel_path.stem
    result = {}
    for ln in cfg['lineas']:
        txt = ln['texto']
        tts = txt
        for k, v in (ln.get('fonetica') or cfg.get('fonetica') or {}).items(): tts = tts.replace(k, v)
        tts = tts.replace('…', ',').replace('...', ',')
        a, sr = synth(voice, tts, ln.get('velocidad', cfg.get('velocidad', 0.86)))
        wav = outdir / f"{rid}-{ln['id']}.wav"
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(a.tobytes())
        w16 = outdir / f".{rid}-{ln['id']}-16k.wav"
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-ar', '16000', '-ac', '1', str(w16)], check=True)
        words, heard = align(w16, txt)
        for f in outdir.glob(f".{rid}-{ln['id']}-16k*"): f.unlink()
        result[ln['id']] = {'archivo': f"audio/vo/{wav.name}", 'duracion': round(len(a) / sr, 3), 'palabras': words, 'transcripcion_control': heard}
        print(f"{ln['id']}: {len(a) / sr:.2f}s | oído: {heard}")
    (outdir / f"{rid}-palabras.json").write_text(json.dumps(result, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
