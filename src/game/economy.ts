import { CONFIG, JOBS, JOB_MILESTONES, LIFE, PROPERTIES, STATION_MILESTONES, type PropertyDef } from "./data";
import type { BuyMode, GameState } from "./state";

/* ---------- Costes geométricos ---------- */

/** Coste de comprar `n` niveles cuando ya tienes `owned`. */
export function geomCost(base: number, k: number, owned: number, n: number): number {
  return (base * Math.pow(k, owned) * (Math.pow(k, n) - 1)) / (k - 1);
}

/** Cuántos niveles puedes pagar con `cash`. */
export function maxAffordable(base: number, k: number, owned: number, cash: number): number {
  const first = base * Math.pow(k, owned);
  if (cash < first) return 0;
  return Math.floor(Math.log((cash * (k - 1)) / first + 1) / Math.log(k));
}

/** Niveles que compraría el botón según el modo x1/x10/x100/Máx (mínimo 1 para mostrar el precio). */
export function buyQty(mode: BuyMode, base: number, k: number, owned: number, cash: number): number {
  if (mode === "max") return Math.max(1, maxAffordable(base, k, owned, cash));
  return mode;
}

export const milestonesReached = (level: number, list: number[]) => list.filter((m) => level >= m).length;
export const nextMilestone = (level: number, list: number[]) => list.find((m) => level < m);

/* ---------- Multiplicadores ---------- */

export const boostActive = (s: GameState, now: number) => s.boostEnd > now;

export function globalMult(s: GameState, now: number, withBoost = true): number {
  return (withBoost && boostActive(s, now) ? 2 : 1) * (1 + CONFIG.shareBonus * s.shares);
}

/* ---------- Carrera ---------- */

export function jobCycle(s: GameState, i: number): number {
  return JOBS[i].time / Math.pow(2, milestonesReached(s.jobs[i].level, JOB_MILESTONES));
}

export function jobRevenue(s: GameState, i: number, now: number, withBoost = true): number {
  return JOBS[i].rev * s.jobs[i].level * globalMult(s, now, withBoost);
}

export function jobRate(s: GameState, i: number, now: number, withBoost = true): number {
  return s.jobs[i].level ? jobRevenue(s, i, now, withBoost) / jobCycle(s, i) : 0;
}

export function jobBuyCost(s: GameState, i: number): { qty: number; cost: number } {
  const j = JOBS[i];
  const owned = s.jobs[i].level;
  const qty = owned === 0 ? 1 : buyQty(s.buyMode, j.cost, j.k, owned, s.cash);
  return { qty, cost: geomCost(j.cost, j.k, owned, qty) };
}

/* ---------- Ciudad: idle dentro de cada negocio ---------- */

export const propDef = (id: string): PropertyDef => {
  const p = PROPERTIES.find((x) => x.id === id);
  if (!p) throw new Error(`Negocio desconocido: ${id}`);
  return p;
};

export function stationCap(def: PropertyDef, station: number, level: number): number {
  return def.stations[station].baseCap * level * Math.pow(2, milestonesReached(level, STATION_MILESTONES));
}

/** Índice de la estación que limita la producción (la de menor capacidad). */
export function bottleneck(s: GameState, id: string): number {
  const def = propDef(id);
  const caps = s.props[id].levels.map((l, i) => stationCap(def, i, l));
  return caps.indexOf(Math.min(...caps));
}

/** Unidades por segundo que vende el negocio. */
export function propThroughput(s: GameState, id: string): number {
  const def = propDef(id);
  return Math.min(...s.props[id].levels.map((l, i) => stationCap(def, i, l)));
}

export const rushActive = (s: GameState, id: string, now: number) => s.props[id].rushEnd > now;

export function propRate(s: GameState, id: string, now: number, withBoost = true): number {
  const p = s.props[id];
  if (!p.owned) return 0;
  const rush = withBoost && rushActive(s, id, now) ? CONFIG.rushMult : 1;
  return propThroughput(s, id) * propDef(id).unitPrice * globalMult(s, now, withBoost) * rush;
}

export function stationUpgradeCost(s: GameState, id: string, station: number): { qty: number; cost: number } {
  const def = propDef(id);
  const owned = s.props[id].levels[station] - 1;
  const base = def.upgradeCost * (1 + station * 0.15);
  const qty = buyQty(s.buyMode, base, def.upgradeK, owned, s.cash);
  return { qty, cost: geomCost(base, def.upgradeK, owned, qty) };
}

/* ---------- Totales ---------- */

/** Ingresos por segundo que no requieren tocar la pantalla. */
export function passiveRate(s: GameState, now: number, withBoost = true): number {
  let r = 0;
  JOBS.forEach((_, i) => {
    if (s.jobs[i].auto) r += jobRate(s, i, now, withBoost);
  });
  for (const p of PROPERTIES) r += propRate(s, p.id, now, withBoost);
  return r;
}

export function sharesToGain(s: GameState): number {
  return Math.floor(Math.sqrt(s.runEarned / CONFIG.shareDivisor));
}

export function lifeIndex(total: number): number {
  let i = 0;
  while (i < LIFE.length - 1 && total >= LIFE[i + 1].min) i++;
  return i;
}

export function earn(s: GameState, amount: number): void {
  s.cash += amount;
  s.runEarned += amount;
  s.totalEarned += amount;
}

/* ---------- Simulación ---------- */

export interface SaleEvent {
  job: number;
  amount: number;
}

/** Avanza el juego `dt` segundos. Devuelve las ventas manuales completadas para mostrarlas. */
export function tick(s: GameState, dt: number, now: number): SaleEvent[] {
  const sales: SaleEvent[] = [];
  s.jobs.forEach((j, i) => {
    if (!j.level) return;
    if (j.auto) j.running = true;
    if (!j.running) return;
    j.prog += dt;
    const c = jobCycle(s, i);
    if (j.prog < c) return;
    if (j.auto) {
      const n = Math.floor(j.prog / c);
      earn(s, jobRevenue(s, i, now) * n);
      j.prog -= n * c;
    } else {
      const amount = jobRevenue(s, i, now);
      earn(s, amount);
      j.prog = 0;
      j.running = false;
      sales.push({ job: i, amount });
    }
  });
  for (const p of PROPERTIES) {
    const r = propRate(s, p.id, now);
    if (r) earn(s, r * dt);
  }
  return sales;
}

/** Lo ganado mientras la app estuvo cerrada (sin x2 ni hora punta, con tope). */
export function offlineEarnings(s: GameState, now: number): { seconds: number; amount: number } {
  const seconds = Math.max(0, Math.min((now - s.lastSeen) / 1000, CONFIG.offlineCapHours * 3600));
  return { seconds, amount: passiveRate(s, now, false) * seconds };
}
