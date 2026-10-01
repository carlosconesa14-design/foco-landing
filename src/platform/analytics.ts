import { Capacitor } from "@capacitor/core";

/**
 * Analítica propia y anónima (Edge Function «track» en Supabase).
 * Un id aleatorio por instalación, sin datos personales. Los eventos esperan en el
 * almacenamiento local y se envían en lotes; si no hay conexión, se reintenta más tarde.
 * Informes: vistas analytics_* en Supabase (ver docs/ANALITICA.md).
 */

const env = import.meta.env;
const LEAGUE = env.VITE_LEAGUE_URL || "https://jpdvpbqiasyjzbdaiedh.supabase.co/functions/v1/league";
const URL = LEAGUE.replace(/\/league$/, "/track");
const KEY = env.VITE_LEAGUE_KEY || "sb_publishable_y8GI8XKM5uuq1jrbPWULBA_v39TLLkE";
const VERSION = "0.1";
const QKEY = "analyticsQueue";
const MAX = 200;

export type AnalyticsName =
  | "session_start"
  | "session_end"
  | "tutorial_step"
  | "tutorial_done"
  | "ad_watched"
  | "business_bought"
  | "floor_opened"
  | "ipo"
  | "city_expand"
  | "league_join"
  | "purchase"
  | "offline_collect"
  | "event_claim"
  | "event_boost";

interface Ev {
  name: AnalyticsName;
  props: Record<string, string | number | boolean>;
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: se pierde la analítica, el juego sigue */
  }
}

function deviceId(): string {
  let id = read<string | null>("analyticsDevice", null);
  if (!id) {
    id = crypto.randomUUID();
    write("analyticsDevice", id);
  }
  return id;
}

/** Momento de la instalación (primer arranque), para días y minutos desde que se instaló. */
const installedAt = (() => {
  let t = read<number | null>("analyticsInstalled", null);
  if (!t) {
    t = Date.now();
    write("analyticsInstalled", t);
  }
  return t;
})();

export const minutesSinceInstall = () => Math.round((Date.now() - installedAt) / 60e3);
export const daysSinceInstall = () => Math.floor((Date.now() - installedAt) / 86400e3);

let queue: Ev[] = read<Ev[]>(QKEY, []);
let sending = false;
/** En la web de pruebas (navegador) no se envía nada salvo que se active a mano. */
let enabled = Capacitor.isNativePlatform();

export const analytics = {
  /** Activa el envío también en la web (para probar). */
  enable(on = true): void {
    enabled = on;
  },

  track(name: AnalyticsName, props: Ev["props"] = {}): void {
    queue.push({ name, props });
    if (queue.length > MAX) queue = queue.slice(-MAX);
    write(QKEY, queue);
  },

  /** Envía lo pendiente. `final` usa keepalive para que llegue aunque se cierre la app. */
  async flush(final = false): Promise<void> {
    if (!enabled || sending || !queue.length) return;
    sending = true;
    const batch = queue.slice(0, 50);
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KEY },
        body: JSON.stringify({ device: deviceId(), platform: Capacitor.getPlatform(), version: VERSION, events: batch }),
        keepalive: final,
      });
      if (res.ok) {
        queue = queue.filter((e) => !batch.includes(e));
        write(QKEY, queue);
      }
    } catch {
      /* sin conexión: se reintenta en el siguiente envío */
    } finally {
      sending = false;
    }
  },
};
