import { BUSINESSES, CONFIG } from "./data";

export type BuyMode = 1 | 10 | 50 | "max";

export interface FloorState {
  level: number;
  managed: boolean;
  /** Dinero en producto esperando en el depósito de la planta. */
  stock: number;
  /** Segundos del ciclo en curso. */
  prog: number;
  running: boolean;
}

export type TransportPhase = "idle" | "down" | "load" | "up" | "unload";

export interface TransportState {
  level: number;
  managed: boolean;
  phase: TransportPhase;
  /** Posición vertical: 0 = superficie, i + 1 = planta i. */
  pos: number;
  /** Planta que está visitando o hacia la que va. */
  target: number;
  carry: number;
  timer: number;
}

export type SalePhase = "idle" | "out" | "back";

export interface SaleState {
  level: number;
  managed: boolean;
  phase: SalePhase;
  /** 0..1 dentro del tramo actual. */
  prog: number;
  carry: number;
}

export interface BusinessState {
  owned: boolean;
  floors: FloorState[];
  transport: TransportState;
  sale: SaleState;
  /** Producto ya en superficie esperando a venderse. */
  topStock: number;
  rushEnd: number;
  /** Ganado por este negocio en la partida actual. */
  earned: number;
}

export type View = { scene: "city" } | { scene: "business"; id: string };

export interface AdStats {
  total: number;
  day: string;
  today: number;
  byPlacement: Record<string, number>;
}

export interface GameState {
  version: 2;
  cash: number;
  /** Ganado desde la última salida a bolsa: decide cuántas acciones recibes. */
  runEarned: number;
  /** Ganado desde siempre: decide el estilo de vida. */
  totalEarned: number;
  shares: number;
  ipos: number;
  biz: Record<string, BusinessState>;
  boostEnd: number;
  buyMode: BuyMode;
  view: View;
  lastSeen: number;
  nextViral: number;
  lifeSeen: number;
  ads: AdStats;
}

export const freshFloor = (): FloorState => ({ level: 1, managed: false, stock: 0, prog: 0, running: false });

export function freshBusiness(owned: boolean): BusinessState {
  return {
    owned,
    floors: [freshFloor()],
    transport: { level: 1, managed: false, phase: "idle", pos: 0, target: 0, carry: 0, timer: 0 },
    sale: { level: 1, managed: false, phase: "idle", prog: 0, carry: 0 },
    topStock: 0,
    rushEnd: 0,
    earned: 0,
  };
}

export function freshState(now = Date.now()): GameState {
  return {
    version: 2,
    cash: 0,
    runEarned: 0,
    totalEarned: 0,
    shares: 0,
    ipos: 0,
    biz: Object.fromEntries(BUSINESSES.map((b) => [b.id, freshBusiness(b.price === 0)])),
    boostEnd: 0,
    buyMode: 1,
    view: { scene: "business", id: BUSINESSES[0].id },
    lastSeen: now,
    nextViral: now + 90_000,
    lifeSeen: 0,
    ads: { total: 0, day: "", today: 0, byPlacement: {} },
  };
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function migrateBusiness(raw: unknown, def: { price: number }): BusinessState {
  const r = obj(raw);
  const b = freshBusiness(def.price === 0 || !!r.owned);
  if (Array.isArray(r.floors) && r.floors.length) {
    b.floors = r.floors.slice(0, 8).map((f) => {
      const o = obj(f);
      return { level: Math.max(1, num(o.level, 1)), managed: !!o.managed, stock: num(o.stock, 0), prog: 0, running: false };
    });
  }
  const t = obj(r.transport);
  b.transport.level = Math.max(1, num(t.level, 1));
  b.transport.managed = !!t.managed;
  // El transporte vuelve arriba al cargar: lo que llevaba se pasa a la superficie.
  const s = obj(r.sale);
  b.sale.level = Math.max(1, num(s.level, 1));
  b.sale.managed = !!s.managed;
  b.topStock = num(r.topStock, 0) + num(t.carry, 0) + num(s.carry, 0);
  b.rushEnd = num(r.rushEnd, 0);
  b.earned = num(r.earned, 0);
  return b;
}

/** Convierte una partida guardada en un estado válido. Las partidas de la versión 1 empiezan de cero. */
export function migrate(raw: unknown, now = Date.now()): GameState {
  const s = freshState(now);
  const r = obj(raw);
  if (r.version !== 2) return s;
  s.cash = num(r.cash, 0);
  s.runEarned = num(r.runEarned, 0);
  s.totalEarned = num(r.totalEarned, 0);
  s.shares = num(r.shares, 0);
  s.ipos = num(r.ipos, 0);
  s.boostEnd = num(r.boostEnd, 0);
  s.lastSeen = num(r.lastSeen, now);
  s.nextViral = num(r.nextViral, s.nextViral);
  s.lifeSeen = num(r.lifeSeen, 0);
  if (r.buyMode === 1 || r.buyMode === 10 || r.buyMode === 50 || r.buyMode === "max") s.buyMode = r.buyMode;
  const biz = obj(r.biz);
  for (const def of BUSINESSES) if (biz[def.id]) s.biz[def.id] = migrateBusiness(biz[def.id], def);
  const v = obj(r.view);
  if (v.scene === "business" && typeof v.id === "string" && s.biz[v.id]?.owned) s.view = { scene: "business", id: v.id };
  else if (v.scene === "city") s.view = { scene: "city" };
  const ads = obj(r.ads);
  s.ads = {
    total: num(ads.total, 0),
    day: typeof ads.day === "string" ? ads.day : "",
    today: num(ads.today, 0),
    byPlacement: { ...(obj(ads.byPlacement) as Record<string, number>) },
  };
  return s;
}

/** Nueva partida tras salir a bolsa: se conserva lo permanente. */
export function afterIpo(s: GameState, gained: number, now = Date.now()): GameState {
  const n = freshState(now);
  n.shares = s.shares + gained;
  n.ipos = s.ipos + 1;
  n.totalEarned = s.totalEarned;
  n.lifeSeen = s.lifeSeen;
  n.boostEnd = s.boostEnd;
  n.ads = s.ads;
  n.buyMode = s.buyMode;
  n.nextViral = now + CONFIG.viralMinSec * 1000;
  return n;
}
