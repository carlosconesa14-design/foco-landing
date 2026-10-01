import { fmt, fmtTime } from "../game/format";
import { LEAGUE_POINTS, leagueEvent, leagueJoined, type LeagueKind } from "../game/league";
import { dayKey } from "../game/meta";
import type { GameState } from "../game/state";
import { leagueApi, type LeagueStatus, type Payout } from "../platform/league";
import { gem } from "./icons";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { openLegal } from "./legal";
import { analytics, minutesSinceInstall } from "../platform/analytics";
import { euros, t } from "../i18n";

/**
 * Pantalla de la Liga Millonario (fase 0: premios dentro del juego).
 * Ver docs/LIGA.md. El servidor calcula puntos, papeletas, puestos y ganadores.
 */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

const DIV = {
  bronce: { icon: "🥉", get name() { return t("Bronce"); } },
  plata: { icon: "🥈", get name() { return t("Plata"); } },
  oro: { icon: "🥇", get name() { return t("Oro"); } },
} as const;

const actions = (): { kind: LeagueKind; text: string }[] => [
  { kind: "login", text: t("Entrar cada día") },
  { kind: "mission", text: t("Cada misión diaria (menos «mira anuncios»)") },
  { kind: "missions_all", text: t("Completar las 3 misiones del día") },
  { kind: "milestone", text: t("Hito x2 de una parte (máx. 6 al día)") },
  { kind: "floor", text: t("Abrir un puesto") },
  { kind: "tier", text: t("Subir de categoría un negocio") },
  { kind: "business", text: t("Comprar un negocio") },
];

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
    `<div class="sheet-head"><span class="sicon">🏅</span><div><h3>${t("Liga Millonario")}</h3><p class="muted" data-sub>${t("Cada semana: premios para los mejores y un sorteo entre todos")}</p></div></div>
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
      <div class="lg-table">${actions().map((a) => `<span>${a.text}</span><b>+${LEAGUE_POINTS[a.kind]}</b>`).join("")}</div>
      <p class="small muted">${t("Máximo {n} puntos al día: gana quien juega con constancia.", { n: lastStatus?.rules.dailyCap ?? 150 })} <b>${t("Ver anuncios o comprar no da puntos.")}</b>
      ${t("Cada {n} puntos de la semana = 1 papeleta para el sorteo (máx. {max}).", { n: lastStatus?.rules.ticketPoints ?? 100, max: lastStatus?.rules.maxTickets ?? 10 })}</p>
    </details>`;

  const rules = () => `<details class="lg-how"><summary>${t("Bases de la Liga")}</summary>
      <p class="small muted">${t("Participación gratuita. La semana va de lunes 00:00 a domingo 23:59 (hora de Madrid). Al cierre gana el primero de cada división (Bronce, Plata, Oro; se sube con los puntos acumulados) y se sortean {n} premios entre todos los que tengan al menos una papeleta, con más opciones cuantas más papeletas. Un premio por persona y semana. El sorteo usa una semilla secreta cuyo resumen (hash) se publica al empezar la semana y que se revela al cerrar, para que cualquiera pueda comprobarlo. Las compras y los anuncios no influyen.", { n: lastStatus?.prizes.drawWinners ?? 6 })}
      ${
        lastStatus && (lastStatus.prizes.drawCents > 0 || Object.values(lastStatus.prizes.topCents).some((c) => c > 0))
          ? t("Los premios en dinero solo pueden cobrarlos mayores de 18 años: se pide un email de contacto, se revisa la partida y se pagan con tarjeta regalo o PayPal. Las bases completas están publicadas en la web del juego.")
          : t("Ahora mismo los premios son dentro del juego (diamantes). Si hay premios en dinero, se publicarán unas bases completas antes de empezar la semana.")
      } ${t("Apple y Google no patrocinan ni participan en esta Liga.")}</p>
      <p class="small"><a href="#" data-legal="bases-liga">${t("Leer las bases completas")}</a></p>
    </details>`;

  /* --- Aún no apuntado --- */
  const renderJoin = (err = "") => {
    body.innerHTML = `
      <div class="lg-hero"><b>🏆 ${t("Premios cada semana")}</b><span>${t("Para el primero de cada división y un sorteo entre todos los que jueguen.")}</span></div>
      ${how()}${rules()}
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
    const d = DIV[me.division];
    const left = Math.max(0, (new Date(st.week.endsAt).getTime() - Date.now()) / 1000);
    const toTicket = st.rules.ticketPoints - (me.points % st.rules.ticketPoints);
    const won = st.unclaimed.reduce((a, u) => a + u.gems, 0); // los premios en dinero van aparte (payouts)
    const closesIn = left >= 86400 ? `${Math.floor(left / 86400)} d ${Math.floor((left % 86400) / 3600)} h` : fmtTime(left);
    $(sheet.el, "[data-sub]").textContent = t("Semana {n} · cierra en {time}", { n: st.week.id.split("-W")[1], time: closesIn });
    const topPrize = prize(st.prizes.topCents[me.division] ?? 0, st.prizes.topGems[me.division] ?? 0);
    body.innerHTML = `
      ${payoutsHtml(payouts)}
      ${won ? `<div class="lg-won"><b>🎉 ${t("¡Has ganado en la Liga!")}</b><button class="claim" data-claim>${t("Cobrar")} +${won} ${gem()}</button></div>` : ""}
      <div class="lg-prizes">
        <div><span>${t("1.º de {div}", { div: d.name })}</span><b>${topPrize}</b></div>
        <div><span>${t("Sorteo ({n} premios)", { n: st.prizes.drawWinners })}</span><b>${prize(st.prizes.drawCents, st.prizes.drawGems)}</b></div>
      </div>
      <div class="lg-me">
        <div class="lg-div">${d.icon}<small>${d.name}</small></div>
        <div><b>${t("{n} puntos", { n: fmt(me.points) })}</b><span>${me.rank ? t("Puesto #{rank} de {total}", { rank: me.rank, total: st.players }) : t("Aún sin puntos esta semana")}</span></div>
        <div class="lg-tix"><b>🎟️ ${me.tickets}</b><small>${me.tickets >= st.rules.maxTickets ? t("máximo") : t("otra en {n} pts", { n: toTicket })}</small></div>
      </div>
      <h4 class="lg-h">${t("Clasificación")} ${d.icon} ${d.name}</h4>
      <ol class="lg-top">${st.top.map((p) => `<li class="${p.me ? "me" : ""}"><span>${esc(p.nickname)}</span><b>${fmt(p.points)}</b></li>`).join("") || `<li class="muted">${t("Sé el primero en sumar puntos esta semana")}</li>`}</ol>
      ${
        st.lastWeek
          ? `<h4 class="lg-h">${t("Ganadores de la semana pasada")}</h4>
        <ul class="lg-win">${st.lastWeek.winners.map((w) => `<li><span>${w.kind === "top" ? `${DIV[w.division as keyof typeof DIV]?.icon ?? "🏆"} ${t("1.º")}` : "🎟️ " + t("Sorteo")} · ${esc(w.nickname)}</span><b>${prize(w.cents, w.gems)}</b></li>`).join("") || `<li class="muted">${t("Sin ganadores")}</li>`}</ul>
        <details class="lg-how"><summary>${t("Comprobar el sorteo")}</summary><p class="small muted lg-mono">${t("Semilla")}: ${esc(st.lastWeek.seed)}<br>${t("Hash publicado")}: ${esc(st.lastWeek.seedHash)}</p></details>`
          : ""
      }
      <div class="lg-nick"><input data-nick maxlength="16" value="${esc(me.nickname)}" aria-label="${t("Tu nombre en la Liga")}"><button class="btn ghost" data-save>${t("Cambiar nombre")}</button></div>
      ${how()}${rules()}
      <p class="small muted lg-mono">${t("Sorteo de esta semana sellado")}: ${esc(st.week.seedHash.slice(0, 16))}…</p>`;

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
