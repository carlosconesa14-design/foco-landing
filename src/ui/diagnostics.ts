import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { leagueJoined } from "../game/league";
import { haptics } from "../platform/haptics";
import { leagueApi } from "../platform/league";
import { notifications } from "../platform/notifications";
import { loadSave } from "../platform/storage";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";

/**
 * Diagnóstico para probar la app en un móvil de verdad: plataforma y versión, guardado,
 * conexión con la Liga, anuncio de prueba, avisos y vibración. No da recompensas.
 */
export function openDiagnostics(ctx: PanelCtx): void {
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🩺</span><div><h3>Diagnóstico</h3><p class="muted">Comprueba que todo funciona en este móvil</p></div></div>
     <div class="diag" data-list></div>
     <div class="actions col">
       <button class="ad-btn wide" data-ad><span class="play"></span>Ver anuncio de prueba</button>
       <button class="btn" data-note>Aviso de prueba en 10 s (cierra la app)</button>
       <button class="btn ghost" data-vibe>Probar vibración</button>
     </div>`,
  );
  const list = sheet.el.querySelector<HTMLElement>("[data-list]")!;
  const rows = new Map<string, string>();
  const row = (key: string, label: string, value: string, ok?: boolean) => {
    rows.set(key, `<div class="stat"><span>${label}</span><b class="${ok === true ? "good" : ok === false ? "bad" : ""}">${value}</b></div>`);
    list.innerHTML = [...rows.values()].join("");
  };

  const native = Capacitor.isNativePlatform();
  row("platform", "Plataforma", native ? Capacitor.getPlatform() : "navegador (web)");
  if (native)
    void App.getInfo()
      .then((i) => row("version", "Versión", `${i.version} (${i.build})`))
      .catch(() => row("version", "Versión", "desconocida", false));
  row("save", "Guardado", "comprobando…");
  void loadSave()
    .then((r) => row("save", "Guardado", r ? "OK" : "aún sin partida guardada", !!r))
    .catch(() => row("save", "Guardado", "error", false));
  row("league", "Servidor de la Liga", "comprobando…");
  void leagueApi.ping().then((ok) => row("league", "Servidor de la Liga", ok ? "conectado" : "sin conexión", ok));
  row("leagueMe", "Tu cuenta de la Liga", leagueJoined(ctx.state()) ? "apuntado" : "no apuntado");
  void notifications.permission().then((p) => row("notify", "Permiso de avisos", p, p === "granted" ? true : native ? false : undefined));
  row("ads", "Anuncios", native ? "AdMob (modo prueba salvo build final)" : "simulados en el navegador");

  const btnAd = sheet.el.querySelector<HTMLButtonElement>("[data-ad]")!;
  btnAd.onclick = async () => {
    btnAd.disabled = true;
    const ok = await ctx.testAd().catch(() => false);
    row("adTest", "Anuncio de prueba", ok ? "visto entero" : "no disponible o cerrado antes", ok);
    btnAd.disabled = false;
  };
  sheet.el.querySelector<HTMLButtonElement>("[data-note]")!.onclick = async () => {
    const ok = await notifications.test(10);
    row("noteTest", "Aviso de prueba", ok ? "programado: cierra la app y espera 10 s" : native ? "sin permiso" : "solo en el móvil", ok);
  };
  sheet.el.querySelector<HTMLButtonElement>("[data-vibe]")!.onclick = () => {
    haptics.medium();
    row("vibe", "Vibración", haptics.enabled ? "enviada (¿la has notado?)" : "desactivada en Ajustes");
  };
}
