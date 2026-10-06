import { TUTORIAL, type DailyReward } from "./data";
import { bizList } from "./economy";
import { skillsReady } from "./skills";
import type { GameState } from "./state";
import { t } from "../i18n";

/**
 * Los primeros 10 minutos (empiezas repartiendo en bici). El tutorial enseña a tocar, mejorar,
 * contratar y abrir; después, estos momentos guían hasta el almacén con un premio o un aviso cada
 * minuto o dos, para que nunca haya un rato muerto:
 *
 * | Momento | Bot (aprox.) | Qué pasa |
 * | --- | --- | --- |
 * | Fin del tutorial | ~2:30 | 25 💎 (ya existía) y la primera «oportunidad» con anuncio llega a los 20 s |
 * | `skill` | ~2:30 | Aviso: tu gerente tiene una habilidad ⚡ (x2 unos minutos) |
 * | `auto` | ~2:30 (justo al acabar el tutorial) | El reparto va solo: 10 💎 |
 * | `half` | ~5:20 | Ya tienes la mitad para el almacén |
 * | `biz2` | ~5:40 | Tras la celebración de compra, un maletín de regalo: tu primer negocio de verdad |
 *
 * Tiempos medidos con `npx vite-node scripts/first10.ts`. Cada momento salta una sola vez en toda la vida (se guardan en `meta.firsts`) y nunca durante
 * el tutorial. Las partidas de antes de esto los tienen todos ya vistos.
 */

export interface FirstMoment {
  id: string;
  icon: string;
  /** Celebración a pantalla completa (si no, banda dorada). */
  big?: boolean;
  reward?: DailyReward;
  check: (s: GameState, now: number) => boolean;
}

/** Segundos tras el tutorial hasta la primera oportunidad con anuncio (moneda que aparece). */
export const FIRST_AD_DELAY_SEC = 20;

const tutorialDone = (s: GameState) => s.meta.tutorial >= TUTORIAL.length;
const first = (s: GameState) => s.biz[bizList(s)[0].id];
const second = (s: GameState) => bizList(s)[1];

export const FIRSTS: FirstMoment[] = [
  { id: "skill", icon: "⚡", check: (s, now) => skillsReady(s, first(s), now) > 0 },
  {
    id: "auto",
    icon: "🚲",
    reward: { gems: 10 },
    check: (s) => {
      const b = first(s);
      return b.floors[0].managed && b.transport.managed && b.sale.managed;
    },
  },
  {
    id: "half",
    icon: "💰",
    check: (s) => {
      const d = second(s);
      return !!d && !s.biz[d.id].owned && s.cash >= d.price / 2;
    },
  },
  {
    id: "biz2",
    icon: "📦",
    reward: { chest: "normal" },
    check: (s) => {
      const d = second(s);
      return !!d && s.biz[d.id].owned;
    },
  },
];

/** Todos los ids, también los internos (para dar por vistas las partidas antiguas). */
export const FIRST_IDS = ["ad", ...FIRSTS.map((f) => f.id)];

export function firstText(f: FirstMoment, s: GameState): { title: string; text: string } {
  const d = second(s);
  switch (f.id) {
    case "skill":
      return { title: t("¡Habilidad lista!"), text: t("Tu gerente tiene una habilidad: toca ⚡ y esa parte va el doble de rápido unos minutos.") };
    case "auto":
      return { title: t("¡El reparto ya va solo!"), text: t("Ahora ganas aunque no toques. Mejora lo que se pone naranja.") };
    case "half":
      return { title: t("¡Ya tienes la mitad!"), text: t("Te falta poco para comprar {name}.", { name: d?.name ?? "" }) };
    default:
      return { title: t("¡Tu primer negocio de verdad!"), text: t("Has pasado de repartir en bici a tener {name}. Esto solo acaba de empezar.", { name: d?.name ?? "" }) };
  }
}

/**
 * Llamar a menudo (cada pocos segundos). Devuelve los momentos nuevos para celebrarlos (el premio
 * lo entrega quien llama, con `grantReward`). Al acabar el tutorial programa la primera oportunidad.
 */
export function checkFirsts(s: GameState, now: number): FirstMoment[] {
  if (!tutorialDone(s)) return [];
  const seen = s.meta.firsts;
  if (!seen.includes("ad")) {
    seen.push("ad");
    s.nextViral = now + FIRST_AD_DELAY_SEC * 1000;
  }
  const fresh: FirstMoment[] = [];
  for (const f of FIRSTS) {
    if (seen.includes(f.id) || !f.check(s, now)) continue;
    seen.push(f.id);
    fresh.push(f);
  }
  return fresh;
}

/** La moneda de «oportunidad» (anuncio con premio) no sale durante el tutorial. */
export const viralAllowed = (s: GameState) => tutorialDone(s);
