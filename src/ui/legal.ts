import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";

/** Páginas legales (generadas desde docs/ al compilar) dentro de un panel, sin salir del juego. */
export type LegalPage = "privacidad" | "bases-liga";

const TITLES: Record<LegalPage, string> = { privacidad: "Política de privacidad", "bases-liga": "Bases de la Liga" };

export function openLegal(ctx: PanelCtx, page: LegalPage): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">📄</span><div><h3>${TITLES[page]}</h3></div></div>
     <iframe class="legal-frame" src="legal/${page}.html" title="${TITLES[page]}"></iframe>`,
  );
}
