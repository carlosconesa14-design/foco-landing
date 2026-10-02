import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { MAX_QUEUE, PLAY, leagueEvent, leagueJoined, trackPlay } from "../src/game/league";
import * as meta from "../src/game/meta";
import { freshState, migrate, type GameState } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 1, 12);

function joined(): GameState {
  const s = freshState(NOW);
  s.meta.league.id = "p1";
  s.meta.league.secret = "sec";
  return s;
}

describe("Liga: qué acciones se informan", () => {
  it("si no estás apuntado no se apunta nada", () => {
    const s = freshState(NOW);
    expect(leagueJoined(s)).toBe(false);
    s.cash = 1e12;
    act.buyBusiness(s, "restaurant");
    expect(s.meta.league.queue).toEqual([]);
  });

  it("el progreso del imperio ya no da puntos (no depende de cuánto llevas jugando)", () => {
    const s = joined();
    s.cash = 1e30;
    s.buyMode = 10;
    act.buyBusiness(s, "restaurant");
    act.unlockFloor(s, "dropship");
    act.unlockFloor(s, "dropship");
    act.upgrade(s, "dropship", { kind: "sale" });
    expect(s.meta.league.queue).toEqual([]);
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
    for (let i = 0; i < MAX_QUEUE + 20; i++) leagueEvent(s, "play", `${i}`);
    expect(s.meta.league.queue).toHaveLength(MAX_QUEUE);
  });

  it("las credenciales y la cola sobreviven al guardar y a salir a bolsa", () => {
    const s = joined();
    leagueEvent(s, "play", "123");
    trackPlay(s, NOW, 30);
    const loaded = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(loaded.meta.league).toEqual(s.meta.league);
    loaded.runEarned = 1e30;
    const after = act.ipo(loaded, 1, NOW)!.state;
    expect(after.meta.league.id).toBe("p1");
    expect(after.meta.league.queue).toEqual(s.meta.league.queue);
  });

  it("tiempo de juego: un bloque de 5 min cuenta al jugar 3 min dentro de él, una sola vez", () => {
    const s = joined();
    const t0 = Math.floor(NOW / PLAY.blockMs) * PLAY.blockMs;
    for (let i = 0; i < 170; i++) trackPlay(s, t0 + i * 1000, 1);
    expect(s.meta.league.queue).toEqual([]);
    for (let i = 170; i < 290; i++) trackPlay(s, t0 + i * 1000, 1);
    expect(s.meta.league.queue).toEqual([{ kind: "play", ref: String(t0 / PLAY.blockMs) }]);
    // Siguiente bloque: empieza de cero
    for (let i = 0; i < 200; i++) trackPlay(s, t0 + PLAY.blockMs + i * 1000, 1);
    expect(s.meta.league.queue.map((e) => e.ref)).toEqual([String(t0 / PLAY.blockMs), String(t0 / PLAY.blockMs + 1)]);
  });

  it("tiempo de juego: sin apuntarse no cuenta y un salto grande de tiempo no regala minutos", () => {
    const s = freshState(NOW);
    trackPlay(s, NOW, 600);
    expect(s.meta.league.queue).toEqual([]);
    const j = joined();
    trackPlay(j, NOW, 600); // como mucho 5 s por llamada
    expect(j.meta.league.play.sec).toBe(5);
  });

  it("una partida antigua sin Liga se carga sin errores", () => {
    const s = migrate({ version: 3, cash: 1, meta: { gems: 3 } }, NOW);
    expect(s.meta.league).toEqual({ id: null, secret: null, nickname: "", queue: [], play: { block: 0, sec: 0 } });
  });
});
