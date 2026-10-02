import { describe, expect, it } from "vitest";
import { canFuse, fuseExecs, fusableRarities } from "../src/game/fusion";
import { newExec } from "../src/game/meta";
import { freshState } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 2, 12);
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe("fusionar ejecutivos", () => {
  it("3 comunes → 1 raro, con la especialidad más repetida y en el sitio del asignado", () => {
    const s = freshState(NOW);
    const [a, b, c, d] = [0, 0, 0, 0].map((r) => newExec(r, rand));
    a.kind = "sale"; b.kind = "sale"; c.kind = "prod";
    a.assigned = "dropship";
    s.meta.execs.push(a, b, c);
    expect(fusableRarities(s)).toEqual([0]);
    const e = fuseExecs(s, 0, rand)!;
    expect(e.rarity).toBe(1);
    expect(e.kind).toBe("sale");
    expect(e.assigned).toBe("dropship");
    expect(s.meta.execs).toHaveLength(1);
    s.meta.execs.push(d);
    expect(canFuse(s, 0)).toBe(false);
  });

  it("los legendarios y el fundador no se fusionan; los libres van primero", () => {
    const s = freshState(NOW);
    for (let i = 0; i < 3; i++) s.meta.execs.push(newExec(3, rand));
    expect(canFuse(s, 3)).toBe(false);
    const t = freshState(NOW);
    const execs = [0, 0, 0, 0].map((r) => newExec(r, rand));
    execs[0].assigned = "dropship";
    t.meta.execs.push(...execs);
    fuseExecs(t, 0, rand);
    expect(t.meta.execs.some((e) => e.id === execs[0].id)).toBe(true); // el asignado se queda
    expect(fuseExecs(t, 1, rand)).toBeNull();
  });
});
