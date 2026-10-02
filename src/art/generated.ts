import type Phaser from "phaser";
import { GENERATED_FRAMES as BASE_FRAMES, GENERATED_SHEETS as BASE_SHEETS } from "./generatedFrames";
import { WAREHOUSE_FRAMES } from "./warehouseFrames";
import { VISUAL_FRAMES, VISUAL_SHEETS } from "./visualFrames";
import { RESTAURANT_FRAMES } from "./restaurantFrames";
import { IMG_EXT } from "./imgExt";

export const GENERATED_SHEETS = [...BASE_SHEETS, ...VISUAL_SHEETS, { key: "generated-restaurant", file: "restaurant" }, { key: "generated-warehouse", file: "warehouse" }];
const GENERATED_FRAMES: typeof BASE_FRAMES = { ...BASE_FRAMES, ...RESTAURANT_FRAMES, ...WAREHOUSE_FRAMES, ...VISUAL_FRAMES };
type Spec = { w: number; h: number };
const aliases: Record<string, string> = {};
for (const key of Object.keys(GENERATED_FRAMES)) {
  if (key.startsWith("bld_") && key.endsWith("_2")) aliases[key.slice(0, -2)] = key;
  if (key.startsWith("ch_") && key.endsWith("_0")) {
    aliases[key.slice(0, -1) + "1"] = key;
    aliases[key.slice(0, -1) + "2"] = key;
  }
}

/** Individual PNG overrides remain authoritative. Generated frames share one GPU source per sheet. */
export function artRef(scene: Phaser.Scene, key: string): { texture: string; frame?: string } {
  if (scene.textures.exists(key)) return { texture: key };
  if (aliases[key] && scene.textures.exists(aliases[key])) return { texture: aliases[key] };
  const frame = GENERATED_FRAMES[key] ? key : aliases[key];
  const ref = GENERATED_FRAMES[frame];
  return ref && scene.textures.exists(ref.sheet) && scene.textures.get(ref.sheet).has(frame)
    ? { texture: ref.sheet, frame } : { texture: key };
}
export function hasGeneratedArt(scene: Phaser.Scene, key: string): boolean {
  return artRef(scene, key).frame !== undefined;
}

/** Fit imported silhouettes without stretching; keep their logical anchor sizes small for mobile. */
export function configureGeneratedArt(scene: Phaser.Scene, specs: Record<string, Spec>): void {
  for (const [key, ref] of Object.entries(GENERATED_FRAMES)) {
    if (!hasGeneratedArt(scene, key)) continue;
    const original = specs[key];
    if (!original) continue;
    if (key.startsWith("bld_") && /_[123]$/.test(key)) {
      const width = key.endsWith("_1") ? 156 : 172;
      specs[key] = { w: width, h: Math.round(width * ref.h / ref.w) };
    } else {
      const scale = Math.min(original.w / ref.w, original.h / ref.h);
      specs[key] = { w: ref.w * scale, h: ref.h * scale };
    }
  }
  for (const [key, target] of Object.entries(aliases)) {
    if (!scene.textures.exists(key) && hasGeneratedArt(scene, key)) specs[key] = { ...specs[target] };
  }
}

/** Preserve the actor's logical display size when its animation swaps atlas frames. */
export function swapArt(image: Phaser.GameObjects.Image, key: string): void {
  const w = image.displayWidth, h = image.displayHeight;
  const ref = artRef(image.scene, key);
  image.setTexture(ref.texture, ref.frame).setDisplaySize(w, h);
}

/**
 * Also usable by HTML UI: SVG crops the unchanged sheet using the same frame metadata.
 * The inner <svg> carries its size inline too: CSS rules like `.lux-card svg { width: 46px }` also
 * match it and would shrink the crop window to 46 sheet pixels (empty or cut-off pictures).
 */
export function generatedIcon(key: string, className = "game-icon"): string {
  const ref = GENERATED_FRAMES[key];
  if (!ref) return "";
  return `<svg class="${className}" viewBox="${ref.x} ${ref.y} ${ref.w} ${ref.h}" aria-hidden="true" focusable="false" overflow="hidden"><svg x="${ref.x}" y="${ref.y}" width="${ref.w}" height="${ref.h}" style="width:${ref.w}px;height:${ref.h}px" overflow="hidden"><image href="sprites/generated/${ref.file}.${IMG_EXT}" x="${-ref.x}" y="${-ref.y}" width="${ref.sheetW}" height="${ref.sheetH}"/></svg></svg>`;
}
