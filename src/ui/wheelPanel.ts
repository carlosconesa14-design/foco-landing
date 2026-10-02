import { now } from "../game/clock";
import { t } from "../i18n";
import { OFFERS, WHEEL, spinWheel, wheelStatus } from "../game/offers";
import { analytics } from "../platform/analytics";
import { rewardLabel, showGrant } from "./metaPanels";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";

/** Ruleta diaria: un giro gratis al día y hasta 3 más con anuncio. */

const COLORS = ["#f5c542", "#3ddc97", "#4aa8ff", "#ff6b5b", "#b57bff", "#f5c542", "#3ddc97", "#ff9f43"];
const SPIN_MS = 3200;
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

function wheelHtml(): string {
  const n = WHEEL.length;
  const step = 360 / n;
  const bg = WHEEL.map((_, i) => `${COLORS[i % COLORS.length]} ${i * step}deg ${(i + 1) * step}deg`).join(",");
  const labels = WHEEL.map((w, i) => {
    const l = rewardLabel(w.reward);
    return `<span class="wheel-slot" style="--a:${i * step + step / 2}deg"><b>${l.icon}</b><small>${l.text}</small></span>`;
  }).join("");
  return `<div class="wheel-wrap"><i class="wheel-pin" aria-hidden="true"></i><div class="wheel" data-wheel style="background:conic-gradient(${bg})">${labels}</div></div>`;
}

export function openWheel(ctx: PanelCtx): void {
  let spinning = false;
  let angle = 0;
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🎡</span><div><h3>${t("Ruleta diaria")}</h3><p class="muted">${t("Un giro gratis cada día y {n} más con anuncio.", { n: OFFERS.wheelAdSpins })}</p></div></div>
     ${wheelHtml()}
     <div class="actions col" data-actions></div>`,
    (el) => {
      const st = wheelStatus(ctx.state(), now());
      const html = spinning
        ? `<button class="btn" disabled>${t("Girando…")}</button>`
        : st.free
          ? `<button class="btn" data-spin="free">${t("Girar gratis")}</button>`
          : st.adsLeft > 0
            ? `<button class="ad-btn wide" data-spin="ad"><span class="play"></span>${t("Girar otra vez ({n} hoy)", { n: st.adsLeft })}</button>`
            : `<button class="btn" disabled>${t("Vuelve mañana para girar gratis")}</button>`;
      const actions = $(el, "[data-actions]");
      if (actions.dataset.html === html) return;
      actions.dataset.html = html;
      actions.innerHTML = html;
      const b = actions.querySelector<HTMLButtonElement>("[data-spin]");
      if (b) b.onclick = () => void spin(el, b.dataset.spin === "ad");
    },
  );

  async function spin(el: HTMLElement, viaAd: boolean): Promise<void> {
    if (spinning) return;
    if (viaAd && !(await ctx.watchAd("wheel_spin"))) return;
    const r = spinWheel(ctx.state(), now(), viaAd);
    if (!r) return;
    analytics.track("wheel_spin", { slot: r.slot, ad: viaAd });
    spinning = true;
    sheet.update?.();
    const step = 360 / WHEEL.length;
    // La casilla ganadora termina bajo la aguja (arriba), con un poco de azar dentro de la casilla.
    const target = 360 - (r.slot * step + step / 2) + (Math.random() - 0.5) * step * 0.6;
    angle += 360 * 5 + ((target - (angle % 360) + 360) % 360);
    const wheel = $<HTMLElement>(el, "[data-wheel]");
    const ms = reduced() ? 0 : SPIN_MS;
    wheel.style.transition = ms ? `transform ${ms}ms cubic-bezier(0.17, 0.67, 0.12, 1)` : "none";
    wheel.style.transform = `rotate(${angle}deg)`;
    if (ms) ctx.fx("click");
    await new Promise((res) => setTimeout(res, ms + 150));
    spinning = false;
    ctx.fx(r.grant.exec ? "chest" : "gems", true);
    showGrant(ctx, r.grant);
    if (sheet.el.isConnected) sheet.update?.();
  }
}
