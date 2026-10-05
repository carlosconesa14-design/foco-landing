import { describe, expect, it } from "vitest";
import { MILESTONES } from "../src/game/data";
import { RANKS, bestRank, nextRank, rankOf, rankSnapshot, rankUps } from "../src/game/ranks";
import { withDropship } from "./fresh";

describe("rangos de los puestos", () => {
  it("bronce, plata, oro, diamante y leyenda en 10, 25, 50, 100 y 200", () => {
    expect([1, 9, 10, 24, 25, 50, 99, 100, 199, 200, 999].map(rankOf)).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5]);
    expect(nextRank(1)!.min).toBe(10);
    expect(nextRank(60)!.name).toBe(RANKS[3].name);
    expect(nextRank(200)).toBeNull();
  });

  it("cada rango coincide con un hito que ya duplica el rendimiento", () => {
    for (const r of RANKS) expect(MILESTONES).toContain(r.min);
  });

  it("detecta los ascensos una sola vez y no los puestos recién abiertos", () => {
    const s = withDropship(Date.UTC(2026, 9, 2));
    const b = s.biz.dropship;
    const before = rankSnapshot(s);
    b.floors[0].level = 30;
    b.floors.push({ level: 1, managed: false, stock: 0, prog: 0, running: false });
    b.sale.level = 10;
    const after = rankSnapshot(s);
    const ups = rankUps(before, after);
    expect(ups).toEqual([
      { bizId: "dropship", station: { kind: "floor", index: 0 }, rank: 2 },
      { bizId: "dropship", station: { kind: "sale" }, rank: 1 },
    ]);
    expect(rankUps(after, rankSnapshot(s))).toEqual([]);
    expect(bestRank(b)).toBe(2);
  });
});
