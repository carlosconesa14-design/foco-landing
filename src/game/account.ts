import type { ChestType } from "./data";
import type { GameState } from "./state";

/**
 * Cuenta anónima del juego (ver docs/GDD.md, «Invitar a amigos» y «Partida en la nube»).
 * Se crea sola al terminar el tutorial. No pide datos personales: el servidor da un id y una clave
 * (que se guardan aquí), un código de invitación público y una clave de recuperación privada.
 */

export const REF = {
  /** Premio para quien usa un código de invitación (al momento). */
  friendGems: 50,
  friendChest: "normal" as ChestType,
  /** Premio para quien invita, por cada amigo que llega a su segundo negocio. */
  perFriendGems: 100,
  perFriendChest: "normal" as ChestType,
  /** Días desde que se instala el juego para poder usar un código. */
  newDays: 7,
} as const;

/** Cada cuánto se sube la partida a la nube mientras se juega. */
export const CLOUD_EVERY_MS = 5 * 60e3;

export interface AccountState {
  id: string | null;
  secret: string | null;
  /** Código de invitación (público). */
  code: string;
  /** Clave para recuperar la partida en otro móvil (privada). */
  recovery: string;
  /** Ya usó el código de un amigo (y cobró el premio de bienvenida). */
  refUsed: boolean;
  /** Ya avisó al servidor de que llegó al objetivo (para el premio de quien le invitó). */
  refQualified: boolean;
  /** Última subida a la nube (hora del juego, ms). */
  cloudAt: number;
}

export const freshAccount = (): AccountState => ({ id: null, secret: null, code: "", recovery: "", refUsed: false, refQualified: false, cloudAt: 0 });

export function migrateAccount(raw: unknown): AccountState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: str(r.id) || null,
    secret: str(r.secret) || null,
    code: str(r.code),
    recovery: str(r.recovery),
    refUsed: r.refUsed === true,
    refQualified: r.refQualified === true,
    cloudAt: typeof r.cloudAt === "number" && Number.isFinite(r.cloudAt) ? r.cloudAt : 0,
  };
}

export const hasAccount = (s: GameState) => !!(s.meta.account.id && s.meta.account.secret);

/** El amigo ya cuenta para quien le invitó: tiene dos negocios de verdad (además del reparto) o ya se expandió. */
export function refGoalReached(s: GameState): boolean {
  if (s.world.completed.length > 0) return true;
  return Object.values(s.biz).filter((b) => b.owned).length >= 3;
}

/** Hay que avisar al servidor de que el amigo ha llegado al objetivo. */
export const refQualifyPending = (s: GameState) => hasAccount(s) && s.meta.account.refUsed && !s.meta.account.refQualified && refGoalReached(s);

/** Toca subir la partida a la nube. */
export const cloudDue = (s: GameState, now: number) => hasAccount(s) && now - s.meta.account.cloudAt >= CLOUD_EVERY_MS;
