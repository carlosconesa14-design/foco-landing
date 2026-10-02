import { CHAIN } from "../game/data";
import { bizList, bizTier, businessRate, chainRates, passiveRate } from "../game/economy";
import { fmt } from "../game/format";
import { cityDef } from "../game/state";
import { cityProgress } from "../game/world";
import { bizIcon, flagIcon } from "./icons";
import { openPlotSheet, type PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { money, t } from "../i18n";

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
     <div class="empire-goal" data-goal></div>
     <div class="list" data-list style="display:grid;gap:8px"></div>`,
    (el) => {
      const s = ctx.state();
      const now = Date.now();
      $(el, "[data-sub]").innerHTML = `<b class="good">+${money(passiveRate(s, now))}/s</b> ${t("entre todos tus negocios")}`;
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
    },
  );
}
