import { grantReward, type Grant } from "./meta";
import type { GameState } from "./state";

/**
 * Rival de la semana (ver docs/GDD.md, «Rival de la semana»): un competidor ficticio que gana dinero
 * a su ritmo de lunes a domingo. Si ganas más que él esa semana (sumando todas tus ciudades),
 * premio grande al momento y el de la semana siguiente es más fuerte. Si no, no pasa nada.
 *
 * Su meta se calcula al empezar la semana con tu ritmo de ingresos de ese momento (horas de tus
 * ingresos pasivos): siempre es un reto a tu medida, estés donde estés del juego.
 */

export const RIVALS: { name: string; face: string; biz: string }[] = [
  { name: "Kevin", face: "🥙", biz: "Kebab de la esquina" },
  { name: "Vanesa", face: "💅", biz: "Salón de uñas" },
  { name: "Toni", face: "🚗", biz: "Coches de segunda mano" },
  { name: "Marta", face: "☕", biz: "Cafetería de especialidad" },
  { name: "Rocco", face: "🍕", biz: "Pizzería napolitana" },
  { name: "Sheila", face: "📱", biz: "Tienda de móviles" },
  { name: "Paco", face: "🏗️", biz: "Constructora" },
  { name: "Lola", face: "👗", biz: "Tienda de ropa" },
];

export const RIVAL = {
  /** Horas de tus ingresos pasivos que gana el rival en la semana; +3 h por cada victoria (hasta 40). */
  baseHours: 8,
  hoursPerWin: 3,
  maxHours: 40,
  /** Meta mínima (para quien empieza). */
  minTarget: 20_000,
  /** Premio: maletín de oro y diamantes (+5 por cada victoria anterior, hasta 100). */
  gems: 40,
  gemsPerWin: 5,
  maxGems: 100,
} as const;

export interface RivalState {
  /** Lunes (fecha local) de la semana del rival actual. */
  week: string;
  start: number;
  end: number;
  /** Lo que gana el rival en toda la semana. */
  target: number;
  /** Tu dinero ganado en total al empezar la semana. */
  base: number;
  /** Rival de la lista. */
  who: number;
  won: boolean;
  /** Victorias (sube la dificultad). */
  wins: number;
}

export const freshRival = (): RivalState => ({ week: "", start: 0, end: 0, target: 0, base: 0, who: 0, won: false, wins: 0 });

export function migrateRival(raw: unknown): RivalState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
  return {
    week: typeof r.week === "string" ? r.week : "",
    start: n(r.start),
    end: n(r.end),
    target: n(r.target),
    base: n(r.base),
    who: Math.floor(n(r.who)) % RIVALS.length,
    won: r.won === true,
    wins: Math.floor(n(r.wins)),
  };
}

const pad = (x: number) => String(x).padStart(2, "0");

/** Semana local de lunes 00:00 a lunes 00:00. */
export function rivalWeek(now: number): { key: string; start: number; end: number } {
  const d = new Date(now);
  const sinceMonday = (d.getDay() + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`, start: start.getTime(), end: end.getTime() };
}

/**
 * Llamar a menudo. Al empezar una semana elige rival y calcula su meta con `ratePerSec`
 * (tus ingresos pasivos ahora). Devuelve true si acaba de empezar un rival nuevo.
 */
export function ensureRival(s: GameState, now: number, ratePerSec: number): boolean {
  const w = rivalWeek(now);
  const r = s.meta.rival;
  if (r.week === w.key) return false;
  const hours = Math.min(RIVAL.maxHours, RIVAL.baseHours + RIVAL.hoursPerWin * r.wins);
  s.meta.rival = {
    ...r,
    week: w.key,
    start: w.start,
    end: w.end,
    target: Math.max(RIVAL.minTarget, ratePerSec * 3600 * hours),
    base: s.world.lifetimeEarned,
    who: (r.week ? r.who + 1 : Math.floor(w.start / 864e5)) % RIVALS.length,
    won: false,
  };
  return true;
}

/** Lo que llevas ganado esta semana. */
export const myWeek = (s: GameState) => Math.max(0, s.world.lifetimeEarned - s.meta.rival.base);

/** Lo que lleva el rival (empieza fuerte y se frena hacia el domingo). */
export function rivalScore(s: GameState, now: number): number {
  const r = s.meta.rival;
  if (!r.week) return 0;
  const p = Math.max(0, Math.min(1, (now - r.start) / (r.end - r.start)));
  return r.target * Math.pow(p, 0.8);
}

export const rivalReward = (s: GameState) => ({ gems: Math.min(RIVAL.maxGems, RIVAL.gems + RIVAL.gemsPerWin * s.meta.rival.wins) });

/**
 * Comprueba si ya le has superado: gana quien lleva más **al final de la semana**, pero en cuanto
 * le pasas a su meta final ya no te puede alcanzar. Da el premio una vez.
 */
export function checkRival(s: GameState, now: number, rand: () => number = Math.random): Grant[] | null {
  const r = s.meta.rival;
  if (!r.week || r.won || now >= r.end || myWeek(s) < r.target) return null;
  r.won = true;
  const reward = rivalReward(s);
  r.wins += 1;
  return [grantReward(s, { chest: "premium" }, now, rand), grantReward(s, reward, now, rand)];
}
