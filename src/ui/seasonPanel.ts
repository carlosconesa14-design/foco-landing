import { now } from "../game/clock";
import * as lux from "../game/luxury";
import { activeSeason, buySeasonReward, SEASON } from "../game/season";
import { t } from "../i18n";
import { luxIcon } from "./avatar";
import { hasIcon } from "./icons";
import { openLife } from "./lifePanel";
import { rewardLabel, showGrant } from "./metaPanels";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { fmtWait } from "./eventPanel";

/** Pantalla del evento de temporada (Halloween): caramelos, cómo se consiguen y su tienda exclusiva. */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

function paint(el: HTMLElement, html: string): boolean {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
}

export function openSeason(ctx: PanelCtx): void {
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head season-head"><span class="sicon">🎃</span><div><h3>${t("Halloween")}</h3><p class="muted" data-sub></p></div></div>
     <div class="season-candy"><span>🍬</span><b data-candy></b><small>${t("caramelos")}</small></div>
     <p class="small muted">${t("Toca los fantasmas 👻 que aparecen mientras juegas (x{n} con un anuncio). Las ventas también dan caramelos. Gástalos antes de que acabe: después desaparecen.", { n: SEASON.adMult })}</p>
     <h4 class="season-h">${t("Solo en Halloween: para tu personaje")}</h4>
     <div class="lux-grid" data-items></div>
     <h4 class="season-h">${t("Premios")}</h4>
     <div data-shop style="display:grid;gap:8px"></div>`,
    (el) => {
      const s = ctx.state();
      const n = now();
      const w = activeSeason(n);
      if (!w) {
        $(el, "[data-sub]").textContent = t("El evento ha terminado");
        return;
      }
      $(el, "[data-sub]").textContent = t("Termina en {time}", { time: fmtWait(w.end - n) });
      $(el, "[data-candy]").textContent = String(s.meta.season.candy);
      const items = lux.LUXURY.filter((i) => i.season === w.def.id);
      const html = items
        .map((i) => {
          const owned = lux.owns(s, i.id);
          const btn = owned
            ? `<button class="mini" data-show>✓ ${t("Ver en Mi vida")}</button>`
            : `<button class="buy" data-buy="${i.id}" ${s.meta.season.candy < (i.candy ?? 0) ? "disabled" : ""}><span>${t("Comprar")}</span><b>${i.candy} 🍬</b></button>`;
          return `<div class="lux-card seasonal ${owned ? "owned" : ""}"><div class="lux-ic">${luxIcon(i.id, hasIcon)}</div><b>${i.name}</b><small class="lux-pr">+${i.prestige} % ${t("ingresos")}</small><div class="lux-btns">${btn}</div></div>`;
        })
        .join("");
      const grid = $(el, "[data-items]");
      if (paint(grid, html)) {
        grid.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((b) => {
          b.onclick = () => {
            const item = lux.itemById(b.dataset.buy!)!;
            if (lux.buyLuxury(ctx.state(), item.id, now()) !== "ok") return ctx.fx("error");
            void ctx
              .celebrate({ icon: item.icon, title: t("¡Te has comprado {name}!", { name: item.name }), subtitle: t("Edición limitada de Halloween: después ya no se podrá conseguir."), color: "#ff8a2a" })
              .then(() => openLife(ctx));
          };
        });
        grid.querySelectorAll<HTMLButtonElement>("[data-show]").forEach((b) => (b.onclick = () => openLife(ctx)));
      }
      const shop = w.def.shop
        .map((r) => {
          const left = r.limit - (s.meta.season.bought[r.id] ?? 0);
          return `<div class="row"><span class="face">${rewardLabel(r.reward).icon}</span><div><b>${rewardLabel(r.reward).text}</b><span class="sub">${t("Quedan {n}", { n: left })}</span></div>
            <button class="buy" data-reward="${r.id}" ${left <= 0 || s.meta.season.candy < r.price ? "disabled" : ""}><span>${t("Canjear")}</span><b>${r.price} 🍬</b></button></div>`;
        })
        .join("");
      const shopEl = $(el, "[data-shop]");
      if (paint(shopEl, shop))
        shopEl.querySelectorAll<HTMLButtonElement>("[data-reward]").forEach((b) => {
          b.onclick = () => {
            const g = buySeasonReward(ctx.state(), b.dataset.reward!, now());
            if (!g) return ctx.fx("error");
            ctx.fx("chest", true);
            showGrant(ctx, g);
            sheet.update?.();
          };
        });
    },
  );
}
