import { FEST_ID, RARITIES } from "./data";
import { schoolMults } from "./school";
import { execBonus } from "./founders";
import { researchMults } from "./twists";
import type { GameState } from "./state";

export interface Mults {
  /** Producción de los puestos. */
  prod: number;
  /** Capacidad de transporte y de venta. */
  log: number;
  /** Dinero por venta (incluye la habilidad activa). */
  sale: number;
}

export const NO_MULTS: Mults = { prod: 1, log: 1, sale: 1 };

/** Bonus del ejecutivo asignado a un negocio. La habilidad solo cuenta en vivo, no offline. */
export function execMults(s: GameState, bizId: string, now: number, live = true): Mults {
  const m = { ...NO_MULTS };
  if (bizId === FEST_ID) return m; // la feria: sin ventajas del imperio
  for (const e of s.meta.execs) {
    if (e.assigned !== bizId) continue;
    const r = RARITIES[e.rarity];
    m[e.kind] += execBonus(e);
    if (live && e.abilityEnd > now) m.sale *= r.ability;
  }
  // Investigación del negocio (Agencia de IA): mejoras permanentes.
  const rm = researchMults(s, bizId);
  m.prod *= rm.prod;
  m.log *= rm.log;
  m.sale *= rm.sale;
  // Escuela de negocios: investigación permanente (no se pierde al salir a bolsa).
  const sm = schoolMults(s);
  m.prod *= sm.prod;
  m.log *= sm.log;
  m.sale *= sm.sale;
  return m;
}
