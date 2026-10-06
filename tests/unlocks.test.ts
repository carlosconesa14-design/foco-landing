import { describe, expect, it } from "vitest";
import { simulate } from "../src/game/balance";
import { TUTORIAL } from "../src/game/data";
import { freshState, migrate } from "../src/game/state";
import { FEATURES, checkUnlocks, isUnlocked, migrateUnlocks, needProgress, nextLocked } from "../src/game/unlocks";

const NOW = Date.UTC(2026, 9, 2, 12);

describe("desbloqueo gradual", () => {
  it("una partida nueva empieza con todo bloqueado", () => {
    const s = freshState(NOW);
    expect(s.meta.unlocked).toEqual([]);
    expect(checkUnlocks(s)).toEqual([]);
    expect(nextLocked(s)?.id).toBe("daily");
  });

  it("al acabar el tutorial: premio diario y misiones", () => {
    const s = freshState(NOW);
    s.meta.tutorial = TUTORIAL.length;
    expect(checkUnlocks(s).map((f) => f.id)).toEqual(["daily", "missions"]);
    expect(checkUnlocks(s)).toEqual([]); // solo una vez
  });

  it("cada condición se mide con lo que lleva el jugador", () => {
    const s = freshState(NOW);
    s.meta.stats.life.upgrades = 60;
    expect(needProgress(s, { kind: "stat", stat: "upgrades", n: 120 })).toEqual({ have: 60, goal: 120 });
    s.totalEarned = 5e6;
    expect(needProgress(s, { kind: "earned", n: 1e7 }).have).toBe(5e6);
    expect(needProgress(s, { kind: "biz", n: 2 }).have).toBe(1);
  });

  it("lo desbloqueado se guarda (no se pierde aunque baje lo ganado al salir a bolsa)", () => {
    const s = freshState(NOW);
    s.totalEarned = 1e7;
    checkUnlocks(s);
    expect(isUnlocked(s, "life")).toBe(true);
    const back = migrate(JSON.parse(JSON.stringify(s)), NOW);
    back.totalEarned = 0;
    expect(isUnlocked(back, "life")).toBe(true);
  });

  it("las partidas de antes con el tutorial hecho lo tienen todo abierto", () => {
    expect(migrateUnlocks(undefined, true)).toEqual(FEATURES.map((f) => f.id));
    expect(migrateUnlocks(undefined, false)).toEqual([]);
    expect(migrateUnlocks(["life", "nada"], true)).toEqual(["life"]);
  });

  it("ritmo: algo nuevo en los primeros minutos y lo último pasada la primera hora (bot)", () => {
    const at = (hours: number) => {
      const s = simulate({ hours, dt: 1 }).state;
      s.meta.tutorial = TUTORIAL.length;
      checkUnlocks(s);
      return s.meta.unlocked;
    };
    expect(at(8 / 60)).toEqual(expect.arrayContaining(["daily", "missions", "execs", "auto"]));
    expect(at(10 / 60)).toContain("wheel");
    expect(at(8 / 60)).not.toContain("life");
    expect(at(30 / 60)).toContain("life");
    expect(at(30 / 60)).not.toContain("league");
    expect(at(2).length).toBe(FEATURES.length);
  });
}, 120_000);
