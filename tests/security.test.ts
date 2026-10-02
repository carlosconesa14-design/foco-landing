import { afterEach, describe, expect, it } from "vitest";
import { CLOCK_TOLERANCE_MS, _resetClock, clockSnapshot, clockTrusted, now, restoreClock, syncClock } from "../src/game/clock";
import { addFlag, freshLeague } from "../src/game/league";
import { dailyStatus, claimDaily } from "../src/game/meta";
import { freshState, migrate } from "../src/game/state";
import { decodeSave, encodeSave, pickSave } from "../src/platform/storage";

const T0 = new Date(2026, 9, 2, 12).getTime();
const DAY = 86400e3;

afterEach(() => _resetClock());

describe("reloj del juego", () => {
  /** Móvil y contador interno simulados: `dev` es la hora del móvil y `run` el tiempo con la app abierta. */
  function sim(startDev = T0) {
    const c = { dev: startDev, run: 0 };
    _resetClock(() => c.dev, () => c.run);
    return c;
  }

  it("cambiar la hora del móvil no adelanta el juego", () => {
    const c = sim();
    const t0 = now();
    c.dev += 365 * DAY; // adelanta un año
    expect(now()).toBe(t0);
    c.run += 5000; // solo avanza el tiempo jugado de verdad
    expect(now()).toBe(t0 + 5000);
  });

  it("adelantar la hora no permite cobrar el premio diario antes de tiempo", () => {
    const c = sim();
    const s = freshState(now());
    expect(claimDaily(s, now())).not.toBeNull();
    c.dev += 3 * DAY;
    expect(dailyStatus(s, now()).canClaim).toBe(false);
  });

  it("sin conexión, el tiempo con la app cerrada no cuenta hasta sincronizar", () => {
    let c = sim();
    now();
    c.run = 1000;
    now();
    const snap = JSON.parse(JSON.stringify(clockSnapshot()));
    // La app se cierra un día; al abrirla sin conexión (y con la hora del móvil adelantada un año)…
    c = sim(T0 + 365 * DAY);
    restoreClock(snap);
    expect(now()).toBe(T0 + 1000);
    expect(clockTrusted()).toBe(false);
    // …y al volver la conexión, el reloj salta a la hora real y se puede cobrar lo ganado offline.
    const r = syncClock(T0 + DAY, 0, 0);
    expect(now()).toBe(T0 + DAY);
    expect(r.jumpMs).toBe(DAY - 1000);
    expect(r.skew).toBe(true); // el móvil iba un año adelantado
    expect(clockTrusted()).toBe(true);
  });

  it("partida nueva con el móvil adelantado: al sincronizar vuelve a la hora real", () => {
    const c = sim(T0 + 3 * DAY);
    const r = syncClock(T0, 0, 0);
    expect(r).toMatchObject({ skew: true, future: true });
    expect(now()).toBe(T0);
    c.dev = T0 + 100 * DAY; // la hora del móvil ya no cuenta…
    c.run += 1000; // …solo el tiempo que la app sigue abierta
    expect(now()).toBe(T0 + 1000);
  });

  it("una partida en el futuro (guardado editado) vuelve a la hora real al sincronizar", () => {
    sim();
    restoreClock({ floor: T0 + 30 * DAY });
    const r = syncClock(T0, 0, 0);
    expect(r.future).toBe(true);
    expect(now()).toBe(T0);
  });

  it("un desvío pequeño no es sospechoso", () => {
    sim(T0 + 60e3);
    expect(syncClock(T0, 0, 0).skew).toBe(false);
    expect(CLOCK_TOLERANCE_MS).toBeGreaterThan(60e3);
  });

  it("se guarda y se recupera, ignorando valores raros", () => {
    sim();
    restoreClock({ floor: T0 + DAY });
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

  it("una partida editada no sirve: se recupera la última copia válida", async () => {
    const s = freshState(T0);
    const raw = await encodeSave(s);
    const edited = raw.replace('"gems":0', '"gems":999999');
    expect(edited).not.toBe(raw);
    const out = await pickSave(edited, raw, true);
    expect(out).toMatchObject({ tampered: true, restored: true });
    expect(migrate(out.data, T0).meta.gems).toBe(0);
  });

  it("si también se edita la copia, se empieza de cero", async () => {
    const raw = await encodeSave(freshState(T0));
    const edited = raw.replace('"gems":0', '"gems":5');
    const out = await pickSave(edited, edited, true);
    expect(out).toMatchObject({ data: null, tampered: true, restored: false });
  });

  it("borrar la copia y escribir JSON sin firma tampoco sirve (el formato nuevo siempre se firma)", async () => {
    const unsigned = JSON.stringify({ ...freshState(T0), clock: {}, cash: 1e30 });
    const out = await pickSave(unsigned, null, true);
    expect(out).toMatchObject({ data: null, tampered: true, restored: false });
  });

  it("quitar la firma tampoco sirve si ya había partidas firmadas", async () => {
    const raw = await encodeSave(freshState(T0));
    const unsigned = JSON.stringify({ ...freshState(T0), cash: 1e30 });
    const out = await pickSave(unsigned, raw, true);
    expect(out).toMatchObject({ tampered: true, restored: true });
  });

  it("acepta partidas antiguas sin firma (sin copia previa)", async () => {
    const out = await pickSave(JSON.stringify(freshState(T0)), null, true);
    expect(out.tampered).toBe(false);
  });

  it("sin partida principal usa la copia", async () => {
    const raw = await encodeSave({ ...freshState(T0), cash: 42 });
    const out = await pickSave(null, raw, true);
    expect(out.tampered).toBe(false);
    expect((out.data as { cash: number }).cash).toBe(42);
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
