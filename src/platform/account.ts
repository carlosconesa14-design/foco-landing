/**
 * Cliente de la Edge Function «account» (Supabase): cuentas anónimas, invitaciones y partida en la nube.
 * Si no hay conexión, las llamadas fallan sin romper el juego.
 */

const env = import.meta.env;
const LEAGUE = env.VITE_LEAGUE_URL || "https://jpdvpbqiasyjzbdaiedh.supabase.co/functions/v1/league";
const URL = LEAGUE.replace(/\/league$/, "/account");
const KEY = env.VITE_LEAGUE_KEY || "sb_publishable_y8GI8XKM5uuq1jrbPWULBA_v39TLLkE";

export interface Creds {
  id: string;
  secret: string;
}

export interface RefStatus {
  code: string;
  invited: number;
  qualified: number;
  claimed: number;
  max: number;
  referred: boolean;
}

/** Error del servidor con su código (`code`, `used`, `old`, `same`, `self`, `recovery`, `too_many`…). */
export class AccountError extends Error {}

async function call<T>(body: Record<string, unknown>, timeoutMs = 10000): Promise<T> {
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
    if (!res.ok || data?.error) throw new AccountError(data?.error ?? `http ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const accountApi = {
  /** Ajustes del juego desde el servidor (ver docs/AJUSTES.md). No necesita cuenta. */
  config: () => call<{ config: unknown }>({ action: "config" }, 6000),
  register: () => call<{ id: string; secret: string; code: string; recovery: string }>({ action: "register" }),
  refStatus: (c: Creds) => call<RefStatus>({ action: "ref_status", ...c }),
  refUse: (c: Creds, code: string) => call<{ ok: true }>({ action: "ref_use", ...c, code }),
  refQualify: (c: Creds) => call<{ ok: boolean }>({ action: "ref_qualify", ...c }),
  refClaim: (c: Creds) => call<{ claimed: number }>({ action: "ref_claim", ...c }),
  save: (c: Creds, save: string, earned: number) => call<{ ok: true; at: string }>({ action: "save", ...c, save, earned }, 15000),
  recover: (recovery: string) => call<{ id: string; secret: string; code: string; save: string | null; at: string | null }>({ action: "recover", recovery }, 15000),
};

/** Enlace para invitar: abre la beta web con el código ya puesto. */
export const inviteLink = (code: string) => `https://carlosconesa14-design.github.io/foco-landing/jugar/?ref=${encodeURIComponent(code)}`;

/** Código de invitación que venía en el enlace con el que se abrió el juego (`?ref=CODE`). */
export function refFromUrl(): string {
  try {
    const v = new URLSearchParams(location.search).get("ref") ?? "";
    return /^[A-Za-z0-9]{4,12}$/.test(v) ? v.toUpperCase() : "";
  } catch {
    return "";
  }
}

const CFG_KEY = "remoteConfig";

/** Últimos ajustes recibidos (para aplicarlos al arrancar, aunque no haya conexión). */
export function cachedConfig(): unknown {
  try {
    return JSON.parse(localStorage.getItem(CFG_KEY) ?? "null");
  } catch {
    return null;
  }
}

/** Pide los ajustes al servidor y los guarda para el próximo arranque. */
export async function fetchConfig(): Promise<unknown | null> {
  try {
    const { config } = await accountApi.config();
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(config ?? {}));
    } catch {
      /* sin almacenamiento: se aplican igual */
    }
    return config ?? {};
  } catch {
    return null;
  }
}
