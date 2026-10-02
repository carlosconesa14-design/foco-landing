import { Capacitor } from "@capacitor/core";
import type { LeagueEvent } from "../game/league";

/**
 * Cliente de la Edge Function «league» (Supabase). Toda la lógica de puntos vive en el servidor.
 * Si no hay conexión, las llamadas fallan sin romper el juego: los eventos esperan en la cola.
 */

const env = import.meta.env;
const URL = env.VITE_LEAGUE_URL || "https://jpdvpbqiasyjzbdaiedh.supabase.co/functions/v1/league";
const KEY = env.VITE_LEAGUE_KEY || "sb_publishable_y8GI8XKM5uuq1jrbPWULBA_v39TLLkE";

export interface LeagueStatus {
  week: { id: string; endsAt: string };
  /** Premio por puesto: dinero para los 3 primeros que pueden cobrarlo, diamantes del 1.º al 10.º. */
  prizes: { cents: number[]; gems: number[] };
  rules: { blockPoints: number; halfPoints: number; fullBlocks: number; halfBlocks: number; missionCap: number; cooldownWeeks: number };
  /** `todayBlocks`: bloques de 5 min jugados hoy. `cashEligible`: false si descansa esta semana o es de la web. */
  me: { nickname: string; points: number; rank: number | null; todayBlocks: number; cashEligible: boolean };
  top: { nickname: string; points: number; me: boolean }[];
  players: number;
  lastWeek: null | { id: string; winners: { nickname: string; rank: number | null; cents: number; gems: number }[] };
  /** Muro de la fama: el 1.º de cada una de las últimas semanas. */
  fame: { week: string; nickname: string }[];
  unclaimed: { week: string; kind: string; gems: number; cents: number }[];
}

export interface Payout {
  week: string;
  cents: number;
  state: "need_data" | "pending" | "paid";
}

export interface Creds {
  id: string;
  secret: string;
}

async function call<T>(body: Record<string, unknown>, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok || data?.error) throw new Error(data?.error ?? `http ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const leagueApi = {
  /** Hora del servidor (para el reloj del juego). No necesita estar apuntado. */
  time: () => call<{ now: number }>({ action: "time" }, 4000),
  register: () => call<{ id: string; secret: string; nickname: string }>({ action: "register", platform: Capacitor.isNativePlatform() ? "app" : "web" }),
  status: (c: Creds) => call<LeagueStatus>({ action: "status", ...c }),
  events: (c: Creds, events: LeagueEvent[]) => call<{ added: number }>({ action: "events", ...c, events }),
  nickname: (c: Creds, nickname: string) => call<{ nickname: string }>({ action: "nickname", ...c, nickname }),
  claim: (c: Creds) => call<{ gems: number }>({ action: "claim", ...c }),
  /** Premios en dinero del jugador (fase 1) y su estado. */
  payouts: (c: Creds) => call<{ payouts: Payout[] }>({ action: "payouts", ...c }),
  /** El ganador deja su email y declara ser mayor de 18 para cobrar. */
  payout: (c: Creds, week: string, email: string, adult: boolean) => call<{ ok: boolean }>({ action: "payout", ...c, week, email, adult }),
  /** ¿Se llega al servidor? Unas credenciales falsas tienen que devolver «auth». */
  ping: async (): Promise<boolean> => {
    try {
      await call({ action: "status", id: "00000000-0000-0000-0000-000000000000", secret: "x" }, 6000);
      return true;
    } catch (e) {
      return (e as Error).message === "auth";
    }
  },
};
