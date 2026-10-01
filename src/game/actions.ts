import { CHAIN, CONFIG } from "./data";
import {
  bizDef,
  bizTier,
  floorUnlockCost,
  managerCost,
  milestonesReached,
  sharesToGain,
  stationLevel,
  upgradeQuote,
  type Station,
} from "./economy";
import { afterIpo, bump, freshFloor, type GameState } from "./state";
import { applyStartPerks, boostHours } from "./world";
import { leagueEvent, runRef } from "./league";

/** Acciones del jugador. Devuelven un mensaje para mostrar ("" si no hace falta), o null si no se pudo. */

export function stationName(id: string, st: Station): string {
  const def = bizDef(id);
  if (st.kind === "floor") return `${def.floorName} ${st.index + 1}`;
  return st.kind === "transport" ? def.transportName : def.saleName;
}

export function upgrade(s: GameState, id: string, st: Station): string | null {
  const b = s.biz[id];
  if (!b.owned) return null;
  const { qty, cost } = upgradeQuote(s, id, st);
  if (s.cash < cost) return null;
  const before = milestonesReached(stationLevel(b, st));
  s.cash -= cost;
  bump(s, "upgrades", qty);
  if (st.kind === "floor") b.floors[st.index].level += qty;
  else if (st.kind === "transport") b.transport.level += qty;
  else b.sale.level += qty;
  if (milestonesReached(stationLevel(b, st)) <= before) return "";
  const stKey = st.kind === "floor" ? `f${st.index}` : st.kind;
  leagueEvent(s, "milestone", runRef(s, id, stKey, milestonesReached(stationLevel(b, st))));
  return `${stationName(id, st)}: ¡rendimiento x2!`;
}

export function hireManager(s: GameState, id: string, st: Station): string | null {
  const b = s.biz[id];
  const cost = managerCost(bizDef(id), st);
  const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
  if (!b.owned || target.managed || s.cash < cost) return null;
  s.cash -= cost;
  target.managed = true;
  bump(s, "hires");
  return `${stationName(id, st)} ya funciona solo`;
}

export function unlockFloor(s: GameState, id: string): string | null {
  const b = s.biz[id];
  const i = b.floors.length;
  if (!b.owned || i >= CHAIN.maxFloors) return null;
  const cost = floorUnlockCost(bizDef(id), i);
  if (s.cash < cost) return null;
  s.cash -= cost;
  const tierBefore = bizTier(b);
  b.floors.push(freshFloor());
  bump(s, "floors");
  leagueEvent(s, "floor", runRef(s, id, i));
  if (bizTier(b) > tierBefore) leagueEvent(s, "tier", runRef(s, id, bizTier(b)));
  return `¡Nuevo puesto: ${bizDef(id).floorName} ${i + 1}!`;
}

export function buyBusiness(s: GameState, id: string): string | null {
  const def = bizDef(id);
  const b = s.biz[id];
  if (b.owned || s.cash < def.price) return null;
  s.cash -= def.price;
  b.owned = true;
  leagueEvent(s, "business", runRef(s, id));
  return `¡Has comprado: ${def.name}!`;
}

export function addBoost(s: GameState, now: number): boolean {
  const remaining = s.boostEnd - now;
  if (remaining > (CONFIG.boostMaxHours - boostHours(s)) * 3600e3) return false;
  s.boostEnd = Math.max(now, s.boostEnd) + boostHours(s) * 3600e3;
  return true;
}

export function startRush(s: GameState, id: string, now: number): boolean {
  const b = s.biz[id];
  if (!b.owned || b.rushEnd > now) return false;
  b.rushEnd = now + CONFIG.rushMinutes * 60e3;
  return true;
}

/** Sale a bolsa. Con `mult` = 2 si el jugador vio el anuncio. */
export function ipo(s: GameState, mult: 1 | 2, now: number): { state: GameState; gained: number } | null {
  const gained = sharesToGain(s) * mult;
  if (gained < 1) return null;
  const state = afterIpo(s, gained, now);
  applyStartPerks(state);
  return { state, gained };
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
  bump(s, "ads");
}
