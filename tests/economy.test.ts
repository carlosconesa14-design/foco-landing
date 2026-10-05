import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { BUSINESSES, CHAIN, CONFIG } from "../src/game/data";
import {
  chainRates,
  floorLoad,
  geomCost,
  maxAffordable,
  offlineEarnings,
  passiveRate,
  saleCap,
  sharesToGain,
  tapStation,
  tick,
  transportCap,
  upgradeQuote,
} from "../src/game/economy";
import { fmt, fmtTime } from "../src/game/format";
import { freshState, migrate, type GameState } from "../src/game/state";
import { withDropship } from "./fresh";

const NOW = 1_700_000_000_000;
const DROP = BUSINESSES.find((b) => b.id === "dropship")!;
const FLOOR0 = { kind: "floor", index: 0 } as const;
const TRANSPORT = { kind: "transport" } as const;
const SALE = { kind: "sale" } as const;

/** Simula `seconds` en pasos pequeños, como el bucle real. */
function run(s: GameState, seconds: number, step = 1 / 30) {
  const events = [];
  for (let t = 0; t < seconds; t += step) events.push(...tick(s, step, NOW));
  return events;
}

function automate(s: GameState, id = DROP.id) {
  const b = s.biz[id];
  b.floors.forEach((f) => (f.managed = true));
  b.transport.managed = true;
  b.sale.managed = true;
}

describe("costes", () => {
  it("geomCost suma la serie geométrica", () => {
    expect(geomCost(4, 1.07, 1)).toBeCloseTo(4);
    expect(geomCost(4, 1.07, 2)).toBeCloseTo(4 + 4 * 1.07);
  });

  it("maxAffordable no se pasa del dinero disponible", () => {
    for (const cash of [0, 3.99, 4, 100, 12345, 1e9]) {
      const n = maxAffordable(4, 1.07, cash);
      expect(geomCost(4, 1.07, n)).toBeLessThanOrEqual(cash + 1e-6);
      expect(geomCost(4, 1.07, n + 1)).toBeGreaterThan(cash);
    }
  });
});

describe("cadena de producción", () => {
  it("sin gerentes, cada toque hace un solo ciclo de cada parte", () => {
    const s = withDropship(NOW);
    tapStation(s, DROP.id, FLOOR0);
    run(s, CHAIN.floorCycle + 0.1);
    const b = s.biz[DROP.id];
    expect(b.floors[0].stock).toBeCloseTo(floorLoad(DROP, 0, 1));
    expect(b.floors[0].running).toBe(false);

    tapStation(s, DROP.id, TRANSPORT);
    run(s, 3);
    expect(b.transport.phase).toBe("idle");
    expect(b.floors[0].stock).toBe(0);
    expect(b.topStock).toBeCloseTo(floorLoad(DROP, 0, 1));

    expect(tapStation(s, DROP.id, SALE)).toBeNull();
    const sales = run(s, 5);
    expect(sales).toHaveLength(1);
    expect(s.cash).toBeCloseTo(floorLoad(DROP, 0, 1));
    expect(b.sale.phase).toBe("idle");
  });

  it("no deja vender si no hay nada arriba", () => {
    const s = withDropship(NOW);
    expect(tapStation(s, DROP.id, SALE)).not.toBeNull();
  });

  it("el transporte no carga más de su capacidad", () => {
    const s = withDropship(NOW);
    const b = s.biz[DROP.id];
    b.floors[0].stock = 1e6;
    tapStation(s, DROP.id, TRANSPORT);
    run(s, 5);
    expect(b.topStock).toBeCloseTo(transportCap(DROP, 1));
    expect(b.floors[0].stock).toBeCloseTo(1e6 - transportCap(DROP, 1));
  });

  it("el transporte recorre todas las plantas en orden", () => {
    const s = withDropship(NOW);
    const b = s.biz[DROP.id];
    s.cash = 1e6;
    act.unlockFloor(s, DROP.id);
    act.unlockFloor(s, DROP.id);
    b.floors.forEach((f) => (f.stock = 1));
    tapStation(s, DROP.id, TRANSPORT);
    run(s, 10);
    expect(b.floors.map((f) => f.stock)).toEqual([0, 0, 0]);
    expect(b.topStock).toBeCloseTo(3);
  });

  it("con gerentes, lo que se gana se acerca al ritmo de la parte más lenta", () => {
    const s = withDropship(NOW);
    automate(s);
    const rates = chainRates(DROP, s.biz[DROP.id], true);
    run(s, 120);
    const measured = s.cash / 120;
    expect(measured).toBeGreaterThan(rates.total * 0.8);
    expect(measured).toBeLessThanOrEqual(rates.total * 1.05);
  });

  it("la venta no lleva más de su capacidad", () => {
    const s = withDropship(NOW);
    s.biz[DROP.id].topStock = 1e6;
    tapStation(s, DROP.id, SALE);
    run(s, 10);
    expect(s.cash).toBeCloseTo(saleCap(DROP, 1));
  });
});

describe("mejoras y compras", () => {
  it("mejorar descuenta el dinero y sube el nivel", () => {
    const s = withDropship(NOW);
    s.cash = 100;
    const { cost } = upgradeQuote(s, DROP.id, FLOOR0);
    expect(act.upgrade(s, DROP.id, FLOOR0)).toBe("");
    expect(s.biz[DROP.id].floors[0].level).toBe(2);
    expect(s.cash).toBeCloseTo(100 - cost);
  });

  it("el hito del nivel 10 avisa y duplica", () => {
    const s = withDropship(NOW);
    s.cash = 1e9;
    s.buyMode = 10;
    expect(act.upgrade(s, DROP.id, TRANSPORT)).toContain("x2");
    // Nivel 11: lineal × crecimiento exponencial × hito del 10 (x2)
    expect(transportCap(DROP, 11)).toBeCloseTo(DROP.mult * CHAIN.transportBaseCap * 11 * CHAIN.logisticsCapGrowth ** 10 * 2);
  });

  it("contratar un gerente solo se puede una vez", () => {
    const s = withDropship(NOW);
    s.cash = 1e6;
    expect(act.hireManager(s, DROP.id, SALE)).not.toBeNull();
    expect(act.hireManager(s, DROP.id, SALE)).toBeNull();
  });

  it("no se puede comprar un negocio sin dinero", () => {
    const s = withDropship(NOW);
    expect(act.buyBusiness(s, "restaurant")).toBeNull();
    s.cash = BUSINESSES.find((b) => b.id === "restaurant")!.price;
    expect(act.buyBusiness(s, "restaurant")).not.toBeNull();
    expect(s.cash).toBe(0);
  });

  it("hay un máximo de plantas", () => {
    const s = withDropship(NOW);
    s.cash = 1e30;
    while (act.unlockFloor(s, DROP.id)) {
      /* desbloquear todas */
    }
    expect(s.biz[DROP.id].floors).toHaveLength(CHAIN.maxFloors);
  });
});

describe("anuncios y bonus", () => {
  it("el modo hustle se acumula hasta el máximo", () => {
    const s = withDropship(NOW);
    expect(act.addBoost(s, NOW)).toBe(true);
    expect(act.addBoost(s, NOW)).toBe(true);
    expect(act.addBoost(s, NOW)).toBe(true);
    expect(act.addBoost(s, NOW)).toBe(false);
    expect(s.boostEnd - NOW).toBe(CONFIG.boostMaxHours * 3600e3);
  });

  it("la hora punta triplica lo que vende ese negocio", () => {
    const a = withDropship(NOW);
    const b = withDropship(NOW);
    act.startRush(b, DROP.id, NOW);
    for (const s of [a, b]) {
      s.biz[DROP.id].topStock = 10;
      tapStation(s, DROP.id, SALE);
      run(s, 10);
    }
    expect(b.cash).toBeCloseTo(a.cash * CONFIG.rushMult);
  });

  it("offline solo cuenta lo automatizado, sin x2 y con tope", () => {
    const s = withDropship(NOW);
    s.lastSeen = NOW - 100 * 3600e3;
    expect(offlineEarnings(s, NOW).amount).toBe(0);
    automate(s);
    s.boostEnd = NOW + 1e9;
    const { seconds, amount } = offlineEarnings(s, NOW);
    expect(seconds).toBe(CONFIG.offlineCapHours * 3600);
    expect(amount).toBeCloseTo(passiveRate(s, NOW, false) * seconds);
    expect(passiveRate(s, NOW, true)).toBeCloseTo(passiveRate(s, NOW, false) * 2);
  });

  it("salir a bolsa conserva lo permanente y reinicia lo demás", () => {
    const s = withDropship(NOW);
    s.runEarned = s.totalEarned = 8 * CONFIG.shareDivisor;
    s.cash = 1e6;
    act.buyBusiness(s, "restaurant");
    act.recordAd(s, "viral", new Date(NOW));
    expect(sharesToGain(s)).toBe(2);
    const res = act.ipo(s, 2, NOW)!;
    expect(res.gained).toBe(4);
    expect(res.state.shares).toBe(4);
    expect(res.state.totalEarned).toBe(8 * CONFIG.shareDivisor);
    expect(res.state.cash).toBe(0);
    expect(res.state.biz.restaurant.owned).toBe(false);
    expect(res.state.biz.bike.owned).toBe(true);
    expect(res.state.biz.dropship.owned).toBe(false);
    expect(res.state.ads.total).toBe(1);
  });
});

describe("guardado", () => {
  it("migrate repara partidas incompletas y descarta la versión 1", () => {
    expect(migrate(null, NOW)).toEqual(freshState(NOW));
    expect(migrate({ cash: 50 }, NOW).cash).toBe(0);
    const s = migrate(
      { version: 2, cash: 50, biz: { dropship: { floors: [{ level: 3 }, {}], transport: { level: 4, carry: 7 } } }, buyMode: "raro" },
      NOW,
    );
    expect(s.cash).toBe(50);
    expect(s.biz.dropship.floors.map((f) => f.level)).toEqual([3, 1]);
    expect(s.biz.dropship.transport.level).toBe(4);
    expect(s.biz.dropship.topStock).toBe(7);
    expect(s.biz.restaurant.owned).toBe(false);
    expect(s.buyMode).toBe(1);
  });
});

describe("formato", () => {
  it("abrevia números grandes", () => {
    expect(fmt(999)).toBe("999");
    expect(fmt(1234)).toBe("1.23 K");
    expect(fmt(5e15)).toBe("5.00 aa");
    expect(fmtTime(3725)).toBe("1:02:05");
  });
});

describe("dopamina", () => {
  it("una venta viral paga x5 y se marca", async () => {
    const { setLuck } = await import("../src/game/economy");
    const s = withDropship(NOW);
    s.biz[DROP.id].topStock = 10;
    setLuck(() => 0);
    tapStation(s, DROP.id, SALE);
    const events = run(s, 5);
    setLuck(() => 1);
    expect(events[0].lucky).toBe(true);
    expect(s.cash).toBeCloseTo(10 * CONFIG.luckyMult);
  });

  it("el próximo objetivo empieza por los gerentes y después sugiere puestos o hitos", async () => {
    const { nextGoal } = await import("../src/game/goal");
    const s = withDropship(NOW);
    const g = nextGoal(s, NOW)!;
    expect(g.text).toContain("gerente");
    expect(g.action.kind).toBe("station");
    s.cash = 1e6;
    act.hireManager(s, DROP.id, FLOOR0);
    act.hireManager(s, DROP.id, TRANSPORT);
    act.hireManager(s, DROP.id, SALE);
    const bike = s.biz.bike;
    bike.floors[0].managed = bike.transport.managed = bike.sale.managed = true;
    const g2 = nextGoal(s, NOW)!;
    expect(g2.text).not.toContain("gerente");
    expect(g2.progress).toBe(1);
  });
});

describe("categoría del negocio", () => {
  it("★ con 1–2 puestos, ★★ con 3–5 y ★★★ con 6–8", async () => {
    const { bizTier } = await import("../src/game/economy");
    const { freshState, freshFloor } = await import("../src/game/state");
    const b = freshState(0).biz.dropship;
    const tiers: number[] = [];
    while (b.floors.length < 8) {
      tiers.push(bizTier(b));
      b.floors.push(freshFloor());
    }
    tiers.push(bizTier(b));
    expect(tiers).toEqual([1, 1, 2, 2, 2, 3, 3, 3]);
  });
});
