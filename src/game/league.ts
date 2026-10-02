import type { GameState } from "./state";

/**
 * Liga Millonario (ver docs/LIGA.md): gana quien más juega esa semana, no quien lleva más tiempo.
 * Solo se informa lo que es igual para todos: tiempo de juego activo, entrar cada día y las
 * misiones diarias. Nada que dependa del tamaño del imperio.
 * Los puntos, los topes y los duplicados los calcula el servidor: el móvil nunca suma puntos.
 * Ni ver anuncios ni comprar generan eventos, y el tiempo viendo un anuncio no cuenta.
 */

export type LeagueKind = "login" | "mission" | "missions_all" | "play" | "daily_reto" | "weekly_reto" | "weekly_all" | "flag";

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
  /** Bloque de 5 minutos en curso y segundos jugados de verdad dentro de él. */
  play: { block: number; sec: number };
}

/** Puntos de cada acción, solo para mostrarlos en la pantalla (los que cuentan son los del servidor). */
export const LEAGUE_POINTS: Record<Exclude<LeagueKind, "play" | "flag">, number> = {
  login: 10,
  mission: 15,
  missions_all: 20,
  daily_reto: 40,
  weekly_reto: 60,
  weekly_all: 100,
};

/** Constancia: extra al entrar 5 y 7 días distintos en la semana. */
export const STREAK_POINTS = { five: 50, seven: 100 } as const;

/** Tiempo de juego: bloques de 5 minutos; cuentan si se ha jugado activamente 3 de ellos. */
export const PLAY = { blockMs: 300e3, activeSec: 180, blockPoints: 4, halfPoints: 2, fullHours: 2, halfHours: 2 } as const;

/** Sin tocar la pantalla durante más de esto, el tiempo deja de contar. */
export const IDLE_MS = 60e3;

export const MAX_QUEUE = 200;
const KINDS: LeagueKind[] = ["login", "mission", "missions_all", "play", "daily_reto", "weekly_reto", "weekly_all", "flag"];

export const freshLeague = (): LeagueState => ({ id: null, secret: null, nickname: "", queue: [], play: { block: 0, sec: 0 } });

export const leagueJoined = (s: GameState) => !!(s.meta.league.id && s.meta.league.secret);

/** Apunta una acción para la Liga. Si el jugador no está apuntado, no hace nada. */
export function leagueEvent(s: GameState, kind: LeagueKind, ref = ""): void {
  if (!leagueJoined(s)) return;
  if (kind === "mission" && ref === "ads") return; // la misión de ver anuncios no puntúa
  const q = s.meta.league.queue;
  if (q.some((e) => e.kind === kind && e.ref === ref)) return;
  q.push({ kind, ref });
  if (q.length > MAX_QUEUE) q.splice(0, q.length - MAX_QUEUE);
}

/**
 * Suma tiempo de juego activo (el que llama decide si cuenta: app visible, tocando hace poco y sin
 * anuncio en pantalla). Al llegar a 3 minutos dentro de un bloque de 5, se informa ese bloque una vez.
 */
export function trackPlay(s: GameState, now: number, dtSec: number): void {
  if (!leagueJoined(s) || dtSec <= 0) return;
  const p = s.meta.league.play;
  const block = Math.floor(now / PLAY.blockMs);
  if (p.block !== block) {
    p.block = block;
    p.sec = 0;
  }
  if (p.sec >= PLAY.activeSec) return;
  p.sec += Math.min(dtSec, 5);
  if (p.sec >= PLAY.activeSec) leagueEvent(s, "play", String(block));
}

/** Lee el estado guardado de la Liga (partidas antiguas: vacío). */
export function migrateLeague(raw: unknown): LeagueState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    id: typeof r.id === "string" ? r.id : null,
    secret: typeof r.secret === "string" ? r.secret : null,
    nickname: typeof r.nickname === "string" ? r.nickname.slice(0, 16) : "",
    queue: Array.isArray(r.queue)
      ? r.queue
          .filter((e): e is LeagueEvent => !!e && typeof e === "object" && KINDS.includes((e as LeagueEvent).kind) && typeof (e as LeagueEvent).ref === "string")
          .slice(-MAX_QUEUE)
      : [],
    play: (() => {
      const p = r.play && typeof r.play === "object" ? (r.play as Record<string, unknown>) : {};
      const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
      return { block: n(p.block), sec: n(p.sec) };
    })(),
  };
}

/** Señales de trampa que se pueden informar (no dan ni quitan puntos: el servidor las apunta para revisar). */
export type SecurityFlag = "clock" | "clock_future" | "save";

/** Apunta una señal de trampa en la partida y, si está en la Liga, la informa una vez. */
export function addFlag(s: GameState, flag: SecurityFlag): void {
  if (!s.meta.flags.includes(flag)) s.meta.flags.push(flag);
  leagueEvent(s, "flag", flag);
}
