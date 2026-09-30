import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { CONFIG, PROPERTIES } from "../src/game/data";
import {
  bottleneck,
  geomCost,
  jobCycle,
  maxAffordable,
  offlineEarnings,
  passiveRate,
  propRate,
  sharesToGain,
  tick,
} from "../src/game/economy";
import { fmt, fmtTime } from "../src/game/format";
import { freshState, migrate } from "../src/game/state";

const NOW = 1_700_000_000_000;

describe("costes", () => {
  it("geomCost suma la serie geométrica", () => {
    expect(geomCost(4, 1.07, 0, 1)).toBeCloseTo(4);
    expect(geomCost(4, 1.07, 0, 2)).toBeCloseTo(4 + 4 * 1.07);
    expect(geomCost(10, 1.1, 3, 1)).toBeCloseTo(10 * 1.1 ** 3);
  });

  it("maxAffordable no se pasa del dinero disponible", () => {
    for (const cash of [0, 3.99, 4, 100, 12345, 1e9]) {
      const n = maxAffordable(4, 1.07, 5, cash);
      expect(geomCost(4, 1.07, 5, n)).toBeLessThanOrEqual(cash + 1e-6);
      expect(geomCost(4, 1.07, 5, n + 1)).toBeGreaterThan(cash);
    }
  });
});

describe("carrera", () => {
  it("un trabajo manual cobra una vez y se para", () => {
    const s = freshState(NOW);
    act.startJob(s, 0);
    const sales = tick(s, 1, NOW);
    expect(sales).toHaveLength(1);
    expect(s.cash).toBe(1);
    expect(s.jobs[0].running).toBe(false);
  });

  it("un trabajo automatizado cobra varios ciclos por tick", () => {
    const s = freshState(NOW);
    s.jobs[0].auto = true;
    tick(s, 6, NOW); // ciclo de 0.6 s
    expect(s.cash).toBeCloseTo(10);
  });

  it("los hitos de nivel duplican la velocidad", () => {
    const s = freshState(NOW);
    s.jobs[0].level = 25;
    expect(jobCycle(s, 0)).toBeCloseTo(0.3);
  });

  it("comprar y automatizar descuentan el dinero", () => {
    const s = freshState(NOW);
    s.cash = 2000;
    expect(act.buyJob(s, 1)).toBe("");
    expect(s.jobs[1].level).toBe(1);
    expect(s.cash).toBeCloseTo(1940);
    expect(act.automateJob(s, 0)).not.toBeNull();
    expect(s.jobs[0].auto).toBe(true);
    expect(act.automateJob(s, 2)).toBeNull(); // no empezado
  });
});

describe("ciudad", () => {
  it("vende al ritmo de la estación más lenta", () => {
    const s = freshState(NOW);
    s.cash = 1e5;
    act.buyProperty(s, "cafe");
    const cafe = PROPERTIES[0];
    expect(bottleneck(s, "cafe")).toBe(1); // baristas 0.8
    expect(propRate(s, "cafe", NOW)).toBeCloseTo(0.8 * cafe.unitPrice);
    act.upgradeStation(s, "cafe", 1);
    expect(bottleneck(s, "cafe")).toBe(0); // ahora las cafeteras (1.0)
    expect(propRate(s, "cafe", NOW)).toBeCloseTo(1 * cafe.unitPrice);
  });

  it("la hora punta multiplica solo ese local", () => {
    const s = freshState(NOW);
    s.cash = 1e5;
    act.buyProperty(s, "cafe");
    const base = propRate(s, "cafe", NOW);
    expect(act.startRush(s, "cafe", NOW)).toBe(true);
    expect(propRate(s, "cafe", NOW + 1000)).toBeCloseTo(base * CONFIG.rushMult);
    expect(propRate(s, "cafe", NOW + CONFIG.rushMinutes * 60e3 + 1)).toBeCloseTo(base);
  });

  it("no se puede comprar sin dinero", () => {
    const s = freshState(NOW);
    expect(act.buyProperty(s, "restaurant")).toBeNull();
    expect(s.props.restaurant.owned).toBe(false);
  });
});

describe("anuncios y bonus", () => {
  it("el modo hustle se acumula hasta el máximo", () => {
    const s = freshState(NOW);
    expect(act.addBoost(s, NOW)).toBe(true);
    expect(act.addBoost(s, NOW)).toBe(true);
    expect(act.addBoost(s, NOW)).toBe(true);
    expect(act.addBoost(s, NOW)).toBe(false);
    expect(s.boostEnd - NOW).toBe(CONFIG.boostMaxHours * 3600e3);
  });

  it("las ganancias offline ignoran el x2 y tienen tope", () => {
    const s = freshState(NOW);
    s.jobs[0].auto = true;
    s.boostEnd = NOW + 1e9;
    s.lastSeen = NOW - 100 * 3600e3;
    const { seconds, amount } = offlineEarnings(s, NOW);
    expect(seconds).toBe(CONFIG.offlineCapHours * 3600);
    expect(amount).toBeCloseTo(passiveRate(s, NOW, false) * seconds);
  });

  it("salir a bolsa conserva lo permanente y reinicia lo demás", () => {
    const s = freshState(NOW);
    s.runEarned = s.totalEarned = 4e9;
    s.cash = 1e6;
    act.buyProperty(s, "cafe");
    act.recordAd(s, "viral", new Date(NOW));
    expect(sharesToGain(s)).toBe(2);
    const res = act.ipo(s, 2, NOW)!;
    expect(res.gained).toBe(4);
    expect(res.state.shares).toBe(4);
    expect(res.state.totalEarned).toBe(4e9);
    expect(res.state.cash).toBe(0);
    expect(res.state.props.cafe.owned).toBe(false);
    expect(res.state.ads.total).toBe(1);
  });
});

describe("guardado", () => {
  it("migrate repara partidas incompletas o corruptas", () => {
    expect(migrate(null, NOW)).toEqual(freshState(NOW));
    const s = migrate({ cash: 50, jobs: [{ level: 3 }], props: { cafe: { owned: true } }, buyMode: "raro" }, NOW);
    expect(s.cash).toBe(50);
    expect(s.jobs[0].level).toBe(3);
    expect(s.jobs).toHaveLength(8);
    expect(s.props.cafe).toEqual({ owned: true, levels: [1, 1, 1], rushEnd: 0 });
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
