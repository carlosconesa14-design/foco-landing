import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { lang, t } from "../i18n";

/** Páginas legales (generadas desde docs/ al compilar) dentro de un panel, sin salir del juego. */
export type LegalPage = "privacidad" | "bases-liga";


export function openLegal(ctx: PanelCtx, page: LegalPage): void {
  const title = page === "privacidad" ? t("Política de privacidad") : t("Bases de la Liga");
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">📄</span><div><h3>${title}</h3>${lang === "es" ? "" : `<p class="muted">${t("Documento oficial en español.")}</p>`}</div></div>
     <iframe class="legal-frame" src="legal/${page}.html" title="${title}"></iframe>`, undefined, { screen: "legal" },
  );
}
