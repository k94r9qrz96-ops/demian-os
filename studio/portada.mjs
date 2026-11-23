// Portada aislada por cliente:  node portada.mjs --cliente <slug> --portada <id>
// Lee clients/<slug>/portadas/<id>.json → clients/<slug>/exports/<id>-portada-pro.png (+ vista de grilla 4:5)
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((x) => { const [k, ...v] = x.trim().split(' '); return [k, v.join(' ')]; }));
if (!/^[a-z0-9-]+$/.test(a.cliente || '') || !/^[a-z0-9-]+$/.test(a.portada || '')) { console.error('Uso: node portada.mjs --cliente <slug> --portada <id>'); process.exit(1); }
const root = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(root, 'clients', a.cliente);
const brand = JSON.parse(fs.readFileSync(path.join(dir, 'brand.json'), 'utf8'));
const spec = JSON.parse(fs.readFileSync(path.join(dir, 'portadas', `${a.portada}.json`), 'utf8'));
if (brand.slug !== a.cliente || (spec.cliente && spec.cliente !== a.cliente)) throw new Error('Cliente cruzado');
for (const f of [spec.antes, spec.despues, brand.logo, brand.tipografia.titulos]) if (f && !fs.existsSync(path.join(dir, f))) throw new Error(`Falta ${f}`);
const browserExecutable = process.env.REMOTION_CHROME || ['/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'].find((f) => fs.existsSync(f)) || null;
const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), publicDir: dir});
const inputProps = {...spec, brand: {...brand, handle: brand.handle ?? null, logo: brand.logo ?? null}};
const composition = await selectComposition({serveUrl, id: 'Portada', inputProps, browserExecutable});
fs.mkdirSync(path.join(dir, 'exports'), {recursive: true});
const out = path.join(dir, 'exports', `${a.portada}-portada-pro.png`);
await renderStill({composition, serveUrl, output: out, inputProps, browserExecutable, scale: 1});
const grid = out.replace('.png', '-grilla.jpg');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', 'crop=1080:1350:0:285', '-q:v', '2', grid]);
console.log('✔ portada', out, '\n✔ recorte de grilla (4:5)', grid);
