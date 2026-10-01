import { GENERATED_SHEETS, configureGeneratedArt, hasGeneratedArt } from "../art/generated";
import Phaser from "phaser";
import { ART, BLD_W, buildArt } from "../art/catalog";
import { DPR } from "./common";

/**
 * Carga el arte. `public/sprites/manifest.json` lista las claves que tienen PNG propio
 * (p. ej. ["bld_restaurant", "ch_cook_0"]); el resto se dibuja por código.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    for (const sheet of GENERATED_SHEETS) {
      this.load.atlas(sheet.key, `sprites/generated/${sheet.file}.png`, `sprites/generated/${sheet.file}.json`);
    }
    this.load.json("sprite-manifest", "sprites/manifest.json");
    this.load.once("filecomplete-json-sprite-manifest", (_key: string, _type: string, data: unknown) => {
      if (!Array.isArray(data)) return;
      for (const key of data) if (typeof key === "string" && ART[key]) this.load.image(key, `sprites/${key}.png`);
    });
  }

  create(): void {
    // Canvas text textures must be generated after the bundled fonts are available.
    void Promise.all([document.fonts.load('16px "Lilita One"'), document.fonts.load('16px "Rubik"'), document.fonts.load('700 16px "Rubik"')])
      .then(() => this.finishArt(), () => this.finishArt());
  }

  private finishArt(): void {
    configureGeneratedArt(this, ART);
    // Si de un personaje solo hay la pose quieta (_0), se usa también para caminar.
    for (const key of Object.keys(ART)) {
      const m = /^(ch_\w+)_([12])$/.exec(key);
      if (!m || hasGeneratedArt(this, key) || this.textures.exists(key) || !this.textures.exists(`${m[1]}_0`)) continue;
      this.textures.addImage(key, this.textures.get(`${m[1]}_0`).getSourceImage() as HTMLImageElement);
    }
    // Los edificios en PNG se recortan al dibujo real y se ajustan al ancho de la parcela.
    for (const key of Object.keys(ART)) if (key.startsWith("bld_") && this.textures.exists(key)) fitBuilding(this, key);
    buildArt(this, DPR);
    this.game.events.emit("art-ready");
  }
}

/** Caja del contenido visible (píxeles con algo de opacidad) de una imagen. */
export function alphaBounds(data: Uint8ClampedArray, w: number, h: number, threshold = 8): { x: number; y: number; w: number; h: number } | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Recorta el margen transparente de un edificio en PNG y fija su tamaño lógico para que
 * la base ocupe el ancho de la parcela. Así cualquier imagen encaja, venga como venga encuadrada.
 */
function fitBuilding(scene: Phaser.Scene, key: string): void {
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  if (!src.width || !src.height) return;
  const probe = document.createElement("canvas");
  probe.width = src.width;
  probe.height = src.height;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(src, 0, 0);
  const box = alphaBounds(ctx.getImageData(0, 0, src.width, src.height).data, src.width, src.height);
  if (!box) return;
  // Ancho lógico con el que la base ocupa la parcela, y 6 px transparentes debajo como el arte
  // por código (las escenas apoyan el edificio en el vértice inferior de la parcela con ese margen).
  const w = BLD_W - 8;
  const pad = Math.round((6 * box.w) / w);
  const out = document.createElement("canvas");
  out.width = box.w;
  out.height = box.h + pad;
  out.getContext("2d")!.drawImage(probe, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, out);
  ART[key] = { w, h: Math.round((w * out.height) / out.width) };
}
