// Gera imagens responsivas (AVIF + WebP + JPG fallback) a partir de media-src/.
// Uso: npm run images
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("media-src");
const OUT = path.resolve("public/img");
const WIDTHS = { default: [640, 1280, 1920], familia: [480, 960], "logo-original": [] };

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f));
for (const file of files) {
  const name = file.replace(/\.(jpe?g|png)$/i, "");
  const key = name.startsWith("familia") ? "familia" : name in WIDTHS ? name : "default";
  const img = sharp(path.join(SRC, file)).rotate();
  const meta = await img.metadata();
  for (const w of WIDTHS[key]) {
    const width = Math.min(w, meta.width ?? w);
    const base = img.clone().resize({ width, withoutEnlargement: true });
    await base.clone().avif({ quality: 50, effort: 5 }).toFile(path.join(OUT, `${name}-${w}.avif`));
    await base.clone().webp({ quality: 72 }).toFile(path.join(OUT, `${name}-${w}.webp`));
    if (w === WIDTHS[key][1]) await base.clone().jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(OUT, `${name}-${w}.jpg`));
  }
  console.log("✓", name, `${meta.width}x${meta.height}`);
}
// Open Graph 1200x630 a partir da costa do Rio
await sharp(path.join(SRC, "praias-rio.jpg")).resize(1200, 630, { fit: "cover", position: "attention" })
  .jpeg({ quality: 80, mozjpeg: true }).toFile(path.resolve("public/og-image.jpg"));
// Ícones a partir do logotipo original da marca
await sharp(path.join(SRC, "logo-original.jpg")).resize(180, 180).png().toFile(path.resolve("public/apple-touch-icon.png"));
await sharp(path.join(SRC, "logo-original.jpg")).resize(48, 48).png().toFile(path.resolve("app/icon.png"));
console.log("done");
