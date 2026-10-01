import { CONFIG, LIFE, type BusinessDef } from "../game/data";
import { bizDef, businessRate, chainRates, floorNextCost, lifeIndex, logisticsNextCost, managerCost, passiveRate, saleMult, type Station } from "../game/economy";
import { fmt, fmtTime } from "../game/format";
import { boostHours, canExpand, upgradeDiscount } from "../game/world";
import { cityDef, type GameState } from "../game/state";
import { bizIcon, flagIcon, gem, icon, lifeIcon } from "./icons";

/** Cabecera (dinero, estilo de vida, modo hustle) y barra inferior según la escena. */

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Solo reescribe el HTML si cambia: así las imágenes de los iconos no parpadean. */
function setHtml(el: HTMLElement, html: string): void {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  el.innerHTML = html;
}

/** Dinero mostrado: sube contando hacia el real en vez de saltar (micro-recompensa constante). */
let shownCash = 0;

export function updateHeader(s: GameState, now: number): void {
  const target = s.cash;
  const prev = shownCash;
  // Si baja (una compra) se muestra al instante; si sube, se acerca poco a poco.
  shownCash = target < shownCash || Math.abs(target - shownCash) < 1 ? target : shownCash + (target - shownCash) * 0.35;
  const cash = $("cash");
  cash.innerHTML = `<small>€</small>${fmt(shownCash)}`;
  // Pequeño salto visual cuando entra un buen pellizco (más de un 5 %)
  if (target > prev * 1.05 && prev > 0 && !cash.classList.contains("bump")) {
    cash.classList.add("bump");
    setTimeout(() => cash.classList.remove("bump"), 350);
  }
  $("rate").innerHTML = `+${fmt(passiveRate(s, now))} /s<span>ingresos pasivos</span>`;
  setHtml($("gems"), `${gem()} ${fmt(s.meta.gems)}`);

  const li = lifeIndex(s.totalEarned);
  const L = LIFE[li];
  const N = LIFE[li + 1];
  const pct = N ? (Math.log10(Math.max(1, s.totalEarned) / Math.max(1, L.min)) / Math.log10(N.min / Math.max(1, L.min))) * 100 : 100;
  setHtml($("life"), `<span class="em">${lifeIcon(li)}</span><b>${L.name}</b><span class="nx">${N ? `${lifeIcon(li + 1)} ${fmt(N.min)}` : "🏁"}</span><span class="track"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></span>`);

  const rem = (s.boostEnd - now) / 1000;
  $("boost").classList.toggle("on", rem > 0);
  $("boostTxt").innerHTML =
    rem > 0
      ? `<b>${fmtTime(rem)}</b>Todo x2`
      : `<b>Todo x2</b>Modo hustle`;
  $<HTMLButtonElement>("boostBtn").disabled = rem > (CONFIG.boostMaxHours - boostHours(s)) * 3600;
  $("boostBtn").lastChild!.textContent = `+${boostHours(s)} h`;
}

let barKey = "";

export function renderBar(s: GameState): void {
  const key = s.view.scene === "business" ? `b:${s.view.id}` : `city:${s.city}`;
  const city = cityDef(s.city);
  if (key === barKey) return;
  barKey = key;
  const bar = $("bar");
  bar.classList.toggle("has-chain", s.view.scene === "business");
  if (s.view.scene === "business") {
    const def = bizDef(s.view.id);
    bar.innerHTML = `
      <div class="chain" id="chain"></div>
      <button class="navbtn" data-nav="city"><span class="ic">${icon("ic_city", "🏙️")}</span>Ciudad</button>
      <button class="barmid tap" data-nav="empire" aria-label="Ver tu imperio"><b>${bizIcon(def)} ${def.name} <span class="more">▸</span></b><span id="barRate"></span></button>
      <button class="ad-btn rushbtn" data-rush="${def.id}" id="rushBtn"><span class="play"></span><span id="rushTxt">x${CONFIG.rushMult}</span></button>`;
  } else {
    bar.innerHTML = `
      <button class="navbtn" data-nav="ipo"><span class="ic">${icon("ic_ipo", "📈")}</span>Bolsa</button>
      <button class="barmid tap" data-nav="empire" aria-label="Ver tu imperio"><b>${flagIcon(city)} ${city.name}</b><span class="more">Ver tu imperio ▸</span></button>
      <button class="navbtn" data-nav="world"><span class="ic">${icon("ic_world", "🌍")}</span>Mundo<i class="dot" id="worldDot" hidden></i></button>`;
  }
}

export function updateBar(s: GameState, now: number): void {
  const dot = document.getElementById("worldDot");
  if (dot) dot.hidden = !canExpand(s);
  if (s.view.scene !== "business") return;
  const id = s.view.id;
  const b = s.biz[id];
  const rate = document.getElementById("barRate");
  if (rate) rate.textContent = `+${fmt(businessRate(s, id, now))} €/s · tu imperio`;
  const chain = document.getElementById("chain");
  if (chain) setHtml(chain, chainCards(s, id, now));
  const rushLeft = (b.rushEnd - now) / 1000;
  const btn = document.getElementById("rushBtn") as HTMLButtonElement | null;
  const txt = document.getElementById("rushTxt");
  if (btn && txt) {
    btn.disabled = rushLeft > 0;
    txt.textContent = rushLeft > 0 ? fmtTime(rushLeft) : `Hora punta x${CONFIG.rushMult}`;
  }
}

/* ---------- Barra de la cadena: producción · transporte · venta ---------- */

/** Coste de subir un solo nivel (para saber si ya se puede mejorar). */
function nextLevelCost(s: GameState, def: BusinessDef, st: Station, level: number): number {
  return (st.kind === "floor" ? floorNextCost(def, st.index, level) : logisticsNextCost(def, level)) * upgradeDiscount(s);
}

/** El puesto que conviene abrir al tocar «Producción»: uno sin gerente o la mejora más barata. */
export function productionTarget(s: GameState, id: string): number {
  const def = bizDef(id);
  const b = s.biz[id];
  const unmanaged = b.floors.findIndex((f) => !f.managed);
  if (unmanaged >= 0) return unmanaged;
  let best = 0;
  let bestCost = Infinity;
  b.floors.forEach((f, i) => {
    const c = nextLevelCost(s, def, { kind: "floor", index: i }, f.level);
    if (c < bestCost) {
      bestCost = c;
      best = i;
    }
  });
  return best;
}

/**
 * Tres tarjetas fijas encima de la barra: cada parte de la cadena con su nivel y su ritmo.
 * La que frena el negocio sale en rojo; la que se puede mejorar ya, con una flecha dorada.
 */
function chainCards(s: GameState, id: string, now: number): string {
  const def = bizDef(id);
  const b = s.biz[id];
  const r = chainRates(def, b, false);
  const m = saleMult(s, id, now);
  const floorIdx = productionTarget(s, id);
  const floorSt: Station = { kind: "floor", index: floorIdx };
  const canFloor = b.floors.some((f, i) => s.cash >= nextLevelCost(s, def, { kind: "floor", index: i }, f.level));
  // El atasco solo tiene sentido con algo automatizado; y en los 3 primeros pasos del tutorial
  // (tocar puesto, carretilla y venta) las etiquetas distraen: el jugador aún está aprendiendo a tocar.
  const auto = b.transport.managed || b.sale.managed || b.floors.some((f) => f.managed);
  const quiet = s.meta.tutorial < 3;
  const card = (
    key: "production" | "transport" | "sale",
    st: string,
    ico: string,
    name: string,
    level: string,
    rate: number,
    managed: boolean,
    canUp: boolean,
    mgrCost: number,
  ) => {
    const slow = !quiet && auto && r.bottleneck === key;
    const hire = !quiet && !managed && s.cash >= mgrCost;
    canUp = canUp && !quiet;
    return `<button class="link-card ${slow ? "slow" : ""} ${canUp || hire ? "can" : ""}" data-st="${st}" aria-label="Mejorar ${name}">
      <span class="lc-txt"><b><span class="lc-ic">${ico}</span>${name}</b><small>${level} · ${fmt(rate * m)}/s</small></span>
      <span class="lc-tag">${slow ? "Atasco" : hire ? "👔 Contratar" : canUp ? "▲ Mejorar" : ""}</span>
    </button>`;
  };
  const allManaged = b.floors.every((f) => f.managed);
  return (
    card("production", `floor:${floorIdx}`, def.worker, "Producción", `${b.floors.length} ${b.floors.length === 1 ? "puesto" : "puest."}`, r.production, allManaged, canFloor, managerCost(def, floorSt)) +
    card("transport", "transport", def.transportIcon, def.transportName, `Nv ${b.transport.level}`, r.transport, b.transport.managed, s.cash >= nextLevelCost(s, def, { kind: "transport" }, b.transport.level), managerCost(def, { kind: "transport" })) +
    card("sale", "sale", def.saleWorker, def.saleName, `Nv ${b.sale.level}`, r.sale, b.sale.managed, s.cash >= nextLevelCost(s, def, { kind: "sale" }, b.sale.level), managerCost(def, { kind: "sale" }))
  );
}
