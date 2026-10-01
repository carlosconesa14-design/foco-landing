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

/**
 * Pantalla de la Liga Millonario (fase 0: premios dentro del juego).
 * Ver docs/LIGA.md. El servidor calcula puntos, papeletas, puestos y ganadores.
 */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

const DIV = {
  bronce: { icon: "🥉", name: "Bronce" },
  plata: { icon: "🥈", name: "Plata" },
  oro: { icon: "🥇", name: "Oro" },
} as const;

const ACTIONS: { kind: LeagueKind; text: string }[] = [
  { kind: "login", text: "Entrar cada día" },
  { kind: "mission", text: "Cada misión diaria (menos «mira anuncios»)" },
  { kind: "missions_all", text: "Completar las 3 misiones del día" },
  { kind: "milestone", text: "Hito x2 de una parte (máx. 6 al día)" },
  { kind: "floor", text: "Abrir un puesto" },
  { kind: "tier", text: "Subir de categoría un negocio" },
  { kind: "business", text: "Comprar un negocio" },
];

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Premio en texto: euros si los hay; si no, diamantes (fase 0). */
function prize(cents: number, gems: number): string {
  if (cents > 0) return `${(cents / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
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
    `<div class="sheet-head"><span class="sicon">🏅</span><div><h3>Liga Millonario</h3><p class="muted" data-sub>Cada semana: premios para los mejores y un sorteo entre todos</p></div></div>
     <div data-body><p class="muted">Cargando…</p></div>`,
  );
  const body = $(sheet.el, "[data-body]");
  body.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("[data-legal]");
    if (!a) return;
    e.preventDefault();
    openLegal(ctx, "bases-liga");
  });

  const how = () => `<details class="lg-how"><summary>¿Cómo se ganan puntos?</summary>
      <div class="lg-table">${ACTIONS.map((a) => `<span>${a.text}</span><b>+${LEAGUE_POINTS[a.kind]}</b>`).join("")}</div>
      <p class="small muted">Máximo ${lastStatus?.rules.dailyCap ?? 150} puntos al día: gana quien juega con constancia. <b>Ver anuncios o comprar no da puntos.</b>
      Cada ${lastStatus?.rules.ticketPoints ?? 100} puntos de la semana = 1 papeleta para el sorteo (máx. ${lastStatus?.rules.maxTickets ?? 10}).</p>
    </details>`;

  const rules = () => `<details class="lg-how"><summary>Bases de la Liga</summary>
      <p class="small muted">Participación gratuita. La semana va de lunes 00:00 a domingo 23:59 (hora de Madrid).
      Al cierre gana el primero de cada división (Bronce, Plata, Oro; se sube con los puntos acumulados) y se sortean
      ${lastStatus?.prizes.drawWinners ?? 6} premios entre todos los que tengan al menos una papeleta, con más opciones cuantas más papeletas.
      Un premio por persona y semana. El sorteo usa una semilla secreta cuyo resumen (hash) se publica al empezar la semana
      y que se revela al cerrar, para que cualquiera pueda comprobarlo. Las compras y los anuncios no influyen.
      ${
        lastStatus && (lastStatus.prizes.drawCents > 0 || Object.values(lastStatus.prizes.topCents).some((c) => c > 0))
          ? "Los premios en dinero solo pueden cobrarlos mayores de 18 años: se pide un email de contacto, se revisa la partida y se pagan con tarjeta regalo o PayPal. Las bases completas están publicadas en la web del juego."
          : "Ahora mismo los premios son dentro del juego (diamantes). Si hay premios en dinero, se publicarán unas bases completas antes de empezar la semana."
      } Apple y Google no patrocinan ni participan en esta Liga.</p>
      <p class="small"><a href="#" data-legal="bases-liga">Leer las bases completas</a></p>
    </details>`;

  /* --- Aún no apuntado --- */
  const renderJoin = (err = "") => {
    body.innerHTML = `
      <div class="lg-hero"><b>🏆 Premios cada semana</b><span>Para el primero de cada división y un sorteo entre todos los que jueguen.</span></div>
      ${how()}${rules()}
      <label class="lg-check"><input type="checkbox" data-accept> Acepto las bases de la Liga</label>
      <button class="buy big wide" data-join disabled><span>Unirme a la Liga</span><b>Gratis</b></button>
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
        ctx.banner("🏅", "¡Ya estás en la Liga!");
        await syncLeague(ctx.state());
        void load();
      } catch {
        renderJoin("No hay conexión con la Liga. Inténtalo en un momento.");
      }
    };
  };

  /* --- Apuntado --- */
  const euros = (c: number) => `${(c / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
  /** Premios en dinero (fase 1): pedir email y mayoría de edad, «en revisión» o «pagado». */
  const payoutsHtml = (list: Payout[]) =>
    list
      .map((p) =>
        p.state === "need_data"
          ? `<div class="lg-pay" data-week="${esc(p.week)}"><b>💶 ¡Has ganado ${euros(p.cents)}!</b>
              <span>Para recibirlo, déjanos un email de contacto. Revisaremos la partida y te lo enviaremos (tarjeta regalo o PayPal).</span>
              <input type="email" data-email placeholder="tu@email.com" autocomplete="email">
              <label class="lg-check"><input type="checkbox" data-adult> Soy mayor de 18 años y acepto las bases</label>
              <button class="buy wide" data-pay><span>Pedir mi premio</span><b>${euros(p.cents)}</b></button></div>`
          : `<div class="lg-pay ${p.state}"><b>${p.state === "paid" ? "✅ Premio pagado" : "⏳ Premio en revisión"} · ${euros(p.cents)}</b>
              <span>${p.state === "paid" ? `Semana ${esc(p.week)}. ¡Enhorabuena!` : "Te escribiremos al email que nos diste en unos días."}</span></div>`,
      )
      .join("");

  const renderStatus = (st: LeagueStatus, payouts: Payout[] = []) => {
    const me = st.me;
    const d = DIV[me.division];
    const left = Math.max(0, (new Date(st.week.endsAt).getTime() - Date.now()) / 1000);
    const toTicket = st.rules.ticketPoints - (me.points % st.rules.ticketPoints);
    const won = st.unclaimed.reduce((a, u) => a + u.gems, 0); // los premios en dinero van aparte (payouts)
    const closesIn = left >= 86400 ? `${Math.floor(left / 86400)} d ${Math.floor((left % 86400) / 3600)} h` : fmtTime(left);
    $(sheet.el, "[data-sub]").textContent = `Semana ${st.week.id.split("-W")[1]} · cierra en ${closesIn}`;
    const topPrize = prize(st.prizes.topCents[me.division] ?? 0, st.prizes.topGems[me.division] ?? 0);
    body.innerHTML = `
      ${payoutsHtml(payouts)}
      ${won ? `<div class="lg-won"><b>🎉 ¡Has ganado en la Liga!</b><button class="claim" data-claim>Cobrar +${won} ${gem()}</button></div>` : ""}
      <div class="lg-prizes">
        <div><span>1.º de ${d.name}</span><b>${topPrize}</b></div>
        <div><span>Sorteo (${st.prizes.drawWinners} premios)</span><b>${prize(st.prizes.drawCents, st.prizes.drawGems)}</b></div>
      </div>
      <div class="lg-me">
        <div class="lg-div">${d.icon}<small>${d.name}</small></div>
        <div><b>${fmt(me.points)} puntos</b><span>${me.rank ? `Puesto #${me.rank} de ${st.players}` : "Aún sin puntos esta semana"}</span></div>
        <div class="lg-tix"><b>🎟️ ${me.tickets}</b><small>${me.tickets >= st.rules.maxTickets ? "máximo" : `otra en ${toTicket} pts`}</small></div>
      </div>
      <h4 class="lg-h">Clasificación ${d.icon} ${d.name}</h4>
      <ol class="lg-top">${st.top.map((p) => `<li class="${p.me ? "me" : ""}"><span>${esc(p.nickname)}</span><b>${fmt(p.points)}</b></li>`).join("") || `<li class="muted">Sé el primero en sumar puntos esta semana</li>`}</ol>
      ${
        st.lastWeek
          ? `<h4 class="lg-h">Ganadores de la semana pasada</h4>
        <ul class="lg-win">${st.lastWeek.winners.map((w) => `<li><span>${w.kind === "top" ? `${DIV[w.division as keyof typeof DIV]?.icon ?? "🏆"} 1.º` : "🎟️ Sorteo"} · ${esc(w.nickname)}</span><b>${prize(w.cents, w.gems)}</b></li>`).join("") || `<li class="muted">Sin ganadores</li>`}</ul>
        <details class="lg-how"><summary>Comprobar el sorteo</summary><p class="small muted lg-mono">Semilla: ${esc(st.lastWeek.seed)}<br>Hash publicado: ${esc(st.lastWeek.seedHash)}</p></details>`
          : ""
      }
      <div class="lg-nick"><input data-nick maxlength="16" value="${esc(me.nickname)}" aria-label="Tu nombre en la Liga"><button class="btn ghost" data-save>Cambiar nombre</button></div>
      ${how()}${rules()}
      <p class="small muted lg-mono">Sorteo de esta semana sellado: ${esc(st.week.seedHash.slice(0, 16))}…</p>`;

    body.querySelectorAll<HTMLElement>(".lg-pay[data-week]").forEach((box) => {
      const btn = box.querySelector<HTMLButtonElement>("[data-pay]")!;
      btn.onclick = async () => {
        const s = ctx.state();
        const email = box.querySelector<HTMLInputElement>("[data-email]")!.value;
        const adult = box.querySelector<HTMLInputElement>("[data-adult]")!.checked;
        if (!adult) return ctx.toast("Tienes que ser mayor de 18 años para cobrar premios en dinero");
        btn.disabled = true;
        try {
          await leagueApi.payout({ id: s.meta.league.id!, secret: s.meta.league.secret! }, box.dataset.week!, email, adult);
          ctx.fx("gems", true);
          ctx.banner("💶", "¡Recibido! Revisaremos la partida y te escribiremos");
          void load();
        } catch (e) {
          btn.disabled = false;
          ctx.toast((e as Error).message === "email" ? "Ese email no parece válido" : "No hay conexión. Inténtalo en un momento.");
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
          void ctx.celebrate({ icon: "🏅", title: "¡Premio de la Liga!", subtitle: "Gracias por jugar cada día.", highlight: `+${r.gems} 💎` });
          void load();
        } catch {
          claim.disabled = false;
          ctx.toast("No hay conexión. Inténtalo en un momento.");
        }
      };
    $<HTMLButtonElement>(body, "[data-save]").onclick = async () => {
      const s = ctx.state();
      const nick = $<HTMLInputElement>(body, "[data-nick]").value;
      try {
        const r = await leagueApi.nickname({ id: s.meta.league.id!, secret: s.meta.league.secret! }, nick);
        s.meta.league.nickname = r.nickname;
        ctx.toast("Nombre cambiado");
        void load();
      } catch {
        ctx.toast("Nombre no válido: de 3 a 16 letras o números");
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
      body.innerHTML = `<p class="muted">No hay conexión con la Liga. Tus puntos se guardan en el móvil y se enviarán en cuanto vuelva la conexión.</p>${how()}`;
    }
  };
  void load();
}
