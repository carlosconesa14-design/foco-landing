import type { GameState } from "./state";
import { t } from "../i18n";

/**
 * Escuela de negocios: investigación permanente. Cada hito x2 que consigues al mejorar una parte
 * (nivel 10, 25, 50…) te da una idea 💡. Las ideas se gastan en un árbol de mejoras que **no se
 * pierde nunca**: ni al salir a bolsa ni al cambiar de ciudad. Como al salir a bolsa vuelves a
 * pasar por los hitos, cada salida a bolsa trae ideas nuevas.
 *
 * Las ideas no se guardan: salen de las estadísticas (hitos de por vida) menos lo gastado.
 * El bot de equilibrado no investiga, así que los tests de ritmo no cambian.
 */

export type SchoolId = "prod" | "log" | "sale" | "mgr" | "start";

export interface SchoolNode {
  id: SchoolId;
  icon: string;
  max: number;
  /** Lo que da cada nivel (0.1 = +10 %). */
  per: number;
  /** Rama que hay que tener a cierto nivel antes de empezar esta. */
  req?: { id: SchoolId; level: number };
}

export const SCHOOL: SchoolNode[] = [
  { id: "prod", icon: "🏭", max: 10, per: 0.1 },
  { id: "log", icon: "🚚", max: 10, per: 0.1 },
  { id: "sale", icon: "💰", max: 10, per: 0.1, req: { id: "prod", level: 2 } },
  { id: "mgr", icon: "👔", max: 5, per: 0.2, req: { id: "log", level: 2 } },
  { id: "start", icon: "🚀", max: 5, per: 0.2, req: { id: "sale", level: 3 } },
];

export function schoolText(id: SchoolId): { name: string; desc: string } {
  switch (id) {
    case "prod":
      return { name: t("Procesos"), desc: t("+10 % de producción en todos los puestos por nivel") };
    case "log":
      return { name: t("Logística"), desc: t("+10 % de capacidad de transporte y venta por nivel") };
    case "sale":
      return { name: t("Marketing"), desc: t("+10 % de dinero por venta por nivel") };
    case "mgr":
      return { name: t("Liderazgo"), desc: t("Las habilidades de los gerentes duran un 20 % más y se recargan un 10 % antes por nivel") };
    case "start":
      return { name: t("Capital semilla"), desc: t("Tras salir a bolsa o abrir ciudad empiezas con dinero: un 20 % del segundo negocio por nivel") };
  }
}

export interface SchoolState {
  levels: Partial<Record<SchoolId, number>>;
  /** Ideas gastadas desde siempre. */
  spent: number;
  /** Ideas regaladas (premios). */
  bonus: number;
}

export const freshSchool = (): SchoolState => ({ levels: {}, spent: 0, bonus: 0 });

export const schoolLevel = (s: GameState, id: SchoolId) => s.meta.school?.levels[id] ?? 0;

/** Ideas por gastar. */
export const ideas = (s: GameState) => Math.max(0, (s.meta.stats.life.milestones ?? 0) + s.meta.school.bonus - s.meta.school.spent);

/** Coste en ideas del siguiente nivel (3, 5, 7…). */
export const schoolCost = (level: number) => 3 + 2 * level;

export type SchoolCheck = "ok" | "max" | "locked" | "ideas";

export function canStudy(s: GameState, id: SchoolId): SchoolCheck {
  const node = SCHOOL.find((n) => n.id === id)!;
  const lvl = schoolLevel(s, id);
  if (lvl >= node.max) return "max";
  if (node.req && schoolLevel(s, node.req.id) < node.req.level) return "locked";
  if (ideas(s) < schoolCost(lvl)) return "ideas";
  return "ok";
}

export function study(s: GameState, id: SchoolId): boolean {
  if (canStudy(s, id) !== "ok") return false;
  const lvl = schoolLevel(s, id);
  s.meta.school.spent += schoolCost(lvl);
  s.meta.school.levels[id] = lvl + 1;
  return true;
}

/** Multiplicadores permanentes (también offline). */
export function schoolMults(s: GameState): { prod: number; log: number; sale: number } {
  const per = (id: SchoolId) => 1 + SCHOOL.find((n) => n.id === id)!.per * schoolLevel(s, id);
  return { prod: per("prod"), log: per("log"), sale: per("sale") };
}

/** Fracción del precio del segundo negocio con la que empiezas tras salir a bolsa o abrir ciudad. */
export const seedShare = (s: GameState) => SCHOOL.find((n) => n.id === "start")!.per * schoolLevel(s, "start");

/** Hay algo que investigar ahora mismo (para el punto rojo del botón). */
export const schoolReady = (s: GameState) => SCHOOL.some((n) => canStudy(s, n.id) === "ok");

export function migrateSchool(raw: unknown): SchoolState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
  const out = freshSchool();
  const lv = r.levels && typeof r.levels === "object" ? (r.levels as Record<string, unknown>) : {};
  for (const n of SCHOOL) {
    const v = Math.min(n.max, num(lv[n.id]));
    if (v > 0) out.levels[n.id] = v;
  }
  out.spent = num(r.spent);
  out.bonus = num(r.bonus);
  return out;
}
