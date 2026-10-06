import { TUTORIAL, type StatKey } from "./data";
import type { GameState } from "./state";

/**
 * Desbloqueo gradual (ver docs/GDD.md, «Desbloqueo gradual»): las funciones del juego se ven desde
 * el principio con un candado que dice cómo conseguirlas, y se abren una a una según avanzas. Así
 * la pantalla no abruma al empezar y cada pocos minutos hay algo nuevo. Lo desbloqueado se guarda
 * y no se pierde nunca (ni al salir a bolsa ni al cambiar de ciudad).
 *
 * Los umbrales salen del bot de equilibrado (jugador muy activo); una persona tarda algo más.
 */

export type FeatureId = "daily" | "missions" | "execs" | "auto" | "wheel" | "achievements" | "life" | "school" | "league" | "rival" | "event" | "invite";

export type Need =
  | { kind: "tutorial" }
  | { kind: "stat"; stat: StatKey; n: number }
  | { kind: "earned"; n: number }
  | { kind: "biz"; n: number };

export interface FeatureDef {
  id: FeatureId;
  icon: string;
  need: Need;
}

/** En el orden en que se desbloquean (bot: minuto aproximado). */
export const FEATURES: FeatureDef[] = [
  { id: "daily", icon: "🎁", need: { kind: "tutorial" } }, // ~2 min
  { id: "missions", icon: "📋", need: { kind: "tutorial" } },
  { id: "execs", icon: "💼", need: { kind: "stat", stat: "floors", n: 2 } }, // ~3 min
  { id: "auto", icon: "⚡", need: { kind: "stat", stat: "upgrades", n: 120 } }, // ~4 min
  { id: "wheel", icon: "🎡", need: { kind: "earned", n: 2e5 } }, // ~8–9 min (tras comprar el almacén)
  { id: "achievements", icon: "🏆", need: { kind: "stat", stat: "hires", n: 7 } }, // ~12 min
  { id: "life", icon: "🛍️", need: { kind: "earned", n: 1e7 } }, // ~12 min
  { id: "school", icon: "🎓", need: { kind: "stat", stat: "milestones", n: 12 } }, // ~15 min: las primeras ideas
  { id: "league", icon: "🏅", need: { kind: "biz", n: 3 } }, // ~45 min: el restaurante (el reparto no cuenta)
  { id: "rival", icon: "🥊", need: { kind: "biz", n: 2 } },
  { id: "event", icon: "🎉", need: { kind: "earned", n: 1e12 } }, // ~1 h
  { id: "invite", icon: "🤝", need: { kind: "earned", n: 1e13 } }, // ~1 h 30 min
];

export const featureDef = (id: FeatureId) => FEATURES.find((f) => f.id === id)!;

export const isUnlocked = (s: GameState, id: FeatureId) => s.meta.unlocked.includes(id);

/** Cuánto llevas y cuánto hace falta para desbloquearla. */
export function needProgress(s: GameState, need: Need): { have: number; goal: number } {
  switch (need.kind) {
    case "tutorial":
      return { have: Math.min(s.meta.tutorial, TUTORIAL.length), goal: TUTORIAL.length };
    case "stat":
      return { have: s.meta.stats.life[need.stat] ?? 0, goal: need.n };
    case "earned":
      return { have: Math.max(s.totalEarned, s.world.lifetimeEarned), goal: need.n };
    case "biz":
      return { have: Math.max(Object.values(s.biz).filter((b) => b.owned).length, s.world.completed.length ? need.n : 0), goal: need.n };
  }
}

/** Desbloquea lo que ya toca y devuelve lo nuevo (para celebrarlo). */
export function checkUnlocks(s: GameState): FeatureDef[] {
  const fresh: FeatureDef[] = [];
  for (const f of FEATURES) {
    if (isUnlocked(s, f.id)) continue;
    const p = needProgress(s, f.need);
    if (p.have >= p.goal) {
      s.meta.unlocked.push(f.id);
      fresh.push(f);
    }
  }
  return fresh;
}

/** La siguiente función por desbloquear (la más avanzada primero no: la primera de la lista). */
export const nextLocked = (s: GameState): FeatureDef | null => FEATURES.find((f) => !isUnlocked(s, f.id)) ?? null;

/**
 * Partidas guardadas. Las de antes de esta función que ya habían acabado el tutorial lo tienen todo
 * abierto: no se le quita nada a nadie.
 */
export function migrateUnlocks(raw: unknown, tutorialDone: boolean): FeatureId[] {
  if (!Array.isArray(raw)) return tutorialDone ? FEATURES.map((f) => f.id) : [];
  return FEATURES.map((f) => f.id).filter((id) => raw.includes(id));
}
