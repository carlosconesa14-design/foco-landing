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
import { analytics } from "../platform/analytics";

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

/** Rellena {marcadores} de una frase ya traducida. */
const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/**
 * Cómo se llama y se cuenta la mecánica en cada negocio (la lógica es la misma por tipo: ver
 * src/game/twists.ts). Las frases llevan {marcadores} que se rellenan con `fill`.
 */
interface Flavor {
  icon: string;
  title: string;
  intro: string;
  // pedidos
  offer?: string;
  running?: string;
  done?: string;
  // visita (crítico)
  arrive?: string;
  tap?: string;
  leaves?: string;
  // hype
  meter?: string;
  viral?: string;
  viralBanner?: string;
  adLabel?: string;
  // investigación
  dataIcon?: string;
}

const FLAVORS = (): Record<string, Flavor> => ({
  // Madrid
  dropship: {
    icon: "📦", title: t("Pedidos urgentes"),
    intro: t("De vez en cuando llega un pedido con prisa: acéptalo y gana el dinero que pide antes de que acabe el tiempo. Si lo cumples, premio grande y diamantes. Si no, no pasa nada."),
    offer: t("Pedido urgente: {m} en {min} min"), running: t("Pedido urgente · {time}"), done: t("¡Pedido cumplido!"),
  },
  restaurant: {
    icon: "🧐", title: t("Críticos gastronómicos"),
    intro: t("A veces viene un crítico y quiere ver la cocina en marcha: toca las cocinas antes de que se vaya. Te deja propina y una estrella: cada estrella da +5 % de ventas en el restaurante para siempre (hasta 10)."),
    arrive: t("¡Crítico gastronómico! Toca las cocinas"), tap: t("Toca las cocinas {got}/{need}"), leaves: t("Un crítico se va en {time}"),
  },
  tiktok: {
    icon: "🔥", title: t("Hype"),
    intro: t("Cada venta y cada toque sube el hype del estudio, que baja solo si te paras. Cuando se llena: ¡directo viral! Ventas x3 durante un rato."),
    meter: t("Hype {n} %"), viral: t("¡Directo viral! Ventas x{n}"), viralBanner: t("¡Directo viral! Ventas x{n} durante {time}"), adLabel: t("Colaboración"),
  },
  ai: {
    icon: "🧠", title: t("Investigación"), dataIcon: "🧠",
    intro: t("Cada venta de la agencia da datos 🧠. Úsalos para investigar mejoras permanentes; la última ayuda a toda la ciudad."),
  },
  // Miami
  foodtruck: {
    icon: "🤳", title: t("Foodies famosos"),
    intro: t("A veces llega un foodie con miles de seguidores y quiere ver los food trucks a tope: tócalos antes de que se vaya. Te deja propina y una estrella: cada estrella da +5 % de ventas aquí para siempre (hasta 10)."),
    arrive: t("¡Un foodie famoso! Toca los food trucks"), tap: t("Toca los food trucks {got}/{need}"), leaves: t("El foodie se va en {time}"),
  },
  beachclub: {
    icon: "🎉", title: t("Ambiente"),
    intro: t("Cada venta y cada toque animan el club, y el ambiente baja si te paras. Cuando se llena: ¡fiesta en la playa! Ventas x3 durante un rato."),
    meter: t("Ambiente {n} %"), viral: t("¡Fiesta en la playa! Ventas x{n}"), viralBanner: t("¡Fiesta en la playa! Ventas x{n} durante {time}"), adLabel: t("Llamar a un DJ"),
  },
  yachts: {
    icon: "🛥️", title: t("Excursiones urgentes"),
    intro: t("De vez en cuando un grupo quiere salir ya a la bahía: acepta y gana el dinero que piden antes de que acabe el tiempo. Si lo cumples, premio grande y diamantes. Si no, no pasa nada."),
    offer: t("Excursión urgente: {m} en {min} min"), running: t("Excursión urgente · {time}"), done: t("¡Excursión cumplida!"),
  },
  realestate: {
    icon: "🔑", title: t("Clientes con prisa"),
    intro: t("A veces llega un comprador que quiere cerrar ya: acepta y gana el dinero que pide antes de que acabe el tiempo. Si lo cumples, premio grande y diamantes. Si no, no pasa nada."),
    offer: t("Venta exprés: {m} en {min} min"), running: t("Venta exprés · {time}"), done: t("¡Venta cerrada!"),
  },
  crypto: {
    icon: "⛏️", title: t("Minería"), dataIcon: "⛏️",
    intro: t("Cada operación mina bloques ⛏️. Úsalos para mejoras permanentes; la última ayuda a toda la ciudad."),
  },
  // Dubái
  supercars: {
    icon: "🏎️", title: t("Encargos VIP"),
    intro: t("Un jeque quiere una flota entera para ya: acepta y gana el dinero que pide antes de que acabe el tiempo. Si lo cumples, premio grande y diamantes. Si no, no pasa nada."),
    offer: t("Encargo VIP: {m} en {min} min"), running: t("Encargo VIP · {time}"), done: t("¡Encargo VIP cumplido!"),
  },
  hotel: {
    icon: "🕵️", title: t("Inspectores de estrellas"),
    intro: t("A veces llega un inspector de la guía y quiere ver el servicio en marcha: toca las suites antes de que se vaya. Te deja propina y una estrella: cada estrella da +5 % de ventas aquí para siempre (hasta 10)."),
    arrive: t("¡Inspector de estrellas! Toca las suites"), tap: t("Toca las suites {got}/{need}"), leaves: t("El inspector se va en {time}"),
  },
  safari: {
    icon: "📸", title: t("Fotos del safari"),
    intro: t("Cada excursión y cada toque suben las fotos compartidas, que bajan si te paras. Cuando se llena: ¡atardecer viral! Ventas x3 durante un rato."),
    meter: t("Fotos {n} %"), viral: t("¡Atardecer viral! Ventas x{n}"), viralBanner: t("¡Atardecer viral! Ventas x{n} durante {time}"), adLabel: t("Influencer de viajes"),
  },
  souk: {
    icon: "💍", title: t("Joyas a medida"),
    intro: t("Llega un cliente que quiere una joya a medida, y con prisa: acepta y gana el dinero que pide antes de que acabe el tiempo. Si lo cumples, premio grande y diamantes. Si no, no pasa nada."),
    offer: t("Joya a medida: {m} en {min} min"), running: t("Joya a medida · {time}"), done: t("¡Joya entregada!"),
  },
  tower: {
    icon: "📐", title: t("Ingeniería"), dataIcon: "📐",
    intro: t("Cada venta da planos 📐. Úsalos para mejoras permanentes de la obra; la última ayuda a toda la ciudad."),
  },
});

/** Textos del negocio, con los de Madrid de su mismo tipo como respaldo. */
function flavor(id: string): Required<Flavor> {
  const all = FLAVORS();
  const base: Record<tw.TwistKind, string> = { orders: "dropship", critic: "restaurant", hype: "tiktok", research: "ai" };
  const kind = tw.twistOf(id) ?? "orders";
  return { ...all.dropship, ...all.restaurant, ...all.tiktok, ...all.ai, ...all[base[kind]], ...(all[id] ?? {}) } as Required<Flavor>;
}

/** Lógica de las mecánicas (cada fotograma) y avisos. */
export function twistTick(ctx: PanelCtx, sales: SaleEvent[], dt: number): void {
  const s = ctx.state();
  if (!tw.twistsStarted(s)) return void (taps = {});
  const n = clockNow();
  const here = s.view.scene === "business" ? s.view.id : null;
  for (const [id, b] of Object.entries(s.biz)) {
    const kind = tw.twistOf(id);
    if (!kind || !b.owned) continue;
    if (kind === "hype") {
      if (tw.hypeTick(s, id, n, dt, salesOf(sales, id), taps[id] ?? 0)) {
        analytics.track("twist", { what: "viral", ad: false, biz: id });
        ctx.fx("milestone", true);
        ctx.banner(flavor(id).icon, fill(flavor(id).viralBanner, { n: tw.TW.viralMult, time: fmtTime(tw.TW.viralSec) }));
      }
    } else if (kind === "research") {
      tw.addData(s, id, salesOf(sales, id));
    } else if (kind === "orders") {
      const ev = tw.orderTick(s, id, n, businessRate(s, id, n), here === id);
      if (ev === "offered") ctx.fx("tap");
      else if (ev === "done") {
        ctx.fx("milestone", true);
        ctx.banner(flavor(id).icon, `${flavor(id).done} ${t("Cobra tu premio")}`);
      } else if (ev === "failed") ctx.toast(t("No llegó a tiempo. ¡Vendrá otro!"));
    } else if (kind === "critic") {
      if (tw.criticTick(s, id, n, here === id) === "arrived") {
        ctx.fx("tap");
        ctx.banner(flavor(id).icon, flavor(id).arrive);
      }
      if (tw.criticTaps(s, id, taps[id] ?? 0, n)) void serve(ctx, id, false);
    }
  }
  taps = {};
}

/** Explicación la primera vez que se entra en un negocio con mecánica propia: ver `flavor`. */

export function maybeIntro(ctx: PanelCtx, open: (title: string, icon: string, text: string, done: () => void) => void): void {
  const s = ctx.state();
  if (s.view.scene !== "business") return;
  const id = s.view.id;
  const kind = tw.twistOf(id);
  if (!kind || tw.twist(s, id).intro) return;
  const f = flavor(id);
  open(f.title, f.icon, f.intro, () => (tw.twist(s, id).intro = true));
}

/** Tarjeta del negocio que estás viendo. `null` si no tiene mecánica. */
export function twistCardHtml(s: GameState): string | null {
  if (s.view.scene !== "business") return null;
  const id = s.view.id;
  const kind = tw.twistOf(id);
  if (!kind || !s.biz[id]?.owned || !tw.twistsStarted(s)) return null;
  const n = clockNow();
  const st = tw.twist(s, id);
  const f = flavor(id);
  const card = (cls: string, icon: string, title: string, sub: string, buttons = "", bar = -1) =>
    `<div class="tw-card ${cls}"><span class="tw-ic">${icon}</span><span class="tw-txt"><b>${title}</b><small>${sub}</small>${bar >= 0 ? `<i class="tw-bar"><i style="width:${Math.round(bar * 100)}%"></i></i>` : ""}</span><span class="tw-btns">${buttons}</span></div>`;
  if (kind === "orders") {
    const o = st.order;
    // Pantalla limpia: la tarjeta solo sale cuando hay algo que hacer.
    if (!o) return null;
    if (o.done)
      return card("tw-on", f.icon, f.done, t("Premio: {m} y {g}", { m: money(o.reward), g: `${tw.TW.orderGems} ${gem()}` }),
        `<button class="ad-btn" data-tw="order2"><span class="play"></span>x2</button><button class="claim" data-tw="order">${t("Cobrar")}</button>`);
    if (!o.deadline)
      return card("tw-offer", f.icon, fill(f.offer, { m: money(o.target), min: tw.TW.orderMinutes }), t("Premio: {m} y {g} · espera {time}", { m: money(o.reward), g: `${tw.TW.orderGems} ${gem()}`, time: fmtTime((o.offerUntil - n) / 1000) }),
        `<button class="claim" data-tw="accept">${t("Aceptar")}</button>`);
    const p = tw.orderProgress(s, id);
    return card("tw-on", f.icon, fill(f.running, { time: fmtTime(Math.max(0, o.deadline - n) / 1000) }), `${money(s.biz[id].earned - o.base)} / ${money(o.target)}`, "", p);
  }
  if (kind === "critic") {
    const c = st.critic;
    if (!c) return null;
    return card("tw-offer", f.icon, fill(f.tap, { got: c.got, need: c.need }), fill(f.leaves, { time: fmtTime(Math.max(0, c.until - n) / 1000) }),
      `<button class="ad-btn" data-tw="criticAd"><span class="play"></span>${t("Atender ya")}</button>`, c.got / c.need);
  }
  if (kind === "hype") {
    if (st.viralEnd > n) return card("tw-viral", f.icon, fill(f.viral, { n: tw.TW.viralMult }), fmtTime((st.viralEnd - n) / 1000), "", (st.viralEnd - n) / (tw.TW.viralSec * 1000));
    if (tw.hypeRestUntil(s, id, n)) return null;
    return card("tw-idle", f.icon, fill(f.meter, { n: Math.floor(st.hype) }), t("Vende y toca para llenarlo"),
      tw.hypeAdReady(s, id, n) ? `<button class="ad-btn" data-tw="hype"><span class="play"></span>${f.adLabel}</button>` : "", st.hype / 100);
  }
  const next = tw.nextResearch(s, id);
  if (!next || st.data < next.cost) return null;
  return card("tw-offer", f.icon, `${fmt(st.data)} ${f.dataIcon}`,
    t("Siguiente: {icon} {name} · {cost}", { icon: next.icon, name: researchName(next), cost: `${fmt(next.cost)} ${f.dataIcon}` }),
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
    analytics.track("twist", { what: "order", ad: act === "order2", biz: id });
    earn(ctx.state(), r.money);
    ctx.fx("gems", true);
    ctx.banner(flavor(id).icon, t("+{m} y {g}", { m: money(r.money), g: `${r.gems} 💎` }));
  } else if (act === "criticAd") {
    if (!(await ctx.watchAd("critic_now"))) return;
    await serve(ctx, id, true);
  } else if (act === "hype") {
    if (!(await ctx.watchAd("hype_collab"))) return;
    if (tw.hypeAd(ctx.state(), id, clockNow())) {
      analytics.track("twist", { what: "viral", ad: true, biz: id });
      ctx.fx("milestone", true);
      ctx.banner(flavor(id).icon, fill(flavor(id).viral, { n: tw.TW.viralMult }));
    }
  } else if (act === "research") openResearch(ctx, id);
}

/** Atiende al crítico (al completar los toques o con un anuncio): estrella y propina. */
async function serve(ctx: PanelCtx, id: string, force: boolean): Promise<void> {
  const st = ctx.state();
  const rate = businessRate(st, id, clockNow());
  const r = tw.serveCritic(st, id, clockNow(), force);
  if (!r) return ctx.fx("error");
  analytics.track("twist", { what: "critic", ad: force, stars: tw.twist(st, id).stars, biz: id });
  const tip = rate * tw.TW.criticTipMin * 60;
  earn(st, tip);
  ctx.fx("milestone", true);
  ctx.banner("⭐", r.star ? t("¡Nueva estrella! +5 % ventas para siempre · propina {m}", { m: money(tip) }) : t("¡Le ha encantado! Propina {m}", { m: money(tip) }));
}

export function openResearch(ctx: PanelCtx, id: string): void {
  const f = flavor(id);
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${f.icon}</span><div><h3>${f.title}</h3><p class="muted" data-sub></p></div></div>
     <div data-list style="display:grid;gap:8px"></div>
     <p class="small muted">${t("Cada venta da 1 {icon}. Las mejoras son para siempre: no se pierden al salir a bolsa.", { icon: f.dataIcon })}</p>`,
    (el) => {
      const s = ctx.state();
      const st = tw.twist(s, id);
      el.querySelector("[data-sub]")!.textContent = `${fmt(st.data)} ${f.dataIcon}`;
      const html = tw.RESEARCH.map((r, i) => {
        const done = i < st.research;
        const next = i === st.research;
        const btn = done ? `<button class="mini" disabled>✓</button>` : next ? `<button class="buy" data-buy ${st.data < r.cost ? "disabled" : ""}><span>${t("Investigar")}</span><b>${fmt(r.cost)} ${f.dataIcon}</b></button>` : `<button class="mini" disabled>🔒 ${fmt(r.cost)}</button>`;
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
            analytics.track("twist", { what: "research", level: tw.twist(ctx.state(), id).research, biz: id });
            ctx.fx("milestone", true);
            ctx.banner("🧠", t("¡Investigación completada!"));
            sheet.update?.();
          };
      }
    },
  );
}
