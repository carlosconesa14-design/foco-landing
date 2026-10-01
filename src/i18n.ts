import { fmt } from "./game/format";
import { EN } from "./i18n/en";

/**
 * Idiomas del juego. El español es el texto original: las claves de `t()` son la frase en
 * español, y `src/i18n/en.ts` tiene su traducción. Si falta una traducción se ve en español.
 *
 * El idioma se elige al arrancar (ajuste guardado o idioma del móvil) y cambiarlo recarga la app.
 * Fuera del navegador (tests) siempre es español.
 */

export type Lang = "es" | "en";
export const LANGS: { id: Lang; name: string }[] = [
  { id: "es", name: "Español" },
  { id: "en", name: "English" },
];

const STORE_KEY = "lang";

function detect(): Lang {
  if (typeof document === "undefined") return "es";
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    /* sin almacenamiento */
  }
  // Español (y lenguas de España) → español. El resto del mundo → inglés.
  const first = (navigator.languages?.[0] ?? navigator.language ?? "es").toLowerCase();
  return /^(es|ca|gl|eu)\b/.test(first) ? "es" : "en";
}

export const lang: Lang = detect();

/** Guarda el idioma elegido. Hay que recargar para aplicarlo. */
export function saveLang(l: Lang): void {
  try {
    localStorage.setItem(STORE_KEY, l);
  } catch {
    /* sin almacenamiento: se queda el del móvil */
  }
}

type Vars = Record<string, string | number>;

/** Traduce una frase escrita en español. `{n}` se sustituye por `vars.n`. */
export function t(es: string, vars?: Vars): string {
  const text = lang === "en" ? (EN[es] ?? es) : es;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}

/** Símbolo de la moneda del juego: € en español, $ en inglés. */
export const CUR = lang === "en" ? "$" : "€";

/** Dinero del juego: «1.23 K €» / «$1.23 K». */
export const money = (n: number): string => (lang === "en" ? `$${fmt(n)}` : `${fmt(n)} €`);

/** Dinero real (premios de la Liga), en euros con el formato del idioma. */
export const euros = (cents: number): string =>
  new Intl.NumberFormat(lang === "en" ? "en-IE" : "es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(cents / 100);

/** Traduce los textos fijos del HTML (index.html): nodos de texto y aria-label/title/placeholder. */
export function localizeDom(root: HTMLElement | Document = document): void {
  if (lang === "es") return;
  document.documentElement.lang = lang;
  document.title = t(document.title);
  const body = root instanceof Document ? root.body : root;
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const raw = n.nodeValue ?? "";
    const key = raw.trim();
    if (key && EN[key]) n.nodeValue = raw.replace(key, EN[key]);
  }
  body.querySelectorAll<HTMLElement>("[aria-label],[title],[placeholder]").forEach((el) => {
    for (const a of ["aria-label", "title", "placeholder"]) {
      const v = el.getAttribute(a);
      if (v && EN[v]) el.setAttribute(a, EN[v]);
    }
  });
}
