import { savingsGoal } from "./ui/visualEffects";
import { clockSnapshot, now as clockNow, restoreClock, syncClock } from "./game/clock";
import { addFlag } from "./game/league";
import { leagueApi } from "./platform/league";
import { localizeData } from "./i18n/data";
import { lang, localizeDom, money, t } from "./i18n";
import { App } from "@capacitor/app";
import Phaser from "phaser";
import { createAds, type Placement } from "./ads";
import { sound, type Sfx } from "./audio/sound";
import * as act from "./game/actions";
import { CHESTS, CITIES, CONFIG, FOUNDERS, GOLD, LIFE, TOURISM, VIRAL_TITLES, floorLabel } from "./game/data";
import { boostHours, callWave, gold, lockGold, tourism } from "./game/world";
import { BIG_RANK, rankInfo, rankSnapshot, rankUps } from "./game/ranks";
import { applyFounderError, applyFounderRank, founderPending, reachedFounderCity } from "./game/founders";
import { bizDef, bizList, earn, floorUnlockCost, lifeIndex, managerCost, offlineEarnings, passiveRate, setLuck, setPedal, tapStation, tick, upgradeQuote, type SaleEvent } from "./game/economy";
import { fmtTime } from "./game/format";
import { nextGoal } from "./game/goal";
import * as meta from "./game/meta";
import { freshState, migrate, type GameState, type View } from "./game/state";
import { haptics } from "./platform/haptics";
import { notifications } from "./platform/notifications";
import { planNotifications } from "./game/notify";
import { analytics, daysSinceInstall, deviceId, minutesSinceInstall } from "./platform/analytics";
import { installErrorReporting } from "./platform/errors";
import { clearSave, loadSave, writeSave } from "./platform/storage";
import { BootScene } from "./scenes/BootScene";
import { RouteScene } from "./scenes/RouteScene";
import { CityScene } from "./scenes/CityScene";
import { COLORS, DPR, overlayHeight, type Bridge } from "./scenes/common";
import { banner, celebrate, floatAt } from "./ui/celebrate";
import { renderBar, updateBar, updateHeader } from "./ui/hud";
import { modal, modalOpen, toast } from "./ui/overlays";
import { openIpoSheet, openPlotSheet, openStationSheet, openUnlockSheet, type PanelCtx } from "./ui/panels";
import { openAchievements, openDaily, openExecs, openMissions, openSettings } from "./ui/metaPanels";
import { activeSheet, closeSheet } from "./ui/sheet";
import { openWorld } from "./ui/worldPanels";
import { openLife } from "./ui/lifePanel";
import { openSeason } from "./ui/seasonPanel";
import { openCloud, openInvite, syncAccount } from "./ui/invitePanel";
import { applyRemoteConfig, remoteVersion } from "./game/remote";
import { applyLocks, nextUnlockText, seen, showLocked, tickUnlocks } from "./ui/unlockUi";
import { FEATURES, isUnlocked, type FeatureId } from "./game/unlocks";
import { maybeIntro, twistAction, twistCardHtml, twistTap, twistTick } from "./ui/twistUi";
import { fusableRarities } from "./game/fusion";
import { awaySummary } from "./game/away";
import { RIVALS, checkRival, ensureRival } from "./game/rival";
import { AUTO, autoAdLeft, autoFreeLeft, autoUnlimited, autoUpgrade, planAuto, spendAutoUse } from "./game/autoUpgrade";
import { cachedConfig, fetchConfig } from "./platform/account";
import { LUXURY, affordable, owns } from "./game/luxury";
import { SEASON, activeSeason, collectVisitor, ensureSeason, scheduleVisitor, seasonOpen, visitorCandy, visitorDue } from "./game/season";
import { openEmpire } from "./ui/empirePanel";
import { openShop } from "./ui/shopPanel";
import { isVip, grantProduct } from "./game/shop";
import { store } from "./platform/store";
import { leagueHasPrize, openLeague, syncLeague } from "./ui/leaguePanel";
import { IDLE_MS, leagueJoined, trackPlay } from "./game/league";
import { ensureRetos, retosToClaim } from "./game/challenges";
import { adLadderStep, nextAdStep } from "./game/adLadder";
import { rewardLabel, showGrant } from "./ui/metaPanels";
import { ensureEvent, eventTiersReached, eventToClaim, eventWindow } from "./game/event";
import { FEST_ID, ensureFest, festOpen, inWallet, tickFest } from "./game/fest";
import { skillDurationMs, useSkill } from "./game/skills";
import { checkFirsts, firstText, viralAllowed } from "./game/onboarding";
import { openFeedback } from "./ui/feedbackPanel";
import { fmtWait, openEvent } from "./ui/eventPanel";
import { openSchool } from "./ui/schoolPanel";
import { schoolReady } from "./game/school";
import { festToClaim } from "./game/fest";
import { icon, loadIcons } from "./ui/icons";
import { WEB_BETA } from "./platform/web";
import { initPwa } from "./platform/pwa";
import { OFFERS, claimVip, dueOffer, rescheduleOffer, truckReward, wheelStatus, type OfferKind } from "./game/offers";
import { openWheel } from "./ui/wheelPanel";
import "./styles.css";
import "./ui/interface-kit.css";
import "./ui/screens.css";
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

/** Al volver, hasta cobrar lo ganado fuera, el guardado no mueve la última vez visto (no se pierde). */
let offlinePending = false;

function save(): void {
  if (!offlinePending) S.lastSeen = clockNow();
  S.clock = clockSnapshot();
  void writeSave(S);
}

/* ---------- Hora del servidor (contra trampas con la hora del móvil) ---------- */

let timeSync: Promise<void> | null = null;

/**
 * Sincroniza el reloj del juego con el servidor. Sin conexión no hace nada: el tiempo del juego
 * solo avanza mientras se juega (nunca con la hora del móvil). Si al sincronizar el reloj avanza
 * (tiempo con la app cerrada), se ofrecen las ganancias offline de ese tiempo.
 */
function syncTime(): Promise<void> {
  timeSync ??= (async () => {
    try {
      const sent = performance.now();
      const { now } = await leagueApi.time();
      const r = syncClock(now, sent, performance.now());
      if (r.skew) addFlag(S, "clock");
      if (r.future) addFlag(S, "clock_future");
      if (booted && r.jumpMs > 60e3) offerOffline();
    } catch {
      /* sin conexión */
    } finally {
      timeSync = null;
    }
  })();
  return timeSync;
}

/** Espera a la hora del servidor, como mucho `ms` (para no dejar la pantalla parada sin conexión). */
const waitTime = (ms = 2500) => Promise.race([syncTime(), new Promise<void>((r) => setTimeout(r, ms))]);

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

/* ---------- Tiempo de juego activo (Liga) ---------- */

// Solo cuenta jugando de verdad: tocando la pantalla y nunca mientras se ve un anuncio.
let lastInput = 0;
let adOnScreen = false;
for (const ev of ["pointerdown", "keydown", "wheel"]) document.addEventListener(ev, () => (lastInput = clockNow()), { capture: true, passive: true });
const playingNow = (now: number) => !document.hidden && !adOnScreen && now - lastInput < IDLE_MS;
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
  adOnScreen = true;
  const ok = await ads.showRewarded(placement).finally(() => {
    sound.duck(false);
    adOnScreen = false;
    lastInput = 0; // tras el anuncio, el tiempo vuelve a contar al tocar de nuevo
  });
  if (ok) {
    fx("gems", true);
    act.recordAd(S, placement);
    analytics.track("ad_watched", { placement });
    // Escalera diaria: a los 3, 6 y 10 anuncios del día, premio extra del juego.
    for (const step of adLadderStep(S, clockNow())) {
      setTimeout(() => {
        fx("chest", true);
        banner(root, "📺", t("¡{n} anuncios hoy! Premio extra", { n: S.ads.today }));
        showGrant(ctx, step.grant);
      }, 600);
    }
    save();
  } else {
    say(t("Anuncio no disponible. Inténtalo en un momento."));
  }
  return ok;
}

/* ---------- Escenas ---------- */

const bridge: Bridge = {
  state: () => S,
  pedal: setPedal,
  tapStation: (id, st) => {
    const err = inWallet(S, id, () => tapStation(S, id, st));
    twistTap(id); // cuenta aunque esa parte ya trabaje sola (hype, crítico)
    fx(err ? "error" : "tap");
    say(err);
  },
  openStation: (id, st) => openStationSheet(ctx, id, st),
  openUnlockFloor: (id) => openUnlockSheet(ctx, id),
  useSkill: (id, st) => {
    const ok = inWallet(S, id, () => useSkill(S, S.biz[id], st, clockNow()));
    fx(ok ? "milestone" : "error", ok);
    if (ok) {
      analytics.track("skill_used", { biz: id, part: st.kind });
      say(t("{name}: ¡x2 de velocidad durante {min} min!", { name: inWallet(S, id, () => act.stationName(id, st)), min: Math.round(skillDurationMs(S) / 60e3) }));
    } else say(t("La habilidad se está recargando"));
  },
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
game.scene.add("route", RouteScene);
/** Escena de un negocio: la vista en ruta (docs/DISENO_RUTA.md). */
const bizScene = (_id: string) => "route";
/** La escena de negocio activa, si hay una (para los visitantes con oferta). */
function activeBizScene(): RouteScene | null {
  return game.scene.isActive("route") ? (game.scene.getScene("route") as RouteScene) : null;
}

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
  updateBar(S, clockNow());
  if (S.view.scene === "fest" && !festOpen(S, clockNow())) S.view = { scene: "city" };
  if (S.view.scene === "business") game.scene.start(bizScene(S.view.id), { id: S.view.id });
  else if (S.view.scene === "fest") game.scene.start("route", { id: FEST_ID });
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
  testAd: () => {
    adOnScreen = true;
    return ads.showRewarded("boost_x2").finally(() => (adOnScreen = false));
  },
  reload: () => {
    save();
    location.reload();
  },
};

document.getElementById("bar")!.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!b) return;
  if (b.dataset.st && (S.view.scene === "business" || S.view.scene === "fest")) {
    const st = b.dataset.st;
    openStationSheet(ctx, S.view.scene === "fest" ? FEST_ID : S.view.id, st.startsWith("floor:") ? { kind: "floor", index: Number(st.slice(6)) } : { kind: st as "transport" | "sale" });
    return;
  }
  if (b.dataset.nav === "city") goTo({ scene: "city" });
  else if (b.dataset.nav === "home") goTo({ scene: "business", id: bizList(S)[0].id });
  else if (b.dataset.nav === "world") openWorld(ctx);
  else if (b.dataset.nav === "empire") openEmpire(ctx);
  else if (b.dataset.nav === "ipo") openIpoSheet(ctx);
  else if (b.dataset.nav === "event") openEvent(ctx);
  else if (b.dataset.rush && (await watchAd("rush"))) {
    act.startRush(S, b.dataset.rush, clockNow());
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
  if (b.classList.contains("locked")) return showLocked(root, S, which as FeatureId);
  if (which) seen(which);
  if (which === "missions") openMissions(ctx);
  else if (which === "daily") openDaily(ctx);
  else if (which === "execs") openExecs(ctx, S.meta.execs.length ? "execs" : "chests");
  else if (which === "achievements") openAchievements(ctx);
  else if (which === "league") openLeague(ctx);
  else if (which === "event") openEvent(ctx);
  else if (which === "wheel") openWheel(ctx);
  else if (which === "settings") openSettings(ctx);
  else if (which === "life") openLife(ctx);
  else if (which === "season") openSeason(ctx);
  else if (which === "invite") openInvite(ctx);
  else if (which === "rival") openEmpire(ctx);
  else if (which === "cloud") openCloud(ctx);
  else if (which === "feedback") openFeedback(ctx);
  else if (which === "school") openSchool(ctx);
});
document.getElementById("gems")!.addEventListener("click", () => openShop(ctx));

/** Lo que cuesta el paso del tutorial (si cuesta algo) y cuánto falta: así se sabe qué hay que ganar antes de poder hacerlo. */
function tutorialPrice(stat: string): string {
  const id = bizList(S)[0].id, def = bizDef(id);
  const cost =
    stat === "upgrades" ? upgradeQuote({ ...S, buyMode: 1 }, id, { kind: "floor", index: 0 }).cost
    : stat === "hires" ? Math.min(...([{ kind: "floor", index: 0 }, { kind: "transport" }, { kind: "sale" }] as const).map((st) => managerCost(def, st)))
    : stat === "floors" ? floorUnlockCost(def, S.biz[id].floors.length)
    : 0;
  if (cost <= 0) return "";
  return S.cash >= cost
    ? ` ${t("(cuesta {price})", { price: money(cost) })}`
    : ` ${t("(cuesta {price}, te faltan {missing})", { price: money(cost), missing: money(cost - S.cash) })}`;
}

function updateMeta(now: number): void {
  meta.ensureDay(S, now);
  ensureRetos(S, now);
  updateAdLadder(now);
  updateEvent(now);
  ensureSeason(S, now);
  for (const f of tickUnlocks(root, S, fx)) analytics.track("unlock", { feature: f.id, minutes: minutesSinceInstall() });
  applyLocks(root, S);
  const nu = document.getElementById("nextUnlock")!;
  const nuText = nextUnlockText(S);
  nu.hidden = !nuText;
  if (nu.textContent !== nuText) nu.textContent = nuText;
  if (isUnlocked(S, "rival")) {
    if (ensureRival(S, now, passiveRate(S, now, false))) {
      const who = RIVALS[S.meta.rival.who];
      banner(root, who.face, t("Nuevo rival de la semana: {name} ({biz}). ¡Gánale antes del domingo!", { name: who.name, biz: who.biz }));
    }
    const won = checkRival(S, now);
    if (won) {
      analytics.track("rival_win", { wins: S.meta.rival.wins });
      const who = RIVALS[S.meta.rival.who];
      void celebrate(root, {
        icon: "🏆",
        title: t("¡Has superado a {name}!", { name: who.name }),
        subtitle: t("Tu imperio ha ganado más que {biz} esta semana. El lunes llega un rival más fuerte.", { biz: who.biz }),
        highlight: t("Maletín de oro + {n} 💎", { n: won[1].gems ?? 0 }),
        color: "#f5c542",
      }).then(() => { if (won[0].exec) showGrant(ctx, won[0]); });
    }
  }
  const season = activeSeason(now);
  document.getElementById("seasonBtn")!.hidden = !season || meta.tutorialStep(S) !== null;
  document.body.classList.toggle("season-halloween", season?.def.id === "halloween");
  const top = document.getElementById("hud")!.offsetHeight + 10;
  const rail = document.getElementById("rail")!;
  rail.style.top = `${top}px`;
  const started = meta.tutorialStep(S) === null;
  const ready: Record<string, boolean> = {
    missions: meta.missionsToClaim(S) + retosToClaim(S) > 0,
    daily: meta.dailyStatus(S, now).canClaim,
    execs: meta.freeChestReady(S, now) || fusableRarities(S).length > 0,
    achievements: meta.achievementsToClaim(S) > 0,
    league: leagueHasPrize() || (!leagueJoined(S) && meta.tutorialStep(S) === null),
    event: eventToClaim(S) + festToClaim(S) > 0,
    school: started && schoolReady(S),
    wheel: started && wheelStatus(S, now).free,
    life: started && !!affordable(S, now),
    season: seasonOpen(S, now) && LUXURY.some((i) => i.season && !owns(S, i.id) && S.meta.season.candy >= (i.candy ?? Infinity)),
  };
  for (const name of Object.keys(ready)) if (FEATURES.some((f) => f.id === name) && !isUnlocked(S, name as FeatureId)) ready[name] = false;
  for (const [name, available] of Object.entries(ready)) {
    root.querySelectorAll<HTMLElement>(`[data-open="${name}"] .dot`).forEach((dot) => (dot.hidden = !available));
  }
  const menuDot = document.getElementById("menuDot");
  if (menuDot) menuDot.hidden = !ready.daily && !ready.execs && !ready.achievements && !ready.league && !ready.event && !ready.wheel;

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
  // Primeros minutos guiados (onboarding.ts): un aviso o un premio cada minuto o dos hasta el almacén.
  if (!adv?.done && !modalOpen()) {
    checkFirsts(S, now).forEach((f, i) => {
      analytics.track("first_moment", { id: f.id, minutes: minutesSinceInstall() });
      const txt = firstText(f, S);
      if(f.id==="skill"&&game.scene.isActive("route"))(game.scene.getScene("route") as RouteScene).focusReadySkill();
      if(f.id==="half"){const target=bizList(S)[1];if(target)savingsGoal(root,S.cash/target.price);}
      const grant = f.reward ? meta.grantReward(S, f.reward, now, Math.random) : null;
      // Texto plano para la banda (rewardLabel lleva iconos en HTML).
      const plain = !f.reward ? "" : "gems" in f.reward ? `+${f.reward.gems} 💎` : "chest" in f.reward ? `+💼 ${CHESTS[f.reward.chest].name}` : "";
      setTimeout(() => {
        if (f.big)
          void ctx.celebrate({ icon: f.icon, title: txt.title, subtitle: txt.text, highlight: plain || undefined }).then(() => {
            if (grant?.exec) showGrant(ctx, grant);
          });
        else {
          fx(f.reward ? "gems" : "click", !!f.reward);
          banner(root, f.icon, plain ? `${txt.title} ${plain}` : `${txt.title} ${txt.text}`);
          if (grant?.exec) setTimeout(() => showGrant(ctx, grant), 1200);
        }
      }, i * 2500);
    });
  }
  const step = meta.tutorialStep(S);
  const tut = document.getElementById("tut")!;
  // El tutorial transcurre en el almacén; en la ciudad se oculta.
  const show = !!step && S.view.scene === "business" && S.city === CITIES[0].id && S.view.id === bizList(S)[0].id && !activeSheet();
  tut.hidden = !show;
  if (show && step) {
    tut.style.top = `${top}px`;
    document.getElementById("tutStep")!.textContent = `${S.meta.tutorial + 1}/${meta.TUTORIAL_LENGTH}`;
    document.getElementById("tutText")!.textContent = step.text + tutorialPrice(step.stat);
  }
  updateGoal(now, top, show);
}

/* ---------- Escalera diaria de anuncios ---------- */

function updateAdLadder(now: number): void {
  const el = document.getElementById("adLadder");
  if (!el) return;
  const today = new Date(now).toISOString().slice(0, 10);
  const next = nextAdStep(S, today);
  el.hidden = isVip(S);
  const seen = S.ads.day === today ? S.ads.today : 0;
  const html = next
    ? `📺 ${t("Anuncios hoy: {n}", { n: seen })} · ${t("a los {n}: {reward}", { n: next.ads, reward: rewardLabel(next.reward).text })}`
    : `📺 ${t("Anuncios hoy: {n}", { n: seen })} · ${t("¡todos los premios de hoy conseguidos!")}`;
  if (el.dataset.html !== html) {
    el.dataset.html = html;
    el.innerHTML = html;
  }
}

/* ---------- Evento del fin de semana ---------- */

let eventReached = -1;

function updateEvent(now: number): void {
  ensureEvent(S, now);
  ensureFest(S, now);
  // La feria cierra al acabar el evento: de vuelta a la ciudad.
  if (S.view.scene === "fest" && !festOpen(S, now)) goTo({ scene: "city" });
  const w = eventWindow(now);
  const claim = eventToClaim(S);
  const started = meta.tutorialStep(S) === null;
  // Botón lateral solo mientras dura el evento (o si quedan premios por cobrar).
  document.getElementById("eventBtn")!.hidden = !started || !isUnlocked(S, "event") || (!(w.active && S.meta.event.week === w.week) && claim === 0 && festToClaim(S) === 0);
  document.getElementById("eventMenuSub")!.textContent = w.active
    ? t("En marcha · termina en {time}", { time: fmtWait(w.end - now) })
    : t("Próximo en {time}", { time: fmtWait(w.next - now) });
  // Premio nuevo desbloqueado: banda dorada (no al cargar la partida).
  const reached = eventTiersReached(S);
  if (eventReached >= 0 && reached > eventReached && started) {
    fx("milestone", true);
    banner(root, "🎉", t("¡Premio del evento desbloqueado!"));
  }
  eventReached = reached;
}

/* ---------- Próximo objetivo ---------- */

let goalAction: ReturnType<typeof nextGoal> = null;

function updateGoal(now: number, top: number, tutorialShown: boolean): void {
  const el = document.getElementById("goal")!;
  const g = tutorialShown || activeSheet() || S.view.scene === "fest" ? null : nextGoal(S, now);
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
    act.addBoost(S, clockNow());
    say(t("Modo hustle: +{h} h ganando el doble", { h: boostHours(S) }));
  }
});

/* ---------- Olas turísticas (Miami) y precio del oro (Dubái) ---------- */

let waveWasActive = false;
let goldWasTop = false;

function updateWave(now: number): void {
  const el = document.getElementById("wave")!;
  const tw = tourism(S, now);
  const g = gold(S, now);
  // Pantalla limpia: si ya hay una tarjeta del negocio, la de la ola o el oro solo sale cuando está activa.
  const busy = !document.getElementById("twist")!.hidden;
  const quiet = busy && ((tw && !tw.active) || (g && !g.locked && g.mult < GOLD.max * 0.9));
  el.hidden = (!tw && !g) || !!quiet;
  el.classList.toggle("gold", !!g);
  if (el.hidden) return;
  el.style.bottom = `${document.getElementById("bar")!.offsetHeight + 10}px`;
  const btn = document.getElementById("waveBtn") as HTMLButtonElement;
  const txt = document.getElementById("waveTxt")!;
  if (g) {
    const top = g.locked || g.mult >= GOLD.max * 0.9;
    el.classList.toggle("on", top);
    btn.hidden = top;
    btn.lastChild!.textContent = t("Fijar x{n}", { n: GOLD.max });
    txt.innerHTML = g.locked
      ? `<b>🥇 ${t("Contrato de oro: ventas x{n}", { n: GOLD.max })}</b>${fmtTime(g.left / 1000)}`
      : `<b>🥇 ${t("Oro: ventas x{n}", { n: g.mult.toFixed(1).replace(".", lang === "es" ? "," : ".") })} ${g.rising ? "📈" : "📉"}</b>${top ? t("¡Precio máximo!") : t("Máximo en {time}", { time: fmtTime(g.peakIn / 1000) })}`;
    if (top && !goldWasTop && !g.locked) {
      fx("milestone", true);
      banner(root, "🥇", t("¡El oro está en máximos! Ventas x{n}", { n: GOLD.max }));
    }
    goldWasTop = top;
    return;
  }
  el.classList.toggle("on", tw!.active);
  btn.hidden = tw!.active;
  btn.lastChild!.textContent = t("Atraer ya");
  txt.innerHTML = tw!.active
    ? `<b>🌊 ${t("¡Ola de turistas! Ventas x{n}", { n: TOURISM.mult })}</b>${fmtTime(tw!.left / 1000)}`
    : `<b>🌊 ${t("Próxima ola")}</b>${t("en {time}", { time: fmtTime(tw!.next / 1000) })}`;
  if (tw!.active && !waveWasActive) {
    fx("milestone", true);
    banner(root, "🌊", t("¡Llegan los turistas! Ventas x{n} durante {time}", { n: TOURISM.mult, time: fmtTime(tw!.left / 1000) }));
  }
  waveWasActive = tw!.active;
}

document.getElementById("waveBtn")!.addEventListener("click", async () => {
  if (gold(S, clockNow())) {
    if (await watchAd("gold_lock")) lockGold(S, clockNow());
  } else if (await watchAd("tourist_wave")) callWave(S, clockNow());
});

/* ---------- Mecánicas de cada negocio (pedidos, crítico, hype, investigación) ---------- */

const twistEl = document.getElementById("twist")!;

function updateTwist(): void {
  const html = meta.tutorialStep(S) === null ? twistCardHtml(S) : null;
  twistEl.hidden = !html;
  if (!html) return;
  if (twistEl.dataset.html !== html) {
    twistEl.dataset.html = html;
    twistEl.innerHTML = html;
  }
  const wave = document.getElementById("wave")!;
  twistEl.style.bottom = `${document.getElementById("bar")!.offsetHeight + 10 + (wave.hidden ? 0 : wave.offsetHeight + 8)}px`;
  if (!modalOpen() && !activeSheet())
    maybeIntro(ctx, (title, icon, text, done) => {
      done();
      modal(root, { title, amount: icon, text, actions: [{ label: t("¡Entendido!"), run: () => {} }] });
    });
}

twistEl.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-tw]");
  if (b) void twistAction(ctx, b.dataset.tw!);
});

/* ---------- «Mejorar todo» ---------- */

const autoBtn = document.getElementById("autoBtn") as HTMLButtonElement;

function updateAuto(now: number): void {
  const show = S.view.scene === "business" && meta.tutorialStep(S) === null && !!S.biz[S.view.id]?.owned;
  // El 💸 viral va justo encima de la barra y de la tarjeta de la mecánica; «Mejorar todo», encima de él.
  const base = document.getElementById("bar")!.offsetHeight + overlayHeight() + 12;
  if (viralEl) viralEl.style.bottom = `${base}px`;
  autoBtn.hidden = !show;
  if (!show) return;
  autoBtn.style.bottom = `${base + (viralEl ? 88 : 0)}px`;
  const free = autoFreeLeft(S, now);
  const txt = !isUnlocked(S, "auto") ? "" : free === Infinity ? "∞" : free > 0 ? t("{n} hoy", { n: free }) : autoAdLeft(S, now) > 0 ? "▶" : "🔒";
  const el = document.getElementById("autoLeft")!;
  if (el.textContent !== txt) el.textContent = txt;
}

async function runAuto(withAd: boolean, spendAll: boolean): Promise<void> {
  if (S.view.scene !== "business") return;
  const id = S.view.id;
  if (withAd && !(await watchAd("auto_upgrade"))) return;
  if (!spendAutoUse(S, clockNow(), withAd)) return;
  const r = autoUpgrade(S, id, clockNow(), spendAll);
  analytics.track("auto_upgrade", { steps: r.steps, ad: withAd, unlimited: autoUnlimited(S), all: spendAll });
  fx("milestone", true);
  floatAt(autoBtn, `+${money(Math.max(0, r.after - r.before))}/s`);
  banner(root, "⚡", t("{n} mejoras · ahora ganas {m}/s", { n: r.steps, m: money(r.after) }));
}

/** Enseña antes lo que va a hacer «Mejorar todo» y pide confirmación (y el uso, si hace falta). */
function offerAuto(spendAll: boolean): void {
  if (S.view.scene !== "business") return;
  const now = clockNow();
  const plan = planAuto(S, S.view.id, now, spendAll);
  if (!plan.steps) {
    if (plan.savingFor && !spendAll)
      return modal(root, {
        title: t("Ahorrando para {biz}", { biz: plan.savingFor }),
        amount: "🐷",
        text: t("Tu siguiente negocio está muy cerca, así que «Mejorar todo» no toca ese dinero."),
        actions: [
          { label: t("Seguir ahorrando"), run: () => {} },
          { label: t("Gastarlo igualmente"), run: () => offerAuto(true) },
        ],
      });
    return say(plan.waiting ? t("En menos de 2 minutos podrás pagar una mejora mucho mejor: espera un poco") : t("Aún no tienes dinero para ninguna mejora"));
  }
  const free = autoFreeLeft(S, now);
  const actions: { label: string; ad?: boolean; run: () => void }[] = [];
  if (free > 0) actions.push({ label: free === Infinity ? t("Mejorar") : t("Mejorar ({n} hoy)", { n: free }), run: () => void runAuto(false, spendAll) });
  else if (autoAdLeft(S, now) > 0) actions.push({ ad: true, label: t("Ver anuncio y mejorar"), run: () => void runAuto(true, spendAll) });
  if (free <= 0) actions.push({ label: t("Sin límite: Gestor automático"), run: () => openShop(ctx) });
  if (plan.savingFor && !spendAll) actions.push({ label: t("Gastarlo todo (sin guardar para {biz})", { biz: plan.savingFor }), run: () => offerAuto(true) });
  actions.push({ label: t("Cancelar"), run: () => {} });
  const notes = [
    plan.savingFor && !spendAll ? t("Guarda el dinero para {biz}, que ya casi puedes comprar.", { biz: plan.savingFor }) : "",
    plan.waiting ? t("Deja algo para una mejora mejor que podrás pagar en menos de 2 minutos.") : "",
    free <= 0 ? t("Hoy ya has usado tus {n} mejoras automáticas gratis.", { n: AUTO.freePerDay }) : "",
  ].filter(Boolean);
  modal(root, {
    title: t("Mejorar todo"),
    amount: `+${money(Math.max(0, plan.after - plan.before))}/s`,
    text: [t("Gastarás {m} en {n} mejoras: de {a}/s a {b}/s.", { m: money(plan.spent), n: plan.steps, a: money(plan.before), b: money(plan.after) }), ...notes].join(" "),
    actions,
  });
}

autoBtn.addEventListener("click", () => {
  if (!isUnlocked(S, "auto")) return showLocked(root, S, "auto");
  seen("auto");
  offerAuto(false);
});

/* ---------- Rangos de los puestos (bronce … leyenda) ---------- */

let rankState: GameState | null = null;
let rankPrev: Record<string, number> = {};

/**
 * Celebra cada ascenso de rango una sola vez, venga de donde venga la mejora (panel, Imperio, comprar
 * al máximo). Al cambiar de partida (ciudad nueva, salir a bolsa, cargar) solo se toma la foto.
 */
function watchRanks(): void {
  const snap = rankSnapshot(S);
  if (rankState !== S) {
    rankState = S;
    rankPrev = snap;
    return;
  }
  const ups = rankUps(rankPrev, snap);
  rankPrev = snap;
  if (!ups.length) return;
  const top = ups.reduce((a, u) => (u.rank > a.rank ? u : a));
  const r = rankInfo(top.rank)!;
  const def = bizList(S).find((d) => d.id === top.bizId);
  if (!def) return;
  const part = top.station.kind === "floor" ? floorLabel(def, top.station.index) : top.station.kind === "transport" ? def.transportName : def.saleName;
  const more = ups.length > 1 ? " " + t("(y {n} más)", { n: ups.length - 1 }) : "";
  if (top.rank >= BIG_RANK && !modalOpen()) {
    void celebrate(root, {
      icon: r.icon,
      title: t("¡Rango {rank}!", { rank: r.name }),
      subtitle: t("{part} de tu {biz} sube a {rank}. Se nota en el recinto: pedestal, brillo y medalla nuevos.", { part, biz: def.name, rank: r.name }) + more,
      highlight: nextRankText(top.rank),
      color: `#${r.color.toString(16).padStart(6, "0")}`,
    });
  } else {
    fx("milestone", true);
    banner(root, r.icon, t("{part} sube a {rank}", { part, rank: r.name }) + more);
  }
}

const nextRankText = (rank: number) => {
  const next = rankInfo(rank + 1);
  return next ? t("Siguiente: {icon} {rank} en el nivel {n}", { icon: next.icon, rank: next.name, n: next.min }) : t("¡Rango máximo!");
};

/* ---------- Carrera de fundadores (Dubái) ---------- */

let founderBusy = false;

/** Pide al servidor el puesto de llegada a Dubái y, si está entre los primeros, da el ejecutivo fundador. */
async function syncFounder(): Promise<void> {
  const now = clockNow();
  if (founderBusy || !founderPending(S, now)) return;
  if (!leagueJoined(S)) {
    if (S.meta.founder.asked || modalOpen()) return;
    S.meta.founder.asked = true;
    modal(root, {
      title: t("Carrera de fundadores"),
      amount: "🏁",
      text: t("Los {n} primeros jugadores en llegar a Dubái reciben un ejecutivo fundador exclusivo. Únete a la Liga (es gratis) para reservar tu puesto.", { n: FOUNDERS.spots }),
      actions: [
        { label: t("Ver la Liga"), run: () => openLeague(ctx) },
        { label: t("Ahora no"), run: () => {} },
      ],
    });
    return;
  }
  founderBusy = true;
  const L = S.meta.league;
  try {
    const r = await leagueApi.founder({ id: L.id!, secret: L.secret! }, FOUNDERS.city, deviceId());
    const exec = applyFounderRank(S, r.rank);
    analytics.track("founder", { rank: r.rank });
    save();
    if (exec) {
      void celebrate(root, {
        icon: "🤴",
        title: t("¡Eres fundador de Dubái!"),
        subtitle: t("Llegaste el n.º {n}. Tu ejecutivo fundador es legendario y da +{pct} % extra. Asígnalo desde Ejecutivos.", { n: r.rank, pct: FOUNDERS.bonus * 100 }),
        highlight: t("Fundador #{n}", { n: r.rank }),
        color: "#f5c542",
      });
    } else {
      banner(root, "🏁", t("Llegaste a Dubái el n.º {n}", { n: r.rank }));
    }
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    applyFounderError(S, code, clockNow());
  } finally {
    founderBusy = false;
  }
}

/* ---------- Evento viral ---------- */

let viralEl: HTMLButtonElement | null = null;
let viralUntil = 0;

function hideViral(): void {
  viralEl?.remove();
  viralEl = null;
  S.nextViral = clockNow() + (CONFIG.viralMinSec + Math.random() * (CONFIG.viralMaxSec - CONFIG.viralMinSec)) * 1000;
}

function viralTick(now: number): void {
  if (!viralEl && now >= S.nextViral && viralAllowed(S) && !modalOpen() && !activeSheet() && S.totalEarned > 50) {
    viralEl = document.createElement("button");
    viralEl.className = "viral";
    viralEl.innerHTML = `${icon("coin")}<span class="viral-callout">${t("¡Pedido grande!")}</span>`;
    viralEl.setAttribute("aria-label", t("Oportunidad"));
    viralUntil = now + CONFIG.viralVisibleSec * 1000;
    viralEl.onclick = () => {
      const reward = Math.max(passiveRate(S, clockNow(), false) * 600, S.cash * 0.15, 100);
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

/* ---------- Temporada: fantasmas de Halloween que traen caramelos ---------- */

let ghostEl: HTMLButtonElement | null = null;
let ghostUntil = 0;

function hideGhost(): void {
  ghostEl?.remove();
  ghostEl = null;
  scheduleVisitor(S, clockNow());
}

function ghostTick(now: number): void {
  if (ghostEl && now > ghostUntil) hideGhost();
  if (ghostEl || viralEl || modalOpen() || activeSheet() || meta.tutorialStep(S) !== null || !visitorDue(S, now)) return;
  const season = activeSeason(now)!;
  const amount = visitorCandy();
  const el = document.createElement("button");
  el.className = "season-ghost";
  el.innerHTML = icon("ghost", season.def.visitor);
  el.setAttribute("aria-label", t("Fantasma con caramelos"));
  el.style.left = `${12 + Math.random() * 60}%`;
  el.style.top = `${30 + Math.random() * 30}%`;
  el.onclick = () => {
    hideGhost();
    fx("gems", true);
    modal(root, {
      title: t("¡Buuu! Un fantasma con caramelos"),
      amount: `+${amount} ${season.def.currency}`,
      text: t("Mira un anuncio corto y te da el triple."),
      actions: [
        {
          ad: true,
          label: t("Ver anuncio: x{n}", { n: SEASON.adMult }),
          run: async () => {
            const ok = await watchAd("season_x3");
            const got = collectVisitor(S, amount, clockNow(), ok);
            say(`+${got} ${season.def.currency}`);
          },
        },
        { label: t("Cobrar {n}", { n: amount }), run: () => say(`+${collectVisitor(S, amount, clockNow(), false)} ${season.def.currency}`) },
      ],
    });
  };
  ghostEl = el;
  ghostUntil = now + 20e3;
  root.appendChild(el);
}

/* ---------- Visitas: camión de suministros y cliente VIP ---------- */

let visitorEl: HTMLButtonElement | null = null;
let visitorKind: OfferKind | null = null;
let visitorUntil = 0;

function hideVisitor(): void {
  if (visitorKind) rescheduleOffer(S, visitorKind, clockNow());
  activeBizScene()?.dismissVisitor();
  visitorEl?.remove();
  visitorEl = null;
  visitorKind = null;
}

function visitorTick(now: number): void {
  // Se van si cambias de negocio o de escena; nunca a la vez que el 💸 viral.
  const here = S.view.scene === "business" ? S.view.id : null;
  if (visitorEl && (now > visitorUntil || visitorEl.dataset.biz !== here)) hideVisitor();
  if (visitorEl && visitorKind && activeBizScene()) {
    activeBizScene()!.presentVisitor(visitorKind, visitorEl);
    return;
  }
  if (visitorEl || viralEl || !here || modalOpen() || activeSheet()) return;
  const kind = dueOffer(S, now);
  if (!kind) return;
  const el = document.createElement("button");
  el.className = `world-visitor ${kind}`;
  el.dataset.biz = here;
  el.innerHTML = `<span class="visitor-dot"></span><b>${kind === "truck" ? t("Suministros") : "VIP"}</b><span class="visitor-arrow" aria-hidden="true">›</span>`;
  el.setAttribute("aria-label", kind === "truck" ? t("Camión de suministros") : t("Cliente VIP"));
  el.onclick = () => (kind === "truck" ? offerTruck(here) : offerVip());
  visitorEl = el;
  visitorKind = kind;
  visitorUntil = now + OFFERS.visibleSec * 1000;
  root.appendChild(el);
  // Si la escena aún no ha arrancado, la presenta el siguiente tick (arriba).
  activeBizScene()?.presentVisitor(kind, el);
  fx("click");
  analytics.track("offer_shown", { kind });
}

function offerTruck(id: string): void {
  const reward = truckReward(S, id, clockNow());
  hideVisitor();
  modal(root, {
    title: t("¡Camión de suministros!"),
    amount: money(reward),
    text: t("Trae material para {min} minutos de ventas. Mira un anuncio corto y es tuyo.", { min: OFFERS.truckMinutes }),
    actions: [
      {
        ad: true,
        label: t("Ver anuncio y descargar"),
        run: async () => {
          if (!(await watchAd("supply_truck"))) return;
          earn(S, reward, id);
          fx("coin");
          banner(root, "🚚", t("+{m} en suministros", { m: money(reward) }));
        },
      },
      { label: t("Ahora no"), run: () => {} },
    ],
  });
}

function offerVip(): void {
  hideVisitor();
  modal(root, {
    title: t("¡Un cliente VIP!"),
    amount: `${OFFERS.vipGems} 💎`,
    text: t("Quiere un pedido especial y paga en diamantes. Mira un anuncio corto para atenderle."),
    actions: [
      {
        ad: true,
        label: t("Ver anuncio y atender"),
        run: async () => {
          if (!(await watchAd("vip_client"))) return;
          const gems = claimVip(S, clockNow());
          if (gems) banner(root, "🤵", t("+{n} 💎 del cliente VIP", { n: gems }));
        },
      },
      { label: t("Ahora no"), run: () => {} },
    ],
  });
}

/* ---------- Ganancias offline ---------- */

function offerOffline(): void {
  offlinePending = false;
  const { seconds, amount } = offlineEarnings(S, clockNow());
  S.lastSeen = clockNow();
  if (seconds < 60 || amount < 1) return;
  modal(root, {
    title: t("¡Bienvenido de nuevo!"),
    amount: money(amount),
    text: t("Tus gerentes han ganado esto en {time} mientras no estabas.", { time: fmtTime(seconds) }),
    list: awaySummary(S, clockNow(), S.cash + amount * 3),
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
let sessionStart = clockNow();

function leaving(): void {
  save();
  analytics.track("session_end", { seconds: Math.round((clockNow() - sessionStart) / 1000) });
  void analytics.flush(true);
  void syncLeague(S);
  void syncAccount(ctx, true);
  void notifications.schedule(planNotifications(S, clockNow()));
}

/** Al volver: ya no hacen falta los avisos; se ofrecen las ganancias offline. */
async function returning(): Promise<void> {
  sessionStart = clockNow();
  analytics.track("session_start", { day: daysSinceInstall(), city: S.city, tutorial: S.meta.tutorial, lang, cfg: remoteVersion });
  void notifications.cancelAll();
  offlinePending = true;
  // Lo ganado fuera se calcula con la hora del servidor: adelantar la del móvil no da más.
  await waitTime();
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
  const now = clockNow();
  // Reloj real: el delta de Phaser se suaviza y ralentizaría el juego en móviles lentos.
  const wall = performance.now();
  const elapsed = (wall - lastStep) / 1000;
  lastStep = wall;
  // Tras volver de segundo plano no se simula el hueco: lo paga offerOffline().
  const dt = elapsed > 2 ? 0 : elapsed;
  frameSales = tick(S, dt, now);
  // La feria del evento avanza aparte, con sus fichas (fest.ts).
  const festSales = tickFest(S, dt, now);
  if (festSales.length) frameSales = frameSales.concat(festSales);
  twistTick(ctx, frameSales, dt);
  if (playingNow(now)) trackPlay(S, now, dt);
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
  visitorTick(now);
  ghostTick(now);
  if (time - lastUi > 120) {
    lastUi = time;
    updateHeader(S, now);
    updateBar(S, now);
    activeSheet()?.update?.();
    updateMeta(now);
    updateWave(now);
    updateTwist();
    updateAuto(now);
    watchRanks();
    decorateIcons(root);
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

let booted = false;

async function boot(): Promise<void> {
  // Errores del juego al panel de la beta (anónimos; ver docs/ANALITICA.md).
  installErrorReporting(() => ({ view: S?.view.scene === "business" ? `biz:${S.view.id}` : "city", city: S?.city ?? "" }));
  // Ajustes desde el servidor: los últimos guardados al momento y los nuevos en cuanto lleguen.
  applyRemoteConfig(cachedConfig());
  void fetchConfig().then((cfg) => cfg && applyRemoteConfig(cfg));
  await loadIcons();
  const loaded = await loadSave();
  // Primero el reloj guardado (nunca hacia atrás); luego la hora del servidor.
  restoreClock((loaded.data as { clock?: unknown } | null)?.clock);
  S = migrate(loaded.data, clockNow());
  if (loaded.tampered) {
    // La partida se editó fuera del juego: la edición no se aplica y la Liga lo sabrá.
    addFlag(S, "save");
    save();
    setTimeout(
      () =>
        modal(root, {
          title: t("Partida modificada"),
          text: loaded.restored
            ? t("La partida guardada se ha modificado fuera del juego. Hemos recuperado la última partida válida. Los cambios hechos a mano no cuentan y la cuenta queda en revisión para la Liga.")
            : t("La partida guardada se ha modificado fuera del juego y no se puede usar. Empiezas una partida nueva y la cuenta queda en revisión para la Liga."),
          actions: [{ label: t("Entendido"), run: () => {} }],
        }),
      1200,
    );
  }
  const firstSync = waitTime();
  applySettings();
  updateHeader(S, clockNow());
  renderBar(S);
  // La primera escena se lanza cuando el arte está listo y la partida cargada.
  saveLoaded = true;
  startView();
  await firstSync;
  offerOffline();
  booted = true;
  setInterval(() => void syncTime(), 15 * 60e3);
  setInterval(save, 5000);
  analytics.track("session_start", { day: daysSinceInstall(), city: S.city, tutorial: S.meta.tutorial, lang, cfg: remoteVersion });
  setInterval(() => void analytics.flush(), 30_000);
  // Liga: envía los puntos pendientes cada 20 s (si no hay conexión, esperan en la cola)
  setInterval(() => {
    void syncLeague(S).then((added) => {
      if (added > 0) banner(root, "🏅", t("+{n} puntos de Liga", { n: added }));
    });
    if (reachedFounderCity(S)) void syncFounder();
    void syncAccount(ctx);
  }, 20_000);
  document.addEventListener("visibilitychange", () => {
    sound.setHidden(document.hidden);
    if (document.hidden) leaving();
    else void returning();
  });
  window.addEventListener("pagehide", leaving);
  void App.addListener("appStateChange", ({ isActive }) => {
    sound.setHidden(!isActive);
    if (isActive) void returning();
    else leaving();
  }).catch(() => {});
  // A quien ya terminó el tutorial (partidas anteriores) se le piden los avisos una vez.
  if (meta.tutorialStep(S) === null) setTimeout(askNotificationsOnce, 4000);
  ads.init().catch(() => {});
  // Compras únicas ya hechas (móvil nuevo o reinstalación): se entregan solas
  void store.owned().then((owned) => owned.forEach((o) => grantProduct(S, o.id, o.order, clockNow())));
}

/** Beta web: una vez, explica que es una versión de prueba y dónde se guarda la partida. */
function welcomeBeta(): void {
  try {
    if (localStorage.getItem("betaSeen")) return;
    localStorage.setItem("betaSeen", "1");
  } catch {
    return;
  }
  modal(root, {
    title: t("¡Bienvenido a la beta!"),
    text: t("Estás jugando la versión web de prueba. Tu partida se guarda en este navegador: si borras sus datos o cambias de dispositivo, empezarás de cero. Muy pronto, en Google Play."),
    actions: [{ label: t("¡A jugar!"), run: () => {} }],
  });
}

initPwa();
void boot().then(() => {
  if (WEB_BETA) welcomeBeta();
});
// Para depurar desde la consola del navegador (solo con `npm run dev`).
if (import.meta.env.DEV) Object.assign(window, { __game: { get state() { return S; }, game, sound, setLuck, analytics } });
