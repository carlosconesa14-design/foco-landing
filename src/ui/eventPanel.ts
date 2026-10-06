import { icon } from "./icons";
import { now as clockNow } from "../game/clock";
import type { StatKey } from "../game/data";
import {
  EVENT_BOOST,
  EVENT_POINTS,
  EVENT_TIERS,
  boostEvent,
  canBoostEvent,
  claimEventTier,
  eventThemeText,
  eventTiersReached,
  eventToClaim,
  eventWindow,
} from "../game/event";
import { fmt, fmtTime } from "../game/format";
import { FEST_DEF, FEST_GOALS, TROPHY, claimFestGoal, festGoalsReached, festOpen, festToClaim } from "../game/fest";
import { t } from "../i18n";
import { analytics } from "../platform/analytics";
import { rewardLabel, showGrant } from "./metaPanels";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";

/** Pantalla del evento del fin de semana: progreso, premios, x2 con anuncio y cómo se puntúa. */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

function paint(el: HTMLElement, html: string): boolean {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
}

/** Puntos enteros (1150, no «1.15 K») hasta 10 000. */
const pts = (n: number) => (n < 1e4 ? String(Math.floor(n)) : fmt(n));

/** «2 d 5 h» para esperas largas; «1:23:45» para las cortas. */
export function fmtWait(ms: number): string {
  const sec = Math.max(0, ms / 1000);
  return sec >= 86400 ? `${Math.floor(sec / 86400)} d ${Math.floor((sec % 86400) / 3600)} h` : fmtTime(sec);
}

const howRows = (): [StatKey, string][] => [
  ["sales", t("Cada 10 ventas")],
  ["upgrades", t("Cada nivel de mejora")],
  ["hires", t("Contratar un gerente")],
  ["floors", t("Abrir un puesto")],
  ["chests", t("Abrir un maletín")],
  ["abilities", t("Usar una habilidad")],
  ["skills", t("Usar la habilidad de un gerente")],
];

export function openEvent(ctx: PanelCtx): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon" data-icon></span><div><h3 data-title></h3><p class="muted" data-sub></p></div></div>
     <div data-top></div>
     <div class="list" data-fest style="display:grid;gap:8px;margin:10px 0"></div>
     <div class="list" data-list style="display:grid;gap:8px"></div>
     <details class="lg-how"><summary>${t("¿Cómo se consiguen puntos?")}</summary><div class="lg-table" data-how></div>
       <p class="small muted">${t("Los puntos solo cuentan mientras juegas, de viernes a domingo. Los premios conseguidos se pueden cobrar hasta que empiece el siguiente evento.")}</p></details>`,
    (el) => {
      const s = ctx.state();
      const now = clockNow();
      const w = eventWindow(now);
      const ev = s.meta.event;
      // Progreso que se ve: el del evento en curso, o el del anterior si aún tiene premios por cobrar.
      const live = w.active && ev.week === w.week;
      const mine = live || eventToClaim(s) > 0;
      const theme = mine ? w.theme : eventWindow(w.next).theme;
      const text = eventThemeText(theme);
      $(el, "[data-icon]").textContent = theme.icon;
      $(el, "[data-title]").textContent = text.name;
      $(el, "[data-sub]").textContent = live
        ? t("Evento del fin de semana · termina en {time}", { time: fmtWait(w.end - now) })
        : mine
          ? t("Evento terminado: cobra tus premios")
          : t("Próximo evento en {time}", { time: fmtWait(w.next - now) });

      const points = mine ? ev.points : 0;
      const reached = mine ? eventTiersReached(s) : 0;
      const next = EVENT_TIERS[reached];
      const prev = reached ? EVENT_TIERS[reached - 1].points : 0;
      const pct = next ? ((points - prev) / (next.points - prev)) * 100 : 100;
      const boostLeft = ev.boostEnd - now;
      const boostBtn = live
        ? boostLeft > 0 && !canBoostEvent(s, now)
          ? `<button class="ad-btn wide" disabled>${t("Puntos x2 · {time}", { time: fmtTime(boostLeft / 1000) })}</button>`
          : `<button class="ad-btn wide" data-boost ${canBoostEvent(s, now) ? "" : "disabled"}><span class="play"></span>${
              boostLeft > 0 ? t("Puntos x2 · {time} (+{min} min)", { time: fmtTime(boostLeft / 1000), min: EVENT_BOOST.minutes }) : t("Puntos x2 durante {min} min", { min: EVENT_BOOST.minutes })
            }</button>`
        : "";
      const top = `<p class="small muted">${text.desc}</p>
        <div class="stat"><span>${t("Tus puntos")}</span><b class="gold">${pts(points)}${next ? ` / ${pts(next.points)}` : ""}</b></div>
        <div class="bar2"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></div>
        ${boostBtn}`;
      const topEl = $(el, "[data-top]");
      if (paint(topEl, top)) {
        const b = topEl.querySelector<HTMLButtonElement>("[data-boost]");
        if (b)
          b.onclick = async () => {
            if (!(await ctx.watchAd("event_x2"))) return;
            if (boostEvent(ctx.state(), clockNow())) {
              analytics.track("event_boost", { week: ctx.state().meta.event.week });
              ctx.toast(t("¡Puntos x2 durante {min} min!", { min: EVENT_BOOST.minutes }));
            }
          };
      }

      // La feria: ruta propia del evento, con fichas y premios exclusivos (fest.ts).
      const fest = s.meta.fest;
      const open = festOpen(s, now);
      const festReached = festGoalsReached(s);
      const festRows = FEST_GOALS.map((g, i) => {
        const l = rewardLabel(g.reward);
        const claimed = i < fest.claimed;
        const ready = i === fest.claimed && i < festReached;
        const btn = claimed
          ? `<button class="claim" disabled>${t("Hecho")}</button>`
          : ready
            ? `<button class="claim" data-festclaim>${t("Cobrar")}</button>`
            : `<button class="claim" disabled>🔒</button>`;
        return `<div class="row ${claimed ? "done" : ""}"><span class="face">${l.icon}</span>
          <div><b>${l.text}${g.trophy ? ` + 🏆` : ""}</b><span class="sub">${t("Abre {n} casetas en la feria", { n: g.stops })}</span></div>${btn}</div>`;
      });
      const festHtml =
        open || festToClaim(s) > 0
          ? `<div class="row"><span class="face">${FEST_DEF.icon}</span><div><b>${t("La feria del fin de semana")}</b><span class="sub">${t(
              "Una ruta solo para el evento, con fichas 🎟️. Cada trofeo 🏆 da +{n} % de ingresos para siempre (tienes {have}).",
              { n: Math.round(TROPHY.bonus * 100), have: fest.trophies },
            )}</span></div>${open ? `<button class="claim" data-festgo>${t("Ir")}</button>` : ""}</div>${fest.trophies>0?`<div class="trophy-cabinet" aria-label="${t("Trofeos")}">${Array.from({length:Math.min(8,fest.trophies)},()=>icon("fest_trophy")).join("")}<b>×${fest.trophies}</b></div>`:""}${festRows.join("")}`
          : "";
      const festEl = $(el, "[data-fest]");
      festEl.hidden = !festHtml;
      if (paint(festEl, festHtml)) {
        const go = festEl.querySelector<HTMLButtonElement>("[data-festgo]");
        if (go)
          go.onclick = () => {
            analytics.track("fest_enter", { week: ctx.state().meta.fest.week, stops: ctx.state().meta.fest.biz.floors.length });
            ctx.goTo({ scene: "fest" });
          };
        const c = festEl.querySelector<HTMLButtonElement>("[data-festclaim]");
        if (c)
          c.onclick = () => {
            const st = ctx.state();
            const r = claimFestGoal(st, clockNow());
            if (!r) return;
            analytics.track("fest_claim", { week: st.meta.fest.week, goal: st.meta.fest.claimed });
            ctx.fx(r.grant.exec ? "chest" : "gems", true);
            if (r.trophy) ctx.banner("🏆", t("¡Feria completa! Trofeo: +{n} % de ingresos para siempre", { n: Math.round(TROPHY.bonus * 100) }));
            showGrant(ctx, r.grant);
          };
      }

      const rows = EVENT_TIERS.map((tier, i) => {
        const l = rewardLabel(tier.reward);
        const claimed = mine && i < ev.claimed;
        const ready = mine && i === ev.claimed && i < reached;
        const btn = claimed
          ? `<button class="claim" disabled>${t("Hecho")}</button>`
          : ready
            ? `<button class="claim" data-claim>${t("Cobrar")}</button>`
            : `<button class="claim" disabled>🔒</button>`;
        return `<div class="row ${claimed ? "done" : ""}"><span class="face">${l.icon}</span>
          <div><b>${l.text}</b><span class="sub">${t("{n} puntos", { n: pts(tier.points) })}</span></div>${btn}</div>`;
      });
      const list = $(el, "[data-list]");
      if (paint(list, rows.join(""))) {
        const c = list.querySelector<HTMLButtonElement>("[data-claim]");
        if (c)
          c.onclick = () => {
            const st = ctx.state();
            const tier = st.meta.event.claimed + 1;
            const g = claimEventTier(st, clockNow());
            if (!g) return;
            analytics.track("event_claim", { week: st.meta.event.week, tier });
            ctx.fx(g.exec ? "chest" : "gems", true);
            if (tier === EVENT_TIERS.length) ctx.banner("🏆", t("¡Has completado el evento!"));
            showGrant(ctx, g);
          };
      }

      paint(
        $(el, "[data-how]"),
        howRows()
          .map(([k, label]) => {
            const x2 = theme.doubles.includes(k);
            return `<span>${label}${x2 ? ` <b class="gold">x2</b>` : ""}</span><b>+${(EVENT_POINTS[k] ?? 0) * (k === "sales" ? 10 : 1) * (x2 ? 2 : 1)}</b>`;
          })
          .join(""),
      );
    }, { screen: "event" },
  );
}
