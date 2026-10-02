import { now as clockNow } from "../game/clock";
import { bizDef, businessRate, earn } from "../game/economy";
import { fmt, fmtTime } from "../game/format";
import type { SaleEvent } from "../game/economy";
import type { GameState } from "../game/state";
import * as tw from "../game/twists";
import { money, t } from "../i18n";
import { gem } from "./icons";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";

/**
 * Interfaz de las mecánicas de cada negocio (src/game/twists.ts): una tarjeta encima de la barra
 * de la cadena en el negocio que estás viendo, la explicación la primera vez y el panel de
 * investigación. La lógica se llama desde aquí cada fotograma (no desde la economía, así el bot de
 * equilibrado no la usa).
 */

let taps: Record<string, number> = {};

/** Un toque del jugador en un negocio (para el hype). */
export function twistTap(bizId: string): void {
  taps[bizId] = (taps[bizId] ?? 0) + 1;
}

const salesOf = (sales: SaleEvent[], id: string) => sales.filter((e) => e.biz === id).length;

/** Lógica de las mecánicas (cada fotograma) y avisos. */
export function twistTick(ctx: PanelCtx, sales: SaleEvent[], dt: number): void {
  const s = ctx.state();
  const n = clockNow();
  const here = s.view.scene === "business" ? s.view.id : null;
  for (const [id, b] of Object.entries(s.biz)) {
    const kind = tw.twistOf(id);
    if (!kind || !b.owned) continue;
    if (kind === "hype") {
      if (tw.hypeTick(s, id, n, dt, salesOf(sales, id), taps[id] ?? 0)) {
        ctx.fx("milestone", true);
        ctx.banner("🔴", t("¡Directo viral! Ventas x{n} durante {time}", { n: tw.TW.viralMult, time: fmtTime(tw.TW.viralSec) }));
      }
    } else if (kind === "research") {
      tw.addData(s, id, salesOf(sales, id));
    } else if (kind === "orders") {
      const ev = tw.orderTick(s, id, n, businessRate(s, id, n), here === id);
      if (ev === "offered") ctx.fx("tap");
      else if (ev === "done") {
        ctx.fx("milestone", true);
        ctx.banner("📦", t("¡Pedido urgente cumplido! Cobra tu premio"));
      } else if (ev === "failed") ctx.toast(t("El pedido urgente no llegó a tiempo. ¡Vendrá otro!"));
    } else if (kind === "critic") {
      if (tw.criticTick(s, id, n, here === id) === "arrived") {
        ctx.fx("tap");
        ctx.banner("🧐", t("¡Crítico gastronómico! Toca las cocinas"));
      }
      if (tw.criticTaps(s, id, taps[id] ?? 0, n)) void serve(ctx, id, false);
    }
  }
  taps = {};
}

/** Explicación la primera vez que se entra en un negocio con mecánica propia. */
const INTRO = (): Record<tw.TwistKind, { icon: string; title: string; text: string }> => ({
  orders: { icon: "📦", title: t("Pedidos urgentes"), text: t("De vez en cuando llega un pedido con prisa: acéptalo y gana el dinero que pide antes de que acabe el tiempo. Si lo cumples, premio grande y diamantes. Si no, no pasa nada.") },
  critic: { icon: "🧐", title: t("Críticos gastronómicos"), text: t("A veces viene un crítico y quiere ver la cocina en marcha: toca las cocinas antes de que se vaya. Te deja propina y una estrella: cada estrella da +5 % de ventas en el restaurante para siempre (hasta 10).") },
  hype: { icon: "🔥", title: t("Hype"), text: t("Cada venta y cada toque sube el hype del estudio, que baja solo si te paras. Cuando se llena: ¡directo viral! Ventas x3 durante un rato.") },
  research: { icon: "🧠", title: t("Investigación"), text: t("Cada venta de la agencia da datos 🧠. Úsalos para investigar mejoras permanentes; la última ayuda a toda la ciudad.") },
});

export function maybeIntro(ctx: PanelCtx, open: (title: string, icon: string, text: string, done: () => void) => void): void {
  const s = ctx.state();
  if (s.view.scene !== "business") return;
  const id = s.view.id;
  const kind = tw.twistOf(id);
  if (!kind || tw.twist(s, id).intro) return;
  const i = INTRO()[kind];
  open(i.title, i.icon, i.text, () => (tw.twist(s, id).intro = true));
}

/** Tarjeta del negocio que estás viendo. `null` si no tiene mecánica. */
export function twistCardHtml(s: GameState): string | null {
  if (s.view.scene !== "business") return null;
  const id = s.view.id;
  const kind = tw.twistOf(id);
  if (!kind || !s.biz[id]?.owned) return null;
  const n = clockNow();
  const st = tw.twist(s, id);
  const card = (cls: string, icon: string, title: string, sub: string, buttons = "", bar = -1) =>
    `<div class="tw-card ${cls}"><span class="tw-ic">${icon}</span><span class="tw-txt"><b>${title}</b><small>${sub}</small>${bar >= 0 ? `<i class="tw-bar"><i style="width:${Math.round(bar * 100)}%"></i></i>` : ""}</span><span class="tw-btns">${buttons}</span></div>`;
  if (kind === "orders") {
    const o = st.order;
    if (!o) return card("tw-idle", "📦", t("Pedidos urgentes"), t("El próximo pedido llega pronto"));
    if (o.done)
      return card("tw-on", "📦", t("¡Pedido cumplido!"), t("Premio: {m} y {g}", { m: money(o.reward), g: `${tw.TW.orderGems} ${gem()}` }),
        `<button class="ad-btn" data-tw="order2"><span class="play"></span>x2</button><button class="claim" data-tw="order">${t("Cobrar")}</button>`);
    if (!o.deadline)
      return card("tw-offer", "📦", t("Pedido urgente: {m} en {min} min", { m: money(o.target), min: tw.TW.orderMinutes }), t("Premio: {m} y {g} · espera {time}", { m: money(o.reward), g: `${tw.TW.orderGems} ${gem()}`, time: fmtTime((o.offerUntil - n) / 1000) }),
        `<button class="claim" data-tw="accept">${t("Aceptar")}</button>`);
    const p = tw.orderProgress(s, id);
    return card("tw-on", "📦", t("Pedido urgente · {time}", { time: fmtTime(Math.max(0, o.deadline - n) / 1000) }), `${money(s.biz[id].earned - o.base)} / ${money(o.target)}`, "", p);
  }
  if (kind === "critic") {
    const c = st.critic;
    const rep = t("Reputación {n}/{max} · +{pct} % ventas", { n: st.stars, max: tw.TW.maxStars, pct: Math.round(st.stars * tw.TW.starBonus * 100) });
    if (!c) return card("tw-idle", "⭐".repeat(Math.min(3, Math.max(1, Math.ceil(st.stars / 4)))), t("Reputación"), rep);
    return card("tw-offer", "🧐", t("Toca las cocinas {got}/{need}", { got: c.got, need: c.need }), t("Un crítico se va en {time}", { time: fmtTime(Math.max(0, c.until - n) / 1000) }),
      `<button class="ad-btn" data-tw="criticAd"><span class="play"></span>${t("Atender ya")}</button>`, c.got / c.need);
  }
  if (kind === "hype") {
    if (st.viralEnd > n) return card("tw-viral", "🔴", t("¡Directo viral! Ventas x{n}", { n: tw.TW.viralMult }), fmtTime((st.viralEnd - n) / 1000), "", (st.viralEnd - n) / (tw.TW.viralSec * 1000));
    const rest = tw.hypeRestUntil(s, id, n);
    if (rest) return card("tw-idle", "😴", t("El público descansa"), fmtTime((rest - n) / 1000),
      tw.hypeAdReady(s, id, n) ? `<button class="ad-btn" data-tw="hype"><span class="play"></span>${t("Colaboración")}</button>` : "", 0);
    return card("tw-idle", "🔥", t("Hype {n} %", { n: Math.floor(st.hype) }), t("Vende y toca para llenarlo"),
      tw.hypeAdReady(s, id, n) ? `<button class="ad-btn" data-tw="hype"><span class="play"></span>${t("Colaboración")}</button>` : "", st.hype / 100);
  }
  const next = tw.nextResearch(s, id);
  return card(next && st.data >= next.cost ? "tw-offer" : "tw-idle", "🧠", t("{n} datos", { n: fmt(st.data) }),
    next ? t("Siguiente: {icon} {name} · {cost} 🧠", { icon: next.icon, name: researchName(next), cost: fmt(next.cost) }) : t("Investigación completa"),
    `<button class="claim" data-tw="research">${t("Investigar")}</button>`, next ? Math.min(1, st.data / next.cost) : 1);
}

const researchName = (r: (typeof tw.RESEARCH)[number]) =>
  r.kind === "city" ? t("+{pct} % ventas en toda la ciudad", { pct: Math.round(r.value * 100) })
  : r.kind === "sale" ? t("+{pct} % ventas", { pct: Math.round(r.value * 100) })
  : r.kind === "prod" ? t("+{pct} % producción", { pct: Math.round(r.value * 100) })
  : t("+{pct} % transporte y venta", { pct: Math.round(r.value * 100) });

/** Botones de la tarjeta. */
export async function twistAction(ctx: PanelCtx, act: string): Promise<void> {
  const s = ctx.state();
  if (s.view.scene !== "business") return;
  const id = s.view.id;
  const n = clockNow();
  if (act === "accept") {
    if (tw.acceptOrder(s, id, n)) ctx.fx("upgrade");
  } else if (act === "order" || act === "order2") {
    if (act === "order2" && !(await ctx.watchAd("order_x2"))) return;
    const r = tw.claimOrder(ctx.state(), id, clockNow(), act === "order2");
    if (!r) return;
    earn(ctx.state(), r.money);
    ctx.fx("gems", true);
    ctx.banner("📦", t("+{m} y {g}", { m: money(r.money), g: `${r.gems} 💎` }));
  } else if (act === "criticAd") {
    if (!(await ctx.watchAd("critic_now"))) return;
    await serve(ctx, id, true);
  } else if (act === "hype") {
    if (!(await ctx.watchAd("hype_collab"))) return;
    if (tw.hypeAd(ctx.state(), id, clockNow())) {
      ctx.fx("milestone", true);
      ctx.banner("🔴", t("¡Colaboración! Directo viral: ventas x{n}", { n: tw.TW.viralMult }));
    }
  } else if (act === "research") openResearch(ctx, id);
}

/** Atiende al crítico (al completar los toques o con un anuncio): estrella y propina. */
async function serve(ctx: PanelCtx, id: string, force: boolean): Promise<void> {
  const st = ctx.state();
  const rate = businessRate(st, id, clockNow());
  const r = tw.serveCritic(st, id, clockNow(), force);
  if (!r) return ctx.fx("error");
  const tip = rate * tw.TW.criticTipMin * 60;
  earn(st, tip);
  ctx.fx("milestone", true);
  ctx.banner("⭐", r.star ? t("¡Nueva estrella! +5 % ventas para siempre · propina {m}", { m: money(tip) }) : t("¡Crítico encantado! Propina {m}", { m: money(tip) }));
}

export function openResearch(ctx: PanelCtx, id: string): void {
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🧠</span><div><h3>${t("Investigación")}</h3><p class="muted" data-sub></p></div></div>
     <div data-list style="display:grid;gap:8px"></div>
     <p class="small muted">${t("Cada venta de la agencia da 1 dato. Las mejoras son para siempre: no se pierden al salir a bolsa.")}</p>`,
    (el) => {
      const s = ctx.state();
      const st = tw.twist(s, id);
      el.querySelector("[data-sub]")!.textContent = t("{n} datos", { n: fmt(st.data) });
      const html = tw.RESEARCH.map((r, i) => {
        const done = i < st.research;
        const next = i === st.research;
        const btn = done ? `<button class="mini" disabled>✓</button>` : next ? `<button class="buy" data-buy ${st.data < r.cost ? "disabled" : ""}><span>${t("Investigar")}</span><b>${fmt(r.cost)} 🧠</b></button>` : `<button class="mini" disabled>🔒 ${fmt(r.cost)}</button>`;
        return `<div class="row ${done ? "done" : ""}"><span class="face">${r.icon}</span><div><b>${researchName(r)}</b><span class="sub">${r.kind === "city" ? t("Todos los negocios de la ciudad") : bizDef(id).name}</span></div>${btn}</div>`;
      }).join("");
      const list = el.querySelector<HTMLElement>("[data-list]")!;
      if (list.dataset.html !== html) {
        list.dataset.html = html;
        list.innerHTML = html;
        const b = list.querySelector<HTMLButtonElement>("[data-buy]");
        if (b)
          b.onclick = () => {
            if (!tw.buyResearch(ctx.state(), id)) return ctx.fx("error");
            ctx.fx("milestone", true);
            ctx.banner("🧠", t("¡Investigación completada!"));
            sheet.update?.();
          };
      }
    },
  );
}
