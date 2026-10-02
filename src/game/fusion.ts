import { RARITIES, type ExecKind } from "./data";
import { newExec } from "./meta";
import type { Exec, GameState } from "./state";

/**
 * Fusionar ejecutivos: 3 de la misma rareza se convierten en 1 de la rareza siguiente
 * (común → raro → épico → legendario). Así los repetidos de los maletines sirven para algo.
 * Se usan primero los que no están asignados. El fundador no se puede fusionar.
 */

export const FUSE_COUNT = 3;

/** Ejecutivos que se pueden fusionar de una rareza (los libres primero). */
export function fusable(s: GameState, rarity: number): Exec[] {
  if (rarity >= RARITIES.length - 1) return [];
  return s.meta.execs.filter((e) => e.rarity === rarity && !e.founder).sort((a, b) => Number(!!a.assigned) - Number(!!b.assigned));
}

export const canFuse = (s: GameState, rarity: number) => fusable(s, rarity).length >= FUSE_COUNT;

/** Rarezas que se pueden fusionar ahora mismo. */
export const fusableRarities = (s: GameState) => RARITIES.map((_, i) => i).filter((r) => canFuse(s, r));

/**
 * Fusiona 3 ejecutivos de una rareza. El nuevo hereda la especialidad más repetida y, si alguno
 * estaba asignado a un negocio, ocupa su sitio. Devuelve el nuevo ejecutivo o null.
 */
export function fuseExecs(s: GameState, rarity: number, rand: () => number = Math.random): Exec | null {
  if (!canFuse(s, rarity)) return null;
  const used = fusable(s, rarity).slice(0, FUSE_COUNT);
  const counts = new Map<ExecKind, number>();
  for (const e of used) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  const kind = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const assigned = used.find((e) => e.assigned)?.assigned ?? null;
  s.meta.execs = s.meta.execs.filter((e) => !used.includes(e));
  const exec = { ...newExec(rarity + 1, rand), kind, assigned };
  s.meta.execs.push(exec);
  return exec;
}
