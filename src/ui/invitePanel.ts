import { now } from "../game/clock";
import { REF, cloudDue, hasAccount, refQualifyPending } from "../game/account";
import { grantReward, tutorialStep } from "../game/meta";
import type { GameState } from "../game/state";
import { t } from "../i18n";
import { AccountError, accountApi, inviteLink, refFromUrl, type RefStatus } from "../platform/account";
import { daysSinceInstall } from "../platform/analytics";
import { decodeSave, encodeSave, replaceSave } from "../platform/storage";
import { gem } from "./icons";
import { showGrant } from "./metaPanels";
import { modal } from "./overlays";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";

/**
 * Invitar a amigos y partida en la nube (cuenta anónima, ver src/game/account.ts).
 * La cuenta se crea sola al terminar el tutorial; aquí también se sincroniza cada poco.
 */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;
const creds = (s: GameState) => ({ id: s.meta.account.id!, secret: s.meta.account.secret! });

/** Código que venía en el enlace de invitación (se usa solo en cuanto hay cuenta). */
const pendingRef = refFromUrl();

let registering: Promise<boolean> | null = null;

/** Crea la cuenta si aún no hay (una a la vez). */
export function ensureAccount(s: GameState): Promise<boolean> {
  if (hasAccount(s)) return Promise.resolve(true);
  registering ??= accountApi
    .register()
    .then((r) => {
      Object.assign(s.meta.account, { id: r.id, secret: r.secret, code: r.code, recovery: r.recovery });
      return true;
    })
    .catch(() => false)
    .finally(() => (registering = null));
  return registering;
}

const refErrors = (): Record<string, string> => ({
  code: t("Ese código no existe. Revísalo."),
  used: t("Ya usaste un código de invitación."),
  old: t("Los códigos solo se pueden usar los primeros {n} días.", { n: REF.newDays }),
  same: t("No puedes usar un código de alguien conectado a tu misma red."),
  self: t("Ese es tu propio código 😉"),
});

/** Usa el código de un amigo: premio de bienvenida al momento. Devuelve un error para mostrar o null. */
export async function useRefCode(ctx: PanelCtx, code: string): Promise<string | null> {
  const s = ctx.state();
  if (s.meta.account.refUsed) return refErrors().used;
  if (!(await ensureAccount(s))) return t("No hay conexión. Inténtalo en un momento.");
  try {
    await accountApi.refUse(creds(s), code.trim().toUpperCase());
  } catch (e) {
    return (e instanceof AccountError && refErrors()[e.message]) || t("No hay conexión. Inténtalo en un momento.");
  }
  s.meta.account.refUsed = true;
  const n = now();
  grantReward(s, { gems: REF.friendGems }, n, Math.random);
  const g = grantReward(s, { chest: REF.friendChest }, n, Math.random);
  ctx.fx("chest", true);
  ctx.banner("🤝", t("¡Bienvenido! +{n} 💎 y un maletín por venir invitado", { n: REF.friendGems }));
  showGrant(ctx, g);
  return null;
}

/**
 * Llamar cada poco (y al salir): crea la cuenta tras el tutorial, usa el código del enlace,
 * avisa de que el amigo llegó al objetivo y sube la partida a la nube cada 5 minutos.
 */
export async function syncAccount(ctx: PanelCtx, force = false): Promise<void> {
  const s = ctx.state();
  if (tutorialStep(s) !== null) return;
  if (!(await ensureAccount(s))) return;
  if (pendingRef && !s.meta.account.refUsed && daysSinceInstall() < REF.newDays) {
    const err = await useRefCode(ctx, pendingRef);
    if (err) s.meta.account.refUsed = true; // código del enlace no válido: no se insiste
  }
  if (refQualifyPending(s)) {
    try {
      if ((await accountApi.refQualify(creds(s))).ok) s.meta.account.refQualified = true;
    } catch {
      /* se reintenta más tarde */
    }
  }
  const n = now();
  if (force || cloudDue(s, n)) await uploadSave(s, n);
}

async function uploadSave(s: GameState, n: number): Promise<boolean> {
  try {
    const value = await encodeSave(s);
    if (!value.startsWith("s1:")) return false;
    await accountApi.save(creds(s), value, s.world.lifetimeEarned);
    s.meta.account.cloudAt = n;
    return true;
  } catch {
    return false;
  }
}

/* ---------- Invitar a amigos ---------- */

export function openInvite(ctx: PanelCtx): void {
  let status: RefStatus | null = null;
  let error = "";
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🤝</span><div><h3>${t("Invita a tus amigos")}</h3><p class="muted">${t("Ganáis los dos")}</p></div></div>
     <div data-body><p class="muted">${t("Cargando…")}</p></div>`,
    (el) => {
      const s = ctx.state();
      const a = s.meta.account;
      const body = $(el, "[data-body]");
      if (!hasAccount(s)) {
        const html = `<p class="small" style="color:var(--red)">${error || t("Termina el tutorial y ten conexión para conseguir tu código.")}</p>`;
        if (body.dataset.html !== html) body.innerHTML = body.dataset.html = html;
        return;
      }
      const toClaim = status ? Math.max(0, Math.min(status.qualified, status.max) - status.claimed) : 0;
      const canUse = !a.refUsed && !status?.referred && daysSinceInstall() < REF.newDays;
      const html = `
        <div class="invite-code"><small>${t("Tu código")}</small><b>${a.code}</b>
          <button class="buy big" data-share><span>${t("Compartir invitación")}</span><b>📤</b></button></div>
        <div class="invite-how">
          <div><span>🎁</span><p>${t("Tu amigo recibe {gems} y un maletín al usar tu código.", { gems: `<b>${REF.friendGems} ${gem()}</b>` })}</p></div>
          <div><span>💼</span><p>${t("Tú recibes {gems} y un maletín cuando abre su segundo negocio.", { gems: `<b>${REF.perFriendGems} ${gem()}</b>` })}</p></div>
        </div>
        ${status ? `<div class="row"><span class="face">👥</span><div><b>${t("{n} amigos invitados", { n: status.invited })}</b><span class="sub">${t("{q} ya cuentan · máximo {max} con premio", { q: status.qualified, max: status.max })}</span></div>
          <button class="claim" data-claim ${toClaim ? "" : "disabled"}>${toClaim ? `+${toClaim * REF.perFriendGems} ${gem()}` : t("Nada aún")}</button></div>` : ""}
        ${
          canUse
            ? `<div class="invite-use"><b>${t("¿Te ha invitado alguien?")}</b><div class="invite-row"><input data-code maxlength="8" placeholder="${t("Código")}" autocapitalize="characters" autocomplete="off"><button class="btn" data-use>${t("Usar")}</button></div></div>`
            : ""
        }
        ${error ? `<p class="small" style="color:var(--red)">${error}</p>` : ""}
        <p class="small muted">${t("Las invitaciones solo dan premios del juego. Cada persona puede usar un código una vez, en sus primeros {n} días.", { n: REF.newDays })}</p>`;
      if (body.dataset.html === html) return;
      const typed = body.querySelector<HTMLInputElement>("[data-code]")?.value ?? "";
      body.innerHTML = body.dataset.html = html;
      const input = body.querySelector<HTMLInputElement>("[data-code]");
      if (input) input.value = typed;
      $<HTMLButtonElement>(body, "[data-share]").onclick = () => void share(ctx, a.code);
      const claim = body.querySelector<HTMLButtonElement>("[data-claim]");
      if (claim)
        claim.onclick = async () => {
          claim.disabled = true;
          try {
            const r = await accountApi.refClaim(creds(ctx.state()));
            for (let i = 0; i < r.claimed; i++) {
              grantReward(ctx.state(), { gems: REF.perFriendGems }, now(), Math.random);
              grantReward(ctx.state(), { chest: REF.perFriendChest }, now(), Math.random);
            }
            if (r.claimed) {
              ctx.fx("chest", true);
              void ctx.celebrate({ icon: "🤝", title: t("¡Gracias por invitar!"), subtitle: t("{n} amigos ya juegan contigo.", { n: r.claimed }), highlight: `+${r.claimed * REF.perFriendGems} 💎`, color: "#3ddc97" });
            }
          } catch {
            error = t("No hay conexión. Inténtalo en un momento.");
          }
          await load();
        };
      const use = body.querySelector<HTMLButtonElement>("[data-use]");
      if (use)
        use.onclick = async () => {
          use.disabled = true;
          error = (await useRefCode(ctx, input!.value)) ?? "";
          await load();
        };
    },
  );
  const load = async () => {
    const s = ctx.state();
    if (!(await ensureAccount(s))) error = t("No hay conexión. Inténtalo en un momento.");
    else
      try {
        status = await accountApi.refStatus(creds(s));
      } catch {
        error = t("No hay conexión. Inténtalo en un momento.");
      }
    sheet.update?.();
  };
  void load();
}

async function share(ctx: PanelCtx, code: string): Promise<void> {
  const url = inviteLink(code);
  const text = t("Juega a Rider Millionaire conmigo: usa mi código {code} y te llevas {gems} 💎 y un maletín.", { code, gems: REF.friendGems });
  try {
    if (navigator.share) {
      await navigator.share({ title: "Rider Millionaire", text, url });
      return;
    }
  } catch {
    /* cancelado: se copia */
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    ctx.toast(t("Invitación copiada. ¡Pégala donde quieras!"));
  } catch {
    ctx.toast(url);
  }
}

/* ---------- Partida en la nube ---------- */

export function openCloud(ctx: PanelCtx): void {
  let msg = "";
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">☁️</span><div><h3>${t("Partida en la nube")}</h3><p class="muted">${t("Para no perderla si cambias de móvil")}</p></div></div>
     <div data-body></div>
     <div class="invite-use"><b>${t("Recuperar una partida")}</b><p class="small muted">${t("Escribe la clave de recuperación de tu otro móvil. La partida de este móvil se sustituirá.")}</p>
       <div class="invite-row"><input data-rec maxlength="20" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off"><button class="btn" data-recover>${t("Recuperar")}</button></div></div>
     <p class="small" data-msg></p>`,
    (el) => {
      const s = ctx.state();
      const a = s.meta.account;
      const ago = a.cloudAt ? Math.max(0, Math.round((now() - a.cloudAt) / 60e3)) : -1;
      const html = hasAccount(s)
        ? `<div class="invite-code"><small>${t("Tu clave de recuperación")}</small><b class="rec">${a.recovery}</b>
            <p class="small muted">${t("Guárdala en un sitio seguro (una foto o una nota). Es privada: con ella se recupera tu partida.")}</p>
            <div class="invite-row"><button class="btn" data-copy>${t("Copiar clave")}</button><button class="buy" data-upload><span>${t("Guardar ahora")}</span><b>☁️</b></button></div>
            <p class="small muted">${ago < 0 ? t("Aún no se ha guardado en la nube.") : ago < 1 ? t("Guardada hace un momento.") : t("Guardada hace {n} min.", { n: ago })} ${t("Se guarda sola cada 5 minutos.")}</p></div>`
        : `<p class="small muted">${t("Termina el tutorial y ten conexión para activarla.")}</p>`;
      const body = $(el, "[data-body]");
      if (body.dataset.html !== html) {
        body.innerHTML = body.dataset.html = html;
        const copy = body.querySelector<HTMLButtonElement>("[data-copy]");
        if (copy)
          copy.onclick = () =>
            navigator.clipboard.writeText(a.recovery).then(
              () => ctx.toast(t("Clave copiada")),
              () => ctx.toast(a.recovery),
            );
        const up = body.querySelector<HTMLButtonElement>("[data-upload]");
        if (up)
          up.onclick = async () => {
            up.disabled = true;
            msg = (await uploadSave(ctx.state(), now())) ? t("¡Guardada en la nube!") : t("No hay conexión. Inténtalo en un momento.");
            sheet.update?.();
          };
      }
      $(el, "[data-msg]").textContent = msg;
    },
  );
  $<HTMLButtonElement>(sheet.el, "[data-recover]").onclick = () => {
    const key = $<HTMLInputElement>(sheet.el, "[data-rec]").value.trim();
    if (key.replace(/[^A-Za-z0-9]/g, "").length !== 12) {
      msg = t("La clave tiene 12 letras y números.");
      return sheet.update?.();
    }
    modal(ctx.root, {
      title: t("¿Recuperar esa partida?"),
      text: t("La partida de este móvil se sustituirá por la de la nube. No se puede deshacer."),
      actions: [
        { label: t("Recuperar"), run: () => void recover(key, (m) => ((msg = m), sheet.update?.())) },
        { label: t("Cancelar"), run: () => {} },
      ],
    });
  };
}

async function recover(key: string, show: (m: string) => void): Promise<void> {
  try {
    const r = await accountApi.recover(key);
    if (!r.save) return show(t("Esa cuenta aún no tiene ninguna partida guardada."));
    const d = await decodeSave(r.save);
    if (d.tampered || !d.data || typeof d.data !== "object") return show(t("La partida guardada no es válida."));
    // La cuenta sigue siendo la misma, con su clave nueva (la anterior deja de valer).
    const data = d.data as { meta?: { account?: Record<string, unknown> } };
    data.meta ??= {};
    data.meta.account = { ...(data.meta.account ?? {}), id: r.id, secret: r.secret, code: r.code, recovery: key.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-") };
    if (!(await replaceSave(await encodeSave(data)))) return show(t("La partida guardada no es válida."));
    location.reload();
  } catch (e) {
    show(e instanceof AccountError && e.message === "recovery" ? t("Esa clave no existe. Revísala.") : e instanceof AccountError && e.message === "too_many" ? t("Demasiados intentos. Prueba mañana.") : t("No hay conexión. Inténtalo en un momento."));
  }
}

