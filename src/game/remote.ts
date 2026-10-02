import { CONFIG } from "./data";
import { LUX } from "./luxury";
import { OFFERS } from "./offers";
import { SEASON } from "./season";

/**
 * Ajustes desde el servidor (ver docs/AJUSTES.md): cambiar algunos números del juego sin publicar
 * una versión nueva. Solo valores de esta lista blanca, y cada uno entre ¼ y 4 veces su valor de
 * fábrica: un error en el servidor nunca puede romper la partida. Nada de la economía base
 * (precios, producción) se toca desde aquí.
 */

type Numbers = Record<string, number>;

/** Grupos que se pueden ajustar y las claves permitidas de cada uno. */
const GROUPS: Record<string, { target: Numbers; keys: string[] }> = {
  offers: { target: OFFERS as unknown as Numbers, keys: ["truckMinSec", "truckMaxSec", "truckMinutes", "vipMinSec", "vipMaxSec", "vipGems", "vipPerDay", "visibleSec", "wheelAdSpins"] },
  viral: { target: CONFIG as unknown as Numbers, keys: ["viralMinSec", "viralMaxSec", "viralVisibleSec", "rushMinutes", "boostHours"] },
  lux: { target: LUX as unknown as Numbers, keys: ["trialMin", "trialsPerDay", "dealOff"] },
  season: { target: SEASON as unknown as Numbers, keys: ["visitorMinSec", "visitorMaxSec", "visitorMin", "visitorMax", "adMult", "salesPer"] },
};

/** Valores de fábrica, para poder volver a ellos y para los límites. */
const FACTORY: Record<string, Numbers> = Object.fromEntries(
  Object.entries(GROUPS).map(([g, { target, keys }]) => [g, Object.fromEntries(keys.map((k) => [k, target[k]]))]),
);

/** Versión de los ajustes en uso (para la analítica: comparar versiones). */
export let remoteVersion = "default";

/**
 * Aplica unos ajustes recibidos del servidor. Lo que no está en la lista o no es un número válido se
 * ignora. Lo que no viene vuelve al valor de fábrica. Devuelve cuántos valores se han cambiado.
 */
export function applyRemoteConfig(raw: unknown): number {
  const cfg = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let changed = 0;
  for (const [g, { target, keys }] of Object.entries(GROUPS)) {
    const values = cfg[g] && typeof cfg[g] === "object" ? (cfg[g] as Record<string, unknown>) : {};
    for (const k of keys) {
      const def = FACTORY[g][k];
      const v = values[k];
      let next = def;
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        next = Math.min(def * 4, Math.max(def / 4, v));
        // Los contadores y los de por día son enteros; el descuento no puede llegar al 100 %.
        if (Number.isInteger(def)) next = Math.max(1, Math.round(next));
        if (g === "lux" && k === "dealOff") next = Math.min(0.9, next);
        if (next !== def) changed++;
      }
      target[k] = next;
    }
  }
  // Los rangos «mínimo–máximo» nunca quedan al revés.
  for (const [g, lo, hi] of [["offers", "truckMinSec", "truckMaxSec"], ["offers", "vipMinSec", "vipMaxSec"], ["viral", "viralMinSec", "viralMaxSec"], ["season", "visitorMinSec", "visitorMaxSec"], ["season", "visitorMin", "visitorMax"]]) {
    const t = GROUPS[g].target;
    if (t[lo] > t[hi]) t[hi] = t[lo];
  }
  remoteVersion = typeof cfg.version === "string" ? cfg.version.slice(0, 32) : changed ? "custom" : "default";
  return changed;
}

/** Valores de fábrica (para los tests y el panel). */
export const factoryConfig = () => structuredClone(FACTORY);
