import { presentSheet, type SheetPresentation } from "./panelPresentation";
import { t } from "../i18n";
import { decorateIcons } from "./icons";
/** Panel inferior (bottom sheet) para mejoras, compras y la bolsa. Solo hay uno abierto a la vez. */

export interface Sheet {
  el: HTMLElement;
  /** Se llama unas 8 veces por segundo mientras está abierto. */
  update?: () => void;
  close: () => void;
}

let current: Sheet | null = null;

export const activeSheet = () => current;

export function openSheet(root: HTMLElement, html: string, update?: (el: HTMLElement) => void, presentation: SheetPresentation = {}): Sheet {
  current?.close();
  const opener = document.activeElement as HTMLElement | null;
  const scrim = document.createElement("div");
  scrim.className = "sheet-scrim";
  const el = document.createElement("div");
  el.className = "sheet";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="grab" aria-hidden="true"></div><button class="sheet-close" aria-label="${t("Cerrar")}">✕</button>${html}`;
  el.setAttribute("aria-label", el.querySelector("h3")?.textContent ?? t("Panel del juego"));
  presentSheet(el, presentation);
  scrim.appendChild(el);
  root.appendChild(scrim);
  const sheet: Sheet = {
    el,
    update: update ? () => { update(el); decorateIcons(el); } : undefined,
    close: () => {
      document.removeEventListener("keydown", onKey);
      scrim.remove();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      if (current === sheet) current = null;
    },
  };
  scrim.addEventListener("click", (e) => {
    if (e.target === scrim) sheet.close();
  });
  el.querySelector<HTMLButtonElement>(".sheet-close")!.onclick = sheet.close;
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); sheet.close(); }
    if (event.key !== "Tab") return;
    const buttons = [...el.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(button => button.getClientRects().length > 0);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  document.addEventListener("keydown", onKey);
  current = sheet;
  sheet.update?.();
  decorateIcons(el);
  el.querySelector<HTMLButtonElement>(".sheet-close")!.focus({ preventScroll: true });
  return sheet;
}

export function closeSheet(): void {
  current?.close();
}
