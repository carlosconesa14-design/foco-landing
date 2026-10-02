import * as act from "./actions";
import { CHAIN } from "./data";
import {
  bizDef, bizList, businessRate, chainRates, floorNextCost, floorUnlockCost, geomCost, logisticsNextCost, managerCost, nextMilestone, passiveRate,
  type ChainRates, type Station,
} from "./economy";
import { execMults } from "./execs";
import type { BusinessState, BuyMode, GameState } from "./state";
import { upgradeDiscount } from "./world";

/**
 * «Mejorar todo»: reparte el dinero del negocio en lo que más rinde, como lo haría un buen jugador
 * (primero los gerentes que falten; luego lo que más €/s da por cada euro, contando los hitos x2),
 * sin gastar lo que guardas para el siguiente negocio. Ver `autoUpgrade`.
 *
 * Límite: unas veces al día gratis y alguna más con anuncio. Sin límite con el «Gestor automático»
 * (compra de 0,99 €) o con el VIP.
 */

export const AUTO = {
  freePerDay: 3,
  adPerDay: 2,
  /** Compras como mucho en un uso (para que nunca se quede colgado). */
  maxSteps: 400,
  /** Si el siguiente negocio llega en menos de esto (s de ingresos), se guarda el dinero para él. */
  saveForBizSec: 1200,
  /** Si la mejor compra llega en menos de esto (s de ingresos), se espera en vez de comprar algo peor. */
  waitForBestSec: 120,
} as const;

export interface AutoState {
  day: string;
  used: number;
  adUsed: number;
}

export const freshAuto = (): AutoState => ({ day: "", used: 0, adUsed: 0 });

export function migrateAuto(raw: unknown): AutoState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (v: unknown) => (typeof v === "number" && v > 0 ? Math.floor(v) : 0);
  return { day: typeof r.day === "string" ? r.day : "", used: n(r.used), adUsed: n(r.adUsed) };
}

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

export const autoUnlimited = (s: GameState) => s.meta.shop.vip || s.meta.shop.autoManager;

function today(s: GameState, now: number): AutoState {
  const a = s.meta.auto;
  if (a.day !== dayOf(now)) Object.assign(a, { day: dayOf(now), used: 0, adUsed: 0 });
  return a;
}

/** Usos gratis que quedan hoy (Infinity si es ilimitado). */
export function autoFreeLeft(s: GameState, now: number): number {
  if (autoUnlimited(s)) return Infinity;
  return Math.max(0, AUTO.freePerDay - today(s, now).used);
}

/** Usos con anuncio que quedan hoy. */
export const autoAdLeft = (s: GameState, now: number) => (autoUnlimited(s) ? 0 : Math.max(0, AUTO.adPerDay - today(s, now).adUsed));

/** Gasta un uso (gratis o con anuncio). Devuelve false si no quedan. */
export function spendAutoUse(s: GameState, now: number, withAd: boolean): boolean {
  if (autoUnlimited(s)) return true;
  const a = today(s, now);
  if (withAd) {
    if (a.adUsed >= AUTO.adPerDay) return false;
    a.adUsed += 1;
    return true;
  }
  if (a.used >= AUTO.freePerDay) return false;
  a.used += 1;
  return true;
}

/* ---------- Qué comprar ---------- */

interface Move {
  /** €/s que gana la parte que frena (la misma medida que usa el bot de equilibrado). */
  gain: number;
  cost: number;
  label: string;
  run: () => void;
}

const levelOf = (b: BusinessState, st: Station) => (st.kind === "floor" ? b.floors[st.index].level : st.kind === "transport" ? b.transport.level : b.sale.level);
function setLevel(b: BusinessState, st: Station, v: number): void {
  if (st.kind === "floor") b.floors[st.index].level = v;
  else if (st.kind === "transport") b.transport.level = v;
  else b.sale.level = v;
}

/** Coste de subir `n` niveles una parte (con los descuentos). */
function levelsCost(s: GameState, id: string, st: Station, n: number): number {
  const def = bizDef(id);
  const level = levelOf(s.biz[id], st);
  const first = (st.kind === "floor" ? floorNextCost(def, st.index, level) : logisticsNextCost(def, level)) * upgradeDiscount(s);
  return geomCost(first, st.kind === "floor" ? CHAIN.floorUpgradeK : CHAIN.logisticsCostK, n);
}

function buyLevels(s: GameState, id: string, st: Station, n: number): void {
  const mode = s.buyMode;
  s.buyMode = n as BuyMode; // upgradeQuote acepta cualquier cantidad
  act.upgrade(s, id, st);
  s.buyMode = mode;
}

/**
 * Todas las compras que ayudan a la parte que frena: subir 1 nivel, **subir hasta el siguiente hito**
 * (contando su x2) o abrir un puesto nuevo. Se valoran por €/s ganados por cada euro.
 */
function moves(s: GameState, id: string, now: number): Move[] {
  const def = bizDef(id);
  const b = s.biz[id];
  const m = execMults(s, id, now);
  const r0 = chainRates(def, b, false, m);
  const part = (r: ChainRates) => r[r0.bottleneck];
  const out: Move[] = [];
  const levelMoves = (st: Station) => {
    const lvl = levelOf(b, st);
    const ms = nextMilestone(lvl);
    for (const n of new Set([1, ms ? ms - lvl : 1])) {
      setLevel(b, st, lvl + n);
      const gain = part(chainRates(def, b, false, m)) - part(r0);
      setLevel(b, st, lvl);
      out.push({ gain, cost: levelsCost(s, id, st, n), label: n > 1 ? "hito" : "mejora", run: () => buyLevels(s, id, st, n) });
    }
  };
  if (r0.bottleneck === "production") {
    b.floors.forEach((_, i) => levelMoves({ kind: "floor", index: i }));
    if (b.floors.length < CHAIN.maxFloors) {
      b.floors.push({ level: 1, managed: false, stock: 0, prog: 0, running: false });
      const gain = chainRates(def, b, false, m).production - r0.production;
      b.floors.pop();
      out.push({ gain, cost: floorUnlockCost(def, b.floors.length), label: "puesto", run: () => act.unlockFloor(s, id) });
    }
  } else levelMoves({ kind: r0.bottleneck === "transport" ? "transport" : "sale" });
  return out.filter((o) => o.gain > 0 && o.cost > 0);
}

const better = (a: Move, b: Move) => (a.gain / a.cost >= b.gain / b.cost ? a : b);

/** Lo que se guarda para el siguiente negocio de la ciudad si está cerca (o ya se puede comprar). */
export function autoReserve(s: GameState, now: number): { amount: number; biz: string | null } {
  const next = bizList(s).find((d) => !s.biz[d.id].owned);
  if (!next) return { amount: 0, biz: null };
  const rate = passiveRate(s, now);
  if (s.cash >= next.price) return { amount: next.price, biz: next.name };
  if (rate > 0 && (next.price - s.cash) / rate < AUTO.saveForBizSec) return { amount: s.cash, biz: next.name };
  return { amount: 0, biz: null };
}

export interface AutoResult {
  steps: number;
  spent: number;
  before: number;
  after: number;
  /** Ha dejado sin tocar el dinero que guardas para este negocio. */
  savingFor: string | null;
  /** Se ha parado para ahorrar para una compra mejor que llega en menos de 2 minutos. */
  waiting: boolean;
}

/**
 * Mejora todo lo que convenga en un negocio, como lo haría un jugador experto:
 * 1. contrata los gerentes que falten;
 * 2. compra lo que más €/s da por euro, contando los hitos x2 (subir varios niveles de golpe);
 * 3. si lo mejor es caro pero llega en menos de 2 minutos de ingresos, espera en vez de gastar en algo peor;
 * 4. no toca el dinero que guardas para el siguiente negocio si está cerca (salvo `spendAll`).
 */
export function autoUpgrade(s: GameState, id: string, now: number, spendAll = false): AutoResult {
  const b = s.biz[id];
  const before = businessRate(s, id, now);
  const cash0 = s.cash;
  const res: AutoResult = { steps: 0, spent: 0, before, after: before, savingFor: null, waiting: false };
  if (!b?.owned) return res;
  const reserve = spendAll ? { amount: 0, biz: null } : autoReserve(s, now);
  const budget = () => s.cash - reserve.amount;
  const rate = Math.max(passiveRate(s, now), 1e-9);
  // 1) Gerentes que falten (lo que más cambia la vida de un negocio)
  const parts: Station[] = [...b.floors.map((_, i) => ({ kind: "floor", index: i }) as Station), { kind: "transport" }, { kind: "sale" }];
  for (const st of parts) {
    const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
    const cost = managerCost(bizDef(id), st);
    if (!target.managed && budget() >= cost && act.hireManager(s, id, st)) res.steps++;
  }
  // 2) y 3) La compra más rentable, una y otra vez
  for (; res.steps < AUTO.maxSteps; res.steps++) {
    const all = moves(s, id, now);
    if (!all.length) break;
    const best = all.reduce(better);
    if (best.cost <= budget()) {
      best.run();
      continue;
    }
    if ((best.cost - budget()) / rate < AUTO.waitForBestSec) {
      res.waiting = true;
      break;
    }
    const fits = all.filter((o) => o.cost <= budget());
    if (!fits.length) break;
    fits.reduce(better).run();
  }
  if (reserve.biz && reserve.amount > 0) res.savingFor = reserve.biz;
  res.spent = cash0 - s.cash;
  res.after = businessRate(s, id, now);
  return res;
}

/** Lo que haría «Mejorar todo» ahora, sin tocar la partida (para enseñarlo antes). */
export function planAuto(s: GameState, id: string, now: number, spendAll = false): AutoResult {
  return autoUpgrade(structuredClone(s), id, now, spendAll);
}
