import { SYMBOL_ICONS, VISUAL_ICON_SHAPES } from "./visualIcons";
import { rankInfo } from "../game/ranks";
import { CHESTS, EXEC_FACES, LIFE, type BusinessDef, type ChestType, type CityDef, type OfficeUpgrade } from "../game/data";
import type { Exec } from "../game/state";

import { generatedIcon } from "../art/generated";
import { IMG_EXT } from "../art/imgExt";
/** Original vector UI kit. All paths use a 48px logical canvas, no remote assets. */
const shapes: Record<string, string> = {
  ...VISUAL_ICON_SHAPES,
  production: '<path fill="#ffd36b" d="M6 21 20 12v9l14-9v9h8v21H6Z"/><path d="M13 29h5m7 0h5m-17 7h5m7 0h5M35 7h6v14"/>',
  transport: '<rect x="5" y="12" width="24" height="24" rx="4" fill="#91d7fb"/><path fill="#ffd36b" d="M29 19h8l6 9v8H29Z"/><circle cx="13" cy="37" r="5" fill="#263e55"/><circle cx="35" cy="37" r="5" fill="#263e55"/>',
  sale: '<path fill="#3ddc97" d="M8 18h32l-3 24H11Z"/><path d="M17 18v-6a7 7 0 0 1 14 0v6"/><path fill="#ffd36b" d="m24 24 3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1Z"/>',
  bike: '<circle cx="11" cy="33" r="8" fill="#aad5eb"/><circle cx="37" cy="33" r="8" fill="#aad5eb"/><path stroke="#3ddc97" stroke-width="4" d="m11 33 9-15 10 15H11m9-15h12l5 15M31 12h6M17 16h8"/><circle cx="25" cy="9" r="5" fill="#ffd3a2"/>',
  menu: '<rect x="5" y="6" width="38" height="36" rx="8" fill="#ffd36b"/><path d="M14 16h20M14 24h20M14 32h20"/>',
  calendar: '<rect x="7" y="10" width="34" height="32" rx="5" fill="#eff6ff"/><path d="M7 20h34M16 5v11M32 5v11M16 28h5M28 28h5M16 35h5"/>',
  clock: '<circle cx="24" cy="24" r="19" fill="#bce7ff"/><path d="M24 12v13l9 5"/>',
  close: '<rect x="5" y="5" width="38" height="38" rx="9" fill="#e0533d"/><path stroke="#fff" stroke-width="5" d="m15 15 18 18m0-18L15 33"/>',
  cash: '<circle cx="24" cy="24" r="18" fill="#ffc94f"/><circle cx="24" cy="24" r="13" fill="#ffe99a"/><path d="M29 15h-7l-5 9 5 9h7M14 22h14M14 26h12"/>',
  gem: '<path fill="#83e5ff" d="m6 18 9-10h18l9 10-18 23Z"/><path fill="#d4f8ff" d="m15 8 9 10 9-10M6 18h36L24 41 16 18"/><path d="M6 18h36M15 8l9 10 9-10M16 18l8 23 8-23"/>',
  missions: '<rect x="11" y="9" width="27" height="33" rx="5" fill="#edf5ff"/><rect x="18" y="5" width="13" height="9" rx="3" fill="#ffc94f"/><path d="m15 23 3 3 5-6M27 23h6m-18 10 3 3 5-6M27 33h6"/>',
  daily: '<rect x="9" y="21" width="30" height="21" rx="4" fill="#ff7d89"/><rect x="6" y="16" width="36" height="9" rx="3" fill="#ff9eab"/><path fill="#ffe092" d="M21 16h7v26h-7z"/><path d="M24 16c-22 0-12-20 0 0 12-20 22 0 0 0"/>',
  execs: '<rect x="5" y="15" width="38" height="27" rx="6" fill="#cc9060"/><path d="M16 15v-5h16v5M5 25q19 9 38 0"/><rect x="20" y="25" width="8" height="8" rx="2" fill="#ffe092"/>',
  premium: '<rect x="5" y="15" width="38" height="27" rx="6" fill="#ffd36c"/><path d="M16 15v-5h16v5M5 25q19 9 38 0"/><path fill="#fff5c2" d="m24 22 3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1Z"/>',
  trophy: '<path fill="#ffd36c" d="M15 8h18v15q-1 10-9 10t-9-10Z"/><path d="M15 12H7v7q0 8 10 9M33 12h8v7q0 8-10 9M24 33v7"/><rect x="15" y="39" width="18" height="5" rx="2" fill="#ffe99a"/>',
  settings: '<path fill="#b6cce1" d="m19 5 10 0 2 7 7 1 5 9-5 5 1 7-9 7-6-4-6 4-9-7 1-7-5-5 5-9 7-1Z"/><circle cx="24" cy="24" r="8" fill="#244862"/>',
  city: '<path fill="#91c8e8" d="M7 19h13v23H7zM20 6h14v36H20zM34 25h8v17h-8z"/><path d="M12 25h3m-3 7h3m10-18h4m-4 7h4m-4 7h4M4 42h40"/>',
  ipo: '<rect x="6" y="7" width="36" height="35" rx="5" fill="#eaf6ff"/><path d="M13 33V16M13 33h23"/><path stroke="#20996c" d="m16 28 7-7 6 3 8-11m-7 0h7v7"/>',
  world: '<circle cx="24" cy="24" r="19" fill="#61cffa"/><path fill="#6de2a1" d="m9 11 12-4 3 8-7 6 2 8-8-2-6-9m25-2 10 5-3 14-9 3-3-10 6-5Z"/><ellipse cx="24" cy="24" rx="11" ry="19"/><path d="M6 24h36"/>',
  star: '<path fill="#ffd36c" d="m24 5 6 12 14 2-10 10 2 14-12-7-12 7 2-14L4 19l14-2Z"/>',
  lock: '<rect x="10" y="21" width="28" height="22" rx="5" fill="#aec3d5"/><path d="M16 21v-8a8 8 0 0 1 16 0v8M24 29v6"/>',
  manager: '<circle cx="24" cy="14" r="9" fill="#ffcda0"/><path fill="#74afdc" d="M8 43v-8q1-12 16-12t16 12v8Z"/><path fill="#fff" d="m16 24 8 9 8-9-4 18h-8Z"/><path fill="#ffcf62" d="m24 29 4 5-4 8-4-8Z"/>',
  check: '<circle cx="24" cy="24" r="19" fill="#6ee4af"/><path d="m13 24 8 8 14-16"/>',
};
const names: Record<string, string> = {
  ...SYMBOL_ICONS,
  '💶':'cash','💰':'cash','💎':'gem','📋':'missions','🎯':'missions','🎁':'daily',
  '💼':'execs','👜':'premium','🏆':'trophy','🏅':'trophy','⚙️':'settings',
  '🏙️':'city','📈':'ipo','🌍':'world','🗺️':'world','⭐':'star','🔒':'lock','👔':'manager','✅':'check',
};
export function icon(name: string, fallback?: string): string {
  if (available.has(name)) return `<img class="ico" src="sprites/${name}.${IMG_EXT}" alt="" draggable="false">`;
  const generated = generatedIcon(name);
  if (generated) return generated;
  if (name === "ic_biz_bike") return icon("bike");
  if (name.startsWith("ic_biz_")) return icon(`bld_${name.slice(7)}_1`);
  if (name.startsWith("ic_life_")) return icon(["lux_parents", "lux_flat", "home", "lux_flat", "lux_penthouse", "lux_villa", "lux_mansion", "lux_yacht", "lux_island", "lux_rocket"][Number(name.slice(8))] ?? "home");
  if (name.startsWith("ic_office_")) return icon(({ brand: "world", team: "manager", floors: "order", suppliers: "invite", offline: "moon", hustle: "bolt", luck: "hype" } as Record<string, string>)[name.slice(10)] ?? "city");
  if (name === "chest_free") return icon("chest_normal");
  name = name.replace(/^ic_/, "");
  if (name === "league") name = "trophy";
  if (!shapes[name] && fallback) return iconFor(fallback);
  const generatedKey = { cash: "coin", gem: "ic_gem", execs: "chest_normal", premium: "chest_premium" }[name as "cash" | "gem" | "execs" | "premium"];
  if (generatedKey) return available.has(generatedKey) ? icon(generatedKey) : generatedIcon(generatedKey);
  return `<svg class="game-icon" viewBox="0 0 48 48" fill="none" stroke="#24445c" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[name] ?? shapes.star}</svg>`;
}
export function iconFor(symbol: string): string {
  return icon(names[symbol] ?? "star");
}
/** Replace only decorative icon slots, never labels or game state. Idempotent. */
const emojiTokens = /(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;
export function decorateIcons(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.ic,.sicon,.face,.mface,.gicon,.bicon,.cicon,.bigchest,.tw-ic,.rv-face,.shop-ic').forEach(el => {
    if (el.querySelector('svg,img')) return;
    const symbol = el.textContent?.trim() ?? '';
    if (names[symbol]) el.innerHTML = icon(names[symbol]);
  });
  // Preserve text, translations and numeric formatting; replace decorative glyphs only.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest('svg,script,style,input,textarea,option,[contenteditable],.nickname,[data-nickname]')) continue;
    emojiTokens.lastIndex = 0;
    if (emojiTokens.test(node.data)) texts.push(node);
  }
  for (const node of texts) {
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    emojiTokens.lastIndex = 0;
    for (const match of node.data.matchAll(emojiTokens)) {
      fragment.append(document.createTextNode(node.data.slice(cursor, match.index)));
      const span = document.createElement('span');
      span.className = 'inline-icon';
      span.setAttribute('aria-hidden', 'true');
      span.innerHTML = iconFor(match[0]);
      fragment.append(span);
      cursor = match.index! + match[0].length;
    }
    fragment.append(document.createTextNode(node.data.slice(cursor)));
    node.replaceWith(fragment);
  }
}

let available = new Set<string>();

/** Lee el manifiesto de sprites una vez al arrancar. Si falla, quedan los atlas y el kit vectorial local. */
export async function loadIcons(): Promise<void> {
  try {
    const res = await fetch("sprites/manifest.json");
    const list: unknown = await res.json();
    if (Array.isArray(list)) available = new Set(list.filter((k): k is string => typeof k === "string"));
  } catch {
    /* Sin manifiesto: atlas y vectores locales. */
  }
  // Iconos fijos del HTML (menú lateral): <span class="ic" data-icon="ic_missions">📋</span>
  document.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon!, el.textContent ?? "");
  });
}

/** ¿Hay imagen propia (PNG o atlas generado) para esta clave? */
export const hasIcon = (key: string) => available.has(key) || !!generatedIcon(key);


export const gem = () => icon("ic_gem", "💎");
export const star = () => icon("ic_star", "⭐");
export const bizIcon = (d: Pick<BusinessDef, "id" | "icon">) => icon(`ic_biz_${d.id}`, d.icon);
export const lifeIcon = (i: number) => icon(`ic_life_${i}`, LIFE[i].icon);
export const flagIcon = (c: Pick<CityDef, "id" | "flag">) => icon(`flag_${c.id}`, c.flag);
export const officeIcon = (o: Pick<OfficeUpgrade, "id" | "icon">) => icon(`ic_office_${o.id}`, o.icon);
export const chestIcon = (t: ChestType) => icon(`chest_${t}`, CHESTS[t].icon);
export const execFace = (e: Pick<Exec, "face" | "founder">) => {
  if (e.founder) return icon("exec_founder", e.face);
  const i = EXEC_FACES.indexOf(e.face);
  return i >= 0 ? icon(`exec_${i}`, e.face) : e.face;
};

/** Medalla de un rango (1 bronce … 5 leyenda) para la interfaz: PNG `rank_<n>` si existe, si no el emoji. */
export function rankIcon(n: number): string {
  const r = rankInfo(n);
  if (!r) return "";
  return `<span class="rank-ic r${n}">${icon(`rank_${n}`)}</span>`;
}
