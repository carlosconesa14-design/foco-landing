import { now } from "../game/clock";
import type { Placement } from "../ads";
import type { Sfx } from "../audio/sound";
import * as act from "../game/actions";
import { CHAIN, CONFIG, LIFE } from "../game/data";
import {
  bizDef,
  bizTier,
  businessRate,
  chainRates,
  floorRate,
  floorUnlockCost,
  lifeIndex,
  managerCost,
  nextMilestone,
  saleCap,
  saleWalk,
  sharesToGain,
  stationLevel,
  transportCap,
  transportSpeed,
  upgradeQuote,
  type Station,
} from "../game/economy";
import { fmt } from "../game/format";
import { cityDef, type BuyMode, type GameState, type View } from "../game/state";
import type { Celebration } from "./celebrate";
import { bizIcon, icon } from "./icons";
import { analytics, minutesSinceInstall } from "../platform/analytics";
import { closeSheet, openSheet } from "./sheet";
import { money, t } from "../i18n";

/** Lo que los paneles necesitan del controlador del juego. */
export interface PanelCtx {
  root: HTMLElement;
  state(): GameState;
  replaceState(s: GameState): void;
  watchAd(p: Placement): Promise<boolean>;
  toast(msg: string): void;
  goTo(view: View): void;
  wipe(): Promise<void>;
  /** Efecto de sonido y vibración; `strong` para compras y premios. */
  fx(name: Sfx, strong?: boolean): void;
  /** Aplica los ajustes de sonido y vibración guardados en el estado. */
  applySettings(): void;
  /** Celebración a pantalla completa (logros grandes). */
  celebrate(c: Celebration): Promise<void>;
  /** Banda dorada (logros medianos). */
  banner(icon: string, text: string): void;
  /** Texto que sube desde un elemento. */
  floatAt(anchor: Element, text: string): void;
  /** Anuncio de prueba sin recompensa (diagnóstico). */
  testAd(): Promise<boolean>;
  /** Guarda y recarga la app (cambio de idioma). */
  reload(): void;
}

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

const buyModes = (s: GameState) =>
  `<div class="seg" data-seg>${([1, 10, 50, "max"] as BuyMode[])
    .map((m) => `<button data-mode="${m}" aria-pressed="${s.buyMode === m}">${m === "max" ? t("Máx") : "x" + m}</button>`)
    .join("")}</div>`;

function wireBuyModes(el: HTMLElement, ctx: PanelCtx): void {
  el.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => {
    b.onclick = () => {
      const s = ctx.state();
      s.buyMode = (b.dataset.mode === "max" ? "max" : Number(b.dataset.mode)) as BuyMode;
      el.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    };
  });
}

/* ---------- Mejora de una parte de la cadena ---------- */

function statRows(s: GameState, id: string, st: Station, qty: number): string {
  const def = bizDef(id);
  const lvl = stationLevel(s.biz[id], st);
  const row = (name: string, now: string, next: string) =>
    `<div class="stat"><span>${name}</span><b>${now} <i class="up">→ ${next}</i></b></div>`;
  if (st.kind === "floor")
    return row(t("Producción"), `${money(floorRate(def, st.index, lvl))}/s`, `${money(floorRate(def, st.index, lvl + qty))}/s`);
  if (st.kind === "transport")
    return (
      row(t("Capacidad por viaje"), money(transportCap(def, lvl)), money(transportCap(def, lvl + qty))) +
      row(t("Velocidad"), `${transportSpeed(lvl).toFixed(2)} ${t("plantas/s")}`, `${transportSpeed(lvl + qty).toFixed(2)}`)
    );
  return (
    row(t("Capacidad por viaje"), money(saleCap(def, lvl)), money(saleCap(def, lvl + qty))) +
    row(t("Tiempo de ida"), `${saleWalk(lvl).toFixed(2)} s`, `${saleWalk(lvl + qty).toFixed(2)} s`)
  );
}

function chainSummary(s: GameState, id: string): string {
  const r = chainRates(bizDef(id), s.biz[id], false);
  const cell = (key: typeof r.bottleneck, name: string, v: number) =>
    `<div class="link ${r.bottleneck === key ? "slow" : ""}"><span>${name}</span><b>${money(v)}/s</b></div>`;
  return `<div class="chainsum">${cell("production", t("Producción"), r.production)}<i>›</i>${cell("transport", t("Transporte"), r.transport)}<i>›</i>${cell("sale", t("Venta"), r.sale)}</div>
    <p class="small muted">${t("Tu negocio vende al ritmo de la parte en rojo. Mejórala primero.")}</p>`;
}

export function openStationSheet(ctx: PanelCtx, id: string, st: Station): void {
  const s0 = ctx.state();
  const def = bizDef(id);
  const icon = st.kind === "floor" ? def.worker : st.kind === "transport" ? def.transportIcon : def.saleWorker;
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${icon}</span><div><h3>${act.stationName(id, st)}</h3><p class="muted" data-lvl></p></div></div>
     <div data-stats></div>
     <p class="small muted" data-ms></p>
     <div class="buyrow">${buyModes(s0)}<button class="buy big" data-up><span data-uq></span><b data-uc></b></button></div>
     <div class="mgrbox" data-mgr></div>
     <div data-chain></div>`,
    (el) => {
      const s = ctx.state();
      const b = s.biz[id];
      const lvl = stationLevel(b, st);
      const q = upgradeQuote(s, id, st);
      $(el, "[data-lvl]").textContent = t("Nivel {n}", { n: lvl });
      $(el, "[data-stats]").innerHTML = statRows(s, id, st, q.qty);
      const nm = nextMilestone(lvl);
      $(el, "[data-ms]").textContent = nm ? t("Nivel {n}: rendimiento x2 (te faltan {left})", { n: nm, left: nm - lvl }) : t("Rendimiento máximo");
      $(el, "[data-uq]").textContent = t("Mejorar x{n}", { n: q.qty });
      $(el, "[data-uc]").textContent = money(q.cost);
      $<HTMLButtonElement>(el, "[data-up]").disabled = s.cash < q.cost;
      const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
      const mc = managerCost(def, st);
      const mgr = $(el, "[data-mgr]");
      const html = target.managed
        ? `<span class="mface">👔</span><div><b>${t("Gerente contratado")}</b><p class="small muted">${t("Trabaja solo, también con la app cerrada.")}</p></div>`
        : `<span class="mface">👔</span><div><b>${t("Contrata un gerente")}</b><p class="small muted">${t("Sin gerente tienes que tocar para cada viaje.")}</p></div><button class="buy" data-hire ${s.cash < mc ? "disabled" : ""}><span>${t("Contratar")}</span><b>${money(mc)}</b></button>`;
      if (mgr.dataset.html !== html) {
        mgr.innerHTML = html;
        mgr.dataset.html = html;
        const hire = mgr.querySelector<HTMLButtonElement>("[data-hire]");
        if (hire)
          hire.onclick = () => {
            const msg = act.hireManager(ctx.state(), id, st);
            ctx.fx(msg ? "hire" : "error", !!msg);
            ctx.toast(msg ?? t("No tienes suficiente dinero"));
          };
      }
      $(el, "[data-chain]").innerHTML = chainSummary(s, id);
    },
  );
  $<HTMLButtonElement>(sheet.el, "[data-up]").onclick = () => {
    const s = ctx.state();
    const before = businessRate(s, id, now()) || chainRates(bizDef(id), s.biz[id], false).total;
    const msg = act.upgrade(s, id, st);
    if (msg === null) return ctx.fx("error");
    const after = businessRate(s, id, now()) || chainRates(bizDef(id), s.biz[id], false).total;
    ctx.fx(msg ? "milestone" : "upgrade", !!msg);
    // Recompensa inmediata y visible: cuánto más ganas con esta mejora.
    if (after > before) ctx.floatAt($(sheet.el, "[data-up]"), `+${money(after - before)}/s`);
    if (msg) ctx.banner("⚡", msg);
  };
  wireBuyModes(sheet.el, ctx);
}

/* ---------- Nueva planta ---------- */

export function openUnlockSheet(ctx: PanelCtx, id: string): void {
  const def = bizDef(id);
  const i = ctx.state().biz[id].floors.length;
  if (i >= CHAIN.maxFloors) return;
  const cost = floorUnlockCost(def, i);
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🔓</span><div><h3>${def.floorName} ${i + 1}</h3><p class="muted">${t("Nuevo puesto de producción")}</p></div></div>
     <div class="stat"><span>${t("Producción inicial")}</span><b class="good">+${money(floorRate(def, i, 1))}/s</b></div>
     <p class="small muted">${t("Cada puesto nuevo produce {n} veces más que el anterior. Recuerda mejorar el transporte y la venta para que no se atasque.", { n: CHAIN.floorGrowth })}</p>
     <button class="buy big wide" data-unlock><span>${t("Abrir puesto")}</span><b>${money(cost)}</b></button>`,
    (el) => {
      $<HTMLButtonElement>(el, "[data-unlock]").disabled = ctx.state().cash < cost;
    },
  );
  $<HTMLButtonElement>(sheet.el, "[data-unlock]").onclick = () => {
    const before = bizTier(ctx.state().biz[id]);
    const msg = act.unlockFloor(ctx.state(), id);
    if (!msg) return ctx.fx("error");
    analytics.track("floor_opened", { biz: id, floors: ctx.state().biz[id].floors.length });
    closeSheet();
    const tier = bizTier(ctx.state().biz[id]);
    if (tier > before) {
      // Sube de categoría: el edificio crece en el mapa. Es un hito grande, se celebra a lo grande.
      void ctx.celebrate({
        icon: def.icon,
        title: t("¡{name} sube de categoría!", { name: def.name }),
        subtitle: tier === 3 ? t("Ya es de los grandes: el edificio luce su versión de lujo.") : t("El negocio crece y el edificio se amplía."),
        highlight: "★".repeat(tier),
      });
      return;
    }
    ctx.fx("unlock", true);
    ctx.banner("🔓", msg);
  };
}

/* ---------- Comprar un negocio de la ciudad ---------- */

export function openPlotSheet(ctx: PanelCtx, id: string): void {
  const def = bizDef(id);
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${bizIcon(def)}</span><div><h3>${def.name}</h3><p class="muted">${def.blurb}</p></div></div>
     <div class="stat"><span>${t("Puestos")}</span><b>${def.floorName} ${def.worker}</b></div>
     <div class="stat"><span>${t("Transporte")}</span><b>${def.transportName} ${def.transportIcon}</b></div>
     <div class="stat"><span>${t("Venta")}</span><b>${def.saleName} ${def.saleWorker}</b></div>
     <div class="stat"><span>${t("Rentabilidad")}</span><b class="good">${t("x{n} frente a tu primer negocio", { n: fmt(def.mult) })}</b></div>
     <button class="buy big wide" data-buyplot><span>${t("Comprar")}</span><b>${money(def.price)}</b></button>`,
    (el) => {
      $<HTMLButtonElement>(el, "[data-buyplot]").disabled = ctx.state().cash < def.price;
    },
  );
  $<HTMLButtonElement>(sheet.el, "[data-buyplot]").onclick = () => {
    const msg = act.buyBusiness(ctx.state(), id);
    if (!msg) return ctx.fx("error");
    analytics.track("business_bought", { biz: id, minutes: minutesSinceInstall() });
    closeSheet();
    ctx.goTo({ scene: "business", id });
    void ctx.celebrate({
      icon: def.icon,
      title: t("¡Nuevo negocio!"),
      subtitle: t("Ya eres dueño de: {name}. Contrata gerentes para que funcione solo.", { name: def.name }),
      highlight: def.blurb,
    });
  };
}

/* ---------- Bolsa ---------- */

export function openIpoSheet(ctx: PanelCtx): void {
  let armed = false;
  let wipeArmed = false;
  const s0 = ctx.state();
  const by = Object.entries(s0.ads.byPlacement)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  const li = lifeIndex(s0.totalEarned);
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${icon("ic_ipo", "📈")}</span><div><h3>${t("Salir a bolsa")}</h3><p class="muted">${t("Tienes {shares} acciones: +{pct}% a todo lo que ganas.", { shares: `<b class="gold">${fmt(s0.shares)}</b>`, pct: fmt(s0.shares * CONFIG.shareBonus * 100) })}</p></div></div>
     <p class="muted">${t("Vendes todos los negocios de esta ciudad y vuelves a empezar con el primero, pero cada acción suma un +{pct}% para siempre. Tu estilo de vida ({life}) se mantiene.", { pct: CONFIG.shareBonus * 100, life: `${LIFE[li].icon} ${LIFE[li].name}` })}</p>
     <div class="stat"><span>${t("Recibirías ahora")}</span><b class="gold" data-gain></b></div>
     <p class="small muted" data-need></p>
     <div class="actions col">
       <button class="ad-btn wide" data-ipo="2"><span class="play"></span>${t("Salir con x2 acciones")}</button>
       <button class="btn" data-ipo="1">${t("Salir a bolsa")}</button>
     </div>
     <details class="dev"><summary>Panel de desarrollo</summary>
       <div class="stat"><span>Anuncios hoy / total</span><b>${s0.ads.today} / ${s0.ads.total}</b></div>
       <div class="stat"><span>Ingreso estimado (eCPM 10 €)</span><b>${((s0.ads.total * 10) / 1000).toFixed(3)} €</b></div>
       <div class="stat"><span>Por ubicación</span><b>${by || "—"}</b></div>
       <div class="stat"><span>Salidas a bolsa</span><b>${s0.ipos}</b></div>
       <button class="btn ghost" data-wipe>${t("Borrar partida")}</button>
     </details>`,
    (el) => {
      const g = sharesToGain(ctx.state());
      $(el, "[data-gain]").textContent = t("{n} acciones", { n: fmt(g) });
      $(el, "[data-need]").textContent = g < 1 ? t("Necesitas ganar {m} en esta partida para tu primera acción.", { m: money(cityDef(ctx.state().city).shareDivisor) }) : "";
      el.querySelectorAll<HTMLButtonElement>("[data-ipo]").forEach((b) => (b.disabled = g < 1));
    },
  );
  sheet.el.querySelectorAll<HTMLButtonElement>("[data-ipo]").forEach((b) => {
    b.onclick = async () => {
      const mult = b.dataset.ipo === "2" ? 2 : 1;
      if (mult === 1 && !armed) {
        armed = true;
        b.textContent = t("Toca otra vez para confirmar");
        return;
      }
      if (mult === 2 && !(await ctx.watchAd("ipo_x2"))) return;
      const res = act.ipo(ctx.state(), mult, now());
      if (!res) return;
      analytics.track("ipo", { shares: Math.round(res.gained), withAd: mult === 2, minutes: minutesSinceInstall() });
      ctx.replaceState(res.state);
      closeSheet();
      void ctx.celebrate({
        icon: "🔔",
        title: t("¡Has salido a bolsa!"),
        subtitle: t("Vuelves a empezar con tu primer negocio, pero ahora todo rinde más."),
        highlight: t("+{n} acciones · +{pct} % para siempre", { n: fmt(res.gained), pct: fmt(res.gained * CONFIG.shareBonus * 100) }),
        color: "#4aa8ff",
      });
    };
  });
  $<HTMLButtonElement>(sheet.el, "[data-wipe]").onclick = async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    if (!wipeArmed) {
      wipeArmed = true;
      b.textContent = t("Toca otra vez para borrar todo");
      return;
    }
    closeSheet();
    await ctx.wipe();
  };
}
