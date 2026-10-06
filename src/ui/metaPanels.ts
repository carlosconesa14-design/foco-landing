import { now as clockNow } from "../game/clock";
import { ACHIEVEMENTS, ALL_BUSINESSES, CHESTS, DAILY_REWARDS, EXEC_KINDS, META, MISSIONS, RARITIES, type ChestType, type DailyReward } from "../game/data";
import { fmt, fmtTime } from "../game/format";
import * as meta from "../game/meta";
import type { Exec } from "../game/state";
import { execBonus } from "../game/founders";
import { fuseExecs, fusableRarities } from "../game/fusion";
import { revealChest } from "./celebrate";
import { modal } from "./overlays";
import type { PanelCtx } from "./panels";
import { bizIcon, chestIcon, execFace, gem } from "./icons";
import { openSheet } from "./sheet";
import { openDiagnostics } from "./diagnostics";
import { openLegal, type LegalPage } from "./legal";
import { notifications } from "../platform/notifications";
import { canOfferInstall, install, isIOS } from "../platform/pwa";
import {
  DAILY_RETOS,
  RETO_GEMS,
  WEEKLY_RETOS,
  allWeeklyClaimed,
  claimDailyReto,
  claimWeeklyAll,
  claimWeeklyReto,
  dailyProgress,
  ensureRetos,
  retoText,
  weeklyProgress,
  type WeeklyRetoId,
} from "../game/challenges";
import { LANGS, lang, money, saveLang, t, type Lang } from "../i18n";
import { analytics } from "../platform/analytics";
import { calmWorld, setReducedMotion } from "../scenes/common";

/** Paneles de la fase 2: misiones, premio diario, ejecutivos y maletines, logros. */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

/** Vuelve a pintar una zona solo si su HTML cambia (así los botones no parpadean). */
function paint(el: HTMLElement, html: string): boolean {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
}

const pct = (v: number, t: number) => `${Math.min(100, (v / Math.max(1, t)) * 100)}%`;

/* ---------- Misiones diarias ---------- */

export function openMissions(ctx: PanelCtx): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">📋</span><div><h3>${t("Misiones y retos")}</h3><p class="muted" data-left></p></div></div>
     <h4 class="lg-h">🎯 ${t("Reto del día")}</h4>
     <div class="list" data-daily style="display:grid;gap:8px"></div>
     <h4 class="lg-h">📋 ${t("Misiones del día")}</h4>
     <div class="list" data-list style="display:grid;gap:8px"></div>
     <h4 class="lg-h">🏆 ${t("Retos de la semana")}</h4>
     <div class="list" data-weekly style="display:grid;gap:8px"></div>
     <p class="small muted">${t("Los retos dan diamantes y, si estás en la Liga, puntos de Liga.")}</p>`,
    (el) => {
      const s = ctx.state();
      meta.ensureDay(s, clockNow());
      ensureRetos(s, clockNow());
      paintRetos(ctx, el);
      const tomorrow = new Date(meta.dayKey(clockNow()) + "T00:00:00Z").getTime() + 86400e3;
      $(el, "[data-left]").textContent = t("Nuevas misiones en {time}", { time: fmtTime((tomorrow - clockNow()) / 1000) });
      const rows = s.meta.missions.list.map((mi, i) => {
        const def = MISSIONS[mi.id];
        const v = meta.missionProgress(s, mi);
        const done = v >= mi.target;
        return `<div class="row ${mi.claimed ? "done" : ""}"><span class="face">${mi.claimed ? "✅" : "🎯"}</span>
          <div><b>${def.text.replace("{n}", fmt(mi.target))}</b><span class="sub">${fmt(v)} / ${fmt(mi.target)}</span><div class="bar2"><i style="width:${pct(v, mi.target)}"></i></div></div>
          <button class="claim" data-claim="${i}" ${!done || mi.claimed ? "disabled" : ""}>${mi.claimed ? t("Hecho") : `+${def.gems} ${gem()}`}</button></div>`;
      });
      const all = meta.allMissionsClaimed(s);
      rows.push(`<div class="row ${s.meta.missions.bonusClaimed ? "done" : ""}"><span class="face">🏅</span>
        <div><b>${t("Completa las 3 misiones")}</b><span class="sub">${t("Premio extra del día")}</span></div>
        <button class="claim" data-bonus ${!all || s.meta.missions.bonusClaimed ? "disabled" : ""}>+${META.missionBonusGems} ${gem()}</button></div>`);
      const list = $(el, "[data-list]");
      if (paint(list, rows.join(""))) {
        list.querySelectorAll<HTMLButtonElement>("[data-claim]").forEach((b) => {
          b.onclick = () => {
            const g = meta.claimMission(ctx.state(), Number(b.dataset.claim));
            if (g) {
              ctx.fx("gems", true);
              ctx.toast(`+${g} 💎`);
            }
          };
        });
        const bonus = list.querySelector<HTMLButtonElement>("[data-bonus]");
        if (bonus)
          bonus.onclick = () => {
            const g = meta.claimMissionBonus(ctx.state());
            if (g) {
              ctx.fx("milestone", true);
              ctx.banner("🏅", t("¡Misiones del día completadas! +{n} 💎", { n: g }));
            }
          };
      }
    }, { screen: "missions" },
  );
}

/** Reto del día y retos de la semana (dentro del panel de misiones). */
function paintRetos(ctx: PanelCtx, el: HTMLElement): void {
  const s = ctx.state();
  const r = s.meta.retos;
  const row = (done: boolean, claimed: boolean, text: string, v: number, target: number, gems: number, attr: string) =>
    `<div class="row ${claimed ? "done" : ""}"><span class="face">${claimed ? "✅" : "🎯"}</span>
      <div><b>${text}</b><span class="sub">${fmt(v)} / ${fmt(target)}</span><div class="bar2"><i style="width:${pct(v, target)}"></i></div></div>
      <button class="claim" ${attr} ${!done || claimed ? "disabled" : ""}>${claimed ? t("Hecho") : `+${gems} ${gem()}`}</button></div>`;
  const dd = DAILY_RETOS[r.daily];
  const dv = dailyProgress(s);
  const dailyEl = $(el, "[data-daily]");
  if (paint(dailyEl, row(dv >= dd.target, r.dailyClaimed, retoText("daily", r.daily, dd.target), dv, dd.target, RETO_GEMS.daily, "data-reto-day")))
    dailyEl.querySelector<HTMLButtonElement>("[data-reto-day]")!.onclick = () => {
      const g = claimDailyReto(ctx.state());
      if (g) {
        ctx.fx("gems", true);
        ctx.toast(t("¡Reto del día completado! +{n} 💎", { n: g }));
      }
    };
  const ids = Object.keys(WEEKLY_RETOS) as WeeklyRetoId[];
  const rows = ids.map((id) => {
    const def = WEEKLY_RETOS[id];
    const v = weeklyProgress(s, id);
    return row(v >= def.target, r.weeklyClaimed.includes(id), retoText("weekly", id, def.target), v, def.target, RETO_GEMS.weekly, `data-reto-week="${id}"`);
  });
  const all = allWeeklyClaimed(s);
  rows.push(`<div class="row ${r.weeklyAll ? "done" : ""}"><span class="face">🏆</span>
    <div><b>${t("Completa los 4 retos de la semana")}</b><span class="sub">${t("Premio extra de la semana")}</span></div>
    <button class="claim" data-reto-all ${!all || r.weeklyAll ? "disabled" : ""}>${r.weeklyAll ? t("Hecho") : `+${RETO_GEMS.weeklyAll} ${gem()}`}</button></div>`);
  const weekEl = $(el, "[data-weekly]");
  if (paint(weekEl, rows.join(""))) {
    weekEl.querySelectorAll<HTMLButtonElement>("[data-reto-week]").forEach((b) => {
      b.onclick = () => {
        const g = claimWeeklyReto(ctx.state(), b.dataset.retoWeek as WeeklyRetoId);
        if (g) {
          ctx.fx("gems", true);
          ctx.toast(t("¡Reto de la semana completado! +{n} 💎", { n: g }));
        }
      };
    });
    const allBtn = weekEl.querySelector<HTMLButtonElement>("[data-reto-all]");
    if (allBtn)
      allBtn.onclick = () => {
        const g = claimWeeklyAll(ctx.state());
        if (g) {
          ctx.fx("milestone", true);
          ctx.banner("🏆", t("¡Todos los retos de la semana! +{n} 💎", { n: g }));
        }
      };
  }
}

/* ---------- Premio diario ---------- */

export function rewardLabel(r: DailyReward): { icon: string; text: string } {
  if ("gems" in r) return { icon: gem(), text: `${r.gems} ${gem()}` };
  if ("cashHours" in r) return { icon: "💶", text: r.cashHours >= 1 ? t("{n} h de ingresos", { n: r.cashHours }) : t("{n} min de ingresos", { n: r.cashHours * 60 }) };
  return { icon: chestIcon(r.chest), text: CHESTS[r.chest].name };
}

function describeGrant(g: meta.Grant): string {
  const parts: string[] = [];
  if (g.exec) parts.push(`${g.exec.face} ${g.exec.name} (${RARITIES[g.exec.rarity].name})`);
  if (g.gems) parts.push(`${g.gems} 💎`);
  if (g.cash) parts.push(money(g.cash));
  return parts.join(" · ");
}

/** Muestra lo recibido: el ejecutivo con su maletín, o un aviso con diamantes o dinero. */
export function showGrant(ctx: PanelCtx, g: meta.Grant): void {
  if (g.exec) void showExec(ctx, g.exec, g);
  else ctx.toast(`🎁 ${describeGrant(g)}`);
}

export function openDaily(ctx: PanelCtx): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🎁</span><div><h3>${t("Premio diario")}</h3><p class="muted" data-streak></p></div></div>
     <div class="days" data-days></div>
     <div class="actions col" data-actions></div>`,
    (el) => {
      const s = ctx.state();
      const st = meta.dailyStatus(s, clockNow());
      $(el, "[data-streak]").textContent = st.canClaim
        ? t("Entra cada día para no perder la racha. Hoy toca el día {n}.", { n: st.index + 1 })
        : st.streak === 1 ? t("Racha de 1 día. Vuelve mañana.") : t("Racha de {n} días. Vuelve mañana.", { n: st.streak });
      paint(
        $(el, "[data-days]"),
        DAILY_REWARDS.map((r, i) => {
          const l = rewardLabel(r);
          const cls = i === st.index ? "today" : i < st.index ? "past" : "";
          return `<div class="daycard ${cls}"><span class="small muted">${t("Día {n}", { n: i + 1 })}</span><span class="ic">${l.icon}</span><span>${l.text}</span></div>`;
        }).join(""),
      );
      const actions = $(el, "[data-actions]");
      if (
        paint(
          actions,
          st.canClaim
            ? `<button class="ad-btn wide" data-x2><span class="play"></span>${t("Cobrar x2 con anuncio")}</button><button class="btn" data-claim>${t("Cobrar")}</button>`
            : `<button class="btn" disabled>${t("Ya lo has cobrado hoy")}</button>`,
        )
      ) {
        const claim = async (double: boolean) => {
          if (double && !(await ctx.watchAd("daily_double"))) return;
          const g = meta.claimDaily(ctx.state(), clockNow(), double);
          if (g) {
            ctx.fx(g.exec ? "chest" : "gems", true);
            if (g.exec) void showExec(ctx, g.exec, g);
            else ctx.toast(t("Premio diario: {what}", { what: describeGrant(g) }));
          }
        };
        const x2 = actions.querySelector<HTMLButtonElement>("[data-x2]");
        const one = actions.querySelector<HTMLButtonElement>("[data-claim]");
        if (x2) x2.onclick = () => claim(true);
        if (one) one.onclick = () => claim(false);
      }
    }, { screen: "daily" },
  );
}

/* ---------- Ejecutivos y maletines ---------- */

async function showExec(ctx: PanelCtx, e: Exec, g: meta.Grant, chestIcon = "💼"): Promise<void> {
  const r = RARITIES[e.rarity];
  // Suspense: el maletín tiembla y estalla con el color de la rareza antes de revelar al ejecutivo.
  await revealChest(ctx.root, chestIcon, r.color, e.rarity >= 2);
  if (e.rarity >= 2) ctx.fx("milestone", true);
  modal(ctx.root, {
    title: t("¡Nuevo ejecutivo {rarity}!", { rarity: r.name.toLowerCase() }),
    amount: `${e.face} ${e.name}`,
    text: `${EXEC_KINDS[e.kind].label}: +${r.bonus * 100}% ${EXEC_KINDS[e.kind].desc}. ${t("Habilidad: ventas x{n} durante {min} min.", { n: r.ability, min: r.abilityMin })}${g.gems ? " " + t("Y además {n} 💎.", { n: g.gems }) : ""} ${t("Asígnalo a un negocio desde Ejecutivos.")}`,
    actions: [{ label: t("¡Genial!"), run: () => {} }],
  });
}

/** Nombre para mostrar: el fundador se llama «Fundador #N» en el idioma del jugador. */
export const execName = (e: Exec) => (e.founder ? t("Fundador #{n}", { n: e.founder }) : e.name);

function execRow(e: Exec, here: string | null, now: number): string {
  const r = RARITIES[e.rarity];
  const at = e.assigned ? ALL_BUSINESSES.find((b) => b.id === e.assigned) : null;
  const active = e.abilityEnd > now;
  const ready = e.readyAt <= now;
  let buttons = "";
  if (here && e.assigned !== here) buttons += `<button class="mini" data-assign="${e.id}">${t("Asignar aquí")}</button>`;
  if (e.assigned) {
    if (active) buttons += `<button class="mini" disabled>x${r.ability} · ${fmtTime((e.abilityEnd - now) / 1000)}</button>`;
    else if (ready) buttons += `<button class="claim" data-ability="${e.id}">⚡ ${t("x{n} ventas", { n: r.ability })}</button>`;
    else buttons += `<button class="ad-btn" data-recharge="${e.id}"><span class="play"></span>${fmtTime((e.readyAt - now) / 1000)}</button>`;
  }
  return `<div class="row${e.founder ? " founder" : ""}"><span class="face" style="box-shadow:inset 0 0 0 2px ${r.color}">${execFace(e)}</span>
    <div><b>${execName(e)} <span class="rar" style="color:${r.color}">${e.founder ? t("Fundador") : r.name}</span></b>
    <span class="sub">+${Math.round(execBonus(e) * 100)}% ${EXEC_KINDS[e.kind].desc} · ${at ? t("en {biz}", { biz: `${bizIcon(at)} ${at.name}` }) : t("sin asignar")}</span></div>
    <div class="btnrow">${buttons}</div></div>`;
}

export function openExecs(ctx: PanelCtx, tab: "chests" | "execs" = "chests"): void {
  let current = tab;
  const view = ctx.state().view;
  const here = view.scene === "business" ? view.id : null;
  const hereDef = here ? ALL_BUSINESSES.find((b) => b.id === here) : null;
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">💼</span><div><h3>${t("Ejecutivos")}</h3><p class="muted">${t("Tienes {gems}. Cada negocio puede tener un ejecutivo.", { gems: "<b data-gems></b>" })}</p></div></div>
     <div class="tabs"><button class="tabbtn" data-tab="chests">${t("Maletines")}<i class="dot" data-freedot hidden></i></button><button class="tabbtn" data-tab="execs">${t("Mis ejecutivos")}</button></div>
     <div data-body style="display:grid;gap:8px"></div>`,
    (el) => {
      const s = ctx.state();
      const now = clockNow();
      $(el, "[data-gems]").innerHTML = `${fmt(s.meta.gems)} ${gem()}`;
      $(el, "[data-freedot]").hidden = !meta.freeChestReady(s, now);
      el.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === current)));
      const body = $(el, "[data-body]");
      if (current === "chests") {
        const freeReady = meta.freeChestReady(s, now);
        const card = (type: ChestType, button: string, note: string) =>
          `<div class="chest"><span class="ic">${chestIcon(type)}</span><b>${CHESTS[type].name}</b><small>${note}</small>${button}</div>`;
        const html =
          `<div class="chests">` +
          card(
            "free",
            freeReady
              ? `<button class="ad-btn" data-chest="free"><span class="play"></span>${t("Abrir")}</button>`
              : `<button class="mini" disabled>${fmtTime((s.meta.freeChestAt - now) / 1000)}</button>`,
            t("Cada {h} h viendo un anuncio", { h: META.freeChestHours }),
          ) +
          card("normal", `<button class="mini" data-chest="normal" ${s.meta.gems < CHESTS.normal.cost ? "disabled" : ""}>${CHESTS.normal.cost} ${gem()}</button>`, t("Raro o mejor: 40 %")) +
          card("premium", `<button class="mini" data-chest="premium" ${s.meta.gems < CHESTS.premium.cost ? "disabled" : ""}>${CHESTS.premium.cost} ${gem()}</button>`, t("Siempre raro o mejor")) +
          `<div class="chest"><span class="ic">💶</span><b>${t("Paquete de dinero")}</b><small>${t("{h} h de tus ingresos pasivos", { h: META.cashPackHours })}</small><button class="mini" data-cash ${s.meta.gems < META.cashPackGems ? "disabled" : ""}>${META.cashPackGems} ${gem()}</button></div>` +
          `</div><p class="small muted">${t("Consigue diamantes con las misiones diarias, el premio diario y los logros.")}</p>`;
        if (paint(body, html)) {
          body.querySelectorAll<HTMLButtonElement>("[data-chest]").forEach((b) => {
            b.onclick = async () => {
              const type = b.dataset.chest as ChestType;
              if (type === "free" && !(await ctx.watchAd("free_chest"))) return;
              const g = meta.openChest(ctx.state(), type, clockNow());
              if (!g) return ctx.fx("error");
              ctx.fx("chest", true);
              if (g.exec) void showExec(ctx, g.exec, g, CHESTS[type].icon);
            };
          });
          const cash = body.querySelector<HTMLButtonElement>("[data-cash]");
          if (cash)
            cash.onclick = () => {
              const c = meta.buyCashPack(ctx.state(), clockNow());
              if (!c) return ctx.fx("error");
              ctx.fx("coin", true);
              ctx.toast(`+${money(c)}`);
            };
        }
      } else {
        const execs = [...s.meta.execs].sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
        const intro = hereDef
          ? `<p class="small muted">${t("Estás en {biz}. «Asignar aquí» pone al ejecutivo en este negocio.", { biz: `${bizIcon(hereDef)} ${hereDef.name}` })}</p>`
          : `<p class="small muted">${t("Entra en un negocio para asignarle un ejecutivo.")}</p>`;
        // Fusión: 3 iguales → 1 de la rareza siguiente
        const fuse = fusableRarities(s)
          .map((r) => `<button class="fuse-btn" data-fuse="${r}" style="--from:${RARITIES[r].color};--to:${RARITIES[r + 1].color}">🔀 ${t("Fusionar 3 {from} → 1 {to}", { from: RARITIES[r].name.toLowerCase(), to: RARITIES[r + 1].name.toLowerCase() })}</button>`)
          .join("");
        const html = execs.length
          ? (fuse ? `<div class="fuse-box"><p class="small muted">${t("Tienes ejecutivos repetidos: fusiona 3 de la misma rareza y consigue uno mejor.")}</p>${fuse}</div>` : "") + intro + execs.map((e) => execRow(e, here, now)).join("")
          : `<p class="muted">${t("Aún no tienes ejecutivos. Abre un maletín para conseguir el primero.")}</p>`;
        if (paint(body, html)) {
          body.querySelectorAll<HTMLButtonElement>("[data-fuse]").forEach((b) => {
            b.onclick = () => {
              const e = fuseExecs(ctx.state(), Number(b.dataset.fuse));
              if (!e) return ctx.fx("error");
              analytics.track("fusion", { rarity: e.rarity });
              ctx.fx("chest", true);
              void showExec(ctx, e, { exec: e }, "🔀");
            };
          });
          body.querySelectorAll<HTMLButtonElement>("[data-assign]").forEach((b) => {
            b.onclick = () => {
              if (here && meta.assignExec(ctx.state(), b.dataset.assign!, here)) {
                ctx.fx("hire");
                ctx.toast(t("Ejecutivo asignado"));
              }
            };
          });
          body.querySelectorAll<HTMLButtonElement>("[data-ability]").forEach((b) => {
            b.onclick = () => {
              if (meta.activateAbility(ctx.state(), b.dataset.ability!, clockNow())) {
                ctx.fx("ability", true);
                ctx.toast("⚡ " + t("¡Habilidad activada!"));
              }
            };
          });
          body.querySelectorAll<HTMLButtonElement>("[data-recharge]").forEach((b) => {
            b.onclick = async () => {
              if (await ctx.watchAd("ability_recharge")) meta.rechargeAbility(ctx.state(), b.dataset.recharge!, clockNow());
            };
          });
        }
      }
    }, { screen: "execs" },
  );
  sheet.el.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => {
    b.onclick = () => {
      current = b.dataset.tab as typeof current;
      sheet.update?.();
    };
  });
}

/* ---------- Ajustes ---------- */

export function openSettings(ctx: PanelCtx): void {
  const rows: { key: "music" | "sfx" | "haptics" | "notify"; icon: string; name: string; desc: string }[] = [
    { key: "music", icon: "🎵", name: t("Música"), desc: t("Música de fondo relajada") },
    { key: "sfx", icon: "🔊", name: t("Sonidos"), desc: t("Monedas, mejoras, maletines…") },
    { key: "haptics", icon: "📳", name: t("Vibración"), desc: t("Al tocar y al comprar (en el móvil)") },
    { key: "notify", icon: "🔔", name: t("Avisos"), desc: t("Caja llena, maletín gratis y premio diario (en el móvil)") },
  ];
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">⚙️</span><div><h3>${t("Ajustes")}</h3><p class="muted">${t("Se guardan con tu partida.")}</p></div></div>
     <div data-list style="display:grid;gap:8px"></div>
     <div class="row"><span class="face">🌐</span><div><b>${t("Idioma")}</b><span class="sub">${t("Se aplica al momento")}</span></div>
       <div class="seg" data-langs>${LANGS.map((l) => `<button data-lang="${l.id}" aria-pressed="${l.id === lang}">${l.name}</button>`).join("")}</div></div>
     <div class="row"><span class="face">🎞️</span><div><b>${t("Reducir movimiento")}</b><span class="sub">${t("Para la gente, los coches y los efectos")}</span></div>
       <button class="switch" role="switch" aria-checked="${calmWorld()}" data-motion aria-label="${t("Reducir movimiento")}"><i></i></button></div>
     ${canOfferInstall() ? `<button class="btn ghost wide" data-install style="margin-top:12px">📲 ${t("Instalar en el móvil")}</button>` : ""}
     <button class="btn ghost wide" data-open="feedback" style="margin-top:${canOfferInstall() ? 8 : 12}px">💬 ${t("Danos tu opinión")}</button>
     <button class="btn ghost wide" data-open="cloud" style="margin-top:8px">☁️ ${t("Partida en la nube")}</button>
     <button class="btn ghost wide" data-diag style="margin-top:8px">🩺 ${t("Diagnóstico del móvil")}</button>
     <p class="small muted legal-links"><a href="#" data-legal="privacidad">${t("Política de privacidad")}</a> · <a href="#" data-legal="bases-liga">${t("Bases de la Liga")}</a></p>`,
    (el) => {
      const set = ctx.state().settings;
      const list = $(el, "[data-list]");
      const html = rows
        .map(
          (r) => `<div class="row"><span class="face">${r.icon}</span><div><b>${r.name}</b><span class="sub">${r.desc}</span></div>
          <button class="switch" role="switch" aria-checked="${set[r.key]}" data-set="${r.key}" aria-label="${r.name}"><i></i></button></div>`,
        )
        .join("");
      if (paint(list, html)) {
        list.querySelectorAll<HTMLButtonElement>("[data-set]").forEach((b) => {
          b.onclick = () => {
            const s = ctx.state().settings;
            const key = b.dataset.set as keyof typeof s;
            s[key] = !s[key];
            if (key === "notify" && s.notify) void notifications.ask();
            ctx.applySettings();
            ctx.fx("click");
          };
        });
      }
    }, { screen: "settings" },
  );
  const motion = sheet.el.querySelector<HTMLButtonElement>("[data-motion]")!;
  motion.onclick = () => {
    const on = !calmWorld();
    setReducedMotion(on);
    motion.setAttribute("aria-checked", String(on));
    ctx.fx("click");
  };
  sheet.el.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => {
    b.onclick = () => {
      const l = b.dataset.lang as Lang;
      if (l === lang) return;
      saveLang(l);
      ctx.reload();
    };
  });
  const inst = sheet.el.querySelector<HTMLButtonElement>("[data-install]");
  if (inst)
    inst.onclick = () =>
      void install().then((r) => {
        if (r === "accepted") return ctx.toast(t("¡Instalado! Búscalo en tu pantalla de inicio."));
        if (r === "manual")
          modal(ctx.root, {
            title: t("Instalar en el móvil"),
            text: isIOS()
              ? t("Toca el botón Compartir del navegador y elige «Añadir a pantalla de inicio».")
              : t("Abre el menú del navegador (⋮) y elige «Instalar aplicación» o «Añadir a pantalla de inicio»."),
            actions: [{ label: t("Entendido"), run: () => {} }],
          });
      });
  sheet.el.querySelector<HTMLButtonElement>("[data-diag]")!.onclick = () => openDiagnostics(ctx);
  sheet.el.querySelectorAll<HTMLAnchorElement>("[data-legal]").forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      openLegal(ctx, a.dataset.legal as LegalPage);
    };
  });
}

/* ---------- Logros ---------- */

export function openAchievements(ctx: PanelCtx): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🏆</span><div><h3>${t("Logros")}</h3><p class="muted" data-count></p></div></div>
     <div data-list style="display:grid;gap:8px"></div>`,
    (el) => {
      const s = ctx.state();
      $(el, "[data-count]").textContent = t("{n} de {total} conseguidos", { n: s.meta.achievements.length, total: ACHIEVEMENTS.length });
      const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(s.meta.achievements.includes(a.id)) - Number(s.meta.achievements.includes(b.id)));
      const list = $(el, "[data-list]");
      const html = sorted
        .map((a) => {
          const claimed = s.meta.achievements.includes(a.id);
          const v = meta.achievementProgress(s, a);
          const done = v >= a.target;
          return `<div class="row ${claimed ? "done" : ""}"><span class="face">${claimed ? "✅" : done ? "🏆" : "🔒"}</span>
            <div><b>${a.text}</b><span class="sub">${fmt(v)} / ${fmt(a.target)}</span><div class="bar2"><i style="width:${pct(v, a.target)}"></i></div></div>
            <button class="claim" data-ach="${a.id}" ${!done || claimed ? "disabled" : ""}>${claimed ? t("Hecho") : `+${a.gems} ${gem()}`}</button></div>`;
        })
        .join("");
      if (paint(list, html)) {
        list.querySelectorAll<HTMLButtonElement>("[data-ach]").forEach((b) => {
          b.onclick = () => {
            const g = meta.claimAchievement(ctx.state(), b.dataset.ach!);
            if (g) {
              ctx.fx("milestone", true);
              ctx.toast(t("¡Logro conseguido! +{n} 💎", { n: g }));
            }
          };
        });
      }
    }, { screen: "achievements" },
  );
}
