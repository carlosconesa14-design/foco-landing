import { CONFIG, JOBS, JOB_MILESTONES, LIFE, PROPERTIES, STATION_MILESTONES } from "../game/data";
import {
  bottleneck,
  jobBuyCost,
  jobCycle,
  jobRate,
  jobRevenue,
  lifeIndex,
  nextMilestone,
  passiveRate,
  propDef,
  propRate,
  propThroughput,
  rushActive,
  sharesToGain,
  stationCap,
  stationUpgradeCost,
} from "../game/economy";
import { fmt, fmtTime } from "../game/format";
import type { GameState } from "../game/state";

/**
 * Render en dos pasos: `renderMain` reconstruye el HTML cuando cambia la estructura
 * (pestaña, algo comprado por primera vez…) y `updateDynamic` refresca números y barras
 * en cada frame sin tocar el DOM entero.
 */

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const setText = (id: string, text: string) => {
  const el = $(id);
  if (el && el.textContent !== text) el.textContent = text;
};

/** Cambia cuando hay que volver a construir el HTML de la pestaña. */
export function structureKey(s: GameState): string {
  return [
    s.tab,
    s.openProperty ?? "",
    s.jobs.map((j) => (j.level ? 1 : 0)).join(""),
    s.jobs.map((j) => (j.auto ? 1 : 0)).join(""),
    PROPERTIES.map((p) => (s.props[p.id].owned ? 1 : 0)).join(""),
    s.shares,
    s.buyMode,
    sharesToGain(s) > 0 ? 1 : 0,
  ].join("|");
}

const buyBar = (s: GameState) => `
  <div class="buybar"><span class="lbl">Comprar</span><div class="seg">${([1, 10, 100, "max"] as const)
    .map((m) => `<button data-mode="${m}" aria-pressed="${s.buyMode === m}">${m === "max" ? "Máx" : "x" + m}</button>`)
    .join("")}</div></div>`;

/* ---------- Carrera ---------- */

function renderJobs(s: GameState): string {
  const firstLocked = s.jobs.findIndex((j) => j.level === 0);
  const shown = JOBS.map((_, i) => i).filter((i) => s.jobs[i].level > 0 || i === firstLocked);
  const left = firstLocked >= 0 ? JOBS.length - firstLocked - 1 : 0;
  return (
    buyBar(s) +
    shown
      .map((i) => {
        const b = JOBS[i];
        const locked = !s.jobs[i].level;
        return `<div class="biz ${locked ? "locked" : ""}">
        <button class="icon" data-tap="${i}" aria-label="Trabajar en ${b.name}">${b.icon}${locked ? "" : `<span class="lvl" id="lv${i}"></span>`}</button>
        <div class="mid">
          <div class="row1"><span class="name">${b.name}</span><span class="rev" id="rv${i}"></span></div>
          ${
            locked
              ? `<div class="ms">Empieza este negocio para ganar más</div>`
              : `<div class="bar" id="br${i}"><i id="pb${i}"></i><span class="time" id="tm${i}"></span></div>
                 <div class="ms"><span id="msl${i}"></span><span class="track"><i id="mst${i}"></i></span></div>`
          }
        </div>
        <button class="buy" data-buy="${i}" id="bb${i}"><span id="bq${i}"></span><b id="bc${i}"></b></button>
      </div>`;
      })
      .join("") +
    (left > 0 ? `<div class="teaser">${left} negocios más por descubrir</div>` : "")
  );
}

/* ---------- Automatizar ---------- */

function renderAuto(s: GameState): string {
  return (
    `<div class="card"><h2>Automatizar</h2><p>Hasta que no automatizas un negocio, tienes que tocarlo tú. Automatizado, gana dinero solo, también con la app cerrada (hasta ${CONFIG.offlineCapHours} h).</p></div>` +
    JOBS.map((b, i) => {
      const owned = s.jobs[i].level > 0;
      return `<div class="mgr"><div class="face">${owned ? b.autoIcon : "🔒"}</div>
        <div><div class="who">${owned ? b.auto : "???"}</div><div class="what">${owned ? b.name : "Negocio sin empezar"}</div></div>
        ${
          s.jobs[i].auto
            ? `<span class="done">Automatizado</span>`
            : `<button class="buy" data-auto="${i}" id="ab${i}" ${owned ? "" : "disabled"}><span>Automatizar</span><b>${fmt(b.autoCost)}</b></button>`
        }
      </div>`;
    }).join("")
  );
}

/* ---------- Ciudad ---------- */

function renderCity(s: GameState): string {
  const firstUnowned = PROPERTIES.findIndex((p) => !s.props[p.id].owned);
  const shown = PROPERTIES.filter((p, i) => s.props[p.id].owned || (i >= firstUnowned && i <= firstUnowned + 1));
  return (
    `<div class="card"><h2>Tu ciudad</h2><p>Compra locales con lo que ganas en tu carrera. Cada uno tiene su propio negocio dentro: mejóralo y te paga cada segundo, también con la app cerrada.</p></div>` +
    shown
      .map((p) => {
        const owned = s.props[p.id].owned;
        return owned
          ? `<button class="prop" data-open="${p.id}">
              <span class="picon">${p.icon}</span>
              <span class="pmid"><b>${p.name}</b><span class="pinfo" id="pi-${p.id}"></span></span>
              <span class="prate" id="pr-${p.id}"></span>
            </button>`
          : `<div class="prop locked">
              <span class="picon">${p.icon}</span>
              <span class="pmid"><b>${p.name}</b><span class="pinfo">${p.blurb}</span></span>
              <button class="buy" data-prop="${p.id}" id="pb-${p.id}"><span>Comprar</span><b>${fmt(p.price)}</b></button>
            </div>`;
      })
      .join("")
  );
}

function renderProperty(s: GameState, id: string): string {
  const def = propDef(id);
  return `
    <button class="back" data-back>← Ciudad</button>
    <div class="card phead">
      <div class="pbig">${def.icon}</div>
      <div class="pmid"><h2>${def.name}</h2><p id="ph-units"></p></div>
      <div class="prate big-rate" id="ph-rate"></div>
    </div>
    <div class="rush" id="rush">
      <div class="x2">x${CONFIG.rushMult}</div>
      <div class="txt" id="rushTxt"></div>
      <button class="ad-btn" data-rush="${id}" id="rushBtn"><span class="play"></span>Hora punta</button>
    </div>
    ${buyBar(s)}
    <p class="hint-line">Vendes al ritmo de la parte más lenta. Mejora la que esté en rojo.</p>
    <div class="chain">
      ${def.stations
        .map(
          (st, i) => `
        <div class="station" id="st${i}">
          <div class="sicon">${st.icon}<span class="lvl" id="sl${i}"></span></div>
          <div class="mid">
            <div class="row1"><span class="name">${st.name}</span><span class="cap" id="sc${i}"></span></div>
            <div class="capbar"><i id="sb${i}"></i></div>
            <div class="ms" id="sm${i}"></div>
          </div>
          <button class="buy" data-up="${i}" id="su${i}"><span id="sq${i}"></span><b id="sx${i}"></b></button>
        </div>${i < 2 ? '<div class="arrow" aria-hidden="true">↓</div>' : ""}`,
        )
        .join("")}
    </div>`;
}

/* ---------- Bolsa ---------- */

function renderIpo(s: GameState, armed: boolean): string {
  const g = sharesToGain(s);
  const by = Object.entries(s.ads.byPlacement)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  return `<div class="card">
      <span class="eyebrow">Tus acciones</span>
      <div class="big">${fmt(s.shares)} 📈</div>
      <p>Cada acción suma un +${CONFIG.shareBonus * 100}% a todo lo que ganas, para siempre. Ahora mismo: <b class="good">+${fmt(s.shares * CONFIG.shareBonus * 100)}%</b>.</p>
    </div>
    <div class="card">
      <h2>Salir a bolsa</h2>
      <p>Vendes todos tus negocios y locales, y empiezas otra vez de rider con acciones que multiplican lo que ganas. Tu estilo de vida se mantiene. Ahora recibirías <b class="gold" id="gain"></b>.</p>
      <div class="actions">
        <button class="ad-btn" data-ipo="2" ${g < 1 ? "disabled" : ""}><span class="play"></span>Salir con x2 acciones</button>
        <button class="btn" data-ipo="1" ${g < 1 ? "disabled" : ""}>${armed ? "Toca otra vez para confirmar" : "Salir a bolsa"}</button>
      </div>
      ${g < 1 ? `<p class="small">Necesitas ganar ${fmt(CONFIG.shareDivisor)} € en esta partida para tu primera acción.</p>` : ""}
    </div>
    <div class="card">
      <span class="eyebrow">Panel de desarrollo</span>
      <div class="stat"><span>Anuncios vistos hoy</span><b>${s.ads.today}</b></div>
      <div class="stat"><span>Anuncios vistos en total</span><b>${s.ads.total}</b></div>
      <div class="stat"><span>Ingreso estimado (eCPM 10 €)</span><b>${((s.ads.total * 10) / 1000).toFixed(3)} €</b></div>
      <div class="stat"><span>Por ubicación</span><b>${by || "—"}</b></div>
      <div class="stat"><span>Salidas a bolsa</span><b>${s.ipos}</b></div>
      <div class="actions"><button class="btn ghost" data-wipe>Borrar partida</button></div>
    </div>`;
}

export function renderMain(main: HTMLElement, s: GameState, ipoArmed: boolean): void {
  let html: string;
  if (s.tab === "jobs") html = renderJobs(s);
  else if (s.tab === "auto") html = renderAuto(s);
  else if (s.tab === "city") html = s.openProperty ? renderProperty(s, s.openProperty) : renderCity(s);
  else html = renderIpo(s, ipoArmed);
  main.innerHTML = html;
  document.querySelectorAll<HTMLElement>("#tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === s.tab)));
}

/* ---------- Actualización por frame ---------- */

/** Barras de progreso: cada frame. */
export function updateBars(s: GameState): void {
  if (s.tab !== "jobs") return;
  s.jobs.forEach((j, i) => {
    const pb = $("pb" + i);
    if (!pb) return;
    const c = jobCycle(s, i);
    const fast = j.auto && c < 0.15;
    $("br" + i)?.classList.toggle("fast", fast);
    if (!fast) pb.style.width = `${j.running ? Math.min(100, (j.prog / c) * 100) : 0}%`;
  });
}

/** Textos y botones: unas 8 veces por segundo. */
export function updateTexts(s: GameState, now: number): void {
  const cash = $("cash");
  if (cash) cash.innerHTML = `<small>€</small>${fmt(s.cash)}`;
  const rate = $("rate");
  if (rate) rate.innerHTML = `+${fmt(passiveRate(s, now))} /s<span>ingresos pasivos</span>`;

  // Estilo de vida
  const li = lifeIndex(s.totalEarned);
  const L = LIFE[li];
  const N = LIFE[li + 1];
  const pct = N ? (Math.log10(Math.max(1, s.totalEarned) / Math.max(1, L.min)) / Math.log10(N.min / Math.max(1, L.min))) * 100 : 100;
  const life = $("life");
  if (life)
    life.innerHTML = `<span class="em">${L.icon}</span><b>${L.name}</b><span class="nx">${N ? `Siguiente: ${N.icon} ${fmt(N.min)} €` : "Lo has conseguido"}</span><span class="track"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;

  // Modo hustle
  const rem = (s.boostEnd - now) / 1000;
  $("boost")?.classList.toggle("on", rem > 0);
  const boostTxt = $("boostTxt");
  if (boostTxt)
    boostTxt.innerHTML =
      rem > 0
        ? `<b>Modo hustle x2 · ${fmtTime(rem)}</b>Puedes acumular hasta ${CONFIG.boostMaxHours} h`
        : `<b>Modo hustle</b>Mira un anuncio y gana el doble durante ${CONFIG.boostHours} h`;
  const boostBtn = $<HTMLButtonElement>("boostBtn");
  if (boostBtn) boostBtn.disabled = rem > (CONFIG.boostMaxHours - CONFIG.boostHours) * 3600;

  const autoDot = $("autoDot");
  if (autoDot) autoDot.hidden = !JOBS.some((b, i) => s.jobs[i].level && !s.jobs[i].auto && s.cash >= b.autoCost);
  const cityDot = $("cityDot");
  if (cityDot) cityDot.hidden = !PROPERTIES.some((p) => !s.props[p.id].owned && s.cash >= p.price);

  if (s.tab === "jobs") updateJobs(s, now);
  else if (s.tab === "auto") JOBS.forEach((b, i) => {
    const btn = $<HTMLButtonElement>("ab" + i);
    if (btn && s.jobs[i].level) btn.disabled = s.cash < b.autoCost;
  });
  else if (s.tab === "city") s.openProperty ? updateProperty(s, s.openProperty, now) : updateCity(s, now);
  else setText("gain", `${fmt(sharesToGain(s))} 📈`);
}

function updateJobs(s: GameState, now: number): void {
  s.jobs.forEach((j, i) => {
    const bb = $<HTMLButtonElement>("bb" + i);
    if (!bb) return;
    const { qty, cost } = jobBuyCost(s, i);
    setText("bq" + i, j.level ? `Comprar x${qty}` : "Empezar");
    setText("bc" + i, fmt(cost));
    bb.disabled = s.cash < cost;
    if (!j.level) return;
    const c = jobCycle(s, i);
    setText("lv" + i, String(j.level));
    setText("rv" + i, "+" + fmt(jobRevenue(s, i, now)));
    setText("tm" + i, j.auto && c < 0.15 ? `${fmt(jobRate(s, i, now))}/s` : fmtTime(j.running ? c - j.prog : c));
    const next = nextMilestone(j.level, JOB_MILESTONES);
    const prev = [0, ...JOB_MILESTONES].filter((m) => m <= j.level).pop() ?? 0;
    setText("msl" + i, next ? `Nivel ${next}: velocidad x2` : "Velocidad máxima");
    const mst = $("mst" + i);
    if (mst) mst.style.width = next ? `${((j.level - prev) / (next - prev)) * 100}%` : "100%";
  });
  document.querySelector('[data-tap="0"]')?.classList.toggle("hint", s.totalEarned < 5 && !s.jobs[0].running);
}

function updateCity(s: GameState, now: number): void {
  for (const p of PROPERTIES) {
    const st = s.props[p.id];
    if (st.owned) {
      setText("pr-" + p.id, `+${fmt(propRate(s, p.id, now))}/s`);
      const slow = p.stations[bottleneck(s, p.id)];
      setText("pi-" + p.id, rushActive(s, p.id, now) ? `Hora punta x${CONFIG.rushMult} activa` : `Atasco en: ${slow.icon} ${slow.name}`);
    } else {
      const b = $<HTMLButtonElement>("pb-" + p.id);
      if (b) b.disabled = s.cash < p.price;
    }
  }
}

function updateProperty(s: GameState, id: string, now: number): void {
  const def = propDef(id);
  const p = s.props[id];
  setText("ph-units", `${fmt(propThroughput(s, id))} ${def.unit}/s · ${fmt(def.unitPrice)} € cada uno`);
  setText("ph-rate", `+${fmt(propRate(s, id, now))}/s`);
  const rushLeft = (p.rushEnd - now) / 1000;
  $("rush")?.classList.toggle("on", rushLeft > 0);
  const rushTxt = $("rushTxt");
  if (rushTxt)
    rushTxt.innerHTML =
      rushLeft > 0
        ? `<b>Hora punta · ${fmtTime(rushLeft)}</b>Este local gana el triple`
        : `<b>Hora punta</b>Mira un anuncio: x${CONFIG.rushMult} aquí durante ${CONFIG.rushMinutes} min`;
  const rushBtn = $<HTMLButtonElement>("rushBtn");
  if (rushBtn) rushBtn.disabled = rushLeft > 0;

  const caps = p.levels.map((l, i) => stationCap(def, i, l));
  const maxCap = Math.max(...caps);
  const slow = bottleneck(s, id);
  def.stations.forEach((st, i) => {
    const lvl = p.levels[i];
    setText("sl" + i, String(lvl));
    setText("sc" + i, `${fmt(caps[i])} ${st.verb}/s`);
    const bar = $("sb" + i);
    if (bar) bar.style.width = `${(caps[i] / maxCap) * 100}%`;
    $("st" + i)?.classList.toggle("slow", i === slow);
    const next = nextMilestone(lvl, STATION_MILESTONES);
    setText("sm" + i, i === slow ? "Cuello de botella: mejora esto primero" : next ? `Nivel ${next}: capacidad x2` : "Capacidad máxima");
    const { qty, cost } = stationUpgradeCost(s, id, i);
    setText("sq" + i, `Mejorar x${qty}`);
    setText("sx" + i, fmt(cost));
    const btn = $<HTMLButtonElement>("su" + i);
    if (btn) btn.disabled = s.cash < cost;
  });
}

