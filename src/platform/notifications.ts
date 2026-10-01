import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { PlannedNote } from "../game/notify";

/**
 * Entrega de avisos locales con @capacitor/local-notifications. Solo en el móvil:
 * en la web no se hace nada (no queremos pedir permisos del navegador).
 */
export const notifications = {
  get supported(): boolean {
    return Capacitor.isNativePlatform();
  },

  /** Pide permiso (una sola vez la muestra el sistema). Devuelve si está concedido. */
  async ask(): Promise<boolean> {
    if (!this.supported) return false;
    try {
      const cur = await LocalNotifications.checkPermissions();
      if (cur.display === "granted") return true;
      if (cur.display === "denied") return false;
      return (await LocalNotifications.requestPermissions()).display === "granted";
    } catch {
      return false;
    }
  },

  /** Sustituye los avisos pendientes por estos. */
  async schedule(notes: PlannedNote[]): Promise<void> {
    if (!this.supported) return;
    try {
      if ((await LocalNotifications.checkPermissions()).display !== "granted") return;
      await this.cancelAll();
      if (!notes.length) return;
      await LocalNotifications.schedule({
        notifications: notes.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true } })),
      });
    } catch {
      /* sin avisos: el juego sigue igual */
    }
  },

  /** Estado del permiso, para el diagnóstico. */
  async permission(): Promise<string> {
    if (!this.supported) return "solo en el móvil";
    try {
      return (await LocalNotifications.checkPermissions()).display;
    } catch {
      return "error";
    }
  },

  /** Aviso de prueba dentro de `seconds` segundos (diagnóstico). */
  async test(seconds = 10): Promise<boolean> {
    if (!(await this.ask())) return false;
    try {
      await LocalNotifications.schedule({
        notifications: [{ id: 99, title: "🔔 Aviso de prueba", body: "Si ves esto, los avisos funcionan.", schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true } }],
      });
      return true;
    } catch {
      return false;
    }
  },

  /** Al volver a la app ya no hacen falta. */
  async cancelAll(): Promise<void> {
    if (!this.supported) return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    } catch {
      /* nada que cancelar */
    }
  },
};
