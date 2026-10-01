import { META } from "./data";
import { passiveRate } from "./economy";
import { fmt } from "./format";
import { dailyStatus } from "./meta";
import type { GameState } from "./state";
import { offlineCapHours } from "./world";

/**
 * Avisos locales que se programan al salir de la app. Son lo que más hace volver al
 * jugador en un idle: la caja llena, el maletín gratis y el premio diario.
 * Puro y testeable: la plataforma solo los entrega (src/platform/notifications.ts).
 */

export interface PlannedNote {
  id: number;
  /** Momento de entrega (ms). */
  at: number;
  title: string;
  body: string;
}

export const NOTE_IDS = { cashFull: 1, freeChest: 2, daily: 3 } as const;

/** Nunca de noche: lo que caiga entre las 22:00 y las 9:00 (hora local) pasa a las 9:30. */
export function outsideQuietHours(at: number): number {
  const d = new Date(at);
  const h = d.getHours();
  if (h >= 9 && h < 22) return at;
  const t = new Date(d);
  if (h >= 22) t.setDate(t.getDate() + 1);
  t.setHours(9, 30, 0, 0);
  return t.getTime();
}

/** La próxima vez que el reloj local marque `hour` después de `from`. */
function nextLocalHour(from: number, hour: number): number {
  const t = new Date(from);
  t.setHours(hour, 0, 0, 0);
  if (t.getTime() <= from) t.setDate(t.getDate() + 1);
  return t.getTime();
}

/** Siguiente medianoche UTC (cuando cambia el día de misiones y premio diario). */
function nextUtcMidnight(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export function planNotifications(s: GameState, now: number): PlannedNote[] {
  if (!s.settings.notify) return [];
  const notes: PlannedNote[] = [];

  // 1) La caja se llena cuando se alcanza el tope de horas offline.
  const rate = passiveRate(s, now, false);
  if (rate > 0) {
    const capMs = offlineCapHours(s) * 3600e3;
    notes.push({
      id: NOTE_IDS.cashFull,
      at: outsideQuietHours(now + capMs),
      title: "💰 Tus gerentes han llenado la caja",
      body: `Tienes unos ${fmt((rate * capMs) / 1000)} € esperando. Entra a cobrarlos: a partir de ahora ya no suman más.`,
    });
  }

  // 2) Maletín gratis listo.
  if (s.meta.freeChestAt > now + 60e3) {
    notes.push({
      id: NOTE_IDS.freeChest,
      at: outsideQuietHours(s.meta.freeChestAt),
      title: "💼 Maletín gratis listo",
      body: `Ábrelo y descubre a tu próximo ejecutivo. Vuelve a estar disponible cada ${META.freeChestHours} h.`,
    });
  }

  // 3) Premio diario. Sin cobrar: esta tarde a las 19:00 (o mañana a las 10:00 si ya es tarde).
  //    Cobrado: mañana a las 10:00, cuando ya haya uno nuevo (el día cambia a medianoche UTC).
  const d = dailyStatus(s, now);
  let at: number;
  if (d.canClaim) {
    const evening = nextLocalHour(now, 19);
    at = evening - now >= 3600e3 && evening - now <= 12 * 3600e3 ? evening : nextLocalHour(now + 3600e3, 10);
  } else {
    at = nextLocalHour(nextUtcMidnight(now), 10);
  }
  notes.push({
    id: NOTE_IDS.daily,
    at: outsideQuietHours(at),
    title: "🎁 Tu premio diario te espera",
    body: d.streak > 1 ? `Llevas ${d.streak} días seguidos. ¡No pierdas la racha!` : "Entra a cobrarlo y empieza una racha de premios.",
  });

  return notes.filter((n) => n.at > now).sort((a, b) => a.at - b.at);
}
