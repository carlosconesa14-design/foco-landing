import { CONFIG, JOBS, JOB_MILESTONES, STATION_MILESTONES } from "./data";
import { jobBuyCost, milestonesReached, propDef, sharesToGain, stationUpgradeCost } from "./economy";
import { afterIpo, type GameState } from "./state";

/** Acciones del jugador. Devuelven un mensaje para mostrar, o null si no se pudo. */

export function startJob(s: GameState, i: number): boolean {
  const j = s.jobs[i];
  if (!j.level || j.running) return false;
  j.running = true;
  return true;
}

export function buyJob(s: GameState, i: number): string | null {
  const { qty, cost } = jobBuyCost(s, i);
  if (s.cash < cost) return null;
  const before = milestonesReached(s.jobs[i].level, JOB_MILESTONES);
  s.cash -= cost;
  s.jobs[i].level += qty;
  if (milestonesReached(s.jobs[i].level, JOB_MILESTONES) > before) return `${JOBS[i].name}: ¡velocidad x2!`;
  return "";
}

export function automateJob(s: GameState, i: number): string | null {
  const def = JOBS[i];
  const j = s.jobs[i];
  if (!j.level || j.auto || s.cash < def.autoCost) return null;
  s.cash -= def.autoCost;
  j.auto = true;
  return `${def.name} ya funciona solo`;
}

export function buyProperty(s: GameState, id: string): string | null {
  const def = propDef(id);
  const p = s.props[id];
  if (p.owned || s.cash < def.price) return null;
  s.cash -= def.price;
  p.owned = true;
  return `¡Has comprado ${def.name}!`;
}

export function upgradeStation(s: GameState, id: string, station: number): string | null {
  const p = s.props[id];
  if (!p.owned) return null;
  const { qty, cost } = stationUpgradeCost(s, id, station);
  if (s.cash < cost) return null;
  const before = milestonesReached(p.levels[station], STATION_MILESTONES);
  s.cash -= cost;
  p.levels[station] += qty;
  if (milestonesReached(p.levels[station], STATION_MILESTONES) > before) {
    return `${propDef(id).stations[station].name}: ¡capacidad x2!`;
  }
  return "";
}

export function addBoost(s: GameState, now: number): boolean {
  const remaining = s.boostEnd - now;
  if (remaining > (CONFIG.boostMaxHours - CONFIG.boostHours) * 3600e3) return false;
  s.boostEnd = Math.max(now, s.boostEnd) + CONFIG.boostHours * 3600e3;
  return true;
}

export function startRush(s: GameState, id: string, now: number): boolean {
  const p = s.props[id];
  if (!p.owned || p.rushEnd > now) return false;
  p.rushEnd = now + CONFIG.rushMinutes * 60e3;
  return true;
}

/** Sale a bolsa. Con `mult` = 2 si el jugador vio el anuncio. */
export function ipo(s: GameState, mult: 1 | 2, now: number): { state: GameState; gained: number } | null {
  const gained = sharesToGain(s) * mult;
  if (gained < 1) return null;
  return { state: afterIpo(s, gained, now), gained };
}

export function recordAd(s: GameState, placement: string, now: Date = new Date()): void {
  const day = now.toISOString().slice(0, 10);
  if (s.ads.day !== day) {
    s.ads.day = day;
    s.ads.today = 0;
  }
  s.ads.total++;
  s.ads.today++;
  s.ads.byPlacement[placement] = (s.ads.byPlacement[placement] ?? 0) + 1;
}
