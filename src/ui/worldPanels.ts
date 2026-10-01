import { CITIES, FRANCHISE, OFFICE, TOURISM } from "../game/data";
import { earn, passiveRate } from "../game/economy";
import { fmt, fmtTime } from "../game/format";
import * as world from "../game/world";
import type { PanelCtx } from "./panels";
import { flagIcon, icon, officeIcon, star } from "./icons";
import { openSheet } from "./sheet";

/** Expansión mundial: mapa de ciudades, expandirse, viajar y la Oficina central. */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

function paint(el: HTMLElement, html: string): boolean {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
}

/** Progreso logarítmico hacia el objetivo (el dinero crece en órdenes de magnitud). */
const logPct = (v: number, goal: number) => Math.max(0, Math.min(100, (Math.log10(Math.max(1, v)) / Math.log10(goal)) * 100));

/* ---------- Mapa del mundo ---------- */

export function openWorld(ctx: PanelCtx): void {
  let expandArmed = false;
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${icon("ic_world", "🌍")}</span><div><h3>Expansión mundial</h3><p class="muted" data-sub></p></div></div>
     <div class="worldmap" data-map></div>
     <button class="btn wide office-btn" data-office><span>🏛️ Oficina central</span><b data-stars></b></button>`,
    (el) => {
      const s = ctx.state();
      const bonus = world.worldIncomeMult(s);
      $(el, "[data-sub]").textContent = `Franquicias: x${fmt(bonus)} a todos tus ingresos`;
      $(el, "[data-stars]").innerHTML = `${s.world.stars} ${star()}`;
      const p = world.cityProgress(s);
      const cards = CITIES.map((c, i) => {
        const here = c.id === s.city;
        const done = s.world.completed.includes(c.id);
        const open = here || done || !!s.world.archive[c.id];
        const locked = !open;
        const prevDone = i > 0 && s.world.completed.includes(CITIES[i - 1].id);
        let body = "";
        if (here) {
          body = `<span class="sub">${p.owned}/${p.total} negocios · ${fmt(p.earned)} / ${fmt(p.goal)} €</span>
            <div class="bar2"><i style="width:${Math.min(p.owned / p.total, 1) * 50 + logPct(p.earned, p.goal) / 2}%"></i></div>`;
          if (world.canExpand(s)) {
            const next = world.nextCity(s)!;
            const st = world.starsToGain(s);
            body += `<p class="small good">¡Ciudad completada! Abre ${flagIcon(next)} ${next.name} y gana ${st} ${star()}</p>
              <div class="actions col">
                <button class="ad-btn wide" data-expand="2"><span class="play"></span>Expandirse con x2 estrellas (${st * 2} ${star()})</button>
                <button class="btn" data-expand="1">${expandArmed ? "Toca otra vez para confirmar" : `Expandirse (${st} ${star()})`}</button>
              </div>`;
          } else if (done) {
            body += `<p class="small muted">Completada: da +${FRANCHISE.cityBonus * 100} % de ingresos en todas partes.</p>`;
          } else {
            body += `<p class="small muted">Compra todos sus negocios y gana ${fmt(p.goal)} € para completarla.</p>`;
          }
        } else if (open) {
          const arch = s.world.archive[c.id];
          body = `<span class="sub">${done ? "✅ Completada" : "En marcha"}${arch ? ` · ${fmt(arch.cash)} € en caja` : ""}</span>
            <button class="buy" data-travel="${c.id}"><span>Viajar</span><b>✈️</b></button>`;
        } else {
          body = `<span class="sub">${prevDone || i === 0 ? "" : `🔒 Completa ${CITIES[i - 1].name} para abrirla`}</span>`;
        }
        const extra = c.mechanic === "tourism" ? `<span class="tag">🌊 Olas turísticas: ventas x${TOURISM.mult}</span>` : "";
        return `<div class="city-card ${here ? "here" : ""} ${locked ? "locked" : ""}">
          <div class="city-top"><span class="flag">${flagIcon(c)}</span><div><b>${c.name}</b>${here ? `<span class="tag here">Estás aquí</span>` : ""}<p class="small muted">${c.blurb}</p>${extra}</div></div>
          <div class="city-body">${body}</div></div>`;
      });
      cards.push(`<div class="city-card locked"><div class="city-top"><span class="flag">🗺️</span><div><b>Próximamente</b><p class="small muted">Dubái, Tokio… nuevas ciudades con sus propias reglas.</p></div></div></div>`);
      const map = $(el, "[data-map]");
      if (!paint(map, cards.join(""))) return;
      map.querySelectorAll<HTMLButtonElement>("[data-expand]").forEach((b) => {
        b.onclick = async () => {
          const double = b.dataset.expand === "2";
          if (!double && !expandArmed) {
            expandArmed = true;
            sheet.update?.();
            return;
          }
          if (double && !(await ctx.watchAd("expand_x2"))) return;
          const res = world.expand(ctx.state(), Date.now(), double);
          if (!res) return;
          const city = CITIES.find((c) => c.id === res.city)!;
          ctx.replaceState(res.state);
          ctx.goTo({ scene: "city" });
          void ctx.celebrate({
            icon: city.flag,
            title: `¡Bienvenido a ${city.name}!`,
            subtitle: `Tu imperio cruza el océano. Empiezas de cero, pero tu franquicia te da +${FRANCHISE.cityBonus * 100} % en todas partes.`,
            highlight: `+${res.stars} ⭐ para la Oficina central`,
            color: "#f5c542",
          });
        };
      });
      map.querySelectorAll<HTMLButtonElement>("[data-travel]").forEach((b) => {
        b.onclick = () => travelTo(ctx, b.dataset.travel!);
      });
    },
  );
  $<HTMLButtonElement>(sheet.el, "[data-office]").onclick = () => openOffice(ctx);
}

function travelTo(ctx: PanelCtx, cityId: string): void {
  const res = world.travel(ctx.state(), cityId, Date.now());
  if (!res) return;
  const city = CITIES.find((c) => c.id === cityId)!;
  // Lo ganado allí mientras no estabas (a ritmo de gerentes, con el tope de horas offline).
  const earned = passiveRate(res.state, Date.now(), false) * res.offline;
  if (earned > 0) earn(res.state, earned);
  ctx.replaceState(res.state);
  ctx.goTo({ scene: "city" });
  ctx.fx("unlock", true);
  ctx.banner(city.flag, earned > 0 ? `${city.name}: tus gerentes ganaron ${fmt(earned)} € en ${fmtTime(res.offline)}` : `Bienvenido de nuevo a ${city.name}`);
}

/* ---------- Oficina central ---------- */

export function openOffice(ctx: PanelCtx): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🏛️</span><div><h3>Oficina central</h3><p class="muted" data-stars></p></div></div>
     <p class="small muted">Mejoras para siempre, en todas las ciudades. Las estrellas se ganan al completar una ciudad y expandirte.</p>
     <div class="list" data-list style="display:grid;gap:8px"></div>`,
    (el) => {
      const s = ctx.state();
      $(el, "[data-stars]").innerHTML = `Tienes ${s.world.stars} ${star()}`;
      const rows = OFFICE.map((o) => {
        const lvl = world.officeLevel(s, o.id);
        const max = lvl >= o.max;
        const cost = o.cost(lvl);
        return `<div class="row ${max ? "done" : ""}"><span class="face">${officeIcon(o)}</span>
          <div><b>${o.name}</b><span class="sub">${o.desc} · Nivel ${lvl}/${o.max}</span></div>
          <button class="claim" data-office="${o.id}" ${max || s.world.stars < cost ? "disabled" : ""}>${max ? "Máx" : `${cost} ${star()}`}</button></div>`;
      });
      const list = $(el, "[data-list]");
      if (paint(list, rows.join("")))
        list.querySelectorAll<HTMLButtonElement>("[data-office]").forEach((b) => {
          b.onclick = () => {
            const ok = world.buyOffice(ctx.state(), b.dataset.office as (typeof OFFICE)[number]["id"]);
            ctx.fx(ok ? "milestone" : "error", ok);
            if (ok) ctx.floatAt(b, "¡Mejorado!");
          };
        });
    },
  );
}
