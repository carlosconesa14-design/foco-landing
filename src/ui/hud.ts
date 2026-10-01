import { CONFIG, LIFE } from "../game/data";
import { bizDef, businessRate, chainRates, lifeIndex, passiveRate } from "../game/economy";
import { fmt, fmtTime } from "../game/format";
import { boostHours, canExpand } from "../game/world";
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
  if (s.view.scene === "business") {
    const def = bizDef(s.view.id);
    bar.innerHTML = `
      <button class="navbtn" data-nav="city"><span class="ic">${icon("ic_city", "🏙️")}</span>Ciudad</button>
      <div class="barmid"><b>${bizIcon(def)} ${def.name}</b><span id="barRate"></span></div>
      <button class="ad-btn rushbtn" data-rush="${def.id}" id="rushBtn"><span class="play"></span><span id="rushTxt">x${CONFIG.rushMult}</span></button>`;
  } else {
    bar.innerHTML = `
      <button class="navbtn" data-nav="ipo"><span class="ic">${icon("ic_ipo", "📈")}</span>Bolsa</button>
      <div class="barmid"><b>${flagIcon(city)} ${city.name}</b><span>Toca un edificio para entrar</span></div>
      <button class="navbtn" data-nav="world"><span class="ic">${icon("ic_world", "🌍")}</span>Mundo<i class="dot" id="worldDot" hidden></i></button>`;
  }
}

export function updateBar(s: GameState, now: number): void {
  const dot = document.getElementById("worldDot");
  if (dot) dot.hidden = !canExpand(s);
  if (s.view.scene !== "business") return;
  const id = s.view.id;
  const b = s.biz[id];
  const r = chainRates(bizDef(id), b, false);
  const names = { production: "producción", transport: "transporte", sale: "venta" };
  const rate = document.getElementById("barRate");
  if (rate) rate.textContent = `+${fmt(businessRate(s, id, now))}/s · atasco: ${names[r.bottleneck]}`;
  const rushLeft = (b.rushEnd - now) / 1000;
  const btn = document.getElementById("rushBtn") as HTMLButtonElement | null;
  const txt = document.getElementById("rushTxt");
  if (btn && txt) {
    btn.disabled = rushLeft > 0;
    txt.textContent = rushLeft > 0 ? fmtTime(rushLeft) : `Hora punta x${CONFIG.rushMult}`;
  }
}
