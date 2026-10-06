import { FEST_DEF, FEST_ID, type DailyReward } from "./data";
import { tickOne, type SaleEvent } from "./economy";
import { eventWindow } from "./event";
import { grantReward, type Grant } from "./meta";
import { freshBusiness, type BusinessState, type GameState } from "./state";
import { isUnlocked } from "./unlocks";

/**
 * «La feria»: el negocio del evento del fin de semana, con su propia ruta (docs/VISUAL.md).
 *
 * - Solo abre mientras dura el evento (viernes a domingo) y empieza de cero cada evento.
 * - Tiene su propia moneda, las fichas 🎟️: lo que ganas en la feria solo sirve en la feria, y nada
 *   de tu imperio (acciones, ejecutivos, VIP…) la acelera. Así todos compiten en igualdad.
 * - Abrir casetas da premios exclusivos del evento; montar la feria entera (8 casetas) da un
 *   trofeo 🏆 que se queda para siempre: +5 % de ingresos en todo el imperio por trofeo.
 * - Todo lo que haces en la feria (ventas, mejoras, gerentes, casetas) suma puntos del evento.
 * - Solo avanza con el juego abierto (no hay ganancias offline en la feria).
 *
 * Por dentro es un negocio normal (`BusinessState`) guardado en `meta.fest`. Para usar con él
 * las funciones de siempre (mejorar, contratar, tocar, la vista…) se envuelven en `withFest`,
 * que pone por un momento las fichas en `s.cash` y la feria en `s.biz.fest`.
 */

export { FEST_DEF, FEST_ID };

export interface FestState {
  /** Viernes del evento al que pertenece esta feria. */
  week: string;
  biz: BusinessState;
  /** Fichas 🎟️. */
  tickets: number;
  /** Premios de la feria ya cobrados (en orden). */
  claimed: number;
  /** Ferias completas desde siempre (no se pierden). */
  trophies: number;
}

export const freshFest = (): FestState => ({ week: "", biz: freshBusiness(true), tickets: 0, claimed: 0, trophies: 0 });

/** Premios exclusivos de la feria: al abrir 2, 4, 6 y 8 casetas. El último da el trofeo. */
export const FEST_GOALS: { stops: number; reward: DailyReward; trophy?: boolean }[] = [
  { stops: 2, reward: { gems: 20 } },
  { stops: 4, reward: { chest: "normal" } },
  { stops: 6, reward: { gems: 60 } },
  { stops: 8, reward: { chest: "premium" }, trophy: true },
];

/** Bonus permanente por trofeo y trofeos que cuentan como máximo. */
export const TROPHY = { bonus: 0.05, max: 20 } as const;
export const trophyMult = (s: GameState) => 1 + TROPHY.bonus * Math.min(TROPHY.max, s.meta.fest.trophies);

/** La feria está abierta: evento en marcha, función desbloqueada y feria de este evento. */
export function festOpen(s: GameState, now: number): boolean {
  const w = eventWindow(now);
  return w.active && isUnlocked(s, "event") && s.meta.fest.week === w.week;
}

/** Llamar a menudo. Al empezar un evento nuevo monta una feria nueva (los trofeos se quedan). */
export function ensureFest(s: GameState, now: number): void {
  const w = eventWindow(now);
  if (!w.active || !isUnlocked(s, "event") || s.meta.fest.week === w.week) return;
  s.meta.fest = { ...freshFest(), week: w.week, trophies: s.meta.fest.trophies };
}

/**
 * Ejecuta `fn` con la feria como negocio `fest` y las fichas como dinero. Lo que `fn` gaste o gane
 * se queda en las fichas; el dinero de verdad no se toca.
 */
export function withFest<T>(s: GameState, fn: () => T): T {
  if (s.biz[FEST_ID] === s.meta.fest.biz) return fn(); // ya dentro
  const cash = s.cash;
  const prev = s.biz[FEST_ID];
  s.cash = s.meta.fest.tickets;
  s.biz[FEST_ID] = s.meta.fest.biz;
  try {
    return fn();
  } finally {
    s.meta.fest.tickets = s.cash;
    s.cash = cash;
    if (prev) s.biz[FEST_ID] = prev;
    else delete s.biz[FEST_ID];
  }
}

/** `withFest` solo si el negocio es la feria. Útil en la interfaz, que recibe cualquier id. */
export const inWallet = <T>(s: GameState, id: string, fn: () => T): T => (id === FEST_ID ? withFest(s, fn) : fn());

/** Avanza la feria `dt` segundos (si está abierta). Devuelve sus ventas, en fichas. */
export function tickFest(s: GameState, dt: number, now: number): SaleEvent[] {
  if (!festOpen(s, now)) return [];
  const events: SaleEvent[] = [];
  withFest(s, () => tickOne(s, FEST_ID, dt, now, events));
  return events;
}

export const festGoalsReached = (s: GameState) => FEST_GOALS.filter((g) => s.meta.fest.biz.floors.length >= g.stops).length;
export const festToClaim = (s: GameState) => Math.max(0, festGoalsReached(s) - s.meta.fest.claimed);

/** Cobra el siguiente premio de la feria. El de la feria completa suma además un trofeo. */
export function claimFestGoal(s: GameState, now: number, rand: () => number = Math.random): { grant: Grant; trophy: boolean } | null {
  if (festToClaim(s) <= 0) return null;
  const goal = FEST_GOALS[s.meta.fest.claimed];
  s.meta.fest.claimed++;
  if (goal.trophy) s.meta.fest.trophies++;
  return { grant: grantReward(s, goal.reward, now, rand), trophy: !!goal.trophy };
}

export function migrateFest(raw: unknown, migrateBiz: (raw: unknown) => BusinessState): FestState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0);
  return {
    week: typeof r.week === "string" ? r.week : "",
    biz: r.biz ? migrateBiz(r.biz) : freshBusiness(true),
    tickets: num(r.tickets),
    claimed: Math.min(FEST_GOALS.length, Math.floor(num(r.claimed))),
    trophies: Math.floor(num(r.trophies)),
  };
}
