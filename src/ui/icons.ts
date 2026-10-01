import { CHESTS, EXEC_FACES, LIFE, type BusinessDef, type ChestType, type CityDef, type OfficeUpgrade } from "../game/data";
import type { Exec } from "../game/state";

/**
 * Iconos de la interfaz. Hoy son emojis; si existe `public/sprites/<clave>.png` y la clave
 * está en `public/sprites/manifest.json`, se usa la imagen. Así se cambian uno a uno sin tocar código.
 * Las claves están documentadas en docs/ART.md («Iconos de la interfaz»).
 */

let available = new Set<string>();

/** Lee el manifiesto de sprites una vez al arrancar. Si falla, todo sigue con emojis. */
export async function loadIcons(): Promise<void> {
  try {
    const res = await fetch("sprites/manifest.json");
    const list: unknown = await res.json();
    if (Array.isArray(list)) available = new Set(list.filter((k): k is string => typeof k === "string"));
  } catch {
    /* sin manifiesto: emojis */
  }
  // Iconos fijos del HTML (menú lateral): <span class="ic" data-icon="ic_missions">📋</span>
  document.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon!, el.textContent ?? "");
  });
}

export const hasIcon = (key: string) => available.has(key);

/** HTML del icono: la imagen si existe, si no el emoji de reserva. */
export function icon(key: string, fallback: string): string {
  return available.has(key) ? `<img class="ico" src="sprites/${key}.png" alt="" draggable="false">` : fallback;
}

export const gem = () => icon("ic_gem", "💎");
export const star = () => icon("ic_star", "⭐");
export const bizIcon = (d: Pick<BusinessDef, "id" | "icon">) => icon(`ic_biz_${d.id}`, d.icon);
export const lifeIcon = (i: number) => icon(`ic_life_${i}`, LIFE[i].icon);
export const flagIcon = (c: Pick<CityDef, "id" | "flag">) => icon(`flag_${c.id}`, c.flag);
export const officeIcon = (o: Pick<OfficeUpgrade, "id" | "icon">) => icon(`ic_office_${o.id}`, o.icon);
export const chestIcon = (t: ChestType) => icon(`chest_${t}`, CHESTS[t].icon);
export const execFace = (e: Pick<Exec, "face">) => {
  const i = EXEC_FACES.indexOf(e.face);
  return i >= 0 ? icon(`exec_${i}`, e.face) : e.face;
};
