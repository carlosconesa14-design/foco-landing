import { analytics } from "./analytics";

/**
 * Registro de errores: los fallos de JavaScript del juego se envían con la analítica (evento
 * `error`, anónimo) para verlos en el panel de la beta (ver docs/ANALITICA.md). Solo el mensaje, el
 * archivo y la línea, sin datos del jugador. Como mucho 5 distintos por sesión.
 */

const MAX_PER_SESSION = 5;
const seen = new Set<string>();

/** Quita rutas, consultas y números largos: así el mismo fallo se agrupa aunque cambien los detalles. */
const clean = (s: string) =>
  s
    .replace(/https?:\/\/[^\s)]+\/([^/\s)?#]+)(\?[^\s):]*)?/g, "$1")
    .replace(/\b\d{4,}\b/g, "#")
    .slice(0, 160);

/** Ruido que no es del juego (extensiones, avisos del navegador). */
const IGNORE = /ResizeObserver loop|Script error\.?$|extension:\/\/|Non-Error promise rejection/i;

export function reportError(err: unknown, where = ""): void {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err ?? null));
  const msg = clean(`${e.name}: ${e.message}`);
  if (IGNORE.test(msg) || IGNORE.test(e.stack ?? "")) return;
  // Primera línea de la pila que sea del juego: archivo y línea.
  const frame = (e.stack ?? "").split("\n").slice(1).find((l) => /\.(ts|js)/.test(l)) ?? where;
  const src = clean(frame.replace(/^\s*at\s+/, "")).slice(0, 120);
  const key = `${msg}|${src}`;
  if (seen.has(key) || seen.size >= MAX_PER_SESSION) return;
  seen.add(key);
  analytics.track("error", { msg, src, where: where.slice(0, 40) });
  void analytics.flush();
}

/** Escucha los errores sin capturar y las promesas rechazadas. Llamar una vez al arrancar. */
export function installErrorReporting(context: () => Record<string, string>): void {
  window.addEventListener("error", (ev) => {
    if (ev.error || ev.message) reportError(ev.error ?? ev.message, Object.values(context()).join(" "));
  });
  window.addEventListener("unhandledrejection", (ev) => reportError(ev.reason, Object.values(context()).join(" ")));
}
