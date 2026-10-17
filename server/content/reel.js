// Exportación de reels con ffmpeg a partir de FOTOS REALES.
// - Nunca se deforma una foto: se encuadra con "fit" sobre fondo desenfocado de la misma foto (o "cover" recortando).
// - Movimientos de cámara (Ken Burns), transiciones, textos animados y audio autorizado.
// - Audio: archivo subido con nota de licencia, o pista original sintetizada aquí (sin derechos de terceros).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

export const FORMATS = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080] };
const TRANSITIONS = ['smoothleft', 'circleopen', 'slideup', 'fadeblack', 'wiperight', 'smoothup', 'radial', 'slideleft'];
const MOVES = ['zoomin', 'panright', 'zoomout', 'panup', 'zoomin_tl', 'panleft'];

export function fontPath() {
  const candidates = [
    path.join(config.root, 'server', 'assets', 'fonts', 'Poppins-Bold.ttf'),
    '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  ];
  return candidates.find((f) => fs.existsSync(f));
}

export function run(cmd, args, { signal, timeoutMs = 10 * 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => { err += d; if (err.length > 200_000) err = err.slice(-100_000); });
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    const onAbort = () => p.kill('SIGKILL');
    signal?.addEventListener('abort', onAbort, { once: true });
    p.on('close', (code) => {
      clearTimeout(t);
      signal?.removeEventListener('abort', onAbort);
      if (signal?.aborted) return reject(new Error('Render cancelado'));
      code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} terminó con código ${code}: ${err.split('\n').filter(Boolean).slice(-14).join(' | ')}`));
    });
  });
}

function wrap(text, max = 20) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 4).join('\n');
}

function moveExpr(move, d) {
  const p = `on/${d}`;
  switch (move) {
    case 'zoomout': return { z: `1.14-0.14*${p}`, x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' };
    case 'panright': return { z: '1.10', x: `(iw-iw/zoom)*${p}`, y: 'ih/2-(ih/zoom/2)' };
    case 'panleft': return { z: '1.10', x: `(iw-iw/zoom)*(1-${p})`, y: 'ih/2-(ih/zoom/2)' };
    case 'panup': return { z: '1.10', x: 'iw/2-(iw/zoom/2)', y: `(ih-ih/zoom)*(1-${p})` };
    case 'zoomin_tl': return { z: `1+0.12*${p}`, x: `(iw/2-(iw/zoom/2))*(1-0.3*${p})`, y: `(ih/2-(ih/zoom/2))*(1-0.3*${p})` };
    default: return { z: `1+0.12*${p}`, x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' };
  }
}

// Pista original: progresión Am–F–C–G con pad suave y pulso a 120 bpm (generada matemáticamente).
function musicExpr() {
  const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
  const pad = chords.map((c, i) => `between(mod(t,8),${i * 2},${i * 2 + 2})*(${c.map((f) => `sin(2*PI*${f}*t)+0.35*sin(2*PI*${f * 2}*t)`).join('+')})`).join('+');
  return `0.09*(${pad})*(0.75+0.25*sin(2*PI*0.5*t))+0.22*sin(2*PI*55*t)*exp(-9*mod(t,0.5))+0.03*sin(2*PI*880*t)*exp(-30*mod(t+0.25,0.5))`;
}

/**
 * @param {object} o
 * @param {{path:string, text?:string}[]} o.scenes  fotos reales en orden, con texto opcional
 * @param {string} o.outFile
 * @param {'9:16'|'4:5'|'1:1'} [o.format]
 * @param {'fit'|'cover'} [o.framing]
 * @param {number} [o.sceneSeconds]
 * @param {{path:string, license:string}|null} [o.audio]
 * @param {{title?:string, cta?:string, handle?:string, accent?:string}} [o.brand]
 */
export async function renderReel(o, { signal } = {}) {
  const { scenes, outFile, format = '9:16', framing = 'fit', sceneSeconds = 2.8, audio = null, brand = {} } = o;
  if (!scenes?.length || scenes.length < 2) throw Object.assign(new Error('Se necesitan al menos 2 fotos reales para el reel'), { noRetry: true });
  if (scenes.length > 12) throw Object.assign(new Error('Máximo 12 fotos por reel'), { noRetry: true });
  const [W, H] = FORMATS[format];
  const fps = 30;
  const T = 0.6; // duración de transición
  const D = sceneSeconds;
  const frames = Math.round(D * fps);
  const font = fontPath();
  if (!font) throw new Error('No hay tipografía disponible para los textos');
  const accent = (brand.accent || '#B8F32D').replace('#', '0x');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const work = fs.mkdtempSync(path.join(path.dirname(outFile), '.render-'));

  const args = ['-y', '-hide_banner', '-loglevel', process.env.FFLOG || 'error'];
  scenes.forEach((s) => args.push('-i', s.path));
  const hasEnd = !!(brand.cta || brand.handle);
  const parts = [];
  scenes.forEach((s, i) => {
    const mv = moveExpr(MOVES[i % MOVES.length], frames);
    const base = framing === 'cover'
      ? `[${i}:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},setsar=1[c${i}]`
      : `[${i}:v]split=2[a${i}][b${i}];[a${i}]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=28:4,eq=brightness=-0.10:saturation=0.9,scale=${W * 2}:${H * 2}[bg${i}];` +
        `[b${i}]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=decrease[fg${i}];[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,setsar=1[c${i}]`;
    let chain = `${base};[c${i}]zoompan=z='${mv.z}':x='${mv.x}':y='${mv.y}':d=${frames}:s=${W}x${H}:fps=${fps},format=yuv420p,setpts=PTS-STARTPTS`;
    // degradé inferior para legibilidad + barra de acento
    chain += `,drawbox=x=0:y=ih*0.56:w=iw:h=ih*0.06:color=black@0.10:t=fill,drawbox=x=0:y=ih*0.62:w=iw:h=ih*0.06:color=black@0.20:t=fill,drawbox=x=0:y=ih*0.68:w=iw:h=ih*0.32:color=black@0.34:t=fill`;
    if (s.text) {
      const tf = path.join(work, `t${i}.txt`);
      fs.writeFileSync(tf, wrap(s.text, format === '9:16' ? 18 : 24));
      const fs0 = format === '9:16' ? 74 : 64;
      chain += `,drawtext=fontfile='${font}':textfile='${tf}':fontsize=${fs0}:fontcolor=white:line_spacing=14:text_align=C:` +
        `x=(w-text_w)/2:y=h*0.70+40*max(0\\,1-(t-0.25)/0.45):alpha='if(lt(t\\,0.25)\\,0\\,min(1\\,(t-0.25)/0.45))':` +
        `shadowcolor=black@0.55:shadowx=0:shadowy=4`;
      chain += `,drawbox=x=(iw-160)/2:y=ih*0.70-36:w='160*min(1\\,max(0\\,(t-0.2)/0.5))':h=8:color=${accent}@1:t=fill`;
    }
    if (brand.handle) {
      const hf = path.join(work, 'handle.txt');
      fs.writeFileSync(hf, brand.handle);
      chain += `,drawtext=fontfile='${font}':textfile='${hf}':fontsize=34:fontcolor=white@0.85:x=56:y=86`;
    }
    parts.push(`${chain}[v${i}]`);
  });

  let inputsCount = scenes.length;
  if (hasEnd) {
    const ef = path.join(work, 'end.txt');
    fs.writeFileSync(ef, wrap(brand.cta || '', 18));
    const hf2 = path.join(work, 'endhandle.txt');
    fs.writeFileSync(hf2, brand.handle || '');
    parts.push(`color=c=0x0E1014:s=${W}x${H}:r=${fps}:d=${D},format=yuv420p,` +
      `drawbox=x=(iw-220)/2:y=ih*0.42:w='220*min(1\\,t/0.6)':h=10:color=${accent}@1:t=fill,` +
      (brand.cta ? `drawtext=fontfile='${font}':textfile='${ef}':fontsize=78:fontcolor=white:line_spacing=16:text_align=C:x=(w-text_w)/2:y=h*0.46:alpha='min(1\\,t/0.5)',` : '') +
      `drawtext=fontfile='${font}':textfile='${hf2}':fontsize=44:fontcolor=${accent}:x=(w-text_w)/2:y=h*0.66:alpha='min(1\\,max(0\\,(t-0.3)/0.5))'[v${inputsCount}]`);
    inputsCount += 1;
  }

  // Encadenar transiciones
  let last = 'v0';
  for (let k = 1; k < inputsCount; k++) {
    const offset = (k * (D - T)).toFixed(3);
    const out = k === inputsCount - 1 ? 'vout' : `x${k}`;
    parts.push(`[${last}][v${k}]xfade=transition=${TRANSITIONS[(k - 1) % TRANSITIONS.length]}:duration=${T}:offset=${offset}[${out}]`);
    last = out;
  }
  const total = inputsCount * D - (inputsCount - 1) * T;

  let audioNote;
  if (audio?.path) {
    args.push('-i', audio.path);
    parts.push(`[${scenes.length}:a]atrim=0:${total.toFixed(2)},asetpts=PTS-STARTPTS,afade=t=in:d=0.5,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2,volume=0.9[aout]`);
    audioNote = `Audio provisto: ${audio.license}`;
  } else {
    args.push('-f', 'lavfi', '-i', `aevalsrc='${musicExpr()}':s=44100:d=${total.toFixed(2)}`);
    parts.push(`[${scenes.length}:a]lowpass=f=4200,afade=t=in:d=0.8,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5,volume=0.8[aout]`);
    audioNote = 'Pista original generada por Demian OS (sintetizada, sin derechos de terceros)';
  }

  const filterFile = path.join(work, 'graph.txt');
  fs.writeFileSync(filterFile, parts.join(';\n'));
  args.push('-filter_complex_script', filterFile, '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', '-t', total.toFixed(2), outFile);
  try {
    await run('ffmpeg', args, { signal });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  return { file: outFile, expectedSeconds: total, width: W, height: H, audioNote, transitions: inputsCount - 1 };
}

// Control de calidad: formato, duración, audio y decodificación completa sin errores.
export async function qaVideo(file, { expect = {} } = {}) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  if (!fs.existsSync(file)) { add('archivo existe', false, file); return { ok: false, checks }; }
  const { out } = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  const info = JSON.parse(out);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  const dur = Number(info.format.duration);
  add('pista de video H.264', v?.codec_name === 'h264', v?.codec_name);
  add('píxeles yuv420p (compatible con celulares)', v?.pix_fmt === 'yuv420p', v?.pix_fmt);
  if (expect.width) add(`resolución ${expect.width}×${expect.height}`, v?.width === expect.width && v?.height === expect.height, `${v?.width}×${v?.height}`);
  add('relación de aspecto de píxel 1:1 (sin deformar)', !v?.sample_aspect_ratio || ['1:1', '0:1'].includes(v.sample_aspect_ratio), v?.sample_aspect_ratio || '1:1');
  add('pista de audio AAC', a?.codec_name === 'aac', a?.codec_name || 'sin audio');
  if (expect.seconds) add(`duración ≈ ${expect.seconds.toFixed(1)} s`, Math.abs(dur - expect.seconds) < 0.6, `${dur.toFixed(2)} s`);
  const moovFirst = fs.readFileSync(file).subarray(0, 4096).includes(Buffer.from('moov'));
  add('inicio rápido (faststart) para reproducir en web', moovFirst, moovFirst ? 'moov al inicio' : 'moov al final');
  const dec = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-']);
  add('decodificación completa sin errores', dec.err.trim() === '', dec.err.trim().slice(0, 200) || 'sin errores');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return { ok: checks.every((c) => c.ok), checks, duration: dur, size: fs.statSync(file).size, sha256: sha };
}

export async function thumbnail(file, outPng, at = 1.0) {
  await run('ffmpeg', ['-y', '-v', 'error', '-ss', String(at), '-i', file, '-frames:v', '1', '-vf', 'scale=360:-2', outPng]);
  return outPng;
}
