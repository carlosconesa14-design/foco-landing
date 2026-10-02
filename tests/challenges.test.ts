import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { AD_LADDER, adLadderStep, nextAdStep } from "../src/game/adLadder";
import {
  DAILY_RETOS,
  RETO_GEMS,
  WEEKLY_RETOS,
  claimDailyReto,
  claimWeeklyAll,
  claimWeeklyReto,
  dailyFor,
  dailyProgress,
  ensureRetos,
  retosToClaim,
  weekKey,
  type WeeklyRetoId,
} from "../src/game/challenges";
import { bump, freshState, migrate, type GameState } from "../src/game/state";

const at = (day: number, h = 12) => new Date(2026, 9, day, h).getTime(); // octubre 2026 (local)

function joined(now: number): GameState {
  const s = freshState(now);
  s.meta.league.id = "p";
  s.meta.league.secret = "s";
  return s;
}

describe("retos del día y de la semana", () => {
  it("el reto del día es el mismo para todos y cambia según la fecha", () => {
    expect(dailyFor("2026-10-01")).toBe(dailyFor("2026-10-01"));
    const ids = new Set(Array.from({ length: 20 }, (_, i) => dailyFor(`2026-10-${String(i + 1).padStart(2, "0")}`)));
    expect(ids.size).toBeGreaterThan(1);
  });

  it("semana ISO", () => {
    expect(weekKey(at(1))).toBe("2026-W40"); // jueves 1 oct 2026
    expect(weekKey(at(4, 23))).toBe("2026-W40"); // domingo
    expect(weekKey(at(5, 1))).toBe("2026-W41"); // lunes
  });

  it("solo cuenta lo hecho desde que empieza el día; se cobra una vez y avisa a la Liga", () => {
    const now = at(1);
    const s = joined(now);
    ensureRetos(s, now);
    const stat = DAILY_RETOS[s.meta.retos.daily].stat;
    bump(s, stat, 1);
    expect(dailyProgress(s)).toBe(1);
    expect(claimDailyReto(s)).toBeNull();
    bump(s, stat, 1000);
    expect(claimDailyReto(s)).toBe(RETO_GEMS.daily);
    expect(claimDailyReto(s)).toBeNull();
    expect(s.meta.retos.dailyCount).toBe(1);
    expect(s.meta.league.queue.some((e) => e.kind === "daily_reto")).toBe(true);
  });

  it("retos de la semana: se completan, se cobran y dan un extra al hacer los 4", () => {
    const now = at(1);
    const s = joined(now);
    ensureRetos(s, now);
    for (const [, def] of Object.entries(WEEKLY_RETOS)) if (def.stat) bump(s, def.stat, def.target);
    s.meta.retos.dailyCount = WEEKLY_RETOS.daily.target;
    expect(retosToClaim(s)).toBeGreaterThanOrEqual(4);
    for (const id of Object.keys(WEEKLY_RETOS) as WeeklyRetoId[]) expect(claimWeeklyReto(s, id)).toBe(RETO_GEMS.weekly);
    expect(claimWeeklyAll(s)).toBe(RETO_GEMS.weeklyAll);
    expect(claimWeeklyAll(s)).toBeNull();
    const refs = s.meta.league.queue.map((e) => `${e.kind}:${e.ref}`);
    expect(refs).toContain("weekly_reto:2026-W40:upgrades");
    expect(refs).toContain("weekly_all:2026-W40");
    // La semana siguiente empieza de cero
    ensureRetos(s, at(5));
    expect(s.meta.retos.weeklyClaimed).toEqual([]);
    expect(s.meta.retos.dailyCount).toBe(0);
  });

  it("las misiones y los hitos x2 cuentan para los retos", () => {
    const s = freshState(at(1));
    s.cash = 1e12;
    s.buyMode = 10;
    act.upgrade(s, "dropship", { kind: "sale" }); // nivel 11: hito del nivel 10
    expect(s.meta.stats.life.milestones).toBe(1);
  });

  it("se guardan y se cargan", () => {
    const s = freshState(at(1));
    ensureRetos(s, at(1));
    s.meta.retos.weeklyClaimed = ["sales"];
    s.meta.adLadder = { day: "2026-10-01", given: 2 };
    const back = migrate(JSON.parse(JSON.stringify(s)), at(1));
    expect(back.meta.retos).toEqual(s.meta.retos);
    expect(back.meta.adLadder).toEqual(s.meta.adLadder);
  });
});

describe("escalera diaria de anuncios", () => {
  it("da cada premio una vez al llegar a 3, 6 y 10 anuncios, y vuelve a empezar al día siguiente", () => {
    const s = freshState(at(1));
    const day1 = new Date("2026-10-01T12:00:00Z");
    const got: number[] = [];
    for (let i = 0; i < 12; i++) {
      act.recordAd(s, "boost_x2", day1);
      got.push(...adLadderStep(s, day1.getTime(), () => 0).map((x) => x.step));
    }
    expect(got).toEqual([0, 1, 2]);
    expect(s.meta.gems).toBeGreaterThanOrEqual(40);
    expect(nextAdStep(s, "2026-10-01")).toBeNull();
    const day2 = new Date("2026-10-02T12:00:00Z");
    expect(nextAdStep(s, "2026-10-02")).toMatchObject({ ads: AD_LADDER[0].ads, left: AD_LADDER[0].ads });
    act.recordAd(s, "boost_x2", day2);
    expect(adLadderStep(s, day2.getTime())).toEqual([]);
    expect(nextAdStep(s, "2026-10-02")!.left).toBe(AD_LADDER[0].ads - 1);
  });

  it("ver anuncios no genera eventos de Liga", () => {
    const s = joined(at(1));
    for (let i = 0; i < 10; i++) {
      act.recordAd(s, "boost_x2");
      adLadderStep(s, Date.now(), () => 0);
    }
    expect(s.meta.league.queue).toEqual([]);
  });
});
