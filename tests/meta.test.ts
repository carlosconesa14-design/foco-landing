import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { BUSINESSES, CHESTS, DAILY_REWARDS, META, MISSIONS, RARITIES, TUTORIAL } from "../src/game/data";
import { chainRates, saleCap, tapStation, tick } from "../src/game/economy";
import { execMults } from "../src/game/execs";
import * as meta from "../src/game/meta";
import { freshState, migrate, type GameState } from "../src/game/state";

const NOW = Date.UTC(2026, 8, 30, 12);
const DAY = 86400e3;
const DROP = BUSINESSES[0];

/** Generador pseudoaleatorio fijo para que los tests sean reproducibles. */
function seq(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

function run(s: GameState, seconds: number, step = 1 / 30) {
  for (let t = 0; t < seconds; t += step) tick(s, step, NOW);
}

describe("misiones diarias", () => {
  it("genera 3 misiones distintas, iguales para todo el día", () => {
    const s = freshState(NOW);
    meta.ensureDay(s, NOW);
    const ids = s.meta.missions.list.map((m) => m.id);
    expect(new Set(ids).size).toBe(3);
    meta.ensureDay(s, NOW + 3600e3);
    expect(s.meta.missions.list.map((m) => m.id)).toEqual(ids);
  });

  it("se completan con los contadores del día y se cobran una vez", () => {
    const s = freshState(NOW);
    meta.ensureDay(s, NOW);
    const mi = s.meta.missions.list[0];
    expect(meta.claimMission(s, 0)).toBeNull();
    s.meta.stats.day[mi.id] = mi.target;
    expect(meta.claimMission(s, 0)).toBe(MISSIONS[mi.id].gems);
    expect(meta.claimMission(s, 0)).toBeNull();
  });

  it("al completar las tres se puede cobrar el bonus", () => {
    const s = freshState(NOW);
    meta.ensureDay(s, NOW);
    s.meta.missions.list.forEach((mi, i) => {
      s.meta.stats.day[mi.id] = mi.target;
      meta.claimMission(s, i);
    });
    expect(meta.claimMissionBonus(s)).toBe(META.missionBonusGems);
    expect(meta.claimMissionBonus(s)).toBeNull();
  });

  it("al cambiar de día se reinician los contadores diarios", () => {
    const s = freshState(NOW);
    meta.ensureDay(s, NOW);
    s.meta.stats.day.sales = 99;
    meta.ensureDay(s, NOW + DAY);
    expect(s.meta.stats.day.sales).toBeUndefined();
    expect(s.meta.missions.day).toBe(meta.dayKey(NOW + DAY));
  });

  it("las ventas y mejoras cuentan para las estadísticas", () => {
    const s = freshState(NOW);
    s.cash = 100;
    act.upgrade(s, DROP.id, { kind: "floor", index: 0 });
    s.biz[DROP.id].topStock = 10;
    tapStation(s, DROP.id, { kind: "sale" });
    run(s, 5);
    expect(s.meta.stats.life.upgrades).toBe(1);
    expect(s.meta.stats.day.sales).toBe(1);
  });
});

describe("racha diaria", () => {
  it("avanza día a día y se reinicia si te saltas uno", () => {
    const s = freshState(NOW);
    expect(meta.claimDaily(s, NOW)).toEqual({ gems: 10 });
    expect(meta.claimDaily(s, NOW)).toBeNull();
    meta.claimDaily(s, NOW + DAY);
    expect(s.meta.daily.streak).toBe(2);
    expect(meta.dailyStatus(s, NOW + 3 * DAY).index).toBe(0);
  });

  it("vuelve al primer premio tras 7 días seguidos y el anuncio lo duplica", () => {
    const s = freshState(NOW);
    for (let d = 0; d < DAILY_REWARDS.length; d++) meta.claimDaily(s, NOW + d * DAY, false, seq(0.5));
    expect(meta.dailyStatus(s, NOW + 7 * DAY).index).toBe(0);
    expect(meta.claimDaily(s, NOW + 7 * DAY, true)).toEqual({ gems: 20 });
  });
});

describe("maletines y ejecutivos", () => {
  it("el maletín normal cuesta diamantes y da un ejecutivo", () => {
    const s = freshState(NOW);
    expect(meta.openChest(s, "normal", NOW)).toBeNull();
    s.meta.gems = CHESTS.normal.cost;
    const g = meta.openChest(s, "normal", NOW, seq(0.99, 0.1, 0.2, 0.3, 0.4, 0.5))!;
    expect(g.exec?.rarity).toBe(3);
    expect(s.meta.execs).toHaveLength(1);
    expect(s.meta.gems).toBe(g.gems);
  });

  it("el maletín gratis solo se abre cada 4 horas", () => {
    const s = freshState(NOW);
    expect(meta.openChest(s, "free", NOW)).not.toBeNull();
    expect(meta.openChest(s, "free", NOW + 3600e3)).toBeNull();
    expect(meta.openChest(s, "free", NOW + META.freeChestHours * 3600e3)).not.toBeNull();
  });

  it("un ejecutivo de ventas asignado sube lo que se cobra", () => {
    const s = freshState(NOW);
    const e = meta.newExec(1, seq(0.1, 0.1, 0.1, 0.99));
    expect(e.kind).toBe("sale");
    s.meta.execs.push(e);
    meta.assignExec(s, e.id, DROP.id);
    expect(execMults(s, DROP.id, NOW).sale).toBeCloseTo(1 + RARITIES[1].bonus);
    s.biz[DROP.id].topStock = 10;
    tapStation(s, DROP.id, { kind: "sale" });
    run(s, 5);
    expect(s.cash).toBeCloseTo(10 * (1 + RARITIES[1].bonus));
  });

  it("uno de logística sube la capacidad de venta", () => {
    const s = freshState(NOW);
    const e = { ...meta.newExec(3, seq(0.5)), kind: "log" as const };
    s.meta.execs.push(e);
    meta.assignExec(s, e.id, DROP.id);
    s.biz[DROP.id].topStock = 1e6;
    tapStation(s, DROP.id, { kind: "sale" });
    run(s, 5);
    expect(s.cash).toBeCloseTo(saleCap(DROP, 1) * (1 + RARITIES[3].bonus));
    const r = chainRates(DROP, s.biz[DROP.id], false, execMults(s, DROP.id, NOW));
    expect(r.sale).toBeGreaterThan(chainRates(DROP, s.biz[DROP.id], false).sale);
  });

  it("solo hay un ejecutivo por negocio", () => {
    const s = freshState(NOW);
    const a = meta.newExec(0, seq(0.1));
    const b = meta.newExec(0, seq(0.2));
    s.meta.execs.push(a, b);
    meta.assignExec(s, a.id, DROP.id);
    meta.assignExec(s, b.id, DROP.id);
    expect(meta.execAt(s, DROP.id)?.id).toBe(b.id);
    expect(a.assigned).toBeNull();
  });

  it("la habilidad multiplica las ventas un rato y luego se recarga", () => {
    const s = freshState(NOW);
    const e = meta.newExec(2, seq(0.5));
    s.meta.execs.push(e);
    expect(meta.activateAbility(s, e.id, NOW)).toBe(false); // sin asignar
    meta.assignExec(s, e.id, DROP.id);
    const base = execMults(s, DROP.id, NOW).sale;
    expect(meta.activateAbility(s, e.id, NOW)).toBe(true);
    expect(execMults(s, DROP.id, NOW + 1000).sale).toBeCloseTo(base * RARITIES[2].ability);
    expect(execMults(s, DROP.id, NOW + 1000, false).sale).toBeCloseTo(base);
    expect(meta.activateAbility(s, e.id, NOW + 1000)).toBe(false);
    expect(meta.rechargeAbility(s, e.id, NOW + 1000)).toBe(true);
    expect(meta.activateAbility(s, e.id, NOW + 1000)).toBe(true);
  });
});

describe("logros, tienda y tutorial", () => {
  it("los logros se cobran al alcanzarlos", () => {
    const s = freshState(NOW);
    expect(meta.claimAchievement(s, "earn_1k")).toBeNull();
    s.totalEarned = 1e3;
    expect(meta.achievementsToClaim(s)).toBe(1);
    expect(meta.claimAchievement(s, "earn_1k")).toBe(5);
    expect(meta.claimAchievement(s, "earn_1k")).toBeNull();
  });

  it("el paquete de dinero cuesta diamantes", () => {
    const s = freshState(NOW);
    expect(meta.buyCashPack(s, NOW)).toBeNull();
    s.meta.gems = META.cashPackGems;
    expect(meta.buyCashPack(s, NOW)).toBe(1000);
    expect(s.meta.gems).toBe(0);
  });

  it("el tutorial avanza con las acciones y premia al final", () => {
    const s = freshState(NOW);
    expect(meta.tutorialStep(s)?.stat).toBe("tapFloor");
    expect(meta.advanceTutorial(s)).toBeNull();
    for (const step of TUTORIAL) s.meta.stats.life[step.stat] = step.n;
    let last = null;
    while (meta.tutorialStep(s)) last = meta.advanceTutorial(s);
    expect(last).toEqual({ done: true, gems: META.tutorialGems });
    expect(s.meta.gems).toBe(META.tutorialGems);
  });

  it("diamantes y ejecutivos se conservan al salir a bolsa y al guardar", () => {
    const s = freshState(NOW);
    s.runEarned = 1e9;
    s.meta.gems = 42;
    s.meta.execs.push(meta.newExec(1, seq(0.3)));
    const res = act.ipo(s, 1, NOW)!;
    expect(res.state.meta.gems).toBe(42);
    const loaded = migrate(JSON.parse(JSON.stringify(res.state)), NOW);
    expect(loaded.meta.gems).toBe(42);
    expect(loaded.meta.execs).toHaveLength(1);
  });
});
