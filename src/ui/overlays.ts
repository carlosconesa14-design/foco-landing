import { decorateIcons } from "./icons";
import { fmt } from "../game/format";

/** Toasts, textos flotantes y ventanas modales. */

export function toast(root: HTMLElement, msg: string): void {
  // El mismo aviso no se apila (un toque en la bici dispara dos veces la misma acción).
  if ([...root.querySelectorAll(".toast")].some((el) => el.textContent === msg)) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

export function floatMoney(anchor: Element | null, amount: number): void {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "float";
  f.textContent = `+${fmt(amount)}`;
  f.style.left = `${r.left + 10}px`;
  f.style.top = `${r.top}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 900);
}

export interface ModalAction {
  label: string;
  /** Muestra el botón verde con el icono de vídeo. */
  ad?: boolean;
  run: () => void | Promise<void>;
}

let open = false;
export const modalOpen = () => open;

export function modal(root: HTMLElement, opts: { title: string; amount?: string; text: string; actions: ModalAction[]; list?: { icon: string; text: string }[] }): void {
  open = true;
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const box = document.createElement("div");
  box.className = "modal";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  const h = document.createElement("h3");
  h.textContent = opts.title;
  box.appendChild(h);
  if (opts.amount) {
    const a = document.createElement("div");
    a.className = "amount";
    a.textContent = opts.amount;
    box.appendChild(a);
  }
  const p = document.createElement("p");
  p.textContent = opts.text;
  box.appendChild(p);
  if (opts.list?.length) {
    // Lista corta de cosas pendientes (texto seguro: nunca HTML).
    const ul = document.createElement("ul");
    ul.className = "modal-list";
    for (const item of opts.list) {
      const li = document.createElement("li");
      const ic = document.createElement("span");
      ic.textContent = item.icon;
      li.append(ic, item.text);
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  const actions = document.createElement("div");
  actions.className = "actions col";
  for (const a of opts.actions) {
    const b = document.createElement("button");
    b.className = a.ad ? "ad-btn wide" : "btn ghost";
    b.innerHTML = a.ad ? '<span class="play"></span>' : "";
    b.append(a.label);
    b.onclick = async () => {
      scrim.remove();
      open = false;
      await a.run();
    };
    actions.appendChild(b);
  }
  box.appendChild(actions);
  scrim.appendChild(box);
  root.appendChild(scrim);
  decorateIcons(box);
  actions.querySelector("button")?.focus();
}
