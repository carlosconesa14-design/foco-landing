import { RARITIES } from "./data";
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
  for (const e of s.meta.execs) {
    if (e.assigned !== bizId) continue;
    const r = RARITIES[e.rarity];
    m[e.kind] += r.bonus;
    if (live && e.abilityEnd > now) m.sale *= r.ability;
  }
  return m;
}
