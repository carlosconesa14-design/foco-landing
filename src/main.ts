import { localizeData } from "./i18n/data";
import { lang, localizeDom, money, t } from "./i18n";
import { App } from "@capacitor/app";
import Phaser from "phaser";
import { createAds, type Placement } from "./ads";
import { sound, type Sfx } from "./audio/sound";
import * as act from "./game/actions";
import { CITIES, CONFIG, LIFE, TOURISM, VIRAL_TITLES } from "./game/data";
import { boostHours, callWave, tourism } from "./game/world";
import { bizList, earn, lifeIndex, offlineEarnings, passiveRate, setLuck, tapStation, tick, type SaleEvent } from "./game/economy";
import { fmtTime } from "./game/format";
import { nextGoal } from "./game/goal";
import * as meta from "./game/meta";
import { freshState, migrate, type GameState, type View } from "./game/state";
import { haptics } from "./platform/haptics";
import { notifications } from "./platform/notifications";
import { planNotifications } from "./game/notify";
import { analytics, daysSinceInstall, minutesSinceInstall } from "./platform/analytics";
import { clearSave, loadSave, writeSave } from "./platform/storage";
import { BootScene } from "./scenes/BootScene";
import { BusinessScene } from "./scenes/BusinessScene";
import { CityScene } from "./scenes/CityScene";
import { COLORS, DPR, type Bridge } from "./scenes/common";
import { banner, celebrate, floatAt } from "./ui/celebrate";
import { renderBar, updateBar, updateHeader } from "./ui/hud";
import { modal, modalOpen, toast } from "./ui/overlays";
import { openIpoSheet, openPlotSheet, openStationSheet, openUnlockSheet, type PanelCtx } from "./ui/panels";
import { openAchievements, openDaily, openExecs, openMissions, openSettings } from "./ui/metaPanels";
import { activeSheet, closeSheet } from "./ui/sheet";
import { openWorld } from "./ui/worldPanels";
import { openEmpire } from "./ui/empirePanel";
import { openShop } from "./ui/shopPanel";
import { isVip, grantProduct } from "./game/shop";
import { store } from "./platform/store";
import { leagueHasPrize, openLeague, syncLeague } from "./ui/leaguePanel";
import { leagueJoined } from "./game/league";
import { loadIcons } from "./ui/icons";
import "./styles.css";
import { decorateIcons } from "./ui/icons";

localizeData();
localizeDom();
const root = document.getElementById("app")!;
decorateIcons(root);
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

/* ---------- Sonido y vibración ---------- */

function fx(name: Sfx, strong = false): void {
  sound.play(name);
  if (strong) haptics.medium();
  else if (name === "tap") haptics.light();
}

function applySettings(): void {
  sound.setMusic(S.settings.music);
  sound.setSfx(S.settings.sfx);
  haptics.enabled = S.settings.haptics;
}

// El audio solo puede empezar tras un gesto del jugador.
document.addEventListener("pointerdown", () => sound.unlock(), { capture: true });
// Un "clic" suave en cualquier botón de la interfaz HTML.
root.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("button")) sound.play("click", 0.7);
});

/* ---------- Anuncios ---------- */

async function watchAd(placement: Placement): Promise<boolean> {
  // VIP: la recompensa llega al momento, sin vídeo
  if (isVip(S)) {
    fx("gems", true);
    return true;
  }
  // El vídeo trae su propio sonido: silenciamos el juego mientras dura.
  sound.duck(true);
  const ok = await ads.showRewarded(placement).finally(() => sound.duck(false));
  if (ok) {
    fx("gems", true);
    act.recordAd(S, placement);
    analytics.track("ad_watched", { placement });
    save();
  } else {
    say(t("Anuncio no disponible. Inténtalo en un momento."));
  }
  return ok;
}

/* ---------- Escenas ---------- */

const bridge: Bridge = {
  state: () => S,
  tapStation: (id, st) => {
    const err = tapStation(S, id, st);
    fx(err ? "error" : "tap");
    say(err);
  },
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
  // La barra va antes: la escena lee su altura al crearse.
  renderBar(S);
  updateBar(S, Date.now());
  if (S.view.scene === "business") game.scene.start("business", { id: S.view.id });
  else game.scene.start("city");
  document.body.classList.remove("loading");
  document.getElementById("loading-screen")?.remove();
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
    applySettings();
    startView();
    say(t("Partida borrada"));
  },
  fx,
  applySettings,
  celebrate: (c) => {
    closeSheet();
    fx("unlock", true);
    return celebrate(root, c);
  },
  banner: (icon, text) => banner(root, icon, text),
  floatAt,
  testAd: () => ads.showRewarded("boost_x2"),
  reload: () => {
    save();
    location.reload();
  },
};

document.getElementById("bar")!.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!b) return;
  if (b.dataset.st && S.view.scene === "business") {
    const st = b.dataset.st;
    openStationSheet(ctx, S.view.id, st.startsWith("floor:") ? { kind: "floor", index: Number(st.slice(6)) } : { kind: st as "transport" | "sale" });
    return;
  }
  if (b.dataset.nav === "city") goTo({ scene: "city" });
  else if (b.dataset.nav === "home") goTo({ scene: "business", id: bizList(S)[0].id });
  else if (b.dataset.nav === "world") openWorld(ctx);
  else if (b.dataset.nav === "empire") openEmpire(ctx);
  else if (b.dataset.nav === "ipo") openIpoSheet(ctx);
  else if (b.dataset.rush && (await watchAd("rush"))) {
    act.startRush(S, b.dataset.rush, Date.now());
    say(t("Hora punta: x{n} en este negocio durante {min} min", { n: CONFIG.rushMult, min: CONFIG.rushMinutes }));
  }
});

/* ---------- Botones laterales, diamantes y tutorial ---------- */

const moreMenu = document.getElementById("moreMenu") as HTMLDialogElement;
const menuToggle = document.getElementById("menuToggle")!;
const openMenu = () => {
  closeSheet();
  moreMenu.showModal();
  menuToggle.setAttribute("aria-expanded", "true");
};
menuToggle.addEventListener("click", openMenu);
document.getElementById("hustleShortcut")!.addEventListener("click", () => {
  openMenu();
  document.getElementById("boostBtn")!.focus();
});
document.getElementById("menuClose")!.addEventListener("click", () => moreMenu.close());
moreMenu.addEventListener("close", () => menuToggle.setAttribute("aria-expanded", "false"));
moreMenu.addEventListener("click", e => {
  const box = moreMenu.getBoundingClientRect();
  if (e.target === moreMenu && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) moreMenu.close();
});
root.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-open]");
  if (!b) return;
  if (moreMenu.open) { moreMenu.close(); menuToggle.focus(); }
  const which = b.dataset.open;
  if (which === "missions") openMissions(ctx);
  else if (which === "daily") openDaily(ctx);
  else if (which === "execs") openExecs(ctx, S.meta.execs.length ? "execs" : "chests");
  else if (which === "achievements") openAchievements(ctx);
  else if (which === "league") openLeague(ctx);
  else if (which === "settings") openSettings(ctx);
});
document.getElementById("gems")!.addEventListener("click", () => openShop(ctx));

function updateMeta(now: number): void {
  meta.ensureDay(S, now);
  const top = document.getElementById("hud")!.offsetHeight + 10;
  const rail = document.getElementById("rail")!;
  rail.style.top = `${top}px`;
  const ready: Record<string, boolean> = {
    missions: meta.missionsToClaim(S) > 0,
    daily: meta.dailyStatus(S, now).canClaim,
    execs: meta.freeChestReady(S, now),
    achievements: meta.achievementsToClaim(S) > 0,
    league: leagueHasPrize() || (!leagueJoined(S) && meta.tutorialStep(S) === null),
  };
  for (const [name, available] of Object.entries(ready)) {
    const dot = root.querySelector<HTMLElement>(`[data-open="${name}"] .dot`);
    if (dot) dot.hidden = !available;
  }
  const menuDot = document.getElementById("menuDot");
  if (menuDot) menuDot.hidden = !ready.daily && !ready.execs && !ready.achievements && !ready.league;

  const adv = meta.advanceTutorial(S);
  if (adv) analytics.track(adv.done ? "tutorial_done" : "tutorial_step", { step: S.meta.tutorial, minutes: minutesSinceInstall() });
  if (adv?.done) setTimeout(askNotificationsOnce, 3500);
  if (adv?.done)
    void ctx.celebrate({
      icon: "🎓",
      title: t("¡Tutorial completado!"),
      subtitle: t("Ya sabes montar un negocio. Ahora haz crecer tu imperio."),
      highlight: `+${adv.gems} 💎`,
    });
  else if (adv) fx("click");
  const step = meta.tutorialStep(S);
  const tut = document.getElementById("tut")!;
  // El tutorial transcurre en el almacén; en la ciudad se oculta.
  const show = !!step && S.view.scene === "business" && S.city === CITIES[0].id && S.view.id === bizList(S)[0].id && !activeSheet();
  tut.hidden = !show;
  if (show && step) {
    tut.style.top = `${top}px`;
    document.getElementById("tutStep")!.textContent = `${S.meta.tutorial + 1}/${meta.TUTORIAL_LENGTH}`;
    document.getElementById("tutText")!.textContent = step.text;
  }
  updateGoal(now, top, show);
}

/* ---------- Próximo objetivo ---------- */

let goalAction: ReturnType<typeof nextGoal> = null;

function updateGoal(now: number, top: number, tutorialShown: boolean): void {
  const el = document.getElementById("goal")!;
  const g = tutorialShown || activeSheet() ? null : nextGoal(S, now);
  goalAction = g;
  el.hidden = !g;
  if (!g) return;
  el.style.top = `${top}px`;
  document.getElementById("goalIcon")!.textContent = g.icon;
  decorateIcons(document.getElementById("goal")!);
  document.getElementById("goalText")!.textContent = g.cost > 0 ? `${g.text} · ${money(g.cost)}` : g.text;
  document.getElementById("goalBar")!.style.width = `${g.progress * 100}%`;
  el.classList.toggle("ready", g.progress >= 1);
}

document.getElementById("goal")!.addEventListener("click", () => {
  const g = goalAction;
  if (!g) return;
  const a = g.action;
  if (a.kind === "world") {
    if (S.view.scene !== "city") goTo({ scene: "city" });
    openWorld(ctx);
    return;
  }
  if (a.kind === "business") {
    if (S.view.scene !== "city") goTo({ scene: "city" });
    openPlotSheet(ctx, a.bizId);
    return;
  }
  if (S.view.scene !== "business" || S.view.id !== a.bizId) goTo({ scene: "business", id: a.bizId });
  if (a.kind === "floor") openUnlockSheet(ctx, a.bizId);
  else openStationSheet(ctx, a.bizId, a.station);
});

document.getElementById("boostBtn")!.addEventListener("click", async () => {
  moreMenu.close();
  if (await watchAd("boost_x2")) {
    act.addBoost(S, Date.now());
    say(t("Modo hustle: +{h} h ganando el doble", { h: boostHours(S) }));
  }
});

/* ---------- Olas turísticas (Miami) ---------- */

let waveWasActive = false;

function updateWave(now: number): void {
  const el = document.getElementById("wave")!;
  const tw = tourism(S, now);
  el.hidden = !tw;
  if (!tw) return;
  el.style.bottom = `${document.getElementById("bar")!.offsetHeight + 10}px`;
  el.classList.toggle("on", tw.active);
  const btn = document.getElementById("waveBtn") as HTMLButtonElement;
  btn.hidden = tw.active;
  document.getElementById("waveTxt")!.innerHTML = tw.active
    ? `<b>🌊 ${t("¡Ola de turistas! Ventas x{n}", { n: TOURISM.mult })}</b>${fmtTime(tw.left / 1000)}`
    : `<b>🌊 ${t("Próxima ola")}</b>${t("en {time}", { time: fmtTime(tw.next / 1000) })}`;
  if (tw.active && !waveWasActive) {
    fx("milestone", true);
    banner(root, "🌊", t("¡Llegan los turistas! Ventas x{n} durante {time}", { n: TOURISM.mult, time: fmtTime(tw.left / 1000) }));
  }
  waveWasActive = tw.active;
}

document.getElementById("waveBtn")!.addEventListener("click", async () => {
  if (await watchAd("tourist_wave")) callWave(S, Date.now());
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
    viralEl.setAttribute("aria-label", t("Oportunidad"));
    viralUntil = now + CONFIG.viralVisibleSec * 1000;
    viralEl.onclick = () => {
      const reward = Math.max(passiveRate(S, Date.now(), false) * 600, S.cash * 0.15, 100);
      hideViral();
      modal(root, {
        title: VIRAL_TITLES[Math.floor(Math.random() * VIRAL_TITLES.length)],
        amount: money(reward),
        text: t("Mira un anuncio corto y te lo quedas."),
        actions: [
          {
            ad: true,
            label: t("Ver anuncio y cobrar"),
            run: async () => {
              if (await watchAd("viral")) {
                earn(S, reward);
                say(t("+{m} extra", { m: money(reward) }));
              }
            },
          },
          { label: t("No, gracias"), run: () => {} },
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
    title: t("Ingresos pasivos"),
    amount: money(amount),
    text: t("Tus gerentes han ganado esto en {time} mientras no estabas.", { time: fmtTime(seconds) }),
    actions: [
      {
        ad: true,
        label: t("Cobrar x3 ({m})", { m: money(amount * 3) }),
        run: async () => {
          const ok = await watchAd("offline_x3");
          analytics.track("offline_collect", { minutes: Math.round(seconds / 60), tripled: ok });
          earn(S, ok ? amount * 3 : amount);
          say(ok ? t("¡Triplicado!") : t("Cobrado"));
        },
      },
      {
        label: t("Cobrar sin anuncio"),
        run: () => {
          earn(S, amount);
          analytics.track("offline_collect", { minutes: Math.round(seconds / 60), tripled: false });
        },
      },
    ],
  });
}

/* ---------- Avisos en el móvil ---------- */

/** Al salir: guardar y programar los avisos (caja llena, maletín, premio diario). */
let sessionStart = Date.now();

function leaving(): void {
  save();
  analytics.track("session_end", { seconds: Math.round((Date.now() - sessionStart) / 1000) });
  void analytics.flush(true);
  void syncLeague(S);
  void notifications.schedule(planNotifications(S, Date.now()));
}

/** Al volver: ya no hacen falta los avisos; se ofrecen las ganancias offline. */
function returning(): void {
  sessionStart = Date.now();
  analytics.track("session_start", { day: daysSinceInstall(), city: S.city, tutorial: S.meta.tutorial, lang });
  void notifications.cancelAll();
  offerOffline();
}

/** El permiso se pide una sola vez, cuando el jugador ya ha visto el juego (al acabar el tutorial). */
function askNotificationsOnce(): void {
  if (!notifications.supported || !S.settings.notify) return;
  try {
    if (localStorage.getItem("notifyAsked")) return;
    localStorage.setItem("notifyAsked", "1");
  } catch {
    /* sin almacenamiento: se pregunta igualmente */
  }
  void notifications.ask();
}

/* ---------- Bucle ---------- */

let lastUi = 0;
let lastLuckyBanner = -Infinity;
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
  // Monedas al vender: más fuerte en el negocio que estás viendo, suave desde la ciudad.
  if (frameSales.length) {
    const here = S.view.scene === "business" ? S.view.id : null;
    const local = here ? frameSales.some((e) => e.biz === here) : false;
    if (local || !here) sound.play("coin", local ? 1 : 0.45);
    // Venta viral (recompensa variable): destello de sonido, vibración y, como mucho cada 20 s, una banda dorada.
    const lucky = frameSales.find((e) => e.lucky && (!here || e.biz === here));
    if (lucky) {
      fx("gems", true);
      if (performance.now() - lastLuckyBanner > 20_000) {
        lastLuckyBanner = performance.now();
        banner(root, "🔥", t("¡Venta viral! +{m}", { m: money(lucky.amount) }));
      }
    }
  }
  viralTick(now);
  if (time - lastUi > 120) {
    lastUi = time;
    updateHeader(S, now);
    updateBar(S, now);
    activeSheet()?.update?.();
    updateMeta(now);
    updateWave(now);
    const li = lifeIndex(S.totalEarned);
    if (li > S.lifeSeen) {
      S.lifeSeen = li;
      const nextLife = LIFE[li + 1];
      void ctx.celebrate({
        icon: LIFE[li].icon,
        title: LIFE[li].name,
        subtitle: t("¡Nuevo estilo de vida! Tu esfuerzo empieza a notarse."),
        highlight: nextLife ? t("Siguiente: {name}", { name: `${nextLife.icon} ${nextLife.name}` }) : t("Has llegado a lo más alto"),
        color: "#3ddc97",
      });
    }
  }
});

async function boot(): Promise<void> {
  await loadIcons();
  S = migrate(await loadSave());
  applySettings();
  updateHeader(S, Date.now());
  renderBar(S);
  // La primera escena se lanza cuando el arte está listo y la partida cargada.
  saveLoaded = true;
  startView();
  offerOffline();
  setInterval(save, 5000);
  analytics.track("session_start", { day: daysSinceInstall(), city: S.city, tutorial: S.meta.tutorial, lang });
  setInterval(() => void analytics.flush(), 30_000);
  // Liga: envía los puntos pendientes cada 20 s (si no hay conexión, esperan en la cola)
  setInterval(() => {
    void syncLeague(S).then((added) => {
      if (added > 0) banner(root, "🏅", t("+{n} puntos de Liga", { n: added }));
    });
  }, 20_000);
  document.addEventListener("visibilitychange", () => {
    sound.setHidden(document.hidden);
    if (document.hidden) leaving();
    else returning();
  });
  window.addEventListener("pagehide", leaving);
  void App.addListener("appStateChange", ({ isActive }) => {
    sound.setHidden(!isActive);
    if (isActive) returning();
    else leaving();
  }).catch(() => {});
  // A quien ya terminó el tutorial (partidas anteriores) se le piden los avisos una vez.
  if (meta.tutorialStep(S) === null) setTimeout(askNotificationsOnce, 4000);
  ads.init().catch(() => {});
  // Compras únicas ya hechas (móvil nuevo o reinstalación): se entregan solas
  void store.owned().then((owned) => owned.forEach((o) => grantProduct(S, o.id, o.order, Date.now())));
}

void boot();
// Para depurar desde la consola del navegador.
Object.assign(window, { __game: { get state() { return S; }, game, sound, setLuck, analytics } });
