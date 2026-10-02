import { describe, expect, it } from "vitest";
import { awaySummary } from "../src/game/away";
import { earn } from "../src/game/economy";
import * as rival from "../src/game/rival";
import { freshState, migrate } from "../src/game/state";

const MON = new Date(2026, 9, 5, 10).getTime(); // lunes
const DAY = 864e5;

describe("rival de la semana", () => {
  it("cada lunes llega un rival con una meta a tu medida", () => {
    const s = freshState(MON);
    expect(rival.ensureRival(s, MON, 100)).toBe(true);
    expect(rival.ensureRival(s, MON + DAY, 100)).toBe(false);
    expect(s.meta.rival.target).toBe(100 * 3600 * rival.RIVAL.baseHours);
    const who = s.meta.rival.who;
    expect(rival.ensureRival(s, MON + 7 * DAY, 100)).toBe(true);
    expect(s.meta.rival.who).toBe((who + 1) % rival.RIVALS.length);
  });

  it("el rival avanza durante la semana", () => {
    const s = freshState(MON);
    rival.ensureRival(s, MON, 100);
    const r = s.meta.rival;
    expect(rival.rivalScore(s, r.start)).toBe(0);
    expect(rival.rivalScore(s, r.start + 3.5 * DAY)).toBeGreaterThan(r.target / 2);
    expect(rival.rivalScore(s, r.end)).toBeCloseTo(r.target);
  });

  it("superar su meta da el premio una vez y el siguiente es más fuerte", () => {
    const s = freshState(MON);
    rival.ensureRival(s, MON, 100);
    expect(rival.checkRival(s, MON)).toBeNull();
    earn(s, s.meta.rival.target);
    const gems = s.meta.gems;
    const g = rival.checkRival(s, MON + 1000, () => 0.5)!;
    expect(g).toHaveLength(2);
    expect(s.meta.gems - gems).toBeGreaterThanOrEqual(rival.RIVAL.gems);
    expect(rival.checkRival(s, MON + 2000)).toBeNull();
    rival.ensureRival(s, MON + 7 * DAY, 100);
    expect(s.meta.rival.target).toBe(100 * 3600 * (rival.RIVAL.baseHours + rival.RIVAL.hoursPerWin));
    expect(migrate(JSON.parse(JSON.stringify(s)), MON).meta.rival.wins).toBe(1);
  });

  it("para quien empieza hay una meta mínima", () => {
    const s = freshState(MON);
    rival.ensureRival(s, MON, 0);
    expect(s.meta.rival.target).toBe(rival.RIVAL.minTarget);
  });
});

describe("mientras no estabas", () => {
  it("enseña lo que te espera, como mucho 4 cosas", () => {
    const s = freshState(MON);
    s.meta.freeChestAt = MON - 1;
    const list = awaySummary(s, MON, 1e6);
    expect(list.length).toBeGreaterThan(1);
    expect(list.length).toBeLessThanOrEqual(4);
    expect(list.some((x) => x.icon === "💼")).toBe(true);
  });
});
