import { Capacitor } from "@capacitor/core";
import { fmt, fmtTime } from "../game/format";
import { LEAGUE_POINTS, PLAY, STREAK_POINTS, leagueEvent, leagueJoined } from "../game/league";
import { dayKey } from "../game/meta";
import type { GameState } from "../game/state";
import { leagueApi, type LeagueStatus, type Payout } from "../platform/league";
import { gem } from "./icons";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { openLegal } from "./legal";
import { analytics, minutesSinceInstall } from "../platform/analytics";
import { euros, ordinal, t } from "../i18n";

/**
 * Pantalla de la Liga Millonario: cada semana gana quien más juega (ver docs/LIGA.md).
 * El servidor calcula puntos, puestos y ganadores.
 */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

/** Cómo se puntúa (los valores reales los da el servidor; estos son los de por defecto). */
const actions = (st: LeagueStatus | null): { text: string; pts: number }[] => [
  { text: t("Cada 5 min jugando (primeras {h} h del día)", { h: PLAY.fullHours }), pts: st?.rules.blockPoints ?? PLAY.blockPoints },
  { text: t("Cada 5 min jugando (de {a} a {b} h)", { a: PLAY.fullHours, b: PLAY.fullHours + PLAY.halfHours }), pts: st?.rules.halfPoints ?? PLAY.halfPoints },
  { text: t("Entrar cada día"), pts: LEAGUE_POINTS.login },
  { text: t("Entrar 5 días distintos en la semana"), pts: STREAK_POINTS.five },
  { text: t("Entrar los 7 días de la semana"), pts: STREAK_POINTS.seven },
  { text: t("Reto del día"), pts: LEAGUE_POINTS.daily_reto },
  { text: t("Cada misión diaria (menos «mira anuncios»)"), pts: LEAGUE_POINTS.mission },
  { text: t("Completar las 3 misiones del día"), pts: LEAGUE_POINTS.missions_all },
  { text: t("Cada reto de la semana"), pts: LEAGUE_POINTS.weekly_reto },
  { text: t("Completar los 4 retos de la semana"), pts: LEAGUE_POINTS.weekly_all },
];

/** «1 h 25 min» / «40 min». */
const playTime = (blocks: number) => {
  const m = blocks * 5;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
const place = ordinal;
/** Puntos enteros: 1490, no «1.49 K». */
const pts = (n: number) => (n < 1e6 ? String(Math.round(n)) : fmt(n));

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Premio en texto: euros si los hay; si no, diamantes (fase 0). */
function prize(cents: number, gems: number): string {
  if (cents > 0) return euros(cents);
  return gems > 0 ? `${gems} ${gem()}` : "—";
}

/** Último estado conocido (para el punto rojo del botón lateral sin preguntar al servidor). */
let lastStatus: LeagueStatus | null = null;
let lastPayouts: Payout[] = [];
export const leagueHasPrize = () => !!lastStatus?.unclaimed.some((u) => u.gems > 0) || lastPayouts.some((p) => p.state === "need_data");

/* ---------- Sincronización: envía la cola de eventos ---------- */

let syncing = false;
let loginDay = "";

/** Envía los eventos pendientes. Devuelve los puntos sumados (0 si no hay conexión o nada nuevo). */
export async function syncLeague(s: GameState, now = Date.now()): Promise<number> {
  if (!leagueJoined(s) || syncing) return 0;
  const today = dayKey(now);
  if (loginDay !== today) {
    leagueEvent(s, "login", today);
    loginDay = today;
  }
  const L = s.meta.league;
  if (!L.queue.length) return 0;
  syncing = true;
  const batch = L.queue.slice(0, 50);
  try {
    const res = await leagueApi.events({ id: L.id!, secret: L.secret! }, batch);
    // Solo se quitan los que se enviaron (pueden haber llegado otros mientras tanto)
    L.queue = L.queue.filter((e) => !batch.includes(e));
    return res.added;
  } catch {
    return 0;
  } finally {
    syncing = false;
  }
}

/* ---------- Pantalla ---------- */

export function openLeague(ctx: PanelCtx): void {
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🏅</span><div><h3>${t("Liga Millonario")}</h3><p class="muted" data-sub>${t("Cada semana gana quien más juega. Todos empiezan de cero el lunes.")}</p></div></div>
     <div data-body><p class="muted">${t("Cargando…")}</p></div>`,
  );
  const body = $(sheet.el, "[data-body]");
  body.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("[data-legal]");
    if (!a) return;
    e.preventDefault();
    openLegal(ctx, "bases-liga");
  });

  const how = () => `<details class="lg-how"><summary>${t("¿Cómo se ganan puntos?")}</summary>
      <div class="lg-table">${actions(lastStatus).map((a) => `<span>${a.text}</span><b>+${a.pts}</b>`).join("")}</div>
      <p class="small muted">${t("Cuenta el tiempo jugando de verdad: con el juego abierto y tocando la pantalla. Más de {h} h al día no suman.", { h: PLAY.fullHours + PLAY.halfHours })}
      <b>${t("Ver anuncios o comprar no da puntos, y el tiempo viendo un anuncio no cuenta.")}</b></p>
    </details>`;

  const rules = () => `<details class="lg-how"><summary>${t("Bases de la Liga")}</summary>
      <p class="small muted">${t("Participación gratuita. La semana va de lunes 00:00 a domingo 23:59 (hora de Madrid) y todos empiezan de cero: gana quien más puntos consigue jugando esa semana, sin importar cuánto tiempo lleve en el juego. Hay premios del 1.º al 10.º. Quien gana un premio en dinero descansa {n} semana: puede ganar diamantes, pero el dinero pasa al siguiente. Se revisan las partidas ganadoras; las trampas dejan fuera de la Liga. Las compras y los anuncios no influyen.", { n: lastStatus?.rules.cooldownWeeks ?? 1 })}
      ${
        lastStatus && lastStatus.prizes.cents.some((c) => c > 0)
          ? t("Los premios en dinero solo pueden cobrarlos mayores de 18 años: se pide un email de contacto, se revisa la partida y se pagan con tarjeta regalo o PayPal. Las bases completas están publicadas en la web del juego.")
          : t("Ahora mismo los premios son dentro del juego (diamantes). Si hay premios en dinero, se publicarán unas bases completas antes de empezar la semana.")
      } ${t("El dinero del juego es ficticio: no tiene valor real y no se puede canjear.")} ${t("Apple y Google no patrocinan ni participan en esta Liga.")}</p>
      <p class="small"><a href="#" data-legal="bases-liga">${t("Leer las bases completas")}</a></p>
    </details>`;

  const webNote = () => (Capacitor.isNativePlatform() ? "" : `<p class="small muted">${t("Beta web: los premios de la Liga son dentro del juego. Los premios en dinero son solo para la app.")}</p>`);

  /* --- Aún no apuntado --- */
  const renderJoin = (err = "") => {
    body.innerHTML = `
      <div class="lg-hero"><b>🏆 ${t("Premios cada semana")}</b><span>${t("Para los 10 que más jueguen. Todos empiezan de cero cada lunes.")}</span></div>
      ${webNote()}${how()}${rules()}
      <label class="lg-check"><input type="checkbox" data-accept> ${t("Acepto las bases de la Liga")}</label>
      <button class="buy big wide" data-join disabled><span>${t("Unirme a la Liga")}</span><b>${t("Gratis")}</b></button>
      ${err ? `<p class="small" style="color:var(--red)">${err}</p>` : ""}`;
    const accept = $<HTMLInputElement>(body, "[data-accept]");
    const join = $<HTMLButtonElement>(body, "[data-join]");
    accept.onchange = () => (join.disabled = !accept.checked);
    join.onclick = async () => {
      join.disabled = true;
      try {
        const r = await leagueApi.register();
        const L = ctx.state().meta.league;
        L.id = r.id;
        L.secret = r.secret;
        L.nickname = r.nickname;
        analytics.track("league_join", { minutes: minutesSinceInstall() });
        ctx.fx("unlock", true);
        ctx.banner("🏅", t("¡Ya estás en la Liga!"));
        await syncLeague(ctx.state());
        void load();
      } catch {
        renderJoin(t("No hay conexión con la Liga. Inténtalo en un momento."));
      }
    };
  };

  /* --- Apuntado --- */
  /** Premios en dinero (fase 1): pedir email y mayoría de edad, «en revisión» o «pagado». */
  const payoutsHtml = (list: Payout[]) =>
    list
      .map((p) =>
        p.state === "need_data"
          ? `<div class="lg-pay" data-week="${esc(p.week)}"><b>💶 ${t("¡Has ganado {m}!", { m: euros(p.cents) })}</b>
              <span>${t("Para recibirlo, déjanos un email de contacto. Revisaremos la partida y te lo enviaremos (tarjeta regalo o PayPal).")}</span>
              <input type="email" data-email placeholder="${t("tu@email.com")}" autocomplete="email">
              <label class="lg-check"><input type="checkbox" data-adult> ${t("Soy mayor de 18 años y acepto las bases")}</label>
              <button class="buy wide" data-pay><span>${t("Pedir mi premio")}</span><b>${euros(p.cents)}</b></button></div>`
          : `<div class="lg-pay ${p.state}"><b>${p.state === "paid" ? "✅ " + t("Premio pagado") : "⏳ " + t("Premio en revisión")} · ${euros(p.cents)}</b>
              <span>${p.state === "paid" ? t("Semana {week}. ¡Enhorabuena!", { week: esc(p.week) }) : t("Te escribiremos al email que nos diste en unos días.")}</span></div>`,
      )
      .join("");

  const renderStatus = (st: LeagueStatus, payouts: Payout[] = []) => {
    const me = st.me;
    const left = Math.max(0, (new Date(st.week.endsAt).getTime() - Date.now()) / 1000);
    const anyCash = st.prizes.cents.some((c) => c > 0);
    const gems = st.prizes.gems;
    const won = st.unclaimed.reduce((a, u) => a + u.gems, 0); // los premios en dinero van aparte (payouts)
    const closesIn = left >= 86400 ? `${Math.floor(left / 86400)} d ${Math.floor((left % 86400) / 3600)} h` : fmtTime(left);
    $(sheet.el, "[data-sub]").textContent = t("Semana {n} · cierra en {time}", { n: st.week.id.split("-W")[1], time: closesIn });
    body.innerHTML = `
      ${payoutsHtml(payouts)}
      ${won ? `<div class="lg-won"><b>🎉 ${t("¡Has ganado en la Liga!")}</b><button class="claim" data-claim>${t("Cobrar")} +${won} ${gem()}</button></div>` : ""}
      <div class="lg-prizes">
        ${[0, 1, 2].map((i) => `<div><span>${["🥇", "🥈", "🥉"][i]} ${place(i + 1)}</span><b>${prize(st.prizes.cents[i] ?? 0, gems[i] ?? 0)}</b></div>`).join("")}
        <div><span>${t("Del 4.º al {n}.º", { n: gems.length })}</span><b>${gems.length > 3 ? `${Math.min(...gems.slice(3))}–${Math.max(...gems.slice(3))} ${gem()}` : "—"}</b></div>
      </div>
      ${anyCash && !me.cashEligible && Capacitor.isNativePlatform() ? `<p class="small muted">${t("Esta semana descansas de premios en dinero porque ganaste uno: puedes ganar diamantes y salir en el Muro de la fama.")}</p>` : ""}
      <div class="lg-me">
        <div class="lg-div">🏅<small>${me.rank ? `#${me.rank}` : "—"}</small></div>
        <div><b>${t("{n} puntos", { n: pts(me.points) })}</b><span>${me.rank ? t("Puesto #{rank} de {total}", { rank: me.rank, total: st.players }) : t("Aún sin puntos esta semana")}</span></div>
        <div class="lg-tix"><b>⏱️ ${playTime(me.todayBlocks)}</b><small>${me.todayBlocks < st.rules.fullBlocks ? t("hoy") : me.todayBlocks < st.rules.fullBlocks + st.rules.halfBlocks ? t("hoy · a mitad") : t("hoy · máximo")}</small></div>
      </div>
      <h4 class="lg-h">${t("Clasificación")}</h4>
      <ol class="lg-top">${st.top.map((p) => `<li class="${p.me ? "me" : ""}"><span>${esc(p.nickname)}</span><b>${pts(p.points)}</b></li>`).join("") || `<li class="muted">${t("Sé el primero en sumar puntos esta semana")}</li>`}</ol>
      ${
        st.lastWeek
          ? `<h4 class="lg-h">${t("Ganadores de la semana pasada")}</h4>
        <ul class="lg-win">${st.lastWeek.winners.map((w) => `<li><span>${w.rank ? place(w.rank) : "🏆"} · ${esc(w.nickname)}</span><b>${prize(w.cents, w.gems)}${w.cents > 0 && w.gems > 0 ? ` + ${w.gems} ${gem()}` : ""}</b></li>`).join("") || `<li class="muted">${t("Sin ganadores")}</li>`}</ul>`
          : ""
      }
      ${
        st.fame.length
          ? `<h4 class="lg-h">🏆 ${t("Muro de la fama")}</h4>
        <ul class="lg-win">${st.fame.map((f) => `<li><span>${t("Semana {n}", { n: esc(f.week.split("-W")[1] ?? f.week) })}</span><b>${esc(f.nickname)}</b></li>`).join("")}</ul>`
          : ""
      }
      <div class="lg-nick"><input data-nick maxlength="16" value="${esc(me.nickname)}" aria-label="${t("Tu nombre en la Liga")}"><button class="btn ghost" data-save>${t("Cambiar nombre")}</button></div>
      ${webNote()}${how()}${rules()}`;

    body.querySelectorAll<HTMLElement>(".lg-pay[data-week]").forEach((box) => {
      const btn = box.querySelector<HTMLButtonElement>("[data-pay]")!;
      btn.onclick = async () => {
        const s = ctx.state();
        const email = box.querySelector<HTMLInputElement>("[data-email]")!.value;
        const adult = box.querySelector<HTMLInputElement>("[data-adult]")!.checked;
        if (!adult) return ctx.toast(t("Tienes que ser mayor de 18 años para cobrar premios en dinero"));
        btn.disabled = true;
        try {
          await leagueApi.payout({ id: s.meta.league.id!, secret: s.meta.league.secret! }, box.dataset.week!, email, adult);
          ctx.fx("gems", true);
          ctx.banner("💶", t("¡Recibido! Revisaremos la partida y te escribiremos"));
          void load();
        } catch (e) {
          btn.disabled = false;
          ctx.toast((e as Error).message === "email" ? t("Ese email no parece válido") : t("No hay conexión. Inténtalo en un momento."));
        }
      };
    });

    const claim = body.querySelector<HTMLButtonElement>("[data-claim]");
    if (claim)
      claim.onclick = async () => {
        claim.disabled = true;
        const s = ctx.state();
        try {
          const r = await leagueApi.claim({ id: s.meta.league.id!, secret: s.meta.league.secret! });
          s.meta.gems += r.gems;
          void ctx.celebrate({ icon: "🏅", title: t("¡Premio de la Liga!"), subtitle: t("Gracias por jugar cada día."), highlight: `+${r.gems} 💎` });
          void load();
        } catch {
          claim.disabled = false;
          ctx.toast(t("No hay conexión. Inténtalo en un momento."));
        }
      };
    $<HTMLButtonElement>(body, "[data-save]").onclick = async () => {
      const s = ctx.state();
      const nick = $<HTMLInputElement>(body, "[data-nick]").value;
      try {
        const r = await leagueApi.nickname({ id: s.meta.league.id!, secret: s.meta.league.secret! }, nick);
        s.meta.league.nickname = r.nickname;
        ctx.toast(t("Nombre cambiado"));
        void load();
      } catch {
        ctx.toast(t("Nombre no válido: de 3 a 16 letras o números"));
      }
    };
  };

  const load = async () => {
    const s = ctx.state();
    if (!leagueJoined(s)) return renderJoin();
    await syncLeague(s);
    try {
      const creds = { id: s.meta.league.id!, secret: s.meta.league.secret! };
      const [st, pay] = await Promise.all([leagueApi.status(creds), leagueApi.payouts(creds).catch(() => ({ payouts: [] as Payout[] }))]);
      lastStatus = st;
      lastPayouts = pay.payouts;
      renderStatus(st, pay.payouts);
    } catch {
      body.innerHTML = `<p class="muted">${t("No hay conexión con la Liga. Tus puntos se guardan en el móvil y se enviarán en cuanto vuelva la conexión.")}</p>${how()}`;
    }
  };
  void load();
}
