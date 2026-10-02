import type { DailyReward } from "./data";
import { grantReward, type Grant } from "./meta";
import type { GameState } from "./state";

/**
 * Escalera diaria de anuncios: cada anuncio visto en el día acerca al siguiente premio del juego.
 * Solo premios del juego (nunca puntos de Liga ni nada de valor real), como permite AdMob.
 * El contador es `s.ads.today` (lo lleva `recordAd`); aquí se guarda qué escalones se han dado hoy.
 */

export const AD_LADDER: { ads: number; reward: DailyReward }[] = [
  { ads: 3, reward: { chest: "normal" } },
  { ads: 6, reward: { gems: 40 } },
  { ads: 10, reward: { chest: "premium" } },
];

export interface AdLadderState {
  day: string;
  given: number;
}

export const freshAdLadder = (): AdLadderState => ({ day: "", given: 0 });

/** Después de un anuncio: entrega los escalones alcanzados hoy que aún no se habían dado. */
export function adLadderStep(s: GameState, now: number, rand: () => number = Math.random): { step: number; grant: Grant }[] {
  const L = s.meta.adLadder;
  if (L.day !== s.ads.day) {
    L.day = s.ads.day;
    L.given = 0;
  }
  const out: { step: number; grant: Grant }[] = [];
  while (L.given < AD_LADDER.length && s.ads.today >= AD_LADDER[L.given].ads) {
    out.push({ step: L.given, grant: grantReward(s, AD_LADDER[L.given].reward, now, rand) });
    L.given++;
  }
  return out;
}

/** Siguiente escalón de hoy (para mostrarlo), o null si ya se han dado todos. */
export function nextAdStep(s: GameState, today: string): { ads: number; left: number; reward: DailyReward } | null {
  const seen = s.ads.day === today ? s.ads.today : 0;
  const given = s.meta.adLadder.day === today ? s.meta.adLadder.given : 0;
  const next = AD_LADDER[given];
  return next ? { ads: next.ads, left: Math.max(0, next.ads - seen), reward: next.reward } : null;
}

export function migrateAdLadder(raw: unknown): AdLadderState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    day: typeof r.day === "string" ? r.day : "",
    given: typeof r.given === "number" && r.given >= 0 ? Math.min(AD_LADDER.length, Math.floor(r.given)) : 0,
  };
}
