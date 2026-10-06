import type { DailyReward, StatKey } from "./data";
import { grantReward, type Grant } from "./meta";
import type { GameState } from "./state";
import { t } from "../i18n";

/**
 * Evento del fin de semana: de viernes 00:00 a lunes 00:00 (hora del móvil).
 * Jugar da puntos y los puntos desbloquean 10 premios. Cada semana cambia el tema, que hace
 * valer el doble un tipo de acción. Con un anuncio, los puntos valen x2 durante 30 minutos.
 *
 * Los puntos salen de los contadores de estadísticas (los mismos de misiones y logros):
 * no hace falta tocar la economía. Calibrado con el bot: ~800 puntos por hora de juego activo,
 * así que el último premio pide unas 3 horas en el fin de semana.
 */

/** Puntos por cada unidad de cada contador. */
export const EVENT_POINTS: Partial<Record<StatKey, number>> = {
  sales: 0.1,
  upgrades: 1,
  hires: 15,
  floors: 25,
  chests: 10,
  abilities: 10,
  skills: 5,
};

export type EventThemeId = "sales" | "upgrades" | "talent";

export interface EventTheme {
  id: EventThemeId;
  icon: string;
  /** Contadores que valen el doble esa semana. */
  doubles: StatKey[];
}

/** Rotan cada semana. Los textos, en `eventThemeText`. */
export const EVENT_THEMES: EventTheme[] = [
  { id: "sales", icon: "🛍️", doubles: ["sales"] },
  { id: "upgrades", icon: "🔧", doubles: ["upgrades"] },
  { id: "talent", icon: "👔", doubles: ["hires", "floors", "chests", "abilities", "skills"] },
];

export function eventThemeText(theme: EventTheme): { name: string; desc: string } {
  if (theme.id === "sales") return { name: t("Black Friday del reparto"), desc: t("Esta semana, las ventas dan el doble de puntos.") };
  if (theme.id === "upgrades") return { name: t("Semana de reformas"), desc: t("Esta semana, las mejoras dan el doble de puntos.") };
  return { name: t("Feria del talento"), desc: t("Esta semana, gerentes, puestos, maletines y habilidades dan el doble de puntos.") };
}

/** ¿Quedan premios por conseguir en el evento en curso? */
export const eventUnfinished = (s: GameState) => s.meta.event.claimed < EVENT_TIERS.length;

export const EVENT_TIERS: { points: number; reward: DailyReward }[] = [
  { points: 50, reward: { gems: 15 } },
  { points: 120, reward: { cashHours: 0.5 } },
  { points: 250, reward: { gems: 25 } },
  { points: 400, reward: { chest: "normal" } },
  { points: 600, reward: { gems: 40 } },
  { points: 850, reward: { cashHours: 1 } },
  { points: 1150, reward: { chest: "normal" } },
  { points: 1500, reward: { gems: 60 } },
  { points: 2000, reward: { gems: 80 } },
  { points: 2500, reward: { chest: "premium" } },
];

export const EVENT_BOOST = { minutes: 30, maxMinutes: 120 } as const;

export interface EventState {
  /** Fecha (local) del viernes en que empezó el evento al que pertenece este progreso. */
  week: string;
  points: number;
  /** Últimos valores vistos de los contadores, para sumar solo lo nuevo. */
  last: Partial<Record<StatKey, number>>;
  /** Premios ya cobrados (en orden). */
  claimed: number;
  /** Fin del x2 de puntos conseguido con un anuncio. */
  boostEnd: number;
}

export const freshEvent = (): EventState => ({ week: "", points: 0, last: {}, claimed: 0, boostEnd: 0 });

const DAY = 86400e3;
const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export interface EventWindow {
  active: boolean;
  /** Inicio del último evento (o del actual). */
  start: number;
  /** Fin del último evento (o del actual). */
  end: number;
  /** Inicio del siguiente evento. */
  next: number;
  week: string;
  theme: EventTheme;
}

/** Ventana del evento según la hora local: el último viernes 00:00 → lunes 00:00. */
export function eventWindow(now: number): EventWindow {
  const d = new Date(now);
  const sinceFriday = (d.getDay() - 5 + 7) % 7;
  const at = (days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceFriday + days);
  const start = at(0);
  // Semana absoluta (sin depender de la zona horaria) para rotar el tema.
  const weekIndex = Math.round(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) / (7 * DAY));
  return {
    active: sinceFriday <= 2,
    start: start.getTime(),
    end: at(3).getTime(),
    next: at(7).getTime(),
    week: localDate(start),
    theme: EVENT_THEMES[((weekIndex % EVENT_THEMES.length) + EVENT_THEMES.length) % EVENT_THEMES.length],
  };
}

/**
 * Llamar a menudo (cada pocos segundos). Al empezar un evento nuevo reinicia el progreso;
 * durante el evento suma los puntos de lo que ha pasado desde la última llamada.
 */
export function ensureEvent(s: GameState, now: number): void {
  const w = eventWindow(now);
  const ev = s.meta.event;
  const life = s.meta.stats.life;
  if (ev.week !== w.week) {
    if (!w.active) return; // el progreso del evento anterior se puede cobrar hasta que empiece otro
    s.meta.event = { week: w.week, points: 0, last: { ...life }, claimed: 0, boostEnd: 0 };
    return;
  }
  if (!w.active || now >= w.end) return;
  const boost = ev.boostEnd > now ? 2 : 1;
  for (const [key, per] of Object.entries(EVENT_POINTS) as [StatKey, number][]) {
    const v = life[key] ?? 0;
    const delta = v - (ev.last[key] ?? 0);
    if (delta > 0) ev.points += delta * per * boost * (w.theme.doubles.includes(key) ? 2 : 1);
    ev.last[key] = v;
  }
}

export const eventTiersReached = (s: GameState) => EVENT_TIERS.filter((t) => s.meta.event.points >= t.points).length;
export const eventToClaim = (s: GameState) => Math.max(0, eventTiersReached(s) - s.meta.event.claimed);

/** Cobra el siguiente premio desbloqueado. */
export function claimEventTier(s: GameState, now: number, rand: () => number = Math.random): Grant | null {
  if (eventToClaim(s) <= 0) return null;
  const tier = EVENT_TIERS[s.meta.event.claimed];
  s.meta.event.claimed++;
  return grantReward(s, tier.reward, now, rand);
}

/** x2 de puntos tras ver un anuncio. Solo durante el evento y con un máximo acumulado. */
export function canBoostEvent(s: GameState, now: number): boolean {
  const w = eventWindow(now);
  if (!w.active || s.meta.event.week !== w.week) return false;
  return s.meta.event.boostEnd - now <= (EVENT_BOOST.maxMinutes - EVENT_BOOST.minutes) * 60e3;
}

export function boostEvent(s: GameState, now: number): boolean {
  if (!canBoostEvent(s, now)) return false;
  s.meta.event.boostEnd = Math.max(now, s.meta.event.boostEnd) + EVENT_BOOST.minutes * 60e3;
  return true;
}

export function migrateEvent(raw: unknown): EventState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const last: Partial<Record<StatKey, number>> = {};
  if (r.last && typeof r.last === "object")
    for (const [k, v] of Object.entries(r.last as Record<string, unknown>)) if (typeof v === "number" && Number.isFinite(v)) last[k as StatKey] = v;
  return {
    week: typeof r.week === "string" ? r.week : "",
    points: Math.max(0, num(r.points)),
    last,
    claimed: Math.min(EVENT_TIERS.length, Math.max(0, Math.floor(num(r.claimed)))),
    boostEnd: num(r.boostEnd),
  };
}
