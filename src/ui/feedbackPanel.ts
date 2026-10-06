import type { GameState } from "../game/state";
import { lang, t } from "../i18n";
import { analytics, daysSinceInstall, minutesSinceInstall } from "../platform/analytics";
import { modal } from "./overlays";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";

/**
 * Opiniones desde el juego (Ajustes → «Danos tu opinión», y una pregunta al comprar el segundo
 * negocio). Se guardan en Supabase, anónimas, para leerlas en el panel de la beta (docs/ANALITICA.md).
 */

const ASKED = "feedbackAsked";

/** Iconos propios (vector): el repaso de iconos convertiría los ★ y 💬 de texto en imágenes. */
const STAR = `<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path fill="currentColor" stroke="#0b1f33" stroke-width="1.2" stroke-linejoin="round" d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8Z"/></svg>`;
const BUBBLE = `<svg class="game-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#7fd3ff" stroke="#24445c" stroke-width="2.3" stroke-linejoin="round" d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-9 8v-8H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z"/><path stroke="#24445c" stroke-width="2.3" stroke-linecap="round" d="M14 20h20M14 26h13"/></svg>`;

/** Contexto mínimo para entender la opinión (sin datos personales). */
const meta = (s: GameState): Record<string, string | number> => ({
  lang,
  city: s.city,
  owned: Object.values(s.biz).filter((b) => b.owned).length,
  minutes: minutesSinceInstall(),
  days: daysSinceInstall(),
});

export function openFeedback(ctx: PanelCtx, preset: number | null = null): void {
  let rating = preset;
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${BUBBLE}</span><div><h3>${t("Danos tu opinión")}</h3><p class="muted">${t("La leemos toda. Nos ayuda a mejorar el juego.")}</p></div></div>
     <div class="fb-stars" role="radiogroup" aria-label="${t("Puntuación")}">${[1, 2, 3, 4, 5].map((n) => `<button role="radio" data-star="${n}" aria-label="${n}">${STAR}</button>`).join("")}</div>
     <textarea class="fb-text" data-text maxlength="1000" rows="5" placeholder="${t("¿Qué te gusta? ¿Qué cambiarías? ¿Algo no funciona?")}"></textarea>
     <p class="small muted">${t("Es anónima: no escribas tu nombre, email ni otros datos personales.")}</p>
     <button class="buy big wide" data-send><span>${t("Enviar")}</span></button>`, undefined, { screen: "feedback" },
  );
  const el = sheet.el;
  const stars = [...el.querySelectorAll<HTMLButtonElement>("[data-star]")];
  const paintStars = () => stars.forEach((b) => {
    const on = rating !== null && Number(b.dataset.star) <= rating;
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", String(Number(b.dataset.star) === rating));
  });
  paintStars();
  stars.forEach((b) => (b.onclick = () => { rating = Number(b.dataset.star); paintStars(); ctx.fx("click"); }));
  const text = el.querySelector<HTMLTextAreaElement>("[data-text]")!;
  const send = el.querySelector<HTMLButtonElement>("[data-send]")!;
  send.onclick = async () => {
    const message = text.value.trim();
    if (rating === null && !message) return ctx.toast(t("Pon una puntuación o escribe algo"));
    send.disabled = true;
    const ok = await analytics.feedback(rating, message, meta(ctx.state()));
    send.disabled = false;
    if (!ok) return ctx.toast(t("No se ha podido enviar. Inténtalo en un momento."));
    sheet.close();
    ctx.fx("unlock", true);
    ctx.banner("💬", t("¡Gracias por tu opinión!"));
  };
}

/** Una sola vez, al comprar el segundo negocio: «¿Te está gustando?». */
export function maybeAskFeedback(ctx: PanelCtx): void {
  try {
    if (localStorage.getItem(ASKED)) return;
    localStorage.setItem(ASKED, "1");
  } catch {
    return; // sin almacenamiento: mejor no preguntar cada vez
  }
  setTimeout(() => {
    modal(ctx.root, {
      title: t("¿Te está gustando Rider Millionaire?"),
      amount: "💬",
      text: t("Es una beta y tu opinión decide lo que viene. Tarda 10 segundos."),
      actions: [
        {
          label: t("¡Me encanta!"),
          run: async () => {
            if (await analytics.feedback(5, "", meta(ctx.state()))) ctx.banner("💬", t("¡Gracias! Cuéntanos más cuando quieras en Ajustes."));
          },
        },
        { label: t("Está bien, pero…"), run: () => openFeedback(ctx, 3) },
        { label: t("No mucho"), run: () => openFeedback(ctx, 2) },
        { label: t("Ahora no"), run: () => {} },
      ],
    });
  }, 9000); // después de la celebración del negocio nuevo
}
