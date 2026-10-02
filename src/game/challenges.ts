import type { StatKey } from "./data";
import { leagueEvent } from "./league";
import { dayKey } from "./meta";
import type { GameState } from "./state";
import { t } from "../i18n";

/**
 * Retos del día y de la semana. Iguales para todos los jugadores (no dependen del tamaño del imperio)
 * y ninguno se acelera directamente con anuncios: nada de maletines gratis, habilidades recargables
 * ni puntos del evento. Dan diamantes y, si estás en la Liga, puntos de Liga (los cuenta el servidor).
 */

export type DailyRetoId = "upgrades" | "sales" | "milestones" | "missions";
export type WeeklyRetoId = "missions" | "upgrades" | "sales" | "daily";

export const DAILY_RETOS: Record<DailyRetoId, { stat: StatKey; target: number }> = {
  upgrades: { stat: "upgrades", target: 50 },
  sales: { stat: "sales", target: 400 },
  milestones: { stat: "milestones", target: 2 },
  missions: { stat: "missions", target: 3 },
};

/** `daily` cuenta retos del día cobrados esta semana; el resto, contadores de estadísticas. */
export const WEEKLY_RETOS: Record<WeeklyRetoId, { stat: StatKey | null; target: number }> = {
  missions: { stat: "missions", target: 15 },
  upgrades: { stat: "upgrades", target: 300 },
  sales: { stat: "sales", target: 2000 },
  daily: { stat: null, target: 4 },
};

export const RETO_GEMS = { daily: 10, weekly: 25, weeklyAll: 50 } as const;

export function retoText(kind: "daily" | "weekly", id: string, n: number): string {
  if (id === "upgrades") return t("Sube {n} niveles de mejora", { n });
  if (id === "sales") return t("Haz {n} ventas", { n });
  if (id === "milestones") return t("Consigue {n} hitos x2", { n });
  if (id === "missions") return kind === "daily" ? t("Completa las 3 misiones del día") : t("Completa {n} misiones diarias", { n });
  return t("Completa {n} retos del día", { n });
}

export interface RetosState {
  day: string;
  daily: DailyRetoId;
  dailyBase: number;
  dailyClaimed: boolean;
  week: string;
  weeklyBase: Partial<Record<StatKey, number>>;
  weeklyClaimed: WeeklyRetoId[];
  weeklyAll: boolean;
  /** Retos del día cobrados esta semana. */
  dailyCount: number;
}

export const freshRetos = (): RetosState => ({
  day: "",
  daily: "upgrades",
  dailyBase: 0,
  dailyClaimed: false,
  week: "",
  weeklyBase: {},
  weeklyClaimed: [],
  weeklyAll: false,
  dailyCount: 0,
});

/** Semana ISO (lunes a domingo, hora del móvil): «2026-W40». */
export function weekKey(now: number): string {
  const d = new Date(now);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - dow);
  const year = day.getUTCFullYear();
  const week = Math.ceil(((day.getTime() - Date.UTC(year, 0, 1)) / 86400e3 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** El reto del día es el mismo para todos: sale de la fecha. */
export function dailyFor(day: string): DailyRetoId {
  const ids = Object.keys(DAILY_RETOS) as DailyRetoId[];
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ids[h % ids.length];
}

export function ensureRetos(s: GameState, now: number): void {
  const r = s.meta.retos;
  const life = s.meta.stats.life;
  const day = dayKey(now);
  if (r.day !== day) {
    r.day = day;
    r.daily = dailyFor(day);
    r.dailyBase = life[DAILY_RETOS[r.daily].stat] ?? 0;
    r.dailyClaimed = false;
  }
  const week = weekKey(now);
  if (r.week !== week) {
    r.week = week;
    r.weeklyBase = { ...life };
    r.weeklyClaimed = [];
    r.weeklyAll = false;
    r.dailyCount = 0;
  }
}

export function dailyProgress(s: GameState): number {
  const r = s.meta.retos;
  const def = DAILY_RETOS[r.daily];
  return Math.min(def.target, Math.max(0, (s.meta.stats.life[def.stat] ?? 0) - r.dailyBase));
}

export function weeklyProgress(s: GameState, id: WeeklyRetoId): number {
  const r = s.meta.retos;
  const def = WEEKLY_RETOS[id];
  const v = def.stat ? (s.meta.stats.life[def.stat] ?? 0) - (r.weeklyBase[def.stat] ?? 0) : r.dailyCount;
  return Math.min(def.target, Math.max(0, v));
}

export function claimDailyReto(s: GameState): number | null {
  const r = s.meta.retos;
  if (r.dailyClaimed || dailyProgress(s) < DAILY_RETOS[r.daily].target) return null;
  r.dailyClaimed = true;
  r.dailyCount++;
  s.meta.gems += RETO_GEMS.daily;
  leagueEvent(s, "daily_reto", r.day);
  return RETO_GEMS.daily;
}

export function claimWeeklyReto(s: GameState, id: WeeklyRetoId): number | null {
  const r = s.meta.retos;
  if (r.weeklyClaimed.includes(id) || weeklyProgress(s, id) < WEEKLY_RETOS[id].target) return null;
  r.weeklyClaimed.push(id);
  s.meta.gems += RETO_GEMS.weekly;
  leagueEvent(s, "weekly_reto", `${r.week}:${id}`);
  return RETO_GEMS.weekly;
}

export const allWeeklyClaimed = (s: GameState) => (Object.keys(WEEKLY_RETOS) as WeeklyRetoId[]).every((id) => s.meta.retos.weeklyClaimed.includes(id));

export function claimWeeklyAll(s: GameState): number | null {
  const r = s.meta.retos;
  if (r.weeklyAll || !allWeeklyClaimed(s)) return null;
  r.weeklyAll = true;
  s.meta.gems += RETO_GEMS.weeklyAll;
  leagueEvent(s, "weekly_all", r.week);
  return RETO_GEMS.weeklyAll;
}

/** Cuántos retos se pueden cobrar ahora (para el punto rojo). */
export function retosToClaim(s: GameState): number {
  const r = s.meta.retos;
  let n = !r.dailyClaimed && dailyProgress(s) >= DAILY_RETOS[r.daily].target ? 1 : 0;
  for (const id of Object.keys(WEEKLY_RETOS) as WeeklyRetoId[])
    if (!r.weeklyClaimed.includes(id) && weeklyProgress(s, id) >= WEEKLY_RETOS[id].target) n++;
  if (!r.weeklyAll && allWeeklyClaimed(s)) n++;
  return n;
}

export function migrateRetos(raw: unknown): RetosState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const base: Partial<Record<StatKey, number>> = {};
  if (r.weeklyBase && typeof r.weeklyBase === "object")
    for (const [k, v] of Object.entries(r.weeklyBase as Record<string, unknown>)) if (typeof v === "number" && Number.isFinite(v)) base[k as StatKey] = v;
  const f = freshRetos();
  return {
    day: typeof r.day === "string" ? r.day : f.day,
    daily: typeof r.daily === "string" && r.daily in DAILY_RETOS ? (r.daily as DailyRetoId) : f.daily,
    dailyBase: num(r.dailyBase),
    dailyClaimed: r.dailyClaimed === true,
    week: typeof r.week === "string" ? r.week : f.week,
    weeklyBase: base,
    weeklyClaimed: Array.isArray(r.weeklyClaimed) ? (r.weeklyClaimed.filter((x) => typeof x === "string" && x in WEEKLY_RETOS) as WeeklyRetoId[]) : [],
    weeklyAll: r.weeklyAll === true,
    dailyCount: Math.floor(num(r.dailyCount)),
  };
}
