import { travelFlight } from "./panelPresentation";
import { IMG_EXT } from "../art/imgExt";
import { now } from "../game/clock";
import { CITIES, FOUNDERS, FRANCHISE, GOLD, OFFICE, TOURISM } from "../game/data";
import { isFounder, reachedFounderCity } from "../game/founders";
import { leagueApi } from "../platform/league";
import { earn, passiveRate } from "../game/economy";
import { fmt, fmtTime } from "../game/format";
import * as world from "../game/world";
import type { PanelCtx } from "./panels";
import { flagIcon, icon, officeIcon, star } from "./icons";
import { openSheet } from "./sheet";
import { analytics, minutesSinceInstall } from "../platform/analytics";
import { money, t } from "../i18n";

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

/** Plazas ocupadas en la carrera de fundadores (se pide al abrir el mapa). */
let founderCount: { spots: number; taken: number } | null = null;

function founderLine(s: ReturnType<PanelCtx["state"]>): string {
  const f = s.meta.founder;
  if (f.rank !== null) {
    return `<span class="tag gold">🏁 ${isFounder(s) ? t("Fundador #{n}", { n: f.rank }) : t("Llegaste el n.º {n}", { n: f.rank })}</span>`;
  }
  const left = founderCount ? Math.max(0, founderCount.spots - founderCount.taken) : null;
  if (left === 0) return "";
  const txt = t("Carrera de fundadores: los {n} primeros en llegar reciben un ejecutivo exclusivo", { n: FOUNDERS.spots });
  return `<span class="tag gold">🏁 ${txt}${left !== null ? ` · ${t("quedan {n} plazas", { n: left })}` : ""}</span>${
    reachedFounderCity(s) && !s.meta.league.id ? `<p class="small muted">${t("Únete a la Liga para reservar tu puesto.")}</p>` : ""
  }`;
}

export function openWorld(ctx: PanelCtx): void {
  let expandArmed = false;
  if (!founderCount) leagueApi.founders(FOUNDERS.city).then((c) => { founderCount = c; sheet.update?.(); }).catch(() => {});
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">${icon("ic_world", "🌍")}</span><div><h3>${t("Expansión mundial")}</h3><p class="muted" data-sub></p></div></div>
     <div class="world-atlas" data-atlas></div>
     <div class="worldmap" data-map></div>
     <button class="btn wide office-btn" data-office><span>🏛️ ${t("Oficina central")}</span><b data-stars></b></button>`,
    (el) => {
      const s = ctx.state();
      const bonus = world.worldIncomeMult(s);
      $(el, "[data-sub]").textContent = t("Franquicias: x{n} a todos tus ingresos", { n: fmt(bonus) });
      $(el, "[data-stars]").innerHTML = `${s.world.stars} ${star()}`;
      const p = world.cityProgress(s);
      $(el,"[data-atlas]").innerHTML = `<svg viewBox="0 0 340 140" aria-hidden="true"><path fill="#96c8a8" stroke="#70a88b" stroke-width="2" d="m24 24 49-13 35 22-16 29-22 8 20 19-6 41-18-17-11-41-25-12Zm124 7 29-15 41 9 22-4 60 23-18 30-43 3-23-20-12 12-10 46-28-18-12-38-16-9Z"/><path fill="none" stroke="#fff6c9" stroke-width="2" stroke-dasharray="4 4" d="M68 50Q118 0 168 43Q203 13 223 70Q263 105 299 49"/></svg>${[{id:"miami",name:CITIES[1].name,x:12,y:32},{id:"madrid",name:CITIES[0].name,x:41,y:17},{id:"dubai",name:CITIES[2].name,x:57,y:54},{id:"tokyo",name:t("Tokio"),x:78,y:20}].map(c=>`<span class="world-pin ${c.id===s.city?"here":!s.world.completed.includes(c.id)&&!s.world.archive[c.id]?"locked":""}" style="left:${c.x}%;top:${c.y}%">${icon(c.id===s.city?"check":s.world.completed.includes(c.id)||s.world.archive[c.id]?"world":"lock")}${c.name}</span>`).join("")}`;
      const cards = CITIES.map((c, i) => {
        const here = c.id === s.city;
        const done = s.world.completed.includes(c.id);
        const open = here || done || !!s.world.archive[c.id];
        const locked = !open;
        const prevDone = i > 0 && s.world.completed.includes(CITIES[i - 1].id);
        let body = "";
        if (here) {
          body = `<span class="sub">${t("{n}/{total} negocios", { n: p.owned, total: p.total })} · ${fmt(p.earned)} / ${money(p.goal)}</span>
            <div class="bar2"><i style="width:${Math.min(p.owned / p.total, 1) * 50 + logPct(p.earned, p.goal) / 2}%"></i></div>`;
          if (world.canExpand(s)) {
            const next = world.nextCity(s)!;
            const st = world.starsToGain(s);
            body += `<p class="small good">${t("¡Ciudad completada! Abre {city} y gana {stars}", { city: `${flagIcon(next)} ${next.name}`, stars: `${st} ${star()}` })}</p>
              <div class="actions col">
                <button class="ad-btn wide" data-expand="2"><span class="play"></span>${t("Expandirse con x2 estrellas")} (${st * 2} ${star()})</button>
                <button class="btn" data-expand="1">${expandArmed ? t("Toca otra vez para confirmar") : `${t("Expandirse")} (${st} ${star()})`}</button>
              </div>`;
          } else if (done) {
            body += `<p class="small muted">${t("Completada: da +{pct} % de ingresos en todas partes.", { pct: FRANCHISE.cityBonus * 100 })}</p>`;
          } else {
            body += `<p class="small muted">${t("Compra todos sus negocios y gana {m} para completarla.", { m: money(p.goal) })}</p>`;
          }
        } else if (open) {
          const arch = s.world.archive[c.id];
          body = `<span class="sub">${done ? "✅ " + t("Completada") : t("En marcha")}${arch ? " · " + t("{m} en caja", { m: money(arch.cash) }) : ""}</span>
            <button class="buy" data-travel="${c.id}"><span>${t("Viajar")}</span><b>✈️</b></button>`;
        } else {
          body = `<span class="sub">${prevDone || i === 0 ? "" : "🔒 " + t("Completa {city} para abrirla", { city: CITIES[i - 1].name })}</span>`;
        }
        let extra = c.mechanic === "tourism" ? `<span class="tag">🌊 ${t("Olas turísticas: ventas x{n}", { n: TOURISM.mult })}</span>` : "";
        if (c.mechanic === "gold") extra = `<span class="tag">🥇 ${t("Precio del oro: ventas hasta x{n}", { n: GOLD.max })}</span>`;
        if (c.id === FOUNDERS.city) extra += founderLine(s);
        return `<div class="city-card ${here ? "here" : ""} ${locked ? "locked" : ""}">
          <img class="city-panorama" src="sprites/street_${({madrid:"restaurant",miami:"yachts",dubai:"tower"} as Record<string,string>)[c.id]}.${IMG_EXT}" alt=""><div class="city-top"><span class="flag">${flagIcon(c)}</span><div><b>${c.name}</b>${here ? `<span class="tag here">${t("Estás aquí")}</span>` : ""}<p class="small muted">${c.blurb}</p>${extra}</div></div>
          <div class="city-body">${body}</div></div>`;
      });
      cards.push(`<div class="city-card locked soon"><div class="city-top"><span class="flag">🇯🇵</span><div><b>${t("Tokio")}</b><span class="tag">${t("Próximamente")}</span><p class="small muted">${t("Tecnología, anime y trenes bala. La siguiente parada de tu imperio, después de Dubái.")}</p></div></div></div>`);
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
          const res = world.expand(ctx.state(), now(), double);
          if (!res) return;
          analytics.track("city_expand", { city: res.city, stars: res.stars, minutes: minutesSinceInstall() });
          const city = CITIES.find((c) => c.id === res.city)!;
          ctx.replaceState(res.state);
          ctx.goTo({ scene: "city" });
          travelFlight();
          void ctx.celebrate({
            icon: city.flag,
            title: t("¡Bienvenido a {city}!", { city: city.name }),
            subtitle: t("Tu imperio cruza el océano. Empiezas de cero, pero tu franquicia te da +{pct} % en todas partes.", { pct: FRANCHISE.cityBonus * 100 }),
            highlight: t("+{n} ⭐ para la Oficina central", { n: res.stars }),
            color: "#f5c542",
          });
        };
      });
      map.querySelectorAll<HTMLButtonElement>("[data-travel]").forEach((b) => {
        b.onclick = () => travelTo(ctx, b.dataset.travel!);
      });
    }, { screen: "world" },
  );
  $<HTMLButtonElement>(sheet.el, "[data-office]").onclick = () => openOffice(ctx);
}

function travelTo(ctx: PanelCtx, cityId: string): void {
  const res = world.travel(ctx.state(), cityId, now());
  if (!res) return;
  const city = CITIES.find((c) => c.id === cityId)!;
  // Lo ganado allí mientras no estabas (a ritmo de gerentes, con el tope de horas offline).
  const earned = passiveRate(res.state, now(), false) * res.offline;
  if (earned > 0) earn(res.state, earned);
  ctx.replaceState(res.state);
  ctx.goTo({ scene: "city" });
          travelFlight();
  ctx.fx("unlock", true);
  ctx.banner(city.flag, earned > 0 ? t("{city}: tus gerentes ganaron {m} en {time}", { city: city.name, m: money(earned), time: fmtTime(res.offline) }) : t("Bienvenido de nuevo a {city}", { city: city.name }));
}

/* ---------- Oficina central ---------- */

export function openOffice(ctx: PanelCtx): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🏛️</span><div><h3>${t("Oficina central")}</h3><p class="muted" data-stars></p></div></div>
     <p class="small muted">${t("Mejoras para siempre, en todas las ciudades. Las estrellas se ganan al completar una ciudad y expandirte.")}</p>
     <div class="office-room" aria-hidden="true"><div class="office-furniture" data-furniture></div></div>
     <div class="list" data-list style="display:grid;gap:8px"></div>`,
    (el) => {
      const s = ctx.state();
      $(el, "[data-stars]").innerHTML = t("Tienes {stars}", { stars: `${s.world.stars} ${star()}` });
      $(el,"[data-furniture]").innerHTML=OFFICE.filter(o=>world.officeLevel(s,o.id)>0).map(o=>`<span>${officeIcon(o)} ${world.officeLevel(s,o.id)}</span>`).join("");
      const rows = OFFICE.map((o) => {
        const lvl = world.officeLevel(s, o.id);
        const max = lvl >= o.max;
        const cost = o.cost(lvl);
        return `<div class="row ${max ? "done" : ""}"><span class="face">${officeIcon(o)}</span>
          <div><b>${o.name}</b><span class="sub">${o.desc} · ${t("Nivel {n}", { n: `${lvl}/${o.max}` })}</span></div>
          <button class="claim" data-office="${o.id}" ${max || s.world.stars < cost ? "disabled" : ""}>${max ? t("Máx") : `${cost} ${star()}`}</button></div>`;
      });
      const list = $(el, "[data-list]");
      if (paint(list, rows.join("")))
        list.querySelectorAll<HTMLButtonElement>("[data-office]").forEach((b) => {
          b.onclick = () => {
            const ok = world.buyOffice(ctx.state(), b.dataset.office as (typeof OFFICE)[number]["id"]);
            ctx.fx(ok ? "milestone" : "error", ok);
            if (ok) ctx.floatAt(b, t("¡Mejorado!"));
          };
        });
    }, { screen: "office" },
  );
}
