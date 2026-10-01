import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { MAX_QUEUE, leagueEvent, leagueJoined } from "../src/game/league";
import * as meta from "../src/game/meta";
import { freshFloor, freshState, migrate, type GameState } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 1, 12);

function joined(): GameState {
  const s = freshState(NOW);
  s.meta.league.id = "p1";
  s.meta.league.secret = "sec";
  return s;
}
const kinds = (s: GameState) => s.meta.league.queue.map((e) => e.kind);

describe("Liga: qué acciones se informan", () => {
  it("si no estás apuntado no se apunta nada", () => {
    const s = freshState(NOW);
    expect(leagueJoined(s)).toBe(false);
    s.cash = 1e12;
    act.buyBusiness(s, "restaurant");
    expect(s.meta.league.queue).toEqual([]);
  });

  it("comprar un negocio, abrir puestos y subir de categoría", () => {
    const s = joined();
    s.cash = 1e30;
    act.buyBusiness(s, "restaurant");
    act.unlockFloor(s, "dropship"); // 2 puestos
    act.unlockFloor(s, "dropship"); // 3 puestos → ★★
    expect(kinds(s)).toEqual(["business", "floor", "floor", "tier"]);
    expect(s.meta.league.queue[0].ref).toBe("madrid:0:restaurant");
  });

  it("los hitos x2 cuentan; las mejoras normales no", () => {
    const s = joined();
    s.cash = 1e12;
    s.buyMode = 1;
    act.upgrade(s, "dropship", { kind: "sale" });
    expect(s.meta.league.queue).toEqual([]);
    s.buyMode = 10;
    act.upgrade(s, "dropship", { kind: "sale" }); // pasa del nivel 10
    expect(kinds(s)).toEqual(["milestone"]);
  });

  it("misiones sí, la de ver anuncios no", () => {
    const s = joined();
    meta.ensureDay(s, NOW);
    s.meta.missions.list = [
      { id: "ads", target: 1, claimed: false },
      { id: "sales", target: 1, claimed: false },
      { id: "upgrades", target: 1, claimed: false },
    ];
    s.meta.stats.day = { ads: 5, sales: 5, upgrades: 5 };
    [0, 1, 2].forEach((i) => meta.claimMission(s, i));
    meta.claimMissionBonus(s);
    expect(s.meta.league.queue.map((e) => `${e.kind}:${e.ref}`)).toEqual(["mission:sales", "mission:upgrades", `missions_all:${s.meta.missions.day}`]);
  });

  it("ver anuncios nunca genera eventos", () => {
    const s = joined();
    act.recordAd(s, "boost_x2");
    act.addBoost(s, NOW);
    expect(s.meta.league.queue).toEqual([]);
  });

  it("sin duplicados y con un tope de cola", () => {
    const s = joined();
    leagueEvent(s, "login", "d");
    leagueEvent(s, "login", "d");
    expect(s.meta.league.queue).toHaveLength(1);
    for (let i = 0; i < MAX_QUEUE + 20; i++) leagueEvent(s, "floor", `x${i}`);
    expect(s.meta.league.queue).toHaveLength(MAX_QUEUE);
  });

  it("las credenciales y la cola sobreviven al guardar y a salir a bolsa", () => {
    const s = joined();
    leagueEvent(s, "floor", "a");
    const loaded = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(loaded.meta.league).toEqual(s.meta.league);
    loaded.runEarned = 1e30;
    const after = act.ipo(loaded, 1, NOW)!.state;
    expect(after.meta.league.id).toBe("p1");
    // tras la bolsa, abrir el mismo puesto es un evento nuevo (otra referencia)
    after.cash = 1e30;
    after.biz.dropship.floors = [freshFloor()];
    act.unlockFloor(after, "dropship");
    expect(after.meta.league.queue.at(-1)!.ref).toBe("madrid:1:dropship:1");
  });

  it("una partida antigua sin Liga se carga sin errores", () => {
    const s = migrate({ version: 3, cash: 1, meta: { gems: 3 } }, NOW);
    expect(s.meta.league).toEqual({ id: null, secret: null, nickname: "", queue: [] });
  });
});
