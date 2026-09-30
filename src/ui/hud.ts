import { CONFIG, LIFE } from "../game/data";
import { bizDef, businessRate, chainRates, lifeIndex, passiveRate } from "../game/economy";
import { fmt, fmtTime } from "../game/format";
import type { GameState } from "../game/state";

/** Cabecera (dinero, estilo de vida, modo hustle) y barra inferior según la escena. */

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function updateHeader(s: GameState, now: number): void {
  $("cash").innerHTML = `<small>€</small>${fmt(s.cash)}`;
  $("rate").innerHTML = `+${fmt(passiveRate(s, now))} /s<span>ingresos pasivos</span>`;
  $("gems").textContent = `💎 ${fmt(s.meta.gems)}`;

  const li = lifeIndex(s.totalEarned);
  const L = LIFE[li];
  const N = LIFE[li + 1];
  const pct = N ? (Math.log10(Math.max(1, s.totalEarned) / Math.max(1, L.min)) / Math.log10(N.min / Math.max(1, L.min))) * 100 : 100;
  $("life").innerHTML = `<span class="em">${L.icon}</span><b>${L.name}</b><span class="nx">${N ? `Siguiente: ${N.icon} ${fmt(N.min)} €` : "Lo has conseguido"}</span><span class="track"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;

  const rem = (s.boostEnd - now) / 1000;
  $("boost").classList.toggle("on", rem > 0);
  $("boostTxt").innerHTML =
    rem > 0
      ? `<b>Modo hustle x2 · ${fmtTime(rem)}</b>Acumulable hasta ${CONFIG.boostMaxHours} h`
      : `<b>Modo hustle</b>Anuncio: todo x2 durante ${CONFIG.boostHours} h`;
  $<HTMLButtonElement>("boostBtn").disabled = rem > (CONFIG.boostMaxHours - CONFIG.boostHours) * 3600;
}

let barKey = "";

export function renderBar(s: GameState): void {
  const key = s.view.scene === "business" ? `b:${s.view.id}` : "city";
  if (key === barKey) return;
  barKey = key;
  const bar = $("bar");
  if (s.view.scene === "business") {
    const def = bizDef(s.view.id);
    bar.innerHTML = `
      <button class="navbtn" data-nav="city"><span class="ic">🏙️</span>Ciudad</button>
      <div class="barmid"><b>${def.icon} ${def.name}</b><span id="barRate"></span></div>
      <button class="ad-btn rushbtn" data-rush="${def.id}" id="rushBtn"><span class="play"></span><span id="rushTxt">x${CONFIG.rushMult}</span></button>`;
  } else {
    bar.innerHTML = `
      <button class="navbtn" data-nav="ipo"><span class="ic">📈</span>Bolsa</button>
      <div class="barmid"><b>🏙️ Tu ciudad</b><span>Toca un edificio para entrar</span></div>
      <button class="navbtn" data-nav="home"><span class="ic">📦</span>Almacén</button>`;
  }
}

export function updateBar(s: GameState, now: number): void {
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
