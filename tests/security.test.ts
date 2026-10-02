import { afterEach, describe, expect, it } from "vitest";
import { CLOCK_TOLERANCE_MS, _resetClock, clockSnapshot, now, restoreClock, syncClock } from "../src/game/clock";
import { addFlag, freshLeague } from "../src/game/league";
import { dailyStatus, claimDaily } from "../src/game/meta";
import { freshState, migrate } from "../src/game/state";
import { decodeSave, encodeSave } from "../src/platform/storage";

const T0 = new Date(2026, 9, 2, 12).getTime();
const DAY = 86400e3;

afterEach(() => _resetClock());

describe("reloj del juego", () => {
  it("nunca va hacia atrás aunque se retrase la hora del móvil", () => {
    let device = T0;
    _resetClock(() => device);
    expect(now()).toBe(T0);
    device = T0 + DAY; // adelanta un día
    expect(now()).toBe(T0 + DAY);
    device = T0; // y la vuelve a poner bien
    expect(now()).toBe(T0 + DAY);
    device = T0 + DAY + 5000; // hasta que el tiempo real le alcanza
    expect(now()).toBe(T0 + DAY + 5000);
  });

  it("adelantar la hora y volver no permite cobrar el premio diario dos veces", () => {
    let device = T0;
    _resetClock(() => device);
    const s = freshState(T0);
    device = T0 + DAY;
    expect(claimDaily(s, now())).not.toBeNull();
    device = T0;
    expect(dailyStatus(s, now()).canClaim).toBe(false);
  });

  it("con conexión manda la hora del servidor", () => {
    let device = T0 + 3 * DAY; // móvil adelantado 3 días
    _resetClock(() => device);
    const r = syncClock(T0, device, device);
    expect(r.skew).toBe(true);
    // Aún no se había usado la hora del móvil: el reloj pasa a la del servidor
    expect(now()).toBe(T0);
    device += 1000;
    expect(now()).toBe(T0 + 1000);
  });

  it("detecta una partida que ya estuvo en el futuro", () => {
    let device = T0 + DAY;
    _resetClock(() => device);
    now();
    device = T0;
    const r = syncClock(T0, T0, T0);
    expect(r.future).toBe(true);
    expect(r.skew).toBe(false);
    expect(now()).toBe(T0 + DAY); // sigue sin ir hacia atrás
  });

  it("un desvío pequeño no es sospechoso", () => {
    _resetClock(() => T0 + 60e3);
    expect(syncClock(T0, T0 + 60e3, T0 + 60e3).skew).toBe(false);
    expect(CLOCK_TOLERANCE_MS).toBeGreaterThan(60e3);
  });

  it("se guarda y se recupera", () => {
    let device = T0 + DAY;
    _resetClock(() => device);
    now();
    const snap = clockSnapshot();
    _resetClock(() => T0);
    restoreClock(JSON.parse(JSON.stringify(snap)));
    expect(now()).toBe(T0 + DAY);
    restoreClock({ floor: "x", offset: NaN });
    expect(now()).toBe(T0 + DAY);
  });
});

describe("firma del guardado", () => {
  it("una partida intacta carga sin aviso", async () => {
    const s = freshState(T0);
    const out = await decodeSave(await encodeSave(s));
    expect(out.tampered).toBe(false);
    expect((out.data as typeof s).cash).toBe(0);
  });

  it("detecta una partida editada a mano", async () => {
    const s = freshState(T0);
    const raw = await encodeSave(s);
    const edited = raw.replace('"gems":0', '"gems":999999');
    expect(edited).not.toBe(raw);
    const out = await decodeSave(edited);
    expect(out.tampered).toBe(true);
    expect(migrate(out.data, T0).meta.gems).toBe(999999); // se carga igual: solo se informa
  });

  it("acepta partidas antiguas sin firma", async () => {
    const out = await decodeSave(JSON.stringify(freshState(T0)));
    expect(out.tampered).toBe(false);
  });
});

describe("señales de trampa", () => {
  it("se apuntan una vez y solo se informan si está en la Liga", () => {
    const s = freshState(T0);
    addFlag(s, "clock");
    addFlag(s, "clock");
    expect(s.meta.flags).toEqual(["clock"]);
    expect(s.meta.league.queue).toEqual([]);
    s.meta.league = { ...freshLeague(), id: "a", secret: "b" };
    addFlag(s, "save");
    expect(s.meta.league.queue).toEqual([{ kind: "flag", ref: "save" }]);
    expect(migrate(JSON.parse(JSON.stringify(s)), T0).meta.flags).toEqual(["clock", "save"]);
  });
});
