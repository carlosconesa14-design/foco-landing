import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { leagueJoined } from "../game/league";
import { haptics } from "../platform/haptics";
import { leagueApi } from "../platform/league";
import { notifications } from "../platform/notifications";
import { loadSave } from "../platform/storage";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { t } from "../i18n";

/**
 * Diagnóstico para probar la app en un móvil de verdad: plataforma y versión, guardado,
 * conexión con la Liga, anuncio de prueba, avisos y vibración. No da recompensas.
 */
export function openDiagnostics(ctx: PanelCtx): void {
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🩺</span><div><h3>${t("Diagnóstico")}</h3><p class="muted">${t("Comprueba que todo funciona en este móvil")}</p></div></div>
     <div class="diag" data-list></div>
     <div class="actions col">
       <button class="ad-btn wide" data-ad><span class="play"></span>${t("Ver anuncio de prueba")}</button>
       <button class="btn" data-note>${t("Aviso de prueba en 10 s (cierra la app)")}</button>
       <button class="btn ghost" data-vibe>${t("Probar vibración")}</button>
     </div>`,
  );
  const list = sheet.el.querySelector<HTMLElement>("[data-list]")!;
  const rows = new Map<string, string>();
  const row = (key: string, label: string, value: string, ok?: boolean) => {
    rows.set(key, `<div class="stat"><span>${label}</span><b class="${ok === true ? "good" : ok === false ? "bad" : ""}">${value}</b></div>`);
    list.innerHTML = [...rows.values()].join("");
  };

  const native = Capacitor.isNativePlatform();
  row("platform", t("Plataforma"), native ? Capacitor.getPlatform() : t("navegador (web)"));
  if (native)
    void App.getInfo()
      .then((i) => row("version", t("Versión"), `${i.version} (${i.build})`))
      .catch(() => row("version", t("Versión"), t("desconocida"), false));
  row("save", t("Guardado"), t("comprobando…"));
  void loadSave()
    .then((r) => row("save", t("Guardado"), r ? "OK" : t("aún sin partida guardada"), !!r))
    .catch(() => row("save", t("Guardado"), "error", false));
  row("league", t("Servidor de la Liga"), t("comprobando…"));
  void leagueApi.ping().then((ok) => row("league", t("Servidor de la Liga"), ok ? t("conectado") : t("sin conexión"), ok));
  row("leagueMe", t("Tu cuenta de la Liga"), leagueJoined(ctx.state()) ? t("apuntado") : t("no apuntado"));
  void notifications.permission().then((p) => row("notify", t("Permiso de avisos"), p, p === "granted" ? true : native ? false : undefined));
  row("ads", t("Anuncios"), native ? t("AdMob (modo prueba salvo build final)") : t("simulados en el navegador"));

  const btnAd = sheet.el.querySelector<HTMLButtonElement>("[data-ad]")!;
  btnAd.onclick = async () => {
    btnAd.disabled = true;
    const ok = await ctx.testAd().catch(() => false);
    row("adTest", t("Anuncio de prueba"), ok ? t("visto entero") : t("no disponible o cerrado antes"), ok);
    btnAd.disabled = false;
  };
  sheet.el.querySelector<HTMLButtonElement>("[data-note]")!.onclick = async () => {
    const ok = await notifications.test(10);
    row("noteTest", t("Aviso de prueba"), ok ? t("programado: cierra la app y espera 10 s") : native ? t("sin permiso") : t("solo en el móvil"), ok);
  };
  sheet.el.querySelector<HTMLButtonElement>("[data-vibe]")!.onclick = () => {
    haptics.medium();
    row("vibe", t("Vibración"), haptics.enabled ? t("enviada (¿la has notado?)") : t("desactivada en Ajustes"));
  };
}
