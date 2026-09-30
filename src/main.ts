import { App } from "@capacitor/app";
import Phaser from "phaser";
import { createAds, type Placement } from "./ads";
import * as act from "./game/actions";
import { BUSINESSES, CONFIG, LIFE, VIRAL_TITLES } from "./game/data";
import { earn, lifeIndex, offlineEarnings, passiveRate, tapStation, tick, type SaleEvent } from "./game/economy";
import { fmt, fmtTime } from "./game/format";
import * as meta from "./game/meta";
import { freshState, migrate, type GameState, type View } from "./game/state";
import { clearSave, loadSave, writeSave } from "./platform/storage";
import { BootScene } from "./scenes/BootScene";
import { BusinessScene } from "./scenes/BusinessScene";
import { CityScene } from "./scenes/CityScene";
import { COLORS, DPR, type Bridge } from "./scenes/common";
import { renderBar, updateBar, updateHeader } from "./ui/hud";
import { modal, modalOpen, toast } from "./ui/overlays";
import { openIpoSheet, openPlotSheet, openStationSheet, openUnlockSheet, type PanelCtx } from "./ui/panels";
import { openAchievements, openDaily, openExecs, openMissions } from "./ui/metaPanels";
import { activeSheet, closeSheet } from "./ui/sheet";
import "./styles.css";

const root = document.getElementById("app")!;
const stage = document.getElementById("stage")!;
const ads = createAds(root);

let S: GameState = freshState();
let frameSales: SaleEvent[] = [];

const say = (msg: string | null) => {
  if (msg) toast(root, msg);
};

/* ---------- Guardado ---------- */

function save(): void {
  S.lastSeen = Date.now();
  void writeSave(S);
}

/* ---------- Anuncios ---------- */

async function watchAd(placement: Placement): Promise<boolean> {
  const ok = await ads.showRewarded(placement);
  if (ok) {
    act.recordAd(S, placement);
    save();
  } else {
    say("Anuncio no disponible. Inténtalo en un momento.");
  }
  return ok;
}

/* ---------- Escenas ---------- */

const bridge: Bridge = {
  state: () => S,
  tapStation: (id, st) => say(tapStation(S, id, st)),
  openStation: (id, st) => openStationSheet(ctx, id, st),
  openUnlockFloor: (id) => openUnlockSheet(ctx, id),
  tapPlot: (id) => (S.biz[id].owned ? goTo({ scene: "business", id }) : openPlotSheet(ctx, id)),
  drainSales: (id) => (id ? frameSales.filter((e) => e.biz === id) : frameSales),
  insets: () => ({
    top: document.getElementById("hud")!.offsetHeight,
    bottom: document.getElementById("bar")!.offsetHeight,
  }),
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: COLORS.grass,
  scale: { mode: Phaser.Scale.NONE, width: innerWidth * DPR, height: innerHeight * DPR, zoom: 1 / DPR },
  render: { antialias: true, roundPixels: false },
  scene: [],
  callbacks: { preBoot: (g) => g.registry.set("bridge", bridge) },
});
game.scene.add("boot", BootScene, true);
game.scene.add("city", CityScene);
game.scene.add("business", BusinessScene);

let artReady = false;
let saveLoaded = false;
game.events.once("art-ready", () => {
  artReady = true;
  if (saveLoaded) startView();
});

function startView(): void {
  if (!artReady || !saveLoaded) return;
  for (const sc of game.scene.getScenes(true)) game.scene.stop(sc.scene.key);
  if (S.view.scene === "business") game.scene.start("business", { id: S.view.id });
  else game.scene.start("city");
  renderBar(S);
}

function goTo(view: View): void {
  closeSheet();
  S.view = view;
  startView();
}

window.addEventListener("resize", () => {
  game.scale.resize(innerWidth * DPR, innerHeight * DPR);
  game.scale.setZoom(1 / DPR);
  startView();
});

/* ---------- Paneles ---------- */

const ctx: PanelCtx = {
  root,
  state: () => S,
  replaceState: (s) => {
    S = s;
    save();
    startView();
  },
  watchAd,
  toast: (m) => toast(root, m),
  goTo,
  wipe: async () => {
    await clearSave();
    S = freshState();
    startView();
    say("Partida borrada");
  },
};

document.getElementById("bar")!.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!b) return;
  if (b.dataset.nav === "city") goTo({ scene: "city" });
  else if (b.dataset.nav === "home") goTo({ scene: "business", id: BUSINESSES[0].id });
  else if (b.dataset.nav === "ipo") openIpoSheet(ctx);
  else if (b.dataset.rush && (await watchAd("rush"))) {
    act.startRush(S, b.dataset.rush, Date.now());
    say(`Hora punta: x${CONFIG.rushMult} en este negocio durante ${CONFIG.rushMinutes} min`);
  }
});

/* ---------- Botones laterales, diamantes y tutorial ---------- */

document.getElementById("rail")!.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-open]");
  if (!b) return;
  const which = b.dataset.open;
  if (which === "missions") openMissions(ctx);
  else if (which === "daily") openDaily(ctx);
  else if (which === "execs") openExecs(ctx, S.meta.execs.length ? "execs" : "chests");
  else if (which === "achievements") openAchievements(ctx);
});
document.getElementById("gems")!.addEventListener("click", () => openExecs(ctx, "chests"));

function updateMeta(now: number): void {
  meta.ensureDay(S, now);
  const top = document.getElementById("hud")!.offsetHeight + 10;
  const rail = document.getElementById("rail")!;
  rail.style.top = `${top}px`;
  const dots = rail.querySelectorAll<HTMLElement>(".dot");
  dots[0].hidden = meta.missionsToClaim(S) === 0;
  dots[1].hidden = !meta.dailyStatus(S, now).canClaim;
  dots[2].hidden = !meta.freeChestReady(S, now);
  dots[3].hidden = meta.achievementsToClaim(S) === 0;

  const adv = meta.advanceTutorial(S);
  if (adv?.done) say(`¡Tutorial completado! +${adv.gems} 💎`);
  const step = meta.tutorialStep(S);
  const tut = document.getElementById("tut")!;
  // El tutorial transcurre en el almacén; en la ciudad se oculta.
  const show = !!step && S.view.scene === "business" && S.view.id === BUSINESSES[0].id && !activeSheet();
  tut.hidden = !show;
  if (show && step) {
    tut.style.top = `${top}px`;
    document.getElementById("tutStep")!.textContent = `${S.meta.tutorial + 1}/${meta.TUTORIAL_LENGTH}`;
    document.getElementById("tutText")!.textContent = step.text;
  }
}

document.getElementById("boostBtn")!.addEventListener("click", async () => {
  if (await watchAd("boost_x2")) {
    act.addBoost(S, Date.now());
    say(`Modo hustle: +${CONFIG.boostHours} h ganando el doble`);
  }
});

/* ---------- Evento viral ---------- */

let viralEl: HTMLButtonElement | null = null;
let viralUntil = 0;

function hideViral(): void {
  viralEl?.remove();
  viralEl = null;
  S.nextViral = Date.now() + (CONFIG.viralMinSec + Math.random() * (CONFIG.viralMaxSec - CONFIG.viralMinSec)) * 1000;
}

function viralTick(now: number): void {
  if (!viralEl && now >= S.nextViral && !modalOpen() && !activeSheet() && S.totalEarned > 50) {
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
                say(`+${fmt(reward)} € extra`);
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
    text: `Tus gerentes han ganado esto en ${fmtTime(seconds)} mientras no estabas.`,
    actions: [
      {
        ad: true,
        label: `Cobrar x3 (${fmt(amount * 3)} €)`,
        run: async () => {
          const ok = await watchAd("offline_x3");
          earn(S, ok ? amount * 3 : amount);
          say(ok ? "¡Triplicado!" : "Cobrado");
        },
      },
      { label: "Cobrar sin anuncio", run: () => earn(S, amount) },
    ],
  });
}

/* ---------- Bucle ---------- */

let lastUi = 0;
let lastStep = performance.now();

game.events.on("step", (time: number) => {
  const now = Date.now();
  // Reloj real: el delta de Phaser se suaviza y ralentizaría el juego en móviles lentos.
  const wall = performance.now();
  const elapsed = (wall - lastStep) / 1000;
  lastStep = wall;
  // Tras volver de segundo plano no se simula el hueco: lo paga offerOffline().
  const dt = elapsed > 2 ? 0 : elapsed;
  frameSales = tick(S, dt, now);
  viralTick(now);
  if (time - lastUi > 120) {
    lastUi = time;
    updateHeader(S, now);
    updateBar(S, now);
    activeSheet()?.update?.();
    updateMeta(now);
    const li = lifeIndex(S.totalEarned);
    if (li > S.lifeSeen) {
      S.lifeSeen = li;
      say(`${LIFE[li].icon} Nuevo estilo de vida: ${LIFE[li].name}`);
    }
  }
});

async function boot(): Promise<void> {
  S = migrate(await loadSave());
  updateHeader(S, Date.now());
  renderBar(S);
  // La primera escena se lanza cuando el arte está listo y la partida cargada.
  saveLoaded = true;
  startView();
  offerOffline();
  setInterval(save, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
    else offerOffline();
  });
  window.addEventListener("pagehide", save);
  void App.addListener("appStateChange", ({ isActive }) => (isActive ? offerOffline() : save())).catch(() => {});
  ads.init().catch(() => {});
}

void boot();
// Para depurar desde la consola del navegador.
Object.assign(window, { __game: { get state() { return S; }, game } });
