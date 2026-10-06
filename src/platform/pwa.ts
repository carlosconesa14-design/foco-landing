import { WEB_BETA } from "./web";

/**
 * Beta web instalable (PWA): registra el service worker (`public/sw.js`) y guarda el aviso de
 * instalación del navegador para ofrecerlo desde Ajustes. Solo en la beta web, nunca en la app.
 */
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;

export const isStandalone = (): boolean => {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
};

export const isIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** ¿Tiene sentido ofrecer «Instalar»? (beta web y todavía en el navegador). */
export const canOfferInstall = (): boolean => WEB_BETA && !isStandalone();

export function initPwa(): void {
  if (!WEB_BETA) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
  });
  window.addEventListener("appinstalled", () => (deferred = null));
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => void navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
}

/** Lanza la instalación del navegador. `manual` = no hay aviso: hay que explicar los pasos. */
export async function install(): Promise<"accepted" | "dismissed" | "manual"> {
  if (!deferred) return "manual";
  const ev = deferred;
  deferred = null;
  try {
    await ev.prompt();
    return (await ev.userChoice).outcome;
  } catch {
    return "manual";
  }
}
