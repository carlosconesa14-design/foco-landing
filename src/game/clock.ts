/**
 * Reloj del juego, a prueba de trampas con la hora del móvil.
 *
 * La hora del móvil NO se usa para nada que dé premios. El tiempo del juego sale de dos fuentes
 * que el jugador no puede tocar:
 * - la **hora del servidor**, al sincronizar (al abrir, al volver a la app y cada 15 min);
 * - el **contador interno del navegador o del móvil** (`performance.now()`), que solo mide el
 *   tiempo que la app lleva abierta y no cambia aunque se cambie la hora del sistema.
 *
 * Sin conexión, el tiempo del juego solo avanza mientras se juega: el tiempo con la app cerrada
 * (ganancias offline, premio diario, maletines, ruleta…) se cuenta al volver a tener conexión.
 * Adelantar la hora del móvil, con o sin conexión, no adelanta nada.
 *
 * Una partida que aparece "en el futuro" respecto al servidor (solo posible editando el guardado o
 * en la primera partida sin conexión) se devuelve a la hora real y se apunta para revisarla.
 */

export interface ClockState {
  /** Hora del juego más alta vista (ms). Se guarda con la partida. */
  floor: number;
  /** Sin uso desde la versión con contador interno; se conserva por compatibilidad. */
  offset: number;
  /** Última sincronización con el servidor (hora del servidor, ms; 0 = nunca). */
  syncedAt: number;
}

/** Desvío a partir del cual la hora del móvil se considera manipulada. */
export const CLOCK_TOLERANCE_MS = 10 * 60e3;

let st: ClockState = { floor: 0, offset: 0, syncedAt: 0 };
/** Punto de referencia: hora del juego `game` cuando el contador interno marcaba `perf`. */
let anchor: { game: number; perf: number } | null = null;
let trustedNow = false;

/** Hora del móvil: solo para la primera partida sin conexión y para comparar con el servidor. */
let device: () => number = () => Date.now();
/** Contador interno (ms): no depende de la hora del sistema. */
let perf: () => number = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Hora del juego en ms. Úsala en lugar de `Date.now()` en todo lo que dé premios o mida esperas. */
export function now(): number {
  // Sin referencia todavía: se parte de la última hora guardada (o, en una partida nueva, de la del móvil).
  anchor ??= { game: st.floor || device(), perf: perf() };
  const t = anchor.game + (perf() - anchor.perf);
  if (t > st.floor) st.floor = t;
  return st.floor;
}

/** ¿La hora viene del servidor en esta sesión? (sin conexión, el tiempo con la app cerrada aún no cuenta) */
export const clockTrusted = () => trustedNow;

/** Copia del estado para guardarlo con la partida. */
export const clockSnapshot = (): ClockState => ({ ...st });

/** Recupera el estado guardado (al cargar la partida): el tiempo sigue desde la última hora guardada. */
export function restoreClock(raw: unknown): void {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
  st = { floor: Math.max(st.floor, num(r.floor)), offset: 0, syncedAt: num(r.syncedAt) };
  anchor = null;
}

/**
 * Ajusta el reloj con la hora del servidor. `sentPerf` y `receivedPerf` son el contador interno al
 * pedirla y al recibirla (se toma el punto medio). Devuelve:
 * - `skew`: la hora del móvil iba desviada (señal para revisar);
 * - `future`: la partida estaba por delante de la hora real (se devuelve a la hora real);
 * - `jumpMs`: cuánto ha avanzado el reloj del juego al sincronizar (tiempo con la app cerrada).
 */
export function syncClock(serverMs: number, sentPerf: number, receivedPerf: number): { skew: boolean; future: boolean; jumpMs: number } {
  const before = now();
  const mid = (sentPerf + receivedPerf) / 2;
  const elapsed = Math.max(0, receivedPerf - mid);
  const serverNow = serverMs + elapsed;
  const future = st.floor > serverNow + CLOCK_TOLERANCE_MS;
  const skew = Math.abs(device() - serverNow) > CLOCK_TOLERANCE_MS;
  anchor = { game: serverMs, perf: mid };
  if (future) st.floor = serverNow; // vuelve a la hora real
  st.syncedAt = serverMs;
  trustedNow = true;
  const after = now();
  return { skew, future, jumpMs: Math.max(0, after - before) };
}

/** Solo para tests: hora del móvil y contador interno simulados. */
export function _resetClock(deviceNow?: () => number, perfNow?: () => number): void {
  st = { floor: 0, offset: 0, syncedAt: 0 };
  anchor = null;
  trustedNow = false;
  device = deviceNow ?? (() => Date.now());
  perf = perfNow ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
}
