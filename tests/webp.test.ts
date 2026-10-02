import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** El juego carga la versión .webp de cada PNG (ver scripts/build-webp.mjs): no puede faltar ninguna. */
const pngs = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? pngs(join(dir, e.name)) : e.name.endsWith(".png") ? [join(dir, e.name)] : []));

describe("imágenes WebP", () => {
  it("cada PNG de public/sprites tiene su .webp (si añades arte: npm run art:webp)", () => {
    const missing = pngs("public/sprites").filter((p) => {
      try {
        return statSync(p.replace(/\.png$/, ".webp")).size === 0;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });
});
