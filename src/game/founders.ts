import { FOUNDERS, RARITIES } from "./data";
import type { Exec, GameState } from "./state";

/**
 * Carrera de fundadores (ver docs/GDD.md, «Dubái»): los primeros `FOUNDERS.spots` jugadores en llegar
 * a Dubái reciben un ejecutivo exclusivo. Solo premios del juego, nunca dinero real.
 * El puesto lo da el servidor (`founder_claim`), una sola vez por jugador y con controles anti-trampas.
 * Hace falta estar en la Liga: es la cuenta con la que el servidor reconoce al jugador.
 */

export interface FounderState {
  /** Puesto de llegada a Dubái (null hasta que el servidor lo da). */
  rank: number | null;
  /** El servidor no da puesto: partida en revisión. */
  blocked: boolean;
  /** Ya se le ha propuesto unirse a la Liga para reservar su puesto. */
  asked: boolean;
  /** Llegó demasiado rápido: no se vuelve a pedir hasta esta hora (ms). */
  retryAt: number;
}

export const freshFounder = (): FounderState => ({ rank: null, blocked: false, asked: false, retryAt: 0 });

export function migrateFounder(raw: unknown): FounderState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const f = freshFounder();
  if (typeof r.rank === "number" && Number.isInteger(r.rank) && r.rank > 0) f.rank = r.rank;
  f.blocked = r.blocked === true;
  f.asked = r.asked === true;
  if (typeof r.retryAt === "number" && Number.isFinite(r.retryAt)) f.retryAt = r.retryAt;
  return f;
}

/** Ha llegado a Dubái (está allí o ya tiene la ciudad abierta). */
export const reachedFounderCity = (s: GameState) =>
  s.city === FOUNDERS.city || s.world.completed.includes(FOUNDERS.city) || !!s.world.archive[FOUNDERS.city];

/** Hay que pedir el puesto al servidor: llegó, aún no lo tiene y no está bloqueado ni en espera. */
export const founderPending = (s: GameState, now: number) => {
  const f = s.meta.founder;
  return reachedFounderCity(s) && f.rank === null && !f.blocked && now >= f.retryAt;
};

export const isFounder = (s: GameState) => s.meta.founder.rank !== null && s.meta.founder.rank <= FOUNDERS.spots;

/** Bonus permanente de un ejecutivo: el de su rareza y, si es el fundador, el extra. */
export const execBonus = (e: Exec) => RARITIES[e.rarity].bonus + (e.founder ? FOUNDERS.bonus : 0);

/** El ejecutivo exclusivo: legendario, con un bonus extra y el número de fundador en el nombre. */
export function founderExec(rank: number): Exec {
  return {
    id: `founder-${FOUNDERS.city}`,
    name: `#${rank}`,
    face: "🤴",
    rarity: RARITIES.length - 1,
    kind: "sale",
    assigned: null,
    abilityEnd: 0,
    readyAt: 0,
    founder: rank,
  };
}

/**
 * Apunta la respuesta del servidor. Si es fundador y aún no tiene el ejecutivo, se lo da.
 * Devuelve el ejecutivo nuevo (para celebrarlo) o null.
 */
export function applyFounderRank(s: GameState, rank: number): Exec | null {
  s.meta.founder.rank = rank;
  if (rank > FOUNDERS.spots) return null;
  if (s.meta.execs.some((e) => e.founder)) return null;
  const e = founderExec(rank);
  s.meta.execs.push(e);
  return e;
}

/** Respuesta de error del servidor: `review` bloquea; `too_fast` espera hasta `after`. */
export function applyFounderError(s: GameState, code: string, now: number, after?: number): void {
  if (code === "review") s.meta.founder.blocked = true;
  else if (code === "too_fast") s.meta.founder.retryAt = after && after > now ? after : now + 3600e3;
  // Cualquier otro fallo (sin conexión, cuenta no válida…): se reintenta más tarde, no cada pocos segundos.
  else s.meta.founder.retryAt = now + 10 * 60e3;
}
