import type { AdService, Placement } from "./types";
import { t } from "../i18n";

/** Anuncio simulado para el navegador: 5 s de espera y se puede cerrar sin recompensa. */
export class MockAds implements AdService {
  constructor(private root: HTMLElement) {}

  async init(): Promise<void> {}

  showRewarded(placement: Placement): Promise<boolean> {
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "adscreen";
      el.innerHTML = `
        <div class="top"><span>${t("Anuncio de prueba")} · ${placement}</span><button class="close" hidden>${t("Cerrar sin recompensa")}</button></div>
        <div class="fake"><div>${t("Aquí se mostrará un vídeo de AdMob")}</div><div class="cd">5</div><div class="small">${t("La recompensa se entrega al terminar")}</div></div>
        <button class="ad-btn wide" disabled>${t("Espera…")}</button>`;
      this.root.appendChild(el);
      const done = el.querySelector<HTMLButtonElement>(".ad-btn")!;
      const cd = el.querySelector<HTMLElement>(".cd")!;
      const close = el.querySelector<HTMLButtonElement>(".close")!;
      let left = 5;
      const closeTimer = setTimeout(() => (close.hidden = false), 1500);
      const iv = setInterval(() => {
        left--;
        cd.textContent = String(Math.max(left, 0));
        if (left <= 0) {
          clearInterval(iv);
          done.disabled = false;
          done.textContent = t("Recibir recompensa");
        }
      }, 1000);
      const finish = (ok: boolean) => {
        clearInterval(iv);
        clearTimeout(closeTimer);
        el.remove();
        resolve(ok);
      };
      done.onclick = () => finish(true);
      close.onclick = () => finish(false);
    });
  }
}
