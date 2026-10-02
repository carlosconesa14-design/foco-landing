import { describe, expect, it } from "vitest";
import { FOUNDERS, RARITIES } from "../src/game/data";
import { execMults } from "../src/game/execs";
import * as f from "../src/game/founders";
import { freshState, migrate } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 2, 12);

const inDubai = () => {
  const s = freshState(NOW, "dubai");
  s.world.completed = ["madrid", "miami"];
  return s;
};

describe("carrera de fundadores", () => {
  it("solo se pide el puesto al llegar a Dubái", () => {
    expect(f.founderPending(freshState(NOW), NOW)).toBe(false);
    expect(f.founderPending(inDubai(), NOW)).toBe(true);
  });

  it("los primeros reciben un ejecutivo legendario exclusivo, una sola vez", () => {
    const s = inDubai();
    const e = f.applyFounderRank(s, 7)!;
    expect(e.founder).toBe(7);
    expect(e.rarity).toBe(RARITIES.length - 1);
    expect(f.isFounder(s)).toBe(true);
    expect(f.founderPending(s, NOW)).toBe(false);
    expect(f.applyFounderRank(s, 7)).toBeNull();
    expect(s.meta.execs.filter((x) => x.founder)).toHaveLength(1);
  });

  it("el fundador da más que un legendario normal", () => {
    const s = inDubai();
    const e = f.applyFounderRank(s, 1)!;
    e.assigned = "supercars";
    expect(execMults(s, "supercars", NOW).sale).toBeCloseTo(1 + RARITIES[3].bonus + FOUNDERS.bonus);
  });

  it("después de las plazas no hay ejecutivo, pero se guarda el puesto", () => {
    const s = inDubai();
    expect(f.applyFounderRank(s, FOUNDERS.spots + 1)).toBeNull();
    expect(s.meta.founder.rank).toBe(FOUNDERS.spots + 1);
    expect(f.isFounder(s)).toBe(false);
    expect(s.meta.execs).toHaveLength(0);
  });

  it("en revisión no se vuelve a pedir; demasiado rápido, se espera", () => {
    const s = inDubai();
    f.applyFounderError(s, "too_fast", NOW, NOW + 86400e3);
    expect(f.founderPending(s, NOW + 1000)).toBe(false);
    expect(f.founderPending(s, NOW + 86400e3)).toBe(true);
    f.applyFounderError(s, "review", NOW);
    expect(f.founderPending(s, NOW + 2 * 86400e3)).toBe(false);
  });

  it("se guarda con la partida", () => {
    const s = inDubai();
    f.applyFounderRank(s, 3);
    const l = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(l.meta.founder.rank).toBe(3);
    expect(l.meta.execs[0].founder).toBe(3);
  });
});
