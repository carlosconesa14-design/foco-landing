/**
 * Reloj del juego, a prueba de trampas con la hora del móvil.
 *
 * - Cuando hay conexión, se sincroniza con la hora del servidor (`syncClock`): cambiar la hora del
 *   móvil no adelanta nada (premio diario, maletines, ganancias offline, ruleta…).
 * - Sin conexión se usa la hora del móvil, pero el reloj nunca va hacia atrás: quien adelanta la hora
 *   para cobrar antes y luego la retrasa se queda "en el futuro" hasta que el tiempo real le alcanza.
 * - Si el móvil se desvía mucho de la hora del servidor, se apunta para revisarlo (Liga).
 */

export interface ClockState {
  /** Hora más alta vista (ms). El reloj nunca devuelve menos. */
  floor: number;
  /** Diferencia hora del servidor − hora del móvil en la última sincronización (ms). */
  offset: number;
  /** Última sincronización con el servidor (hora del servidor, ms; 0 = nunca). */
  syncedAt: number;
}

/** Desvío a partir del cual la hora del móvil se considera manipulada. */
export const CLOCK_TOLERANCE_MS = 10 * 60e3;

let st: ClockState = { floor: 0, offset: 0, syncedAt: 0 };
/** La hora del móvil (se puede fijar en los tests). */
let device: () => number = () => Date.now();

/** Hora del juego en ms. Úsala en lugar de `Date.now()` en todo lo que dé premios o mida esperas. */
export function now(): number {
  const t = device() + st.offset;
  if (t > st.floor) st.floor = t;
  return st.floor;
}

/** Copia del estado para guardarlo con la partida. */
export const clockSnapshot = (): ClockState => ({ ...st });

/** Recupera el estado guardado (al cargar la partida). */
export function restoreClock(raw: unknown): void {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  st = { floor: Math.max(st.floor, num(r.floor)), offset: num(r.offset), syncedAt: num(r.syncedAt) };
}

/**
 * Ajusta el reloj con la hora del servidor. `sentAt` y `receivedAt` son la hora del móvil al pedirla
 * y al recibirla (se toma el punto medio). Devuelve qué hay que revisar:
 * `skew` si el móvil iba desviado y `future` si la partida ya había estado en el futuro.
 */
export function syncClock(serverMs: number, sentAt: number, receivedAt: number): { skew: boolean; future: boolean } {
  const offset = serverMs - (sentAt + receivedAt) / 2;
  const future = st.floor > serverMs + CLOCK_TOLERANCE_MS;
  st.offset = offset;
  st.syncedAt = serverMs;
  return { skew: Math.abs(offset) > CLOCK_TOLERANCE_MS, future };
}

/** Solo para tests. */
export function _resetClock(deviceNow?: () => number): void {
  st = { floor: 0, offset: 0, syncedAt: 0 };
  device = deviceNow ?? (() => Date.now());
}
