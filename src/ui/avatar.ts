import { itemById, type LuxuryCat } from "../game/luxury";
import { icon } from "./icons";

/**
 * Personaje de «Mi vida» dibujado en SVG por capas: cuerpo, ropa y joyas.
 * Si existe el PNG `avatar_<ropa>` (ver docs/ART.md, «Mi vida»), se usa en su lugar.
 */

interface Outfit {
  top: string;
  topDark: string;
  pants: string;
  shoes: string;
  head: "cap" | "hair" | "slick";
  hat?: string;
  neck?: "tie" | "bowtie";
  neckColor?: string;
  lapel?: string;
  glasses?: boolean;
  glow?: string;
}

const OUTFITS: Record<string, Outfit> = {
  tracksuit: { top: "#27ae60", topDark: "#1e8449", pants: "#2c3e50", shoes: "#ecf0f1", head: "cap", hat: "#27ae60" },
  hoodie: { top: "#8395a7", topDark: "#576574", pants: "#34495e", shoes: "#ff6b6b", head: "hair" },
  suit: { top: "#1f3a93", topDark: "#16296b", pants: "#1b2631", shoes: "#2b1d14", head: "hair", neck: "tie", neckColor: "#f5c542", lapel: "#f4f6f7" },
  designer: { top: "#8e2b4d", topDark: "#6a1f39", pants: "#2d1b26", shoes: "#111111", head: "slick", neck: "tie", neckColor: "#111111", lapel: "#f8e1ea", glasses: true },
  goldtux: { top: "#15151c", topDark: "#000000", pants: "#15151c", shoes: "#111111", head: "slick", neck: "bowtie", neckColor: "#f5c542", lapel: "#f5c542" },
  vampire: { top: "#1b1b24", topDark: "#0d0d12", pants: "#1b1b24", shoes: "#111111", head: "slick", neck: "bowtie", neckColor: "#b3122e", lapel: "#b3122e", glow: "#b3122e" },
  neonsuit: { top: "#d63384", topDark: "#9c1c5c", pants: "#2b1a4a", shoes: "#6fe3ff", head: "slick", neck: "tie", neckColor: "#6fe3ff", lapel: "#6fe3ff", glasses: true, glow: "#ff6fd8" },
};

export function avatarSvg(shown: Partial<Record<LuxuryCat, string>>, available: (key: string) => boolean): string {
  const outfitId = shown.outfit ?? "tracksuit";
  if (available(`avatar_${outfitId}`)) return `<div class="avatar-img">${icon(`avatar_${outfitId}`)}</div>`;
  const o = OUTFITS[outfitId] ?? OUTFITS.tracksuit;
  const jewel = shown.jewel ?? "";
  const skin = "#f1c27d";
  const hair = "#3b2a1e";
  const head =
    o.head === "cap"
      ? `<path d="M52 42q28-22 56 0v6H52z" fill="${o.hat}"/><path d="M100 46q16 0 22 6H98z" fill="${o.hat}"/>`
      : o.head === "slick"
        ? `<path d="M50 52q2-30 30-30t30 30q-6-14-30-14t-30 14z" fill="${hair}"/>`
        : `<path d="M50 56q-2-34 30-34t30 34q-4-18-14-20-6 8-32 6-10 2-14 14z" fill="${hair}"/>`;
  const neck =
    o.neck === "tie"
      ? `<path d="M76 104h8l-1 6 4 26-7 8-7-8 4-26z" fill="${o.neckColor}"/>`
      : o.neck === "bowtie"
        ? `<path d="M68 102l12 6 12-6v12l-12-6-12 6z" fill="${o.neckColor}"/><circle cx="80" cy="108" r="3" fill="${o.neckColor}"/>`
        : "";
  const lapel = o.lapel ? `<path d="M64 102l16 22 16-22v6l-16 30-16-30z" fill="${o.lapel}" opacity=".9"/>` : "";
  const watch = jewel === "digital" ? `<rect x="40" y="148" width="12" height="9" rx="2" fill="#2d3436"/><rect x="42" y="150" width="8" height="5" fill="#6fe3ff"/>`
    : jewel === "luxwatch" ? `<rect x="40" y="147" width="12" height="11" rx="3" fill="#f5c542"/><circle cx="46" cy="152.5" r="3.5" fill="#fff7d6"/>`
    : "";
  const chain = jewel === "goldchain" ? `<path d="M64 104q16 26 32 0" fill="none" stroke="#f5c542" stroke-width="4"/><circle cx="80" cy="124" r="5" fill="#f5c542"/>` : "";
  const skull = jewel === "skullring" ? `<circle cx="114" cy="160" r="5" fill="#f4f6f7"/><circle cx="112" cy="159" r="1.4" fill="#222"/><circle cx="116" cy="159" r="1.4" fill="#222"/>` : "";
  const vampire = outfitId === "vampire";
  const cape = vampire ? `<path d="M40 100q-14 60 6 112h68q20-52 6-112z" fill="#b3122e" opacity=".85"/>` : "";
  const fangs = vampire ? `<path d="M74 78l2 5 2-5zM82 78l2 5 2-5z" fill="#fff"/>` : "";
  const ring = jewel === "diamondring" ? `<circle cx="114" cy="160" r="4" fill="#f5c542"/><path d="M114 150l5 5-5 5-5-5z" fill="#bff3ff"/><path d="M114 146v-4M121 151l3-3M107 151l-3-3" stroke="#fff" stroke-width="2"/>` : "";
  const crown = jewel === "crown" ? `<path d="M56 26l8 14 8-16 8 16 8-16 8 16 8-14v18H56z" fill="#f5c542" stroke="#a77b0f" stroke-width="2"/><circle cx="80" cy="34" r="3" fill="#6fe3ff"/>` : "";
  const glasses = o.glasses ? `<rect x="62" y="58" width="15" height="9" rx="3" fill="#111"/><rect x="83" y="58" width="15" height="9" rx="3" fill="#111"/><path d="M77 61h6" stroke="#111" stroke-width="2"/>` : "";
  const glow = o.glow ? `<ellipse cx="80" cy="130" rx="58" ry="70" fill="${o.glow}" opacity=".25"/>` : "";
  return `<svg class="avatar-svg" viewBox="0 0 160 230" role="img" aria-hidden="true">
    ${glow}
    ${cape}
    <ellipse cx="80" cy="222" rx="44" ry="7" fill="#000" opacity=".25"/>
    <rect x="58" y="168" width="18" height="48" rx="7" fill="${o.pants}"/><rect x="84" y="168" width="18" height="48" rx="7" fill="${o.pants}"/>
    <rect x="52" y="210" width="26" height="12" rx="6" fill="${o.shoes}"/><rect x="82" y="210" width="26" height="12" rx="6" fill="${o.shoes}"/>
    <rect x="38" y="104" width="16" height="52" rx="8" fill="${o.topDark}"/><rect x="106" y="104" width="16" height="52" rx="8" fill="${o.topDark}"/>
    <circle cx="46" cy="158" r="7" fill="${skin}"/><circle cx="114" cy="158" r="7" fill="${skin}"/>
    <rect x="50" y="98" width="60" height="78" rx="16" fill="${o.top}"/>
    ${lapel}${neck}${chain}
    <rect x="72" y="86" width="16" height="16" rx="5" fill="${skin}"/>
    <circle cx="80" cy="60" r="30" fill="${skin}"/>
    ${head}
    <circle cx="70" cy="62" r="3.4" fill="#2d2d2d"/><circle cx="90" cy="62" r="3.4" fill="#2d2d2d"/>
    <path d="M71 75q9 7 18 0" stroke="#7a3b2e" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="63" cy="70" r="4" fill="#ff9a8b" opacity=".5"/><circle cx="97" cy="70" r="4" fill="#ff9a8b" opacity=".5"/>
    ${glasses}${watch}${ring}${skull}${crown}${fangs}
  </svg>`;
}

/** Icono de un objeto: PNG `lux_<id>` si existe, si no su emoji. */
export function luxIcon(id: string, available: (key: string) => boolean): string {
  const item = itemById(id);
  if (!item) return "";
  return available(`lux_${id}`) ? icon(`lux_${id}`) : `<span class="lux-emoji">${item.icon}</span>`;
}
