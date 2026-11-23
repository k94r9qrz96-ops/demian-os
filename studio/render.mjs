// Render aislado por cliente:  node render.mjs --cliente <slug> --reel <id> [--borrador] [--portada <segundo>]
// - El único directorio público del render es clients/<slug>/ → un cliente no puede leer archivos de otro.
// - Salida: clients/<slug>/exports/<id>.mp4 (+ portada .png + hoja de contacto .jpg) y control de calidad.
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => { const [k, ...v] = a.trim().split(' '); return [k, v.join(' ') || true]; }));
const slug = String(args.cliente || ''), id = String(args.reel || '');
if (!/^[a-z0-9-]+$/.test(slug) || !/^[a-z0-9-]+$/.test(id)) { console.error('Uso: node render.mjs --cliente <slug> --reel <id> [--borrador] [--storyboard] [--portada 1.2]'); process.exit(1); }

const root = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(root, 'clients', slug);
const brand = JSON.parse(fs.readFileSync(path.join(dir, 'brand.json'), 'utf8'));
const reel = JSON.parse(fs.readFileSync(path.join(dir, 'reels', `${id}.json`), 'utf8'));
if (brand.slug !== slug || (reel.cliente && reel.cliente !== slug)) throw new Error(`Cliente cruzado: brand.slug=${brand.slug}, reel.cliente=${reel.cliente}, carpeta=${slug}`);

// Solo se aceptan rutas dentro de la carpeta del cliente
const assertLocal = (p) => { if (!p) return; const abs = path.resolve(dir, p); if (!abs.startsWith(dir + path.sep) || !fs.existsSync(abs)) throw new Error(`Archivo inválido o inexistente para ${slug}: ${p}`); };
[brand.tipografia.titulos, brand.tipografia.cuerpo, brand.tipografia.acento, brand.tipografia.marca, brand.logo, brand.logoPartes?.r, brand.logoPartes?.texto, reel.musica?.src, ...(reel.plantilla === 'ReelPro' ? [] : reel.escenas.map((s) => s.src))].forEach(assertLocal);
if (reel.musica && !reel.musica.licencia) throw new Error('La música necesita nota de licencia');

const browserExecutable = process.env.REMOTION_CHROME || ['/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'].find((f) => fs.existsSync(f)) || null;
const out = path.join(dir, 'exports'); fs.mkdirSync(out, {recursive: true});
const PRO = reel.plantilla === 'ReelPro';
let inputProps, timeline;
if (PRO) {
  // ReelPro: requiere tools/voz.py y tools/montaje.py (línea de tiempo + mezcla sincronizadas)
  const tlFile = path.join(dir, 'audio', `${id}-timeline.json`), mixFile = path.join(dir, 'audio', `${id}-mezcla.wav`);
  if (!fs.existsSync(tlFile)) throw new Error(`Falta ${tlFile}: corré python3 -I tools/voz.py y tools/montaje.py`);
  timeline = JSON.parse(fs.readFileSync(tlFile, 'utf8'));
  const imgs = JSON.stringify(timeline.escenas).match(/assets\/[^"]+\.(jpe?g|png|webp|mp4|mov)/gi) || [];
  [...new Set(imgs)].forEach(assertLocal);
  inputProps = {brand: {...brand, handle: brand.handle ?? null, logo: brand.logo ?? null}, timeline, audio: fs.existsSync(mixFile) ? `audio/${id}-mezcla.wav` : null, marcaDeAgua: args.borrador ? 'BORRADOR · NO PUBLICAR' : null};
} else {
  inputProps = {brand: {...brand, handle: brand.handle ?? null, logo: brand.logo ?? null}, escenas: reel.escenas, transicion: reel.transicion ?? 12, subtitulos: reel.subtitulos ?? [], musica: reel.musica ?? null, marcaDeAgua: args.borrador ? 'BORRADOR — NO PUBLICAR' : null};
}

console.log(`▶ ${brand.nombre} / ${id}: empaquetando…`);
const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), publicDir: dir});
const composition = await selectComposition({serveUrl, id: PRO ? 'ReelPro' : 'Reel', inputProps, browserExecutable});
// Modo storyboard: un cuadro por escena (sin video), para aprobar antes de renderizar
if (args.storyboard) {
  let frames = [];
  if (args.cuadros) frames = String(args.cuadros).split(',').map((x) => Math.round(Number(x) * 30));
  else if (PRO) frames = timeline.escenas.flatMap((s) => [0.35, 0.8].map((q) => Math.round((s.desde + (s.hasta - s.desde) * q) * 30)));
  else { const T = inputProps.transicion; let start = 0; reel.escenas.forEach((s) => { const f = Math.round(s.duracion * 30); frames.push(start + Math.round(f * 0.7)); start += f - T; }); }
  const sb = path.join(out, `${id}-storyboard${args.cuadros ? '-cuadros' : ''}`); fs.rmSync(sb, {recursive: true, force: true}); fs.mkdirSync(sb, {recursive: true});
  for (const [i, frame] of frames.entries()) await renderStill({composition, serveUrl, output: path.join(sb, `${String(i + 1).padStart(2, '0')}.png`), frame, inputProps: PRO ? inputProps : {...inputProps, subtitulos: []}, browserExecutable});
  const sheet = path.join(out, `${id}-storyboard${args.cuadros ? '-cuadros' : ''}.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(sb, '*.png'), '-vf', `scale=360:-1,tile=${Math.min(frames.length, 6)}x${Math.ceil(frames.length / 6)}:padding=12:color=0x222222`, '-frames:v', '1', sheet]);
  console.log('✔ storyboard', sheet, `(${(composition.durationInFrames / 30).toFixed(1)} s)`);
  process.exit(0);
}
const file = path.join(out, `${id}${args.borrador ? '-borrador' : ''}.mp4`);
let last = -1;
await renderMedia({composition, serveUrl, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', colorSpace: 'bt709', audioCodec: 'aac', outputLocation: file, inputProps, browserExecutable, concurrency: 4,
  onProgress: ({progress}) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; process.stdout.write(`${p * 10}% `); } } });
console.log('\n✔ video', file);

const sec = Number(args.portada ?? reel.portada ?? 1.2);
const cover = path.join(out, `${id}-portada.png`);
await renderStill({composition, serveUrl, output: cover, frame: Math.round(sec * 30), inputProps: PRO ? {...inputProps, timeline: {...timeline, subtitulos: []}} : {...inputProps, subtitulos: []}, browserExecutable});
console.log('✔ portada', cover);

// Control de calidad: formato exacto exigido por IG/FB/TikTok
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate:format=duration,size', '-of', 'json', file]).toString());
const v = probe.streams.find((s) => s.codec_type === 'video'); const dur = Number(probe.format.duration);
const checks = {'1080x1920': v.width === 1080 && v.height === 1920, 'h264 yuv420p': v.codec_name === 'h264' && v.pix_fmt === 'yuv420p', '30 fps': v.r_frame_rate === '30/1', 'duración 15–30 s': dur >= 15 && dur <= 30.5, 'peso < 100 MB': Number(probe.format.size) < 100e6};
const sheet = path.join(out, `${id}-contacto.jpg`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf', `fps=${(8 / dur).toFixed(4)},scale=270:-1,tile=8x1`, '-frames:v', '1', sheet]);
console.log('✔ hoja de contacto', sheet);
console.log('QA:', Object.entries(checks).map(([k, ok]) => `${ok ? '✅' : '❌'} ${k}`).join('  '), `(${dur.toFixed(1)} s, ${(probe.format.size / 1e6).toFixed(1)} MB)`);
if (Object.values(checks).includes(false)) process.exitCode = 2;
