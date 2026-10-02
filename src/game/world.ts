import { CITIES, CONFIG, FRANCHISE, GOLD, OFFICE, TOURISM, type OfficeId } from "./data";
import { cityDef, freshFloor, switchCity, type GameState } from "./state";

/**
 * Capa de "Expansión mundial": ciudades, estrellas de franquicia y la Oficina central.
 * No depende de economy.ts (economy lo usa a él), para evitar dependencias circulares.
 */

export const officeLevel = (s: GameState, id: OfficeId) => s.world.upgrades[id] ?? 0;

/** Multiplicador de ingresos global: Marca global + bonus de franquicias (ciudades completadas). */
export function worldIncomeMult(s: GameState): number {
  return (1 + 0.25 * officeLevel(s, "brand")) * (1 + FRANCHISE.cityBonus * s.world.completed.length);
}

export const upgradeDiscount = (s: GameState) => 1 - 0.08 * officeLevel(s, "suppliers");
export const offlineCapHours = (s: GameState) => CONFIG.offlineCapHours + 2 * officeLevel(s, "offline");
export const boostHours = (s: GameState) => CONFIG.boostHours + officeLevel(s, "hustle");
export const luckyChance = (s: GameState) => CONFIG.luckyChance + 0.01 * officeLevel(s, "luck");

/* ---------- Olas turísticas (Miami) ---------- */

/** Estado de la ola: si está activa, cuánto le queda y cuándo llega la siguiente. */
export function tourism(s: GameState, now: number): { active: boolean; left: number; next: number } | null {
  if (cityDef(s.city).mechanic !== "tourism") return null;
  const period = TOURISM.periodMin * 60e3;
  const wave = TOURISM.waveMin * 60e3;
  const phase = now % period;
  if (s.waveEnd > now) return { active: true, left: s.waveEnd - now, next: 0 };
  if (phase < wave) return { active: true, left: wave - phase, next: 0 };
  return { active: false, left: 0, next: period - phase };
}

/** Multiplicador de ventas por la ola turística (solo jugando, no offline). */
export function tourismMult(s: GameState, now: number, live: boolean): number {
  if (!live) return 1;
  return tourism(s, now)?.active ? TOURISM.mult : 1;
}

/** Atrae una ola al instante (tras ver un anuncio). */
export function callWave(s: GameState, now: number): boolean {
  const t = tourism(s, now);
  if (!t || t.active) return false;
  s.waveEnd = now + TOURISM.adWaveMin * 60e3;
  return true;
}

/* ---------- Precio del oro (Dubái) ---------- */

export interface GoldState {
  /** Multiplicador de ventas actual (x1 a x3). */
  mult: number;
  /** Contrato firmado con un anuncio: precio máximo fijado. */
  locked: boolean;
  /** Tiempo que le queda al contrato (ms). */
  left: number;
  /** El precio está subiendo. */
  rising: boolean;
  /** Tiempo hasta el próximo máximo (ms; 0 si estás en él o con contrato). */
  peakIn: number;
}

/** Precio del oro: una onda suave de `GOLD.periodMin` minutos entre x1 y x3. */
export function gold(s: GameState, now: number): GoldState | null {
  if (cityDef(s.city).mechanic !== "gold") return null;
  if (s.goldEnd > now) return { mult: GOLD.max, locked: true, left: s.goldEnd - now, rising: false, peakIn: 0 };
  const period = GOLD.periodMin * 60e3;
  const phase = (now % period) / period;
  const mult = GOLD.min + (GOLD.max - GOLD.min) * (0.5 - 0.5 * Math.cos(2 * Math.PI * phase));
  return { mult: Math.round(mult * 100) / 100, locked: false, left: 0, rising: phase < 0.5, peakIn: phase <= 0.5 ? (0.5 - phase) * period : (1.5 - phase) * period };
}

/** Multiplicador de ventas por el oro (solo jugando, no offline). */
export function goldMult(s: GameState, now: number, live: boolean): number {
  if (!live) return 1;
  return gold(s, now)?.mult ?? 1;
}

/** Firma un contrato de oro (tras ver un anuncio): precio máximo durante unos minutos. No si ya está casi en el máximo. */
export function lockGold(s: GameState, now: number): boolean {
  const g = gold(s, now);
  if (!g || g.locked || g.mult >= GOLD.max * 0.9) return false;
  s.goldEnd = now + GOLD.adLockMin * 60e3;
  return true;
}

/* ---------- Completar y expandirse ---------- */

export const nextCity = (s: GameState) => {
  const i = CITIES.findIndex((c) => c.id === s.city);
  return CITIES[i + 1] ?? null;
};

/** La ciudad está completa si tienes todos sus negocios y has ganado su objetivo. */
export function cityProgress(s: GameState): { owned: number; total: number; earned: number; goal: number; done: boolean } {
  const city = cityDef(s.city);
  const owned = city.businesses.filter((b) => s.biz[b.id]?.owned).length;
  const total = city.businesses.length;
  const done = owned === total && s.totalEarned >= city.goal;
  return { owned, total, earned: s.totalEarned, goal: city.goal, done };
}

/** Estrellas que da expandirse desde la ciudad actual (crecen con lo que superes el objetivo). */
export function starsToGain(s: GameState): number {
  const p = cityProgress(s);
  if (!p.done) return 0;
  return Math.floor(FRANCHISE.baseStars * Math.pow(p.earned / p.goal, 0.25));
}

/** Se puede abrir la siguiente ciudad si la actual está completa y aún no la habías abierto. */
export function canExpand(s: GameState): boolean {
  const next = nextCity(s);
  return !!next && cityProgress(s).done && !s.world.completed.includes(s.city);
}

/** Ventajas de la Oficina central al empezar una ciudad (o tras salir a bolsa). */
export function applyStartPerks(s: GameState): void {
  const first = cityDef(s.city).businesses[0];
  const b = s.biz[first.id];
  const extra = officeLevel(s, "floors");
  while (b.floors.length < 1 + extra) b.floors.push({ ...freshFloor(), managed: true });
  if (officeLevel(s, "team")) {
    b.floors[0].managed = true;
    b.transport.managed = true;
    b.sale.managed = true;
  }
}

/**
 * Se expande a la siguiente ciudad: marca la actual como completada (bonus de franquicia),
 * suma las estrellas (x2 si vio el anuncio) y empieza la nueva desde cero con las ventajas.
 */
export function expand(s: GameState, now: number, double = false): { state: GameState; stars: number; city: string } | null {
  if (!canExpand(s)) return null;
  const next = nextCity(s)!;
  const stars = starsToGain(s) * (double ? 2 : 1);
  s.world.stars += stars;
  s.world.completed.push(s.city);
  const n = switchCity(s, next.id, now);
  applyStartPerks(n);
  return { state: n, stars, city: next.id };
}

/** Viaja a una ciudad ya abierta. Devuelve lo ganado allí mientras no estabas (con tope). */
export function travel(s: GameState, cityId: string, now: number): { state: GameState; offline: number } | null {
  if (cityId === s.city) return null;
  const open = s.world.completed.includes(cityId) || !!s.world.archive[cityId];
  if (!open) return null;
  const savedAt = s.world.archive[cityId]?.savedAt ?? now;
  const n = switchCity(s, cityId, now);
  return { state: n, offline: Math.max(0, Math.min((now - savedAt) / 1000, offlineCapHours(n) * 3600)) };
}

/** Compra un nivel de una mejora de la Oficina central. */
export function buyOffice(s: GameState, id: OfficeId): boolean {
  const up = OFFICE.find((o) => o.id === id);
  if (!up) return false;
  const lvl = officeLevel(s, id);
  if (lvl >= up.max) return false;
  const cost = up.cost(lvl);
  if (s.world.stars < cost) return false;
  s.world.stars -= cost;
  s.world.upgrades[id] = lvl + 1;
  // Las ventajas de arranque se aplican también a la ciudad actual
  if (id === "team" || id === "floors") applyStartPerks(s);
  return true;
}
