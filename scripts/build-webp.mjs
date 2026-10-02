// Crea una copia .webp de cada PNG del juego (public/sprites): pesa 3–5 veces menos y el juego la usa
// si el navegador la sabe leer (todos los Android y iPhone actuales). El PNG sigue siendo la fuente.
// Ejecutar después de cambiar arte: `npm run art:webp`. Solo rehace los que han cambiado.
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = "public/sprites";
const QUALITY = 88;

async function* pngs(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* pngs(p);
    else if (e.name.endsWith(".png")) yield p;
  }
}

let made = 0, before = 0, after = 0;
for await (const png of pngs(ROOT)) {
  const webp = png.replace(/\.png$/, ".webp");
  const src = await stat(png);
  const out = await stat(webp).catch(() => null);
  if (!out || out.mtimeMs < src.mtimeMs) {
    await sharp(png).webp({ quality: QUALITY, alphaQuality: 100, effort: 6 }).toFile(webp);
    made++;
  }
  before += src.size;
  after += (await stat(webp)).size;
}
console.log(`WebP: ${made} nuevos · ${(before / 1e6).toFixed(1)} MB en PNG → ${(after / 1e6).toFixed(1)} MB en WebP`);
