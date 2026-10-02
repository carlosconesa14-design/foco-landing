import { ALL_BUSINESSES, CHAIN, CONFIG, LIFE, MILESTONES, type BusinessDef } from "./data";
import { NO_MULTS, execMults, type Mults } from "./execs";
import { bump, cityDef, type BusinessState, type BuyMode, type GameState } from "./state";
import { t } from "../i18n";
import { luckyChance, offlineCapHours, tourismMult, upgradeDiscount, worldIncomeMult } from "./world";

/* ---------- Utilidades ---------- */

/** Coste de comprar `n` niveles cuando el siguiente cuesta `first`. */
export function geomCost(first: number, k: number, n: number): number {
  return (first * (Math.pow(k, n) - 1)) / (k - 1);
}

/** Cuántos niveles puedes pagar con `cash` si el siguiente cuesta `first`. */
export function maxAffordable(first: number, k: number, cash: number): number {
  if (cash < first) return 0;
  return Math.floor(Math.log((cash * (k - 1)) / first + 1) / Math.log(k));
}

export function buyQty(mode: BuyMode, first: number, k: number, cash: number): number {
  return mode === "max" ? Math.max(1, maxAffordable(first, k, cash)) : mode;
}

export const milestonesReached = (level: number) => MILESTONES.filter((m) => level >= m).length;
export const nextMilestone = (level: number) => MILESTONES.find((m) => level < m);
const msMult = (level: number) => Math.pow(2, milestonesReached(level));

export const bizDef = (id: string): BusinessDef => {
  const d = ALL_BUSINESSES.find((b) => b.id === id);
  if (!d) throw new Error(`Negocio desconocido: ${id}`);
  return d;
};

/* ---------- Multiplicadores de venta ---------- */

export const boostActive = (s: GameState, now: number) => s.boostEnd > now;
export const rushActive = (b: BusinessState, now: number) => b.rushEnd > now;

/** Multiplica el dinero al vender. El x2 y la hora punta no cuentan offline. */
/** Negocios de la ciudad en la que estás. */
export const bizList = (s: GameState): BusinessDef[] => cityDef(s.city).businesses;

/** Categoría del negocio según sus puestos: 1 (1–2 puestos), 2 (3–5) o 3 estrellas (6–8). El edificio crece con ella. */
export const bizTier = (b: BusinessState) => (b.floors.length >= 6 ? 3 : b.floors.length >= 3 ? 2 : 1);

export function saleMult(s: GameState, id: string, now: number, live = true): number {
  const boost = live && boostActive(s, now) ? 2 : 1;
  const rush = live && rushActive(s.biz[id], now) ? CONFIG.rushMult : 1;
  return (
    boost *
    rush *
    (1 + CONFIG.shareBonus * s.shares) *
    execMults(s, id, now, live).sale *
    worldIncomeMult(s) *
    tourismMult(s, now, live) *
    (s.meta.shop.vip ? 2 : 1) // VIP: x2 permanente (también offline)
  );
}

/** Escala de costes del negocio: su multiplicador por su ritmo (los últimos negocios avanzan más despacio). */
export const costScale = (def: BusinessDef) => def.mult * def.pace;

/* ---------- Plantas ---------- */

export function floorRate(def: BusinessDef, i: number, level: number): number {
  return def.mult * CHAIN.floorBaseRate * Math.pow(CHAIN.floorGrowth, i) * level * msMult(level);
}

export const floorLoad = (def: BusinessDef, i: number, level: number) => floorRate(def, i, level) * CHAIN.floorCycle;

export function floorUnlockCost(def: BusinessDef, i: number): number {
  return costScale(def) * CHAIN.unlockBase * Math.pow(CHAIN.unlockGrowth, i);
}

/** Coste del siguiente nivel de la planta i estando en `level`. */
export function floorNextCost(def: BusinessDef, i: number, level: number): number {
  const base = i === 0 ? costScale(def) * 5 : floorUnlockCost(def, i) * 0.2;
  return base * Math.pow(CHAIN.floorUpgradeK, level - 1);
}

/* ---------- Transporte ---------- */

/** Capacidad logística: crece de forma exponencial con el nivel para poder seguir a los puestos nuevos. */
const logisticsGrowth = (level: number) => level * Math.pow(CHAIN.logisticsCapGrowth, level - 1) * msMult(level);

export const transportCap = (def: BusinessDef, level: number) => def.mult * CHAIN.transportBaseCap * logisticsGrowth(level);

/** Plantas por segundo. */
export const transportSpeed = (level: number) =>
  Math.min(CHAIN.transportMaxSpeed, CHAIN.transportBaseSpeed * (1 + 0.04 * (level - 1)));

/** Tiempo de un viaje completo visitando todas las plantas. */
export function transportRoundTrip(floors: number, level: number): number {
  return (2 * floors) / transportSpeed(level) + floors * CHAIN.transportLoadTime + CHAIN.transportUnloadTime;
}

/* ---------- Venta ---------- */

export const saleCap = (def: BusinessDef, level: number) => def.mult * CHAIN.saleBaseCap * logisticsGrowth(level);
export const saleWalk = (level: number) => Math.max(CHAIN.saleMinWalk, CHAIN.saleBaseWalk / (1 + 0.03 * (level - 1)));

export const logisticsNextCost = (def: BusinessDef, level: number) =>
  costScale(def) * CHAIN.logisticsCostBase * Math.pow(CHAIN.logisticsCostK, level - 1);

/* ---------- Gerentes ---------- */

export type Station = { kind: "floor"; index: number } | { kind: "transport" } | { kind: "sale" };

export function managerCost(def: BusinessDef, st: Station): number {
  if (st.kind === "floor") return costScale(def) * CHAIN.managerFloorBase * Math.pow(CHAIN.unlockGrowth, st.index);
  return costScale(def) * (st.kind === "transport" ? CHAIN.managerTransport : CHAIN.managerSale);
}

/* ---------- Mejoras de una parte de la cadena ---------- */

export function stationLevel(b: BusinessState, st: Station): number {
  if (st.kind === "floor") return b.floors[st.index].level;
  return st.kind === "transport" ? b.transport.level : b.sale.level;
}

export function upgradeQuote(s: GameState, id: string, st: Station): { qty: number; cost: number } {
  const def = bizDef(id);
  const level = stationLevel(s.biz[id], st);
  const first = (st.kind === "floor" ? floorNextCost(def, st.index, level) : logisticsNextCost(def, level)) * upgradeDiscount(s);
  const k = st.kind === "floor" ? CHAIN.floorUpgradeK : CHAIN.logisticsCostK;
  const qty = buyQty(s.buyMode, first, k, s.cash);
  return { qty, cost: geomCost(first, k, qty) };
}

/* ---------- Ritmos (para la interfaz y el offline) ---------- */

export interface ChainRates {
  production: number;
  transport: number;
  sale: number;
  /** Lo que de verdad llega a venderse: el mínimo de las tres. */
  total: number;
  /** Qué parte limita. */
  bottleneck: "production" | "transport" | "sale";
}

/** Ritmos de la cadena en €/s (antes de multiplicadores). Con `managedOnly` solo cuenta lo automatizado. */
export function chainRates(def: BusinessDef, b: BusinessState, managedOnly: boolean, m: Mults = NO_MULTS): ChainRates {
  const production =
    m.prod * b.floors.reduce((a, f, i) => a + (!managedOnly || f.managed ? floorRate(def, i, f.level) : 0), 0);
  const transport =
    !managedOnly || b.transport.managed
      ? (m.log * transportCap(def, b.transport.level)) / transportRoundTrip(b.floors.length, b.transport.level)
      : 0;
  const sale = !managedOnly || b.sale.managed ? (m.log * saleCap(def, b.sale.level)) / (2 * saleWalk(b.sale.level)) : 0;
  const total = Math.min(production, transport, sale);
  const bottleneck = total === production ? "production" : total === transport ? "transport" : "sale";
  return { production, transport, sale, total, bottleneck };
}

export function businessRate(s: GameState, id: string, now: number, live = true): number {
  const b = s.biz[id];
  if (!b.owned) return 0;
  return chainRates(bizDef(id), b, true, execMults(s, id, now, live)).total * saleMult(s, id, now, live);
}

export function passiveRate(s: GameState, now: number, live = true): number {
  return bizList(s).reduce((a, d) => a + businessRate(s, d.id, now, live), 0);
}

/* ---------- Totales ---------- */

export function sharesToGain(s: GameState): number {
  return Math.floor(Math.cbrt(s.runEarned / cityDef(s.city).shareDivisor) + 1e-9);
}

export function lifeIndex(total: number): number {
  let i = 0;
  while (i < LIFE.length - 1 && total >= LIFE[i + 1].min) i++;
  return i;
}

export function earn(s: GameState, amount: number, bizId?: string): void {
  s.cash += amount;
  s.runEarned += amount;
  s.totalEarned += amount;
  s.world.lifetimeEarned += amount;
  bump(s, "earned", amount);
  if (bizId) s.biz[bizId].earned += amount;
}

/* ---------- Simulación ---------- */

export interface SaleEvent {
  biz: string;
  amount: number;
  /** Venta viral: paga CONFIG.luckyMult veces más. */
  lucky?: boolean;
}

/** Tirada de suerte de las ventas virales. Se puede fijar en tests y simulaciones. */
let luck: () => number = Math.random;
export function setLuck(fn: () => number): void {
  luck = fn;
}

function tickBusiness(s: GameState, id: string, dt: number, now: number, events: SaleEvent[]): void {
  const def = bizDef(id);
  const b = s.biz[id];
  const m = execMults(s, id, now);

  // Plantas: cada trabajador completa ciclos y deja producto en su depósito.
  b.floors.forEach((f, i) => {
    if (f.managed) f.running = true;
    if (!f.running) return;
    f.prog += dt;
    if (f.prog < CHAIN.floorCycle) return;
    const n = f.managed ? Math.floor(f.prog / CHAIN.floorCycle) : 1;
    f.stock += floorLoad(def, i, f.level) * m.prod * n;
    if (f.managed) f.prog -= n * CHAIN.floorCycle;
    else {
      f.prog = 0;
      f.running = false;
    }
  });

  // Transporte: baja planta a planta, carga hasta llenarse y sube.
  const t = b.transport;
  const cap = transportCap(def, t.level) * m.log;
  const speed = transportSpeed(t.level);
  let left = dt;
  let guard = 0;
  while (left > 0 && guard++ < 64) {
    if (t.phase === "idle") {
      if (!t.managed) break;
      t.phase = "down";
      t.target = 0;
    } else if (t.phase === "down" || t.phase === "up") {
      const goal = t.phase === "down" ? t.target + 1 : 0;
      const dist = Math.abs(goal - t.pos);
      const step = speed * left;
      if (step < dist) {
        t.pos += Math.sign(goal - t.pos) * step;
        left = 0;
      } else {
        t.pos = goal;
        left -= dist / speed;
        t.phase = t.phase === "down" ? "load" : "unload";
        t.timer = t.phase === "load" ? CHAIN.transportLoadTime : CHAIN.transportUnloadTime;
      }
    } else {
      // load / unload: esperar el temporizador
      if (t.timer > left) {
        t.timer -= left;
        left = 0;
        break;
      }
      left -= t.timer;
      t.timer = 0;
      if (t.phase === "load") {
        const f = b.floors[t.target];
        const take = Math.min(f.stock, cap - t.carry);
        f.stock -= take;
        t.carry += take;
        const last = t.target >= b.floors.length - 1;
        if (t.carry >= cap - 1e-9 || last) t.phase = "up";
        else {
          t.target++;
          t.phase = "down";
        }
      } else {
        b.topStock += t.carry;
        t.carry = 0;
        t.phase = t.managed ? "down" : "idle";
        t.target = 0;
      }
    }
  }

  // Venta: carga lo que hay arriba, lo lleva al cliente y vuelve.
  const sl = b.sale;
  const walk = saleWalk(sl.level);
  left = dt;
  guard = 0;
  while (left > 0 && guard++ < 64) {
    if (sl.phase === "idle") {
      if (!sl.managed || b.topStock <= 0) break;
      startSale(def, b, m.log);
    } else {
      const need = (1 - sl.prog) * walk;
      if (need > left) {
        sl.prog += left / walk;
        left = 0;
      } else {
        left -= need;
        sl.prog = 0;
        if (sl.phase === "out") {
          // Recompensa variable: de vez en cuando una venta se hace viral y paga mucho más.
          const lucky = sl.carry > 0 && luck() < luckyChance(s);
          const amount = sl.carry * saleMult(s, id, now) * (lucky ? CONFIG.luckyMult : 1);
          sl.carry = 0;
          earn(s, amount, id);
          bump(s, "sales");
          events.push({ biz: id, amount, lucky });
          sl.phase = "back";
        } else {
          sl.phase = "idle";
        }
      }
    }
  }
}

function startSale(def: BusinessDef, b: BusinessState, logMult = 1): void {
  const take = Math.min(b.topStock, saleCap(def, b.sale.level) * logMult);
  b.topStock -= take;
  b.sale.carry = take;
  b.sale.phase = "out";
  b.sale.prog = 0;
}

/** Avanza el juego `dt` segundos. Devuelve las ventas para mostrarlas. */
export function tick(s: GameState, dt: number, now: number): SaleEvent[] {
  const events: SaleEvent[] = [];
  for (const d of bizList(s)) if (s.biz[d.id].owned) tickBusiness(s, d.id, dt, now, events);
  return events;
}

/* ---------- Toques del jugador ---------- */

/** Pone en marcha una parte parada. Devuelve un aviso si no se puede. */
export function tapStation(s: GameState, id: string, st: Station): string | null {
  const b = s.biz[id];
  if (st.kind === "floor") {
    const f = b.floors[st.index];
    if (!f.running) {
      f.running = true;
      bump(s, "tapFloor");
    }
    return null;
  }
  if (st.kind === "transport") {
    if (b.transport.phase === "idle") {
      b.transport.phase = "down";
      b.transport.target = 0;
      bump(s, "tapTransport");
    }
    return null;
  }
  if (b.sale.phase !== "idle") return null;
  if (b.topStock <= 0) return t("Aún no hay nada que vender arriba");
  startSale(bizDef(id), b, execMults(s, id, Date.now()).log);
  return null;
}

/** Lo ganado mientras la app estuvo cerrada (sin x2 ni hora punta, con tope). */
export function offlineEarnings(s: GameState, now: number): { seconds: number; amount: number } {
  const seconds = Math.max(0, Math.min((now - s.lastSeen) / 1000, offlineCapHours(s) * 3600));
  return { seconds, amount: passiveRate(s, now, false) * seconds };
}
