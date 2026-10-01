import type { LeagueEvent } from "../game/league";

/**
 * Cliente de la Edge Function «league» (Supabase). Toda la lógica de puntos vive en el servidor.
 * Si no hay conexión, las llamadas fallan sin romper el juego: los eventos esperan en la cola.
 */

const env = import.meta.env;
const URL = env.VITE_LEAGUE_URL || "https://jpdvpbqiasyjzbdaiedh.supabase.co/functions/v1/league";
const KEY = env.VITE_LEAGUE_KEY || "sb_publishable_y8GI8XKM5uuq1jrbPWULBA_v39TLLkE";

export interface LeagueStatus {
  week: { id: string; endsAt: string; seedHash: string };
  prizes: {
    drawWinners: number;
    drawCents: number;
    drawGems: number;
    topCents: Record<string, number>;
    topGems: Record<string, number>;
  };
  rules: { dailyCap: number; ticketPoints: number; maxTickets: number; plataFrom: number; oroFrom: number };
  me: { nickname: string; division: "bronce" | "plata" | "oro"; points: number; tickets: number; rank: number | null; lifetime: number };
  top: { nickname: string; points: number; me: boolean }[];
  players: number;
  lastWeek: null | {
    id: string;
    seed: string;
    seedHash: string;
    winners: { nickname: string; kind: "draw" | "top"; division: string; cents: number; gems: number }[];
  };
  unclaimed: { week: string; kind: string; gems: number; cents: number }[];
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
  register: () => call<{ id: string; secret: string; nickname: string }>({ action: "register" }),
  status: (c: Creds) => call<LeagueStatus>({ action: "status", ...c }),
  events: (c: Creds, events: LeagueEvent[]) => call<{ added: number }>({ action: "events", ...c, events }),
  nickname: (c: Creds, nickname: string) => call<{ nickname: string }>({ action: "nickname", ...c, nickname }),
  claim: (c: Creds) => call<{ gems: number }>({ action: "claim", ...c }),
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
