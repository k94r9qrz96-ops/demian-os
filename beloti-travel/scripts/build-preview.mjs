// Gera preview/beloti-preview.html: a página inteira em UM arquivo (JS, CSS, fontes,
// imagens, vídeos e quadros do cruzeiro embutidos), para abrir no celular sem servidor.
// Pré-requisito: `npx next build --webpack` (o carregamento de chunks do webpack funciona inline).
// Com --artifact gera preview/artifact/index.html para um artefato do Claude: sem <html>/<head>/<body>
// (o visualizador adiciona o esqueleto), <title> no início, noindex e imagens como data: URLs.
const ARTIFACT = process.argv.includes("--artifact");
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
const read = (p) => readFileSync(path.join(OUT, p));
const b64 = (p) => read(p).toString("base64");
const MIME = { webp: "image/webp", mp4: "video/mp4", json: "application/json", woff2: "font/woff2", jpg: "image/jpeg", avif: "image/avif" };
const mime = (p) => MIME[p.split(".").pop()];
const GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

let html = read("index.html").toString();

// 1) ativos carregados pelo JavaScript (resolvidos por lib/asset.ts)
const assets = {};
const add = (p) => { if (existsSync(path.join(OUT, p))) assets[p] = [mime(p), b64(p)]; };
["/media/hero-m.mp4", "/media/sunset-m.mp4", "/media/clouds.mp4", "/media/praias.mp4", "/data/land-110m.json"].forEach((p) => add(p));
for (const f of readdirSync(path.join(OUT, "media/cruise/m"))) add(`/media/cruise/m/${f}`);
for (const f of readdirSync(path.join(OUT, "img"))) {
  if (/-1280\.webp$/.test(f) || /^familia-.*-960\.webp$/.test(f)) add(`/img/${f}`);
}
for (const k of Object.keys(assets)) if (!k.startsWith("/")) delete assets[k];
// helper embutido (mesma lógica de lib/asset.ts) para trocar as imagens do HTML estático
const land = read("data/land-110m.json").toString();
const boot = `<script>window.__LAND=${land};window.__ASSETS=${JSON.stringify(assets)};
window.__pv=function(p){var m=window.__ASSETS[p];return m?"data:"+m[0]+";base64,"+m[1]:null;};</script>`;

// 2) imagens do HTML: placeholder + data-pv com o caminho embutido (cada imagem guardada uma vez)
const toEmbedded = (url) => {
  const m = url.match(/\/img\/([a-z0-9-]+?)-(?:640|480|960|1280|1920)\.(?:avif|webp|jpg)/);
  if (!m) return null;
  const fam = m[1].startsWith("familia");
  const p = `/img/${m[1]}-${fam ? 960 : 1280}.webp`;
  return assets[p] ? p : null;
};
html = html.replace(/<picture>([\s\S]*?)<\/picture>/g, (block) => {
  const seen = new Set();
  return block.replace(/<source([^>]*?)srcSet="([^"]+)"([^>]*)>/gi, (tag, a, set, b) => {
    const media = (tag.match(/media="([^"]+)"/) || [, "all"])[1];
    const p = toEmbedded(set);
    if (!p || seen.has(media)) return `<source${a}srcSet="${GIF} 1w"${b}>`;
    seen.add(media);
    return `<source${a}srcSet="${GIF} 1w" data-pv="${p}"${b}>`;
  }).replace(/(<img[^>]*?)src="\/img\/[^"]+"/g, `$1src="${GIF}"`);
});
html = html.replace(/(poster|src)="(\/img\/[^"]+)"/g, (all, attr, url) => {
  const p = toEmbedded(url);
  return p ? `${attr}="${GIF}" data-pv-${attr}="${p}"` : all;
});
const swap = `<script>document.querySelectorAll("[data-pv]").forEach(function(e){var u=__pv(e.dataset.pv);if(u)e.srcset=u+" 1280w";});
document.querySelectorAll("[data-pv-src]").forEach(function(e){var u=__pv(e.dataset.pvSrc);if(u)e.src=u;});
document.querySelectorAll("[data-pv-poster]").forEach(function(e){var u=__pv(e.dataset.pvPoster);if(u)e.poster=u;});</script>`;

// 3) CSS inline com fontes embutidas
html = html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g, (_, href) => { // (substituto por função: seguro)
  const css = read(href).toString().replace(/url\("?(\/fonts\/[^")]+)"?\)/g, (m, f) => `url(data:font/woff2;base64,${b64(f)})`);
  return `<style>${css}</style>`;
});
// 4) remove preloads/ícones externos
html = html.replace(/<link rel="(preload|apple-touch-icon|icon|canonical)"[^>]*\/?>/g, "");

// 5) scripts: todos os chunks inline no fim do <body> (o runtime do webpack registra por id)
const srcs = [...html.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
html = html.replace(/<script src="([^"]+)"[^>]*><\/script>/g, "");
const extra = readdirSync(path.join(OUT, "_next/static/chunks")).filter((f) => /^\d+\.[a-f0-9]+\.js$/.test(f)).map((f) => `/_next/static/chunks/${f}`);
const order = [...srcs.filter((s) => !/polyfills|webpack-/.test(s)), ...extra, ...srcs.filter((s) => /webpack-/.test(s))];
const inline = order.map((s) => `<script>${read(s).toString().replace(/<\/script/gi, "<\\/script")}</script>`).join("\n");

// função como substituto: o código dos chunks contém "$&", "$'" etc., que String.replace interpretaria
html = html.replace("<head>", () => `<head>${boot}`);
html = html.replace("</body>", () => `${swap}\n${inline}\n</body>`);

let file = "preview/beloti-preview.html";
if (ARTIFACT) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charSet="utf-8"\/>|<meta name="viewport"[^>]*\/>|<title>[^<]*<\/title>/g, "");
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  // o reset do visualizador (14px, fonte do sistema) vem sem camada e venceria o @layer base do Tailwind
  const fix = `<style>body{font-family:var(--font-sans);font-size:16px;line-height:1.5;background:#f8f7f3;color:#08273b}</style>`;
  html = `<title>Beloti Travel Demo</title>\n<meta name="robots" content="noindex, nofollow">\n${fix}\n${head}\n${body}`;
  mkdirSync("preview/artifact", { recursive: true });
  file = "preview/artifact/index.html";
}
mkdirSync("preview", { recursive: true });
writeFileSync(file, html);
console.log(file, (Buffer.byteLength(html) / 1048576).toFixed(1) + " MB", "| scripts:", order.length, "| assets:", Object.keys(assets).length);
