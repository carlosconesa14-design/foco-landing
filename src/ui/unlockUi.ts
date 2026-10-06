import { fmt } from "../game/format";
import type { GameState } from "../game/state";
import { FEATURES, checkUnlocks, featureDef, isUnlocked, needProgress, nextLocked, type FeatureDef, type FeatureId, type Need } from "../game/unlocks";
import { money, t } from "../i18n";
import { banner } from "./celebrate";
import { modal } from "./overlays";

/**
 * Interfaz del desbloqueo gradual (src/game/unlocks.ts): los botones de lo que aún no tienes se ven
 * con candado; al tocarlos se explica qué es y cómo conseguirlo, con lo que llevas. Al desbloquear,
 * aviso y el botón brilla hasta que lo abres.
 */

const LABELS = (): Record<FeatureId, { name: string; desc: string }> => ({
  daily: { name: t("Premio diario"), desc: t("Un regalo cada día: diamantes, dinero o maletines. Cuantos más días seguidos, mejor.") },
  missions: { name: t("Misiones"), desc: t("Tres objetivos nuevos cada día, con diamantes de premio.") },
  execs: { name: t("Ejecutivos"), desc: t("Maletines con ejecutivos que multiplican tus negocios. Uno gratis cada pocas horas.") },
  auto: { name: t("Mejorar todo"), desc: t("Reparte tu dinero en las mejores mejoras con un solo toque.") },
  wheel: { name: t("Ruleta diaria"), desc: t("Un giro gratis cada día: diamantes, dinero o un maletín.") },
  achievements: { name: t("Logros"), desc: t("Grandes retos para toda la partida, con diamantes.") },
  life: { name: t("Mi vida"), desc: t("Cómprate ropa, coches, casas y caprichos. Cada uno sube tus ingresos para siempre.") },
  school: { name: t("Escuela de negocios"), desc: t("Investigación permanente: cada hito x2 te da una idea 💡 y las ideas compran mejoras que no se pierden nunca, ni al salir a bolsa.") },
  league: { name: t("Liga Millonario"), desc: t("Compite cada semana con otros jugadores por diamantes.") },
  rival: { name: t("Rival de la semana"), desc: t("Un competidor nuevo cada lunes. Si le ganas, maletín de oro.") },
  event: { name: t("Evento del finde"), desc: t("Cada fin de semana, 10 premios por jugar.") },
  invite: { name: t("Invita a amigos"), desc: t("Diamantes para ti y para cada amigo que se una.") },
});

export const featureName = (id: FeatureId) => LABELS()[id].name;

/** Qué hay que hacer, en palabras del jugador. */
export function needText(need: Need): string {
  switch (need.kind) {
    case "tutorial":
      return t("Termina el tutorial");
    case "stat":
      if (need.stat === "floors") return t("Abre {n} puestos nuevos", { n: need.n });
      if (need.stat === "upgrades") return t("Mejora {n} veces", { n: need.n });
      if (need.stat === "hires") return t("Contrata {n} gerentes", { n: need.n });
      if (need.stat === "milestones") return t("Consigue {n} hitos x2", { n: need.n });
      return `${need.stat} ${need.n}`;
    case "earned":
      return t("Gana {m} en total", { m: money(need.n) });
    case "biz":
      return t("Compra tu segundo negocio");
  }
}

/** «Llevas 3/7» o «Llevas 1.2 M € de 10 M €». */
export function progressText(s: GameState, need: Need): string {
  const p = needProgress(s, need);
  return need.kind === "earned"
    ? t("Llevas {a} de {b}", { a: money(Math.min(p.have, p.goal)), b: money(p.goal) })
    : t("Llevas {a}/{b}", { a: fmt(Math.min(p.have, p.goal)), b: fmt(p.goal) });
}

/** Elementos de una función (botones del lateral y del menú, y «Mejorar todo»). */
const elementsOf = (root: HTMLElement, id: FeatureId): HTMLElement[] => [
  ...root.querySelectorAll<HTMLElement>(`[data-open="${id}"]`),
  ...(id === "auto" ? [document.getElementById("autoBtn")!] : []),
];

/** Las que se acaban de desbloquear brillan hasta que se abren. */
const fresh = new Set<FeatureId>();

let shown = "";

/** Pone o quita los candados (solo si algo ha cambiado). */
export function applyLocks(root: HTMLElement, s: GameState): void {
  const key = s.meta.unlocked.join(",") + "|" + [...fresh].join(",");
  if (key === shown) return;
  shown = key;
  const labels = LABELS();
  for (const f of FEATURES) {
    const locked = !isUnlocked(s, f.id);
    for (const el of elementsOf(root, f.id)) {
      el.classList.toggle("locked", locked);
      el.classList.toggle("fresh-unlock", fresh.has(f.id));
      if (locked) el.setAttribute("aria-label", `${labels[f.id].name} (${t("bloqueado")})`);
      else el.removeAttribute("aria-label");
    }
  }
}

/** Al abrir una función, deja de brillar. */
export function seen(id: string): void {
  if (fresh.delete(id as FeatureId)) shown = "";
}

/** Explica una función bloqueada y cómo conseguirla. */
export function showLocked(root: HTMLElement, s: GameState, id: FeatureId): void {
  const f = featureDef(id);
  const l = LABELS()[id];
  modal(root, {
    title: `🔒 ${l.name}`,
    amount: f.icon,
    text: `${l.desc} ${t("Se desbloquea así: {how}.", { how: needText(f.need) })} ${progressText(s, f.need)}.`,
    actions: [{ label: t("¡Voy a por ello!"), run: () => {} }],
  });
}

/** Comprueba si toca desbloquear algo y lo anuncia. Devuelve lo nuevo. */
export function tickUnlocks(root: HTMLElement, s: GameState, fx: (name: "milestone", big?: boolean) => void): FeatureDef[] {
  const got = checkUnlocks(s);
  if (!got.length) return got;
  const labels = LABELS();
  for (const f of got) fresh.add(f.id);
  fx("milestone", true);
  banner(root, "🔓", got.length === 1
    ? t("¡Nuevo: {name}! {desc}", { name: labels[got[0].id].name, desc: labels[got[0].id].desc })
    : t("¡Nuevo: {names}!", { names: got.map((f) => `${f.icon} ${labels[f.id].name}`).join(" · ") }));
  return got;
}

/** Línea del menú con el próximo desbloqueo. */
export function nextUnlockText(s: GameState): string {
  const f = nextLocked(s);
  if (!f) return "";
  return `🔒 ${t("Próximo: {name}", { name: `${f.icon} ${LABELS()[f.id].name}` })} · ${needText(f.need)} · ${progressText(s, f.need)}`;
}
