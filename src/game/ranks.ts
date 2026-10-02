import type { Station } from "./economy";
import type { BusinessState, GameState } from "./state";

/**
 * Rangos de los puestos (ver docs/GDD.md, «Rangos»): cada parte de la cadena (puesto, transporte y
 * venta) sube de rango al llegar a ciertos niveles. Coinciden con hitos que ya duplican el
 * rendimiento, así que el rango es solo visual: se ve en el recinto (pedestal, brillo, medalla y,
 * cuando exista, arte propio de cada rango) y se celebra. No cambia ningún número de la economía.
 */

export interface Rank {
  /** 1 = bronce … 5 = leyenda (0 = sin rango). */
  n: number;
  /** Nivel a partir del que se consigue. */
  min: number;
  name: string;
  icon: string;
  /** Color principal (pedestal, brillo, medalla). */
  color: number;
  /** Color oscuro para bordes. */
  edge: number;
}

export const RANKS: Rank[] = [
  { n: 1, min: 10, name: "Bronce", icon: "🥉", color: 0xd08a4e, edge: 0x8a5228 },
  { n: 2, min: 25, name: "Plata", icon: "🥈", color: 0xcfd8e3, edge: 0x7c8a9c },
  { n: 3, min: 50, name: "Oro", icon: "🥇", color: 0xf5c542, edge: 0xa77b0f },
  { n: 4, min: 100, name: "Diamante", icon: "💎", color: 0x6fe3ff, edge: 0x2a8fb5 },
  { n: 5, min: 200, name: "Leyenda", icon: "👑", color: 0xc77dff, edge: 0x6a2ca8 },
];

/** Rango de un nivel: 0 sin rango, 1–5 de bronce a leyenda. */
export function rankOf(level: number): number {
  let n = 0;
  for (const r of RANKS) if (level >= r.min) n = r.n;
  return n;
}

export const rankInfo = (n: number): Rank | null => RANKS[n - 1] ?? null;

/** Siguiente rango por conseguir (null si ya es leyenda). */
export const nextRank = (level: number): Rank | null => RANKS.find((r) => level < r.min) ?? null;

/** A partir de oro, el ascenso se celebra a pantalla completa. */
export const BIG_RANK = 3;

const levelOf = (b: BusinessState, st: Station) => (st.kind === "floor" ? b.floors[st.index]?.level ?? 0 : st.kind === "transport" ? b.transport.level : b.sale.level);

export const stationRank = (b: BusinessState, st: Station) => rankOf(levelOf(b, st));

/** Rangos de todas las partes de los negocios de la ciudad actual, por clave «negocio:parte». */
export function rankSnapshot(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, b] of Object.entries(s.biz)) {
    if (!b.owned) continue;
    b.floors.forEach((f, i) => (out[`${id}:floor:${i}`] = rankOf(f.level)));
    out[`${id}:transport`] = rankOf(b.transport.level);
    out[`${id}:sale`] = rankOf(b.sale.level);
  }
  return out;
}

export interface RankUp {
  bizId: string;
  station: Station;
  rank: number;
}

/** Ascensos entre dos fotos de rangos (para celebrarlos una vez, venga de donde venga la mejora). */
export function rankUps(before: Record<string, number>, after: Record<string, number>): RankUp[] {
  const ups: RankUp[] = [];
  for (const [key, rank] of Object.entries(after)) {
    if (rank <= (before[key] ?? 0) || rank === 0) continue;
    const [bizId, kind, idx] = key.split(":");
    const station: Station = kind === "floor" ? { kind: "floor", index: Number(idx) } : { kind: kind as "transport" | "sale" };
    ups.push({ bizId, station, rank });
  }
  return ups;
}

/** Mejor rango conseguido por cualquier parte del negocio (para el cartel del edificio). */
export function bestRank(b: BusinessState): number {
  return Math.max(rankOf(b.transport.level), rankOf(b.sale.level), ...b.floors.map((f) => rankOf(f.level)));
}
