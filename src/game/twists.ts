import type { Mults } from "./execs";
import type { GameState } from "./state";

/**
 * Mecánicas propias de cada negocio (ver docs/GDD.md, «Mecánicas de cada negocio»). Son módulos
 * reutilizables; en Madrid cada negocio tiene uno:
 * - **Pedidos urgentes** (almacén): un encargo con tiempo; si se cumple, premio grande.
 * - **Clientes exigentes** (restaurante): un crítico quiere ver la cocina en marcha (tocarla N veces
 *   antes de que se vaya); atenderle da propina y una estrella de reputación (+% de ventas para siempre).
 * - **Hype** (TikTok): una barra que sube al vender y tocar; llena, «¡Directo viral!» x3 un rato.
 * - **Investigación** (IA): las ventas dan datos 🧠 que desbloquean mejoras permanentes.
 *
 * Reglas: nunca castigan (si no haces nada, el negocio va igual) y solo cuentan jugando. El bot de
 * equilibrado no las usa, así que no cambian los tests de ritmo: son extra para quien juega.
 * Todo vive en `meta.twists` (se conserva al salir a bolsa y entre ciudades).
 */

export type TwistKind = "orders" | "critic" | "hype" | "research";

/** Qué mecánica tiene cada negocio. */
export const TWISTS: Record<string, TwistKind> = {
  // Madrid
  dropship: "orders",
  restaurant: "critic",
  tiktok: "hype",
  ai: "research",
  // Miami: foodies, fiesta en la playa, excursiones, pisos con prisa y minería
  // (la investigación, siempre en el último negocio de la ciudad: en uno intermedio acelera demasiado)
  foodtruck: "critic",
  beachclub: "hype",
  yachts: "orders",
  realestate: "orders",
  crypto: "research",
  // Dubái: encargos VIP, inspectores de estrellas, atardecer viral, joyas a medida e ingeniería
  supercars: "orders",
  hotel: "critic",
  safari: "hype",
  souk: "orders",
  tower: "research",
};

/** Negocios con su pieza dibujada en el mundo (TwistWorld). Todas las piezas están entregadas; esto solo habilita la proyección visual. */
export const TWIST_WORLD_ART = ["dropship", "restaurant", "tiktok", "ai", "foodtruck", "beachclub", "yachts", "realestate", "crypto", "supercars", "hotel", "safari", "souk", "tower"];

export const twistOf = (bizId: string): TwistKind | null => TWISTS[bizId] ?? null;

/**
 * Las mecánicas no empiezan justo al acabar el tutorial (ya hay celebración y desbloqueos): esperan a
 * que el jugador haya abierto unos cuantos puestos (unos minutos más).
 */
export const twistsStarted = (s: GameState) => (s.meta.stats.life.floors ?? 0) >= TW.startFloors;

/** Números de las mecánicas (algunos se pueden cambiar desde el servidor: ver remote.ts). */
export const TW = {
  /** Puestos abiertos (de por vida) para que empiecen las mecánicas. */
  startFloors: 3,
  // Pedidos urgentes
  orderMinMin: 6,
  orderMaxMin: 10,
  /** Minutos para cumplirlo. */
  orderMinutes: 3,
  /** Hay que ganar en ese tiempo esto por el ritmo actual del negocio (más que su ritmo: hay que mejorar o tocar). */
  orderTarget: 1.25,
  /** Premio: minutos de ingresos del negocio, y diamantes. */
  orderRewardMin: 4,
  orderGems: 3,
  /** Segundos que espera el pedido a que lo aceptes. */
  orderOfferSec: 60,
  // Crítico gastronómico
  criticMinMin: 6,
  criticMaxMin: 10,
  criticWaitSec: 45,
  /** Toques en el restaurante que pide. */
  criticTaps: 12,
  /** Propina: minutos de ingresos. */
  criticTipMin: 2,
  starBonus: 0.05,
  maxStars: 10,
  // Hype
  hypePerSale: 4,
  hypePerTap: 2,
  /** Lo que baja por segundo (menos de lo que sube un negocio con gerentes: se llena solo en unos 3 min). */
  hypeDecay: 0.5,
  viralSec: 60,
  viralMult: 3,
  /** Después de un directo, el público descansa: el hype no sube durante estos minutos (x1,2 de media). */
  viralRestMin: 6,
  hypeAdCooldownMin: 10,
} as const;

/** Árbol de investigación de la IA, en orden. `city` = para todos los negocios de la ciudad. */
export const RESEARCH: { cost: number; icon: string; kind: "sale" | "prod" | "log" | "city"; value: number }[] = [
  { cost: 50, icon: "💬", kind: "sale", value: 0.25 },
  { cost: 150, icon: "⚡", kind: "prod", value: 0.25 },
  { cost: 400, icon: "🚚", kind: "log", value: 0.25 },
  { cost: 1000, icon: "💰", kind: "sale", value: 0.5 },
  { cost: 2500, icon: "🌍", kind: "city", value: 0.1 },
  { cost: 6000, icon: "🤖", kind: "sale", value: 1 },
];

export interface Order {
  /** Dinero que hay que ganar con el negocio. */
  target: number;
  /** `earned` del negocio al aceptarlo (lo ganado desde entonces cuenta). */
  base: number;
  /** Fin del plazo (0 si aún no se ha aceptado). */
  deadline: number;
  /** Hasta cuándo espera a que lo aceptes. */
  offerUntil: number;
  /** Premio en dinero. */
  reward: number;
  done: boolean;
}

export interface BizTwist {
  /** Ya se ha explicado la mecánica al jugador. */
  intro: boolean;
  order: Order | null;
  nextOrder: number;
  critic: { need: number; got: number; until: number } | null;
  nextCritic: number;
  stars: number;
  hype: number;
  viralEnd: number;
  hypeAdAt: number;
  data: number;
  research: number;
}

export type TwistState = Record<string, BizTwist>;

export const freshBizTwist = (): BizTwist => ({
  intro: false, order: null, nextOrder: 0, critic: null, nextCritic: 0, stars: 0, hype: 0, viralEnd: 0, hypeAdAt: 0, data: 0, research: 0,
});

export function migrateTwists(raw: unknown): TwistState {
  const out: TwistState = {};
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, max = Infinity) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.min(v, max) : 0);
  for (const id of Object.keys(TWISTS)) {
    const t = r[id] && typeof r[id] === "object" ? (r[id] as Record<string, unknown>) : null;
    if (!t) continue;
    const o = t.order && typeof t.order === "object" ? (t.order as Record<string, unknown>) : null;
    const c = t.critic && typeof t.critic === "object" ? (t.critic as Record<string, unknown>) : null;
    out[id] = {
      intro: t.intro === true,
      order: o ? { target: num(o.target), base: num(o.base), deadline: num(o.deadline), offerUntil: num(o.offerUntil), reward: num(o.reward), done: o.done === true } : null,
      nextOrder: num(t.nextOrder),
      critic: c ? { need: Math.max(1, num(c.need)), got: num(c.got), until: num(c.until) } : null,
      nextCritic: num(t.nextCritic),
      stars: Math.floor(num(t.stars, TW.maxStars)),
      hype: num(t.hype, 100),
      viralEnd: num(t.viralEnd),
      hypeAdAt: num(t.hypeAdAt),
      data: Math.floor(num(t.data)),
      research: Math.floor(num(t.research, RESEARCH.length)),
    };
  }
  return out;
}

/** Estado de la mecánica de un negocio (lo crea si no existe). */
export function twist(s: GameState, bizId: string): BizTwist {
  return (s.meta.twists[bizId] ??= freshBizTwist());
}

const between = (a: number, b: number, rand: () => number) => (a + rand() * (b - a)) * 60e3;

/* ---------- Pedidos urgentes ---------- */

export type OrderEvent = "offered" | "expired" | "done" | "failed" | null;

/**
 * Llamar a menudo mientras el jugador está en el negocio (`here`) o tiene un pedido aceptado.
 * `rate` es el ritmo actual del negocio (€/s, en vivo).
 */
export function orderTick(s: GameState, bizId: string, now: number, rate: number, here: boolean, rand: () => number = Math.random): OrderEvent {
  const tw = twist(s, bizId);
  const b = s.biz[bizId];
  if (!b?.owned) return null;
  const o = tw.order;
  if (!o) {
    if (!tw.nextOrder) tw.nextOrder = now + between(1, 2, rand);
    if (!here || now < tw.nextOrder || rate <= 0) return null;
    tw.order = {
      target: rate * TW.orderMinutes * 60 * TW.orderTarget,
      base: 0,
      deadline: 0,
      offerUntil: now + TW.orderOfferSec * 1000,
      reward: rate * TW.orderRewardMin * 60,
      done: false,
    };
    return "offered";
  }
  if (o.done) return null;
  if (!o.deadline) {
    if (now > o.offerUntil) {
      tw.order = null;
      tw.nextOrder = now + between(TW.orderMinMin, TW.orderMaxMin, rand);
      return "expired";
    }
    return null;
  }
  if (b.earned - o.base >= o.target) {
    o.done = true;
    return "done";
  }
  if (now > o.deadline) {
    tw.order = null;
    tw.nextOrder = now + between(TW.orderMinMin, TW.orderMaxMin, rand);
    return "failed";
  }
  return null;
}

export function acceptOrder(s: GameState, bizId: string, now: number): boolean {
  const o = twist(s, bizId).order;
  if (!o || o.deadline || now > o.offerUntil) return false;
  o.base = s.biz[bizId].earned;
  o.deadline = now + TW.orderMinutes * 60e3;
  return true;
}

/** Progreso del pedido aceptado (0–1). */
export function orderProgress(s: GameState, bizId: string): number {
  const o = twist(s, bizId).order;
  if (!o || !o.deadline) return 0;
  return Math.max(0, Math.min(1, (s.biz[bizId].earned - o.base) / o.target));
}

/** Cobra el pedido cumplido (x2 con anuncio). Devuelve el dinero y los diamantes (el dinero lo suma quien llama). */
export function claimOrder(s: GameState, bizId: string, now: number, double: boolean, rand: () => number = Math.random): { money: number; gems: number } | null {
  const tw = twist(s, bizId);
  const o = tw.order;
  if (!o?.done) return null;
  const k = double ? 2 : 1;
  tw.order = null;
  tw.nextOrder = now + between(TW.orderMinMin, TW.orderMaxMin, rand);
  s.meta.gems += TW.orderGems * k;
  return { money: o.reward * k, gems: TW.orderGems * k };
}

/* ---------- Crítico gastronómico ---------- */

/** Llega un crítico (solo con el jugador en el restaurante) o se va si se acaba su tiempo. */
export function criticTick(s: GameState, bizId: string, now: number, here: boolean, rand: () => number = Math.random): "arrived" | "left" | null {
  const tw = twist(s, bizId);
  if (!s.biz[bizId]?.owned) return null;
  if (tw.critic) {
    if (now > tw.critic.until) {
      tw.critic = null;
      tw.nextCritic = now + between(TW.criticMinMin, TW.criticMaxMin, rand);
      return "left";
    }
    return null;
  }
  if (!tw.nextCritic) tw.nextCritic = now + between(1, 2, rand);
  if (!here || now < tw.nextCritic) return null;
  tw.critic = { need: TW.criticTaps, got: 0, until: now + TW.criticWaitSec * 1000 };
  return "arrived";
}

/** Toques en el restaurante mientras espera el crítico. Devuelve true si ya ha visto bastante. */
export function criticTaps(s: GameState, bizId: string, n: number, now: number): boolean {
  const c = s.meta.twists[bizId]?.critic;
  if (!c || n <= 0 || now > c.until) return false;
  c.got = Math.min(c.need, c.got + n);
  return c.got >= c.need;
}

/**
 * Atiende al crítico: hace falta que haya visto la cocina en marcha (`got ≥ need`) o un anuncio
 * (`force`). Da una estrella (hasta 10); la propina (minutos de ingresos) la suma quien llama.
 */
export function serveCritic(s: GameState, bizId: string, now: number, force: boolean, rand: () => number = Math.random): { star: boolean } | null {
  const tw = twist(s, bizId);
  const c = tw.critic;
  if (!c || now > c.until || (!force && c.got < c.need)) return null;
  tw.critic = null;
  tw.nextCritic = now + between(TW.criticMinMin, TW.criticMaxMin, rand);
  const star = tw.stars < TW.maxStars;
  if (star) tw.stars += 1;
  return { star };
}

/* ---------- Hype ---------- */

export const viralActive = (s: GameState, bizId: string, now: number) => (s.meta.twists[bizId]?.viralEnd ?? 0) > now;

/** Hasta cuándo descansa el público tras el último directo (0 si no descansa). */
export function hypeRestUntil(s: GameState, bizId: string, now: number): number {
  const end = s.meta.twists[bizId]?.viralEnd ?? 0;
  const until = end ? end + TW.viralRestMin * 60e3 : 0;
  return end <= now && until > now ? until : 0;
}

/** Ventas y toques del último fotograma. Devuelve true si empieza un «directo viral». */
export function hypeTick(s: GameState, bizId: string, now: number, dt: number, sales: number, taps: number): boolean {
  const tw = twist(s, bizId);
  if (tw.viralEnd > now || hypeRestUntil(s, bizId, now)) return false;
  tw.hype = Math.max(0, Math.min(100, tw.hype + sales * TW.hypePerSale + taps * TW.hypePerTap - TW.hypeDecay * dt));
  if (tw.hype >= 100) {
    tw.hype = 0;
    tw.viralEnd = now + TW.viralSec * 1000;
    return true;
  }
  return false;
}

export const hypeAdReady = (s: GameState, bizId: string, now: number) => now - twist(s, bizId).hypeAdAt >= TW.hypeAdCooldownMin * 60e3 && !viralActive(s, bizId, now);

/** «Colaboración con un influencer» (anuncio): directo viral al momento. */
export function hypeAd(s: GameState, bizId: string, now: number): boolean {
  if (!hypeAdReady(s, bizId, now)) return false;
  const tw = twist(s, bizId);
  tw.hypeAdAt = now;
  tw.hype = 0;
  tw.viralEnd = now + TW.viralSec * 1000;
  return true;
}

/* ---------- Investigación ---------- */

export function addData(s: GameState, bizId: string, n: number): void {
  if (n > 0) twist(s, bizId).data += n;
}

export const nextResearch = (s: GameState, bizId: string) => RESEARCH[s.meta.twists[bizId]?.research ?? 0] ?? null;

export function buyResearch(s: GameState, bizId: string): boolean {
  const tw = twist(s, bizId);
  const node = RESEARCH[tw.research];
  if (!node || tw.data < node.cost) return false;
  tw.data -= node.cost;
  tw.research += 1;
  return true;
}

/** Bonus de la investigación hecha en un negocio (venta, producción y logística). */
export function researchMults(s: GameState, bizId: string): Mults {
  const m = { prod: 1, log: 1, sale: 1 };
  const done = s.meta.twists[bizId]?.research ?? 0;
  if (twistOf(bizId) !== "research") return m;
  for (const node of RESEARCH.slice(0, done)) if (node.kind !== "city") m[node.kind] += node.value;
  return m;
}

/** Bonus para toda la ciudad (nodo 🌍) si alguna IA de la ciudad lo tiene. */
function cityResearch(s: GameState): number {
  let k = 1;
  for (const id of Object.keys(s.biz)) {
    if (twistOf(id) !== "research") continue;
    const done = s.meta.twists[id]?.research ?? 0;
    for (const node of RESEARCH.slice(0, done)) if (node.kind === "city") k += node.value;
  }
  return k;
}

/* ---------- Efecto en las ventas ---------- */

/** Multiplicador de ventas de las mecánicas: reputación, directo viral (solo jugando) e investigación. */
export function twistSaleMult(s: GameState, bizId: string, now: number, live: boolean): number {
  const tw = s.meta.twists[bizId];
  let k = cityResearch(s);
  if (!tw) return k;
  if (twistOf(bizId) === "critic") k *= 1 + TW.starBonus * tw.stars;
  if (live && tw.viralEnd > now) k *= TW.viralMult;
  return k;
}
