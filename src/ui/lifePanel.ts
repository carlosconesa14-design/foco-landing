import { now } from "../game/clock";
import { fmt, fmtTime } from "../game/format";
import * as lux from "../game/luxury";
import type { LuxuryCat } from "../game/luxury";
import { money, t } from "../i18n";
import { avatarSvg, luxIcon } from "./avatar";
import { gem, hasIcon } from "./icons";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { seasonOpen } from "../game/season";

/** «Mi vida»: el personaje con lo que se ha comprado y la tienda de lujo por colecciones. */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

function paint(el: HTMLElement, html: string): boolean {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
}

let lastTab: LuxuryCat = "outfit";

/** Escena del personaje: su casa al fondo, el coche, la mascota y el capricho de lujo en el cielo. */
function stageHtml(shown: Partial<Record<LuxuryCat, string>>): string {
  const home = shown.home ?? "parents";
  const slot = (cat: LuxuryCat, cls: string) => (shown[cat] ? `<div class="st-${cls}">${luxIcon(shown[cat]!, hasIcon)}</div>` : "");
  return `<div class="life-stage home-${home}">
    <div class="st-home">${luxIcon(home, hasIcon)}</div>
    ${slot("extreme", "sky")}
    ${slot("car", "car")}
    <div class="st-avatar">${avatarSvg(shown, hasIcon)}</div>
    ${slot("pet", "pet")}
  </div>`;
}

export function openLife(ctx: PanelCtx): void {
  let tab = lastTab;
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🛍️</span><div><h3>${t("Mi vida")}</h3><p class="muted" data-sub></p></div></div>
     <div data-stage></div>
     <div data-deal></div>
     <div class="tabs life-tabs" data-tabs>${lux.LUXURY_CATS.map((c) => `<button class="tabbtn" data-tab="${c.id}" aria-label="${c.name}">${c.icon}</button>`).join("")}</div>
     <div data-coll class="small muted"></div>
     <div class="lux-grid" data-items></div>
     <p class="small muted">${t("Lo que compras es para siempre: no se pierde al salir a bolsa ni al cambiar de ciudad. Cada punto de prestigio da +1 % de ingresos y cada colección completa, +10 %.")}</p>`,
    (el) => {
      const s = ctx.state();
      const n = now();
      const shown = lux.shownItems(s, n);
      const pr = lux.prestige(s, n);
      $(el, "[data-sub]").innerHTML = t("Prestigio {p} · ingresos x{m}", { p: pr, m: fmt(lux.luxuryMult(s, n)) });
      paint($(el, "[data-stage]"), stageHtml(shown));

      // Oferta del día y prueba en curso
      const deal = lux.dailyDeal(s, n);
      const trial = lux.activeTrial(s, n);
      let dealHtml = "";
      if (trial) {
        const it = lux.itemById(trial)!;
        dealHtml += `<div class="lux-banner trial">${luxIcon(trial, hasIcon)}<span><b>${t("Probando: {name}", { name: it.name })}</b><small>${t("Te queda {time}. ¡Cómpralo para quedártelo!", { time: fmtTime((s.meta.luxury.trial!.until - n) / 1000) })}</small></span></div>`;
      }
      if (deal) {
        const unlocked = lux.dealUnlocked(s, n);
        dealHtml += `<div class="lux-banner deal">${luxIcon(deal.id, hasIcon)}<span><b>${t("Oferta del día: {name}", { name: deal.name })}</b><small>${unlocked ? t("Hoy a mitad de precio: {m}", { m: money(lux.priceOf(s, deal, n)) }) : t("−{pct} % viendo un anuncio", { pct: lux.LUX.dealOff * 100 })}</small></span>
          ${unlocked ? `<button class="buy" data-buy="${deal.id}" ${s.cash < lux.priceOf(s, deal, n) ? "disabled" : ""}><span>${t("Comprar")}</span><b>${money(lux.priceOf(s, deal, n))}</b></button>` : `<button class="ad-btn" data-deal><span class="play"></span>−${lux.LUX.dealOff * 100} %</button>`}</div>`;
      }
      const dealBox = $(el, "[data-deal]");
      if (paint(dealBox, dealHtml)) wire(dealBox);

      el.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
      const open = seasonOpen(s, n);
      // Los de temporada solo se ven durante su evento (o si ya los tienes).
      const items = lux.LUXURY.filter((i) => i.cat === tab && (!i.season || open || lux.owns(s, i.id)));
      const paid = lux.collectionItems(tab);
      const have = paid.filter((i) => lux.owns(s, i.id)).length;
      const cat = lux.LUXURY_CATS.find((c) => c.id === tab)!;
      $(el, "[data-coll]").textContent = `${cat.name}: ${have}/${paid.length}${have === paid.length ? " · " + t("¡Colección completa! +10 %") : " · " + t("Complétala: +10 % de ingresos")}`;
      const trialsLeft = lux.trialsLeft(s, n);
      const html = items
        .map((i) => {
          const owned = lux.owns(s, i.id);
          const on = shown[i.cat] === i.id;
          const price = lux.priceOf(s, i, n);
          let btn: string;
          if (owned) btn = on ? `<button class="mini" disabled>✓ ${t("En uso")}</button>` : `<button class="mini" data-equip="${i.id}">${t("Usar")}</button>`;
          else if (i.candy) btn = `<button class="buy" data-buy="${i.id}" ${s.meta.season.candy < i.candy ? "disabled" : ""}><span>${t("Comprar")}</span><b>${i.candy} 🍬</b></button>`;
          else if (i.gems) btn = `<button class="buy" data-buy="${i.id}" ${s.meta.gems < i.gems ? "disabled" : ""}><span>${t("Comprar")}</span><b>${i.gems} ${gem()}</b></button>`;
          else
            btn = `<button class="buy" data-buy="${i.id}" ${s.cash < price ? "disabled" : ""}><span>${t("Comprar")}</span><b>${money(price)}</b></button>` +
              (trialsLeft > 0 && trial !== i.id ? `<button class="ad-btn mini" data-trial="${i.id}"><span class="play"></span>${t("Probar 1 h")}</button>` : "");
          const tag = i.prestige ? `<small class="lux-pr">+${i.prestige} % ${t("ingresos")}</small>` : `<small class="lux-pr">${t("De serie")}</small>`;
          const seasonTag = i.season ? `<small class="lux-season">🎃 ${t("Edición Halloween")}</small>` : "";
          return `<div class="lux-card ${owned ? "owned" : ""} ${on ? "on" : ""} ${i.gems ? "exclusive" : ""} ${i.season ? "seasonal" : ""}">
            <div class="lux-ic">${luxIcon(i.id, hasIcon)}</div><b>${i.name}</b>${seasonTag}${tag}<div class="lux-btns">${btn}</div></div>`;
        })
        .join("");
      const grid = $(el, "[data-items]");
      if (paint(grid, html)) wire(grid);
    },
  );

  function wire(box: HTMLElement): void {
    box.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.buy!;
        const item = lux.itemById(id)!;
        const res = lux.buyLuxury(ctx.state(), id, now());
        if (res !== "ok") {
          ctx.fx("error");
          ctx.toast(res === "gems" ? t("Te faltan diamantes") : res === "candy" ? t("Te faltan caramelos") : t("No tienes suficiente dinero"));
          return;
        }
        if (item.gems || item.candy || item.price >= 1e9) {
          void ctx.celebrate({
            icon: item.icon,
            title: t("¡Te has comprado {name}!", { name: item.name }),
            subtitle: t("Tu personaje ya lo luce. +{n} de prestigio: tus ingresos suben un {n} % para siempre.", { n: item.prestige }),
            color: "#f5c542",
          }).then(() => openLife(ctx)); // vuelve a «Mi vida» para verlo puesto
          return;
        } else {
          ctx.fx("unlock", true);
          ctx.banner(item.icon, t("¡Nuevo: {name}! +{n} % de ingresos", { name: item.name, n: item.prestige }));
        }
        sheet.update?.();
      };
    });
    box.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((b) => {
      b.onclick = () => {
        if (lux.equipLuxury(ctx.state(), b.dataset.equip!)) ctx.fx("upgrade");
        sheet.update?.();
      };
    });
    box.querySelectorAll<HTMLButtonElement>("[data-trial]").forEach((b) => {
      b.onclick = async () => {
        if (!(await ctx.watchAd("lux_trial"))) return;
        if (lux.startTrial(ctx.state(), b.dataset.trial!, now())) {
          ctx.fx("gems", true);
          ctx.banner("✨", t("¡Pruébalo durante {min} min!", { min: lux.LUX.trialMin }));
        }
        sheet.update?.();
      };
    });
    const deal = box.querySelector<HTMLButtonElement>("[data-deal]");
    if (deal)
      deal.onclick = async () => {
        if (!(await ctx.watchAd("lux_deal"))) return;
        if (lux.unlockDeal(ctx.state(), now())) ctx.fx("gems", true);
        sheet.update?.();
      };
  }

  sheet.el.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => {
    b.onclick = () => {
      tab = lastTab = b.dataset.tab as LuxuryCat;
      sheet.update?.();
    };
  });
}
