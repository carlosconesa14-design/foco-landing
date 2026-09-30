import { App } from "@capacitor/app";
import { createAds, type Placement } from "./ads";
import * as act from "./game/actions";
import { CONFIG, JOBS, LIFE, VIRAL_TITLES } from "./game/data";
import { earn, lifeIndex, offlineEarnings, passiveRate, tick } from "./game/economy";
import { fmt, fmtTime } from "./game/format";
import { freshState, migrate, type BuyMode, type GameState, type Tab } from "./game/state";
import { clearSave, loadSave, writeSave } from "./platform/storage";
import { floatMoney, modal, modalOpen, toast } from "./ui/overlays";
import { renderMain, structureKey, updateBars, updateTexts } from "./ui/views";
import "./styles.css";

const root = document.getElementById("app")!;
const main = document.getElementById("main")!;
const ads = createAds(root);

let S: GameState = freshState();
let lastKey = "";
let ipoArmed = false;
let wipeArmed = false;

/* ---------- Guardado ---------- */

function save(): void {
  S.lastSeen = Date.now();
  void writeSave(S);
}

/* ---------- Render ---------- */

function render(): void {
  renderMain(main, S, ipoArmed);
  lastKey = structureKey(S);
  updateTexts(S, Date.now());
  updateBars(S);
}

function refresh(): void {
  if (structureKey(S) !== lastKey) render();
  else updateTexts(S, Date.now());
}

/* ---------- Anuncios ---------- */

async function watchAd(placement: Placement): Promise<boolean> {
  const ok = await ads.showRewarded(placement);
  if (ok) {
    act.recordAd(S, placement);
    save();
  } else {
    toast(root, "Anuncio no disponible. Inténtalo en un momento.");
  }
  return ok;
}

/* ---------- Evento viral (anuncio opcional que aparece de vez en cuando) ---------- */

let viralEl: HTMLButtonElement | null = null;
let viralUntil = 0;

function scheduleViral(): void {
  const span = CONFIG.viralMaxSec - CONFIG.viralMinSec;
  S.nextViral = Date.now() + (CONFIG.viralMinSec + Math.random() * span) * 1000;
}

function hideViral(): void {
  viralEl?.remove();
  viralEl = null;
  scheduleViral();
}

function viralTick(now: number): void {
  if (!viralEl && now >= S.nextViral && !modalOpen() && S.totalEarned > 50) {
    viralEl = document.createElement("button");
    viralEl.className = "viral";
    viralEl.textContent = "💸";
    viralEl.setAttribute("aria-label", "Oportunidad");
    viralUntil = now + CONFIG.viralVisibleSec * 1000;
    viralEl.onclick = () => {
      const reward = Math.max(passiveRate(S, Date.now(), false) * 600, S.cash * 0.15, 100);
      hideViral();
      modal(root, {
        title: VIRAL_TITLES[Math.floor(Math.random() * VIRAL_TITLES.length)],
        amount: `${fmt(reward)} €`,
        text: "Mira un anuncio corto y te lo quedas.",
        actions: [
          {
            ad: true,
            label: "Ver anuncio y cobrar",
            run: async () => {
              if (await watchAd("viral")) {
                earn(S, reward);
                toast(root, `+${fmt(reward)} € extra`);
              }
            },
          },
          { label: "No, gracias", run: () => {} },
        ],
      });
    };
    root.appendChild(viralEl);
  }
  if (viralEl && now > viralUntil) hideViral();
}

/* ---------- Ganancias offline ---------- */

function offerOffline(): void {
  const { seconds, amount } = offlineEarnings(S, Date.now());
  S.lastSeen = Date.now();
  if (seconds < 60 || amount < 1) return;
  modal(root, {
    title: "Ingresos pasivos",
    amount: `${fmt(amount)} €`,
    text: `Tus negocios automatizados han ganado esto en ${fmtTime(seconds)} mientras no estabas.`,
    actions: [
      {
        ad: true,
        label: `Cobrar x3 (${fmt(amount * 3)} €)`,
        run: async () => {
          const ok = await watchAd("offline_x3");
          earn(S, ok ? amount * 3 : amount);
          toast(root, ok ? "¡Triplicado!" : "Cobrado");
        },
      },
      { label: "Cobrar sin anuncio", run: () => earn(S, amount) },
    ],
  });
}

/* ---------- Entrada del jugador ---------- */

document.getElementById("tabs")!.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-tab]");
  if (!b) return;
  const tab = b.dataset.tab as Tab;
  if (tab === S.tab && tab === "city") S.openProperty = null;
  S.tab = tab;
  ipoArmed = false;
  render();
  main.scrollTop = 0;
});

document.getElementById("boostBtn")!.addEventListener("click", async () => {
  if (await watchAd("boost_x2")) {
    act.addBoost(S, Date.now());
    toast(root, `Modo hustle: +${CONFIG.boostHours} h ganando el doble`);
    refresh();
  }
});

main.addEventListener("click", async (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!t) return;
  const d = t.dataset;
  const say = (msg: string | null) => {
    if (msg) toast(root, msg);
  };

  if (d.mode) {
    S.buyMode = (d.mode === "max" ? "max" : Number(d.mode)) as BuyMode;
  } else if (d.tap !== undefined) {
    act.startJob(S, Number(d.tap));
  } else if (d.buy !== undefined) {
    say(act.buyJob(S, Number(d.buy)));
  } else if (d.auto !== undefined) {
    say(act.automateJob(S, Number(d.auto)));
  } else if (d.prop !== undefined) {
    const msg = act.buyProperty(S, d.prop);
    if (msg) {
      say(msg);
      S.openProperty = d.prop;
    }
  } else if (d.open !== undefined) {
    S.openProperty = d.open;
    main.scrollTop = 0;
  } else if (d.back !== undefined) {
    S.openProperty = null;
  } else if (d.up !== undefined && S.openProperty) {
    say(act.upgradeStation(S, S.openProperty, Number(d.up)));
  } else if (d.rush !== undefined) {
    if (await watchAd("rush")) {
      act.startRush(S, d.rush, Date.now());
      toast(root, `Hora punta: x${CONFIG.rushMult} durante ${CONFIG.rushMinutes} min`);
    }
  } else if (d.ipo !== undefined) {
    const mult = d.ipo === "2" ? 2 : 1;
    if (mult === 1 && !ipoArmed) {
      ipoArmed = true;
      render();
      return;
    }
    if (mult === 2 && !(await watchAd("ipo_x2"))) return;
    const res = act.ipo(S, mult, Date.now());
    if (res) {
      S = res.state;
      ipoArmed = false;
      save();
      toast(root, `+${fmt(res.gained)} acciones. Vuelves a empezar de rider, pero más rápido.`);
    }
  } else if (d.wipe !== undefined) {
    if (!wipeArmed) {
      wipeArmed = true;
      t.textContent = "Toca otra vez para borrar todo";
      return;
    }
    wipeArmed = false;
    await clearSave();
    S = freshState();
    toast(root, "Partida borrada");
    render();
    return;
  } else {
    return;
  }
  if (d.mode || d.open !== undefined || d.back !== undefined) render();
  else refresh();
});

/* ---------- Bucle ---------- */

let prev = performance.now();
let lastText = 0;

function frame(t: number): void {
  const now = Date.now();
  let dt = (t - prev) / 1000;
  prev = t;
  // Tras volver de segundo plano no se simula el hueco: lo paga offerOffline().
  if (dt > 2) dt = 0;
  for (const sale of tick(S, dt, now)) floatMoney(document.querySelector(`[data-tap="${sale.job}"]`), sale.amount);
  viralTick(now);
  updateBars(S);
  if (t - lastText > 120) {
    lastText = t;
    refresh();
    const li = lifeIndex(S.totalEarned);
    if (li > S.lifeSeen) {
      S.lifeSeen = li;
      toast(root, `${LIFE[li].icon} Nuevo estilo de vida: ${LIFE[li].name}`);
    }
  }
  requestAnimationFrame(frame);
}

async function boot(): Promise<void> {
  S = migrate(await loadSave());
  if (!S.jobs.some((j) => j.level)) S.jobs[0].level = 1;
  render();
  offerOffline();
  requestAnimationFrame((t) => {
    prev = t;
    frame(t);
  });
  setInterval(save, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
    else offerOffline();
  });
  window.addEventListener("pagehide", save);
  // En el móvil, al volver de segundo plano se ofrecen las ganancias offline.
  void App.addListener("appStateChange", ({ isActive }) => (isActive ? offerOffline() : save())).catch(() => {});
  ads.init().catch(() => {});
}

void boot();
// Para depurar desde la consola del navegador.
Object.assign(window, { __game: { get state() { return S; }, JOBS } });
