import type { DailyReward } from "./data";
import { bizDef, chainRates, saleMult } from "./economy";
import { execMults } from "./execs";
import { dayKey, grantReward, tutorialStep, type Grant } from "./meta";
import type { GameState } from "./state";

/**
 * Más ocasiones de ver anuncios: el camión de suministros, el cliente VIP y la ruleta diaria.
 * Todo da premios del juego (nunca puntos de Liga ni nada de valor real), como permite AdMob.
 */

type Rand = () => number;

export const OFFERS = {
  /** Cada cuánto llega el camión a un negocio (segundos, al azar entre los dos). */
  truckMinSec: 300,
  truckMaxSec: 540,
  /** El camión trae lo que el negocio vende en estos minutos a pleno rendimiento. */
  truckMinutes: 15,
  vipMinSec: 420,
  vipMaxSec: 780,
  vipGems: 10,
  /** Clientes VIP al día como máximo. */
  vipPerDay: 4,
  /** Segundos que se quedan esperando antes de irse. */
  visibleSec: 30,
  /** Giros extra de la ruleta con anuncio, además del gratis. */
  wheelAdSpins: 3,
} as const;

/** Casillas de la ruleta, en orden. El peso decide la probabilidad. */
export const WHEEL: { reward: DailyReward; weight: number }[] = [
  { reward: { cashHours: 0.25 }, weight: 24 },
  { reward: { gems: 5 }, weight: 20 },
  { reward: { cashHours: 0.5 }, weight: 16 },
  { reward: { gems: 15 }, weight: 12 },
  { reward: { chest: "normal" }, weight: 12 },
  { reward: { cashHours: 2 }, weight: 8 },
  { reward: { gems: 50 }, weight: 5 },
  { reward: { chest: "premium" }, weight: 3 },
];

export type OfferKind = "truck" | "vip";

export interface OffersState {
  /** Cuándo puede llegar el siguiente camión y el siguiente cliente VIP. */
  truckAt: number;
  vipAt: number;
  vipDay: string;
  vipToday: number;
  wheelDay: string;
  wheelFreeUsed: boolean;
  wheelAdsUsed: number;
}

const between = (min: number, max: number, rand: Rand) => (min + rand() * (max - min)) * 1000;

export const freshOffers = (now = Date.now()): OffersState => ({
  truckAt: now + OFFERS.truckMinSec * 1000,
  vipAt: now + OFFERS.vipMinSec * 1000,
  vipDay: "",
  vipToday: 0,
  wheelDay: "",
  wheelFreeUsed: false,
  wheelAdsUsed: 0,
});

/* ---------- Camión y cliente VIP ---------- */

function vipsToday(s: GameState, now: number): number {
  const o = s.meta.offers;
  return o.vipDay === dayKey(now) ? o.vipToday : 0;
}

/**
 * Visita que toca mostrar ahora en el negocio que estás viendo, o null.
 * Solo después del tutorial, y nunca dos a la vez (el camión tiene prioridad).
 */
export function dueOffer(s: GameState, now: number): OfferKind | null {
  if (s.view.scene !== "business" || !s.biz[s.view.id]?.owned || tutorialStep(s) !== null) return null;
  const o = s.meta.offers;
  if (now >= o.truckAt) return "truck";
  if (now >= o.vipAt && vipsToday(s, now) < OFFERS.vipPerDay) return "vip";
  return null;
}

/** La visita se ha ido (cobrada o no): programa la siguiente. */
export function rescheduleOffer(s: GameState, kind: OfferKind, now: number, rand: Rand = Math.random): void {
  const o = s.meta.offers;
  if (kind === "truck") o.truckAt = now + between(OFFERS.truckMinSec, OFFERS.truckMaxSec, rand);
  else o.vipAt = now + between(OFFERS.vipMinSec, OFFERS.vipMaxSec, rand);
}

/** Lo que trae el camión: lo que el negocio vende en `truckMinutes` con toda la cadena funcionando. */
export function truckReward(s: GameState, id: string, now: number): number {
  const b = s.biz[id];
  if (!b?.owned) return 0;
  const rate = chainRates(bizDef(id), b, false, execMults(s, id, now, false)).total * saleMult(s, id, now, false);
  return Math.max(100, rate * OFFERS.truckMinutes * 60);
}

export function claimVip(s: GameState, now: number): number | null {
  if (vipsToday(s, now) >= OFFERS.vipPerDay) return null;
  const o = s.meta.offers;
  o.vipDay = dayKey(now);
  o.vipToday = vipsToday(s, now) + 1;
  s.meta.gems += OFFERS.vipGems;
  return OFFERS.vipGems;
}

/* ---------- Ruleta diaria ---------- */

export function wheelStatus(s: GameState, now: number): { free: boolean; adsLeft: number } {
  const o = s.meta.offers;
  const today = o.wheelDay === dayKey(now);
  return {
    free: !today || !o.wheelFreeUsed,
    adsLeft: today ? Math.max(0, OFFERS.wheelAdSpins - o.wheelAdsUsed) : OFFERS.wheelAdSpins,
  };
}

/** Casilla al azar según los pesos. */
export function pickSlot(rand: Rand): number {
  const total = WHEEL.reduce((a, w) => a + w.weight, 0);
  let r = rand() * total;
  for (let i = 0; i < WHEEL.length; i++) {
    r -= WHEEL[i].weight;
    if (r < 0) return i;
  }
  return WHEEL.length - 1;
}

/** Gira la ruleta: el giro gratis del día o, con `viaAd`, uno extra. Null si ya no quedan. */
export function spinWheel(s: GameState, now: number, viaAd: boolean, rand: Rand = Math.random): { slot: number; grant: Grant } | null {
  const st = wheelStatus(s, now);
  if (viaAd ? st.adsLeft <= 0 : !st.free) return null;
  const o = s.meta.offers;
  const today = dayKey(now);
  if (o.wheelDay !== today) {
    o.wheelDay = today;
    o.wheelFreeUsed = false;
    o.wheelAdsUsed = 0;
  }
  if (viaAd) o.wheelAdsUsed++;
  else o.wheelFreeUsed = true;
  const slot = pickSlot(rand);
  return { slot, grant: grantReward(s, WHEEL[slot].reward, now, rand) };
}

/* ---------- Guardado ---------- */

export function migrateOffers(raw: unknown, now = Date.now()): OffersState {
  const o = freshOffers(now);
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  // Los tiempos guardados nunca se alejan más del máximo (por si el reloj del móvil cambió).
  o.truckAt = Math.min(num(r.truckAt, o.truckAt), now + OFFERS.truckMaxSec * 1000);
  o.vipAt = Math.min(num(r.vipAt, o.vipAt), now + OFFERS.vipMaxSec * 1000);
  o.vipDay = str(r.vipDay);
  o.vipToday = Math.max(0, Math.floor(num(r.vipToday, 0)));
  o.wheelDay = str(r.wheelDay);
  o.wheelFreeUsed = r.wheelFreeUsed === true;
  o.wheelAdsUsed = Math.max(0, Math.floor(num(r.wheelAdsUsed, 0)));
  return o;
}
