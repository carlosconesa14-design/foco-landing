import { schoolLevel } from "./school";
import { bump, type BusinessState, type GameState } from "./state";
import type { Station } from "./economy";

/**
 * Habilidades de los gerentes: cada parte de la cadena con gerente tiene un botón que la acelera
 * x2 durante unos minutos y luego se recarga. Solo cuenta jugando (no offline). La investigación
 * «Gerentes» (school.ts) alarga la duración y acorta la recarga.
 *
 * - Puesto: «Turno doble», produce el doble de rápido.
 * - Transporte: «Ruta exprés», recorre la ruta el doble de rápido.
 * - Venta: «Hora punta», vende el doble de rápido.
 */
export const SKILL = { mult: 2, minutes: 5, cooldownMin: 20 } as const;

export interface SkillSlot {
  /** Fin del efecto en curso. */
  end: number;
  /** Cuándo se puede volver a usar. */
  ready: number;
}

/** Clave de una parte en `BusinessState.skills`: "f0"…"f7", "t" o "s". */
export const skillKey = (st: Station): string => (st.kind === "floor" ? `f${st.index}` : st.kind === "transport" ? "t" : "s");

export const skillDurationMs = (s: GameState) => SKILL.minutes * 60e3 * (1 + 0.2 * schoolLevel(s, "mgr"));
export const skillCooldownMs = (s: GameState) => SKILL.cooldownMin * 60e3 * (1 - 0.1 * schoolLevel(s, "mgr"));

/** Multiplicador de velocidad de una parte ahora mismo (1 o SKILL.mult). */
export const skillSpeed = (b: BusinessState, key: string, now: number) => ((b.skills[key]?.end ?? 0) > now ? SKILL.mult : 1);

export type SkillState = "locked" | "ready" | "active" | "cooldown";

export interface SkillStatus {
  /** locked: sin gerente; ready: se puede usar; active: en marcha; cooldown: recargando. */
  state: SkillState;
  /** Milisegundos que le quedan al efecto (active) o a la recarga (cooldown). */
  left: number;
  /** 0–1: lo que queda del efecto (active) o lo recargado (cooldown). */
  progress: number;
}

const managedOf = (b: BusinessState, st: Station) =>
  st.kind === "floor" ? !!b.floors[st.index]?.managed : st.kind === "transport" ? b.transport.managed : b.sale.managed;

export function skillStatus(s: GameState, b: BusinessState, st: Station, now: number): SkillStatus {
  if (!managedOf(b, st)) return { state: "locked", left: 0, progress: 0 };
  const slot = b.skills[skillKey(st)];
  if (slot && slot.end > now) {
    return { state: "active", left: slot.end - now, progress: Math.min(1, (slot.end - now) / skillDurationMs(s)) };
  }
  if (slot && slot.ready > now) {
    const cd = skillCooldownMs(s);
    return { state: "cooldown", left: slot.ready - now, progress: Math.max(0, Math.min(1, 1 - (slot.ready - now) / cd)) };
  }
  return { state: "ready", left: 0, progress: 1 };
}

/** Activa la habilidad del gerente de una parte. Devuelve false si no tiene gerente o se está recargando. */
export function useSkill(s: GameState, b: BusinessState, st: Station, now: number): boolean {
  if (skillStatus(s, b, st, now).state !== "ready") return false;
  b.skills[skillKey(st)] = { end: now + skillDurationMs(s), ready: now + skillCooldownMs(s) };
  bump(s, "skills");
  return true;
}

/** Cuántas habilidades se pueden usar ahora en un negocio (para un aviso en la interfaz). */
export function skillsReady(s: GameState, b: BusinessState, now: number): number {
  const sts: Station[] = [...b.floors.map((_, i) => ({ kind: "floor", index: i }) as Station), { kind: "transport" }, { kind: "sale" }];
  return sts.filter((st) => skillStatus(s, b, st, now).state === "ready").length;
}

export function migrateSkills(raw: unknown): Record<string, SkillSlot> {
  const out: Record<string, SkillSlot> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^(f[0-7]|t|s)$/.test(k) || !v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const end = typeof o.end === "number" && Number.isFinite(o.end) ? o.end : 0;
    const ready = typeof o.ready === "number" && Number.isFinite(o.ready) ? o.ready : 0;
    out[k] = { end, ready };
  }
  return out;
}
