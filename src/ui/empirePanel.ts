import { now as clockNow } from "../game/clock";
import { CHAIN } from "../game/data";
import { bizList, bizTier, businessRate, chainRates, passiveRate } from "../game/economy";
import { fmt } from "../game/format";
import { cityDef } from "../game/state";
import { cityProgress } from "../game/world";
import { bizIcon, icon, flagIcon } from "./icons";
import { openPlotSheet, type PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { money, t } from "../i18n";
import { RIVALS, myWeek, rivalReward, rivalScore } from "../game/rival";
import type { GameState } from "../game/state";
import { fmtWait } from "./eventPanel";
import { gem } from "./icons";

/** Tarjeta del rival de la semana: tú contra él, quién va ganando y el premio. */
export function rivalCardHtml(s: GameState, now: number): string {
  const r = s.meta.rival;
  if (!r.week) return "";
  const who = RIVALS[r.who];
  const mine = myWeek(s);
  const his = rivalScore(s, now);
  const top = Math.max(r.target, mine, 1);
  const status = r.won
    ? `<span class="good">✅ ${t("¡Le has ganado esta semana!")}</span>`
    : mine >= his
      ? `<span class="good">${t("Vas ganando. Llega a {m} y será tuyo.", { m: money(r.target) })}</span>`
      : `<span class="warn">${t("Te gana por {m}", { m: money(his - mine) })}</span>`;
  return `<div class="rv-head"><span class="rv-face">${icon(`exec_${r.who % 8}`)}</span><div><b>${t("Rival de la semana: {name}", { name: who.name })}</b><small>${who.biz} · ${t("termina en {time}", { time: fmtWait(r.end - now) })}</small></div>
      <span class="rv-prize">👜 + ${rivalReward(s).gems} ${gem()}</span></div>
    <div class="rv-row"><span>${t("Tú")}</span><i class="rv-bar me"><i style="width:${((mine / top) * 100).toFixed(1)}%"></i></i><b>${money(mine)}</b></div>
    <div class="rv-row"><span>${who.name}</span><i class="rv-bar him"><i style="width:${((his / top) * 100).toFixed(1)}%"></i></i><b>${money(his)}</b></div>
    <p class="small">${status}</p>`;
}

/**
 * Panel «Imperio»: todos los negocios de la ciudad de un vistazo. Qué gana cada uno,
 * qué le frena y cuántos gerentes le faltan, con un botón para ir directo.
 */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

function paint(el: HTMLElement, html: string): boolean {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
}

const part = (k: "production" | "transport" | "sale") =>
  k === "production" ? t("producción") : k === "transport" ? t("transporte") : t("venta");

export function openEmpire(ctx: PanelCtx): void {
  const s0 = ctx.state();
  const city = cityDef(s0.city);
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${flagIcon(city)}</span><div><h3>${t("Tu imperio en {city}", { city: city.name })}</h3><p class="muted" data-sub></p></div></div>
     <div class="rival-card" data-rival></div>
     <div class="empire-goal" data-goal></div>
     <div class="list" data-list style="display:grid;gap:8px"></div>`,
    (el) => {
      const s = ctx.state();
      const now = clockNow();
      $(el, "[data-sub]").innerHTML = `<b class="good">+${money(passiveRate(s, now))}/s</b> ${t("entre todos tus negocios")}`;
      paint($(el, "[data-rival]"), rivalCardHtml(s, now));
      const p = cityProgress(s);
      const pct = Math.min(100, (Math.log10(Math.max(1, p.earned)) / Math.log10(p.goal)) * 100);
      paint(
        $(el, "[data-goal]"),
        `<div class="stat"><span>${t("Completar {city}", { city: city.name })}</span><b>${t("{n}/{total} negocios", { n: p.owned, total: p.total })} · ${fmt(p.earned)} / ${money(p.goal)}</b></div><div class="bar2"><i style="width:${pct.toFixed(1)}%"></i></div>`,
      );
      const list = bizList(s);
      const nextIdx = list.findIndex((d) => !s.biz[d.id].owned);
      const rows = list.map((d, i) => {
        const b = s.biz[d.id];
        if (!b.owned) {
          const next = i === nextIdx;
          const can = next && s.cash >= d.price;
          return `<div class="row ${next ? "" : "locked"}"><span class="face">${next ? bizIcon(d) : "🔒"}</span>
            <div><b>${d.name}</b><span class="sub">${next ? d.blurb : t("Compra antes el negocio anterior")}</span>
            ${next ? `<div class="bar2"><i style="width:${Math.min(100, (s.cash / d.price) * 100).toFixed(1)}%"></i></div>` : ""}</div>
            <button class="claim" data-buy="${d.id}" ${can ? "" : "disabled"}>${money(d.price)}</button></div>`;
        }
        const r = chainRates(d, b, false);
        const missing = b.floors.filter((f) => !f.managed).length + (b.transport.managed ? 0 : 1) + (b.sale.managed ? 0 : 1);
        const auto = missing < b.floors.length + 2;
        const tags: string[] = [];
        if (missing) tags.push(`<span class="etag warn">👔 ${t("{n} sin gerente", { n: missing })}</span>`);
        if (auto) tags.push(`<span class="etag slow">${t("Atasco")}: ${part(r.bottleneck)}</span>`);
        return `<div class="row"><span class="face">${bizIcon(d)}</span>
          <div><b>${d.name} <span class="stars">${"★".repeat(bizTier(b))}</span></b>
          <span class="sub">+${money(businessRate(s, d.id, now))}/s · ${t("{n}/{total} puestos", { n: b.floors.length, total: CHAIN.maxFloors })}</span>
          <div class="etags">${tags.join("")}</div></div>
          <button class="claim" data-go="${d.id}">${t("Ir")} ▸</button></div>`;
      });
      const box = $(el, "[data-list]");
      if (!paint(box, rows.join(""))) return;
      box.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((btn) => {
        btn.onclick = () => ctx.goTo({ scene: "business", id: btn.dataset.go! });
      });
      box.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((btn) => {
        btn.onclick = () => openPlotSheet(ctx, btn.dataset.buy!);
      });
    }, { screen: "empire" },
  );
}
