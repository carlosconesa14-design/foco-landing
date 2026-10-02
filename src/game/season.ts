import type { DailyReward } from "./data";
import { grantReward, type Grant } from "./meta";
import type { GameState } from "./state";

/**
 * Eventos de temporada (ver docs/GDD.md, «Eventos de temporada»). El primero es Halloween.
 * Mientras dura, aparecen visitantes (👻) que dan la moneda del evento (🍬) al tocarlos (x3 con un
 * anuncio) y las ventas también dan algo. Con esa moneda se compran premios exclusivos: objetos de
 * «Mi vida» que solo se consiguen esas fechas, maletines y diamantes. La moneda caduca al terminar.
 * Las fechas son del calendario local, con la hora del juego (servidor), igual que el evento del finde.
 */

export interface SeasonDef {
  id: "halloween";
  icon: string;
  /** Moneda del evento. */
  currency: string;
  /** Visitante que la trae. */
  visitor: string;
  /** Mes (1–12) y día de inicio, incluido, y de fin, excluido. */
  from: [number, number];
  to: [number, number];
  /** Premios de la tienda que no son objetos de «Mi vida». */
  shop: { id: string; price: number; reward: DailyReward; limit: number }[];
}

export const SEASONS: SeasonDef[] = [
  {
    id: "halloween",
    icon: "🎃",
    currency: "🍬",
    visitor: "👻",
    from: [10, 24],
    to: [11, 2],
    shop: [
      { id: "gems", price: 60, reward: { gems: 30 }, limit: 5 },
      { id: "chest", price: 150, reward: { chest: "premium" }, limit: 3 },
    ],
  },
];

export const SEASON = {
  /** Cada cuánto aparece un visitante (segundos, al azar entre los dos). */
  visitorMinSec: 60,
  visitorMaxSec: 120,
  /** Moneda por visitante (al azar entre los dos) y multiplicador con anuncio. */
  visitorMin: 5,
  visitorMax: 10,
  adMult: 3,
  /** Una unidad de moneda cada tantas ventas. */
  salesPer: 50,
} as const;

export interface SeasonState {
  /** Temporada a la que pertenece el progreso, p. ej. «halloween-2026». */
  key: string;
  candy: number;
  /** Total conseguido en la temporada (para la analítica y los logros). */
  earned: number;
  nextVisitor: number;
  /** Ventas vistas al dar la última moneda por ventas. */
  lastSales: number;
  /** Veces que se ha comprado cada premio de la tienda. */
  bought: Record<string, number>;
}

export const freshSeason = (): SeasonState => ({ key: "", candy: 0, earned: 0, nextVisitor: 0, lastSales: 0, bought: {} });

export function migrateSeason(raw: unknown): SeasonState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
  const bought: Record<string, number> = {};
  if (r.bought && typeof r.bought === "object")
    for (const [k, v] of Object.entries(r.bought as Record<string, unknown>)) if (typeof v === "number" && v > 0) bought[k] = Math.floor(v);
  return {
    key: typeof r.key === "string" ? r.key : "",
    candy: Math.floor(num(r.candy)),
    earned: Math.floor(num(r.earned)),
    nextVisitor: num(r.nextVisitor),
    lastSales: num(r.lastSales),
    bought,
  };
}

export interface SeasonWindow {
  def: SeasonDef;
  key: string;
  start: number;
  end: number;
}

/** Temporada en curso (o null). */
export function activeSeason(now: number): SeasonWindow | null {
  const d = new Date(now);
  for (const def of SEASONS) {
    for (const year of [d.getFullYear(), d.getFullYear() - 1]) {
      const start = new Date(year, def.from[0] - 1, def.from[1]).getTime();
      const endYear = def.to[0] < def.from[0] ? year + 1 : year;
      const end = new Date(endYear, def.to[0] - 1, def.to[1]).getTime();
      if (now >= start && now < end) return { def, key: `${def.id}-${year}`, start, end };
    }
  }
  return null;
}

/** Llamar a menudo: empieza la temporada nueva (la moneda de la anterior caduca) y suma lo de las ventas. */
export function ensureSeason(s: GameState, now: number, rand: () => number = Math.random): void {
  const w = activeSeason(now);
  if (!w) return;
  const st = s.meta.season;
  const sales = s.meta.stats.life.sales ?? 0;
  if (st.key !== w.key) {
    s.meta.season = { ...freshSeason(), key: w.key, lastSales: sales, nextVisitor: now + 20e3 + rand() * 20e3 };
    return;
  }
  const n = Math.floor((sales - st.lastSales) / SEASON.salesPer);
  if (n > 0) {
    st.candy += n;
    st.earned += n;
    st.lastSales += n * SEASON.salesPer;
  }
}

/** ¿Toca que aparezca un visitante? */
export function visitorDue(s: GameState, now: number): boolean {
  return !!activeSeason(now) && s.meta.season.key === activeSeason(now)!.key && now >= s.meta.season.nextVisitor;
}

/** Moneda que trae el visitante que acaba de aparecer. */
export const visitorCandy = (rand: () => number = Math.random) => SEASON.visitorMin + Math.floor(rand() * (SEASON.visitorMax - SEASON.visitorMin + 1));

/** Programa el siguiente visitante (al tocarlo o al irse). */
export function scheduleVisitor(s: GameState, now: number, rand: () => number = Math.random): void {
  s.meta.season.nextVisitor = now + (SEASON.visitorMinSec + rand() * (SEASON.visitorMaxSec - SEASON.visitorMinSec)) * 1000;
}

/** Cobra lo que trae el visitante (x3 si vio el anuncio). */
export function collectVisitor(s: GameState, amount: number, now: number, withAd: boolean): number {
  if (!activeSeason(now)) return 0;
  const n = amount * (withAd ? SEASON.adMult : 1);
  s.meta.season.candy += n;
  s.meta.season.earned += n;
  return n;
}

/** Puede gastar moneda de la temporada en curso. */
export const seasonOpen = (s: GameState, now: number) => {
  const w = activeSeason(now);
  return !!w && s.meta.season.key === w.key;
};

/** Gasta moneda (para los objetos de «Mi vida» de la temporada). */
export function spendCandy(s: GameState, n: number, now: number): boolean {
  if (!seasonOpen(s, now) || s.meta.season.candy < n) return false;
  s.meta.season.candy -= n;
  return true;
}

/** Compra un premio de la tienda de la temporada (diamantes, maletines). */
export function buySeasonReward(s: GameState, id: string, now: number, rand: () => number = Math.random): Grant | null {
  const w = activeSeason(now);
  const item = w?.def.shop.find((x) => x.id === id);
  if (!w || !item || (s.meta.season.bought[id] ?? 0) >= item.limit) return null;
  if (!spendCandy(s, item.price, now)) return null;
  s.meta.season.bought[id] = (s.meta.season.bought[id] ?? 0) + 1;
  return grantReward(s, item.reward, now, rand);
}
