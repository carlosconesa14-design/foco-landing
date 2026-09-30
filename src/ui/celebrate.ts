/**
 * Recompensas visuales escalonadas (la "dopamina" del juego):
 * - banner(): banda dorada para logros medianos (hito x2, puesto nuevo, misiones completadas).
 * - celebrate(): pantalla completa con confeti para los grandes (negocio nuevo, estilo de vida, bolsa).
 * - revealChest(): maletín que tiembla antes de revelar la rareza del ejecutivo.
 * - floatAt(): "+X €/s" que sube desde un botón al mejorar.
 */

const CONFETTI = ["#f5c542", "#3ddc97", "#ff6b5b", "#4aa8ff", "#b57bff", "#ffffff"];
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let bannerQueue: { icon: string; text: string }[] = [];
let bannerBusy = false;

/** Banda dorada que baja desde arriba. Si llegan varias, salen en cola. */
export function banner(root: HTMLElement, icon: string, text: string): void {
  bannerQueue.push({ icon, text });
  if (!bannerBusy) nextBanner(root);
}

function nextBanner(root: HTMLElement): void {
  const item = bannerQueue.shift();
  if (!item) {
    bannerBusy = false;
    return;
  }
  bannerBusy = true;
  const el = document.createElement("div");
  el.className = "banner";
  el.innerHTML = `<span class="bicon">${item.icon}</span><span></span>`;
  el.lastElementChild!.textContent = item.text;
  root.appendChild(el);
  setTimeout(() => el.classList.add("out"), 1900);
  setTimeout(() => {
    el.remove();
    nextBanner(root);
  }, 2300);
}

function confetti(host: HTMLElement, pieces = 60): void {
  if (reduced()) return;
  for (let i = 0; i < pieces; i++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = CONFETTI[i % CONFETTI.length];
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    c.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    c.style.setProperty("--drift", `${(Math.random() - 0.5) * 160}px`);
    c.style.setProperty("--spin", `${(Math.random() - 0.5) * 900}deg`);
    host.appendChild(c);
  }
}

export interface Celebration {
  icon: string;
  title: string;
  subtitle: string;
  /** Texto destacado (premio, siguiente paso…). */
  highlight?: string;
  color?: string;
  button?: string;
}

/** Celebración a pantalla completa. Se cierra con el botón o tocando fuera. */
export function celebrate(root: HTMLElement, c: Celebration): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "celebrate";
    el.style.setProperty("--glow", c.color ?? "#f5c542");
    el.innerHTML = `
      <div class="rays" aria-hidden="true"></div>
      <div class="cbox" role="dialog" aria-modal="true">
        <div class="cicon"></div>
        <h2></h2>
        <p class="csub"></p>
        ${c.highlight ? `<p class="chigh"></p>` : ""}
        <button class="claim cbtn"></button>
      </div>`;
    el.querySelector(".cicon")!.textContent = c.icon;
    el.querySelector("h2")!.textContent = c.title;
    el.querySelector(".csub")!.textContent = c.subtitle;
    if (c.highlight) el.querySelector(".chigh")!.textContent = c.highlight;
    const btn = el.querySelector<HTMLButtonElement>(".cbtn")!;
    btn.textContent = c.button ?? "¡Genial!";
    confetti(el);
    root.appendChild(el);
    const close = () => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 250);
      resolve();
    };
    btn.onclick = close;
    el.addEventListener("click", (e) => {
      if (e.target === el) close();
    });
    btn.focus();
  });
}

/** Maletín que tiembla y se abre: suspense antes de la recompensa variable. */
export function revealChest(root: HTMLElement, chestIcon: string, rarityColor: string, big: boolean): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "chestreveal";
    el.style.setProperty("--glow", rarityColor);
    el.innerHTML = `<div class="rays" aria-hidden="true"></div><div class="bigchest">${chestIcon}</div>`;
    root.appendChild(el);
    const shake = reduced() ? 0 : 1000;
    setTimeout(() => {
      el.classList.add("open");
      if (big) confetti(el, 80);
    }, shake);
    setTimeout(() => {
      el.remove();
      resolve();
    }, shake + 650);
  });
}

/** Texto verde que sube desde un elemento (p. ej. "+12 €/s" al mejorar). */
export function floatAt(anchor: Element, text: string): void {
  const r = anchor.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "float";
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2 - 30}px`;
  f.style.top = `${r.top - 6}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 900);
}
