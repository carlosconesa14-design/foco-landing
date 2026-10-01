import type { GameState } from "./state";

/**
 * Liga Millonario (ver docs/LIGA.md). Aquí solo se decide QUÉ acciones se informan al servidor.
 * Los puntos, los topes y los duplicados los calcula el servidor: el móvil nunca suma puntos.
 * Ni ver anuncios ni comprar generan eventos.
 */

export type LeagueKind = "login" | "mission" | "missions_all" | "milestone" | "floor" | "tier" | "business";

export interface LeagueEvent {
  kind: LeagueKind;
  ref: string;
}

export interface LeagueState {
  /** Credenciales del jugador en la Liga (null hasta que se apunta). */
  id: string | null;
  secret: string | null;
  nickname: string;
  /** Eventos pendientes de enviar (se guardan con la partida por si no hay conexión). */
  queue: LeagueEvent[];
}

/** Puntos de cada acción, solo para mostrarlos en la pantalla (los que cuentan son los del servidor). */
export const LEAGUE_POINTS: Record<LeagueKind, number> = {
  login: 10,
  mission: 15,
  missions_all: 20,
  milestone: 5,
  floor: 10,
  tier: 25,
  business: 40,
};

export const MAX_QUEUE = 100;

export const freshLeague = (): LeagueState => ({ id: null, secret: null, nickname: "", queue: [] });

export const leagueJoined = (s: GameState) => !!(s.meta.league.id && s.meta.league.secret);

/** Referencia única dentro de la partida actual (ciudad y salida a bolsa incluidas). */
export const runRef = (s: GameState, ...parts: (string | number)[]) => [s.city, s.ipos, ...parts].join(":");

/** Apunta una acción para la Liga. Si el jugador no está apuntado, no hace nada. */
export function leagueEvent(s: GameState, kind: LeagueKind, ref = ""): void {
  if (!leagueJoined(s)) return;
  if (kind === "mission" && ref === "ads") return; // la misión de ver anuncios no puntúa
  const q = s.meta.league.queue;
  if (q.some((e) => e.kind === kind && e.ref === ref)) return;
  q.push({ kind, ref });
  if (q.length > MAX_QUEUE) q.splice(0, q.length - MAX_QUEUE);
}

/** Lee el estado guardado de la Liga (partidas antiguas: vacío). */
export function migrateLeague(raw: unknown): LeagueState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const kinds = Object.keys(LEAGUE_POINTS);
  return {
    id: typeof r.id === "string" ? r.id : null,
    secret: typeof r.secret === "string" ? r.secret : null,
    nickname: typeof r.nickname === "string" ? r.nickname.slice(0, 16) : "",
    queue: Array.isArray(r.queue)
      ? r.queue
          .filter((e): e is LeagueEvent => !!e && typeof e === "object" && kinds.includes((e as LeagueEvent).kind) && typeof (e as LeagueEvent).ref === "string")
          .slice(-MAX_QUEUE)
      : [],
  };
}
