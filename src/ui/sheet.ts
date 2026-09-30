/** Panel inferior (bottom sheet) para mejoras, compras y la bolsa. Solo hay uno abierto a la vez. */

export interface Sheet {
  el: HTMLElement;
  /** Se llama unas 8 veces por segundo mientras está abierto. */
  update?: () => void;
  close: () => void;
}

let current: Sheet | null = null;

export const activeSheet = () => current;

export function openSheet(root: HTMLElement, html: string, update?: (el: HTMLElement) => void): Sheet {
  current?.close();
  const scrim = document.createElement("div");
  scrim.className = "sheet-scrim";
  const el = document.createElement("div");
  el.className = "sheet";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="grab" aria-hidden="true"></div><button class="sheet-close" aria-label="Cerrar">✕</button>${html}`;
  scrim.appendChild(el);
  root.appendChild(scrim);
  const sheet: Sheet = {
    el,
    update: update ? () => update(el) : undefined,
    close: () => {
      scrim.remove();
      if (current === sheet) current = null;
    },
  };
  scrim.addEventListener("click", (e) => {
    if (e.target === scrim) sheet.close();
  });
  el.querySelector<HTMLButtonElement>(".sheet-close")!.onclick = sheet.close;
  current = sheet;
  sheet.update?.();
  return sheet;
}

export function closeSheet(): void {
  current?.close();
}
