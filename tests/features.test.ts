import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { simulateFest } from "../src/game/balance";
import { FEST_ID } from "../src/game/data";
import { businessRate, offlineEarnings, passiveRate, saleMult, tapStation, tick } from "../src/game/economy";
import { eventWindow } from "../src/game/event";
import { FEST_GOALS, claimFestGoal, ensureFest, festOpen, festToClaim, tickFest, withFest } from "../src/game/fest";
import { FIRST_IDS, checkFirsts, viralAllowed } from "../src/game/onboarding";
import { canStudy, ideas, schoolCost, schoolLevel, study } from "../src/game/school";
import { SKILL, skillDurationMs, skillStatus, useSkill } from "../src/game/skills";
import { freshState, migrate, type GameState } from "../src/game/state";
import { businessView } from "../src/view/businessView";
import { withDropship } from "./fresh";

const NOW = Date.UTC(2026, 9, 5, 12);
/** Un viernes a mediodía, hora local: evento en marcha. */
const FRIDAY = new Date(2026, 9, 9, 12).getTime();

const managedDropship = (now = NOW) => {
  const s = withDropship(now);
  const b = s.biz.dropship;
  b.floors[0].managed = true;
  b.transport.managed = b.sale.managed = true;
  b.floors[0].level = b.transport.level = b.sale.level = 30;
  return s;
};

describe("habilidades de los gerentes", () => {
  it("solo con gerente; se activa, dura y se recarga", () => {
    const s = withDropship(NOW);
    const b = s.biz.dropship;
    expect(skillStatus(s, b, { kind: "sale" }, NOW).state).toBe("locked");
    expect(useSkill(s, b, { kind: "sale" }, NOW)).toBe(false);
    b.sale.managed = true;
    expect(skillStatus(s, b, { kind: "sale" }, NOW).state).toBe("ready");
    expect(useSkill(s, b, { kind: "sale" }, NOW)).toBe(true);
    expect(s.meta.stats.life.skills).toBe(1);
    expect(skillStatus(s, b, { kind: "sale" }, NOW + 60e3).state).toBe("active");
    const after = NOW + SKILL.minutes * 60e3 + 1;
    expect(skillStatus(s, b, { kind: "sale" }, after).state).toBe("cooldown");
    expect(useSkill(s, b, { kind: "sale" }, after)).toBe(false);
    expect(skillStatus(s, b, { kind: "sale" }, NOW + SKILL.cooldownMin * 60e3).state).toBe("ready");
  });

  it("x2 en vivo (ritmo y producción reales), nada offline", () => {
    const s = managedDropship();
    const before = businessRate(s, "dropship", NOW);
    for (const st of [{ kind: "floor", index: 0 }, { kind: "transport" }, { kind: "sale" }] as const) useSkill(s, s.biz.dropship, st, NOW);
    expect(businessRate(s, "dropship", NOW)).toBeCloseTo(before * SKILL.mult, 6);
    expect(passiveRate(s, NOW, false)).toBeCloseTo(passiveRate(managedDropship(), NOW, false), 6);
    s.lastSeen = NOW;
    expect(offlineEarnings(s, NOW + 3600e3).amount).toBeCloseTo(offlineEarnings(Object.assign(managedDropship(), { lastSeen: NOW }), NOW + 3600e3).amount, 3);

    // Producción: con «Turno doble» el puesto hace el doble de ciclos.
    const a = managedDropship(), c = managedDropship();
    useSkill(c, c.biz.dropship, { kind: "floor", index: 0 }, NOW);
    a.biz.dropship.transport.managed = c.biz.dropship.transport.managed = false;
    a.biz.dropship.sale.managed = c.biz.dropship.sale.managed = false;
    tick(a, 20, NOW);
    tick(c, 20, NOW);
    expect(c.biz.dropship.floors[0].stock).toBeCloseTo(a.biz.dropship.floors[0].stock * 2, 6);
  });

  it("la escuela «Liderazgo» alarga la habilidad", () => {
    const s = withDropship(NOW);
    const base = skillDurationMs(s);
    s.meta.school.levels.mgr = 2;
    expect(skillDurationMs(s)).toBeCloseTo(base * 1.4, 6);
  });

  it("la vista de la ruta enseña el estado de la habilidad", () => {
    const s = managedDropship();
    expect(businessView(s, "dropship", NOW).sale.skill.state).toBe("ready");
    useSkill(s, s.biz.dropship, { kind: "sale" }, NOW);
    const v = businessView(s, "dropship", NOW + 1000);
    expect(v.sale.skill.state).toBe("active");
    expect(v.transport.skill.state).toBe("ready");
    expect(v.wallet.currency).toBe("cash");
  });
});

describe("escuela de negocios (investigación permanente)", () => {
  it("las ideas salen de los hitos x2 y se gastan en el árbol", () => {
    const s = withDropship(NOW);
    expect(ideas(s)).toBe(0);
    s.cash = 1e12;
    s.buyMode = 50;
    act.upgrade(s, "dropship", { kind: "sale" }); // nivel 51: hitos 10, 25 y 50
    expect(ideas(s)).toBe(3);
    expect(canStudy(s, "prod")).toBe("ok");
    expect(canStudy(s, "sale")).toBe("locked"); // pide Procesos 2
    expect(study(s, "prod")).toBe(true);
    expect(ideas(s)).toBe(0);
    expect(canStudy(s, "prod")).toBe("ideas");
    expect(schoolCost(1)).toBe(5);
  });

  it("sube los ingresos y no se pierde al salir a bolsa; «Capital semilla» da dinero al empezar", () => {
    const s = managedDropship();
    const before = passiveRate(s, NOW, false);
    s.meta.school.levels = { prod: 3, log: 3, sale: 3, start: 2 };
    expect(passiveRate(s, NOW, false)).toBeGreaterThan(before * 1.25);
    s.runEarned = 1e30;
    const r = act.ipo(s, 1, NOW)!;
    expect(schoolLevel(r.state, "prod")).toBe(3);
    expect(r.state.cash).toBeCloseTo(4000 * 0.4, 6); // 40 % del almacén
  });
});

describe("la feria del evento", () => {
  const withEvent = (now = FRIDAY): GameState => {
    const s = freshState(now);
    s.meta.unlocked.push("event");
    return s;
  };

  it("abre solo durante el evento y con el evento desbloqueado", () => {
    expect(eventWindow(FRIDAY).active).toBe(true);
    const locked = freshState(FRIDAY);
    ensureFest(locked, FRIDAY);
    expect(festOpen(locked, FRIDAY)).toBe(false);
    const s = withEvent();
    ensureFest(s, FRIDAY);
    expect(festOpen(s, FRIDAY)).toBe(true);
    const tuesday = FRIDAY + 4 * 86400e3;
    expect(festOpen(s, tuesday)).toBe(false);
    expect(tickFest(s, 10, tuesday)).toEqual([]);
  });

  it("va con fichas: no toca tu dinero ni tus ganancias", () => {
    const s = withEvent();
    ensureFest(s, FRIDAY);
    s.cash = 1234;
    withFest(s, () => {
      tapStation(s, FEST_ID, { kind: "floor", index: 0 });
    });
    let sold = 0;
    for (let i = 0; i < 60; i++) {
      withFest(s, () => {
        tapStation(s, FEST_ID, { kind: "transport" });
        tapStation(s, FEST_ID, { kind: "sale" });
        tapStation(s, FEST_ID, { kind: "floor", index: 0 });
      });
      sold += tickFest(s, 1, FRIDAY + i * 1000).length;
    }
    expect(sold).toBeGreaterThan(0);
    expect(s.meta.fest.tickets).toBeGreaterThan(0);
    expect(s.cash).toBe(1234);
    expect(s.totalEarned).toBe(0);
    expect(s.biz[FEST_ID]).toBeUndefined();
    expect(s.meta.stats.life.sales).toBe(sold); // pero sí suma puntos del evento
    // Mejorar en la feria gasta fichas
    const tickets = s.meta.fest.tickets;
    const ok = withFest(s, () => act.upgrade(s, FEST_ID, { kind: "floor", index: 0 }));
    expect(ok).not.toBeNull();
    expect(s.meta.fest.tickets).toBeLessThan(tickets);
    expect(s.cash).toBe(1234);
    expect(businessView(s, FEST_ID, FRIDAY).wallet).toEqual({ currency: "tickets", amount: s.meta.fest.tickets });
  });

  it("premios al abrir casetas; la feria completa da un trofeo permanente", () => {
    const s = withEvent();
    ensureFest(s, FRIDAY);
    const base = saleMult(s, "bike", FRIDAY, false);
    const gems = s.meta.gems;
    s.meta.fest.biz.floors = Array.from({ length: 8 }, () => ({ level: 1, managed: false, stock: 0, prog: 0, running: false }));
    expect(festToClaim(s)).toBe(FEST_GOALS.length);
    let trophy = false;
    while (festToClaim(s)) trophy = claimFestGoal(s, FRIDAY, () => 0.5)!.trophy || trophy;
    expect(trophy).toBe(true);
    expect(s.meta.gems).toBeGreaterThan(gems);
    expect(s.meta.fest.trophies).toBe(1);
    expect(saleMult(s, "bike", FRIDAY, false)).toBeCloseTo(base * 1.05, 6);
    // El evento siguiente: feria nueva, el trofeo se queda
    const next = FRIDAY + 7 * 86400e3;
    ensureFest(s, next);
    expect(s.meta.fest.biz.floors).toHaveLength(1);
    expect(s.meta.fest.claimed).toBe(0);
    expect(s.meta.fest.trophies).toBe(1);
  });

  it("se guarda y se carga", () => {
    const s = withEvent();
    ensureFest(s, FRIDAY);
    s.meta.fest.tickets = 500;
    s.meta.fest.biz.floors[0].level = 7;
    const m = migrate(JSON.parse(JSON.stringify(s)), FRIDAY);
    expect(m.meta.fest.tickets).toBe(500);
    expect(m.meta.fest.biz.floors[0].level).toBe(7);
    expect(m.meta.fest.week).toBe(s.meta.fest.week);
  });

  it("ritmo: la feria entera pide unas 2–4 h de juego activo", () => {
    const { at } = simulateFest({ minutes: 300, dt: 2 });
    expect(at.stops_2).toBeLessThan(5 * 60);
    expect(at.stops_4).toBeLessThan(20 * 60);
    expect(at.stops_8).toBeGreaterThan(2 * 3600);
    expect(at.stops_8).toBeLessThan(4 * 3600);
  }, 120_000);
});

describe("primeros minutos guiados", () => {
  it("nada durante el tutorial; al acabarlo, la primera oportunidad llega enseguida", () => {
    const s = freshState(NOW);
    expect(checkFirsts(s, NOW)).toEqual([]);
    expect(viralAllowed(s)).toBe(false);
    s.meta.tutorial = 6;
    s.nextViral = NOW + 600e3;
    checkFirsts(s, NOW);
    expect(viralAllowed(s)).toBe(true);
    expect(s.nextViral).toBe(NOW + 20e3);
  });

  it("habilidad lista, reparto automático, mitad del almacén y almacén, una sola vez cada uno", () => {
    const s = freshState(NOW);
    s.meta.tutorial = 6;
    checkFirsts(s, NOW);
    const b = s.biz.bike;
    b.floors[0].managed = true;
    expect(checkFirsts(s, NOW).map((f) => f.id)).toEqual(["skill"]);
    b.transport.managed = b.sale.managed = true;
    expect(checkFirsts(s, NOW).map((f) => f.id)).toEqual(["auto"]);
    s.cash = 2000;
    expect(checkFirsts(s, NOW).map((f) => f.id)).toEqual(["half"]);
    s.cash = 4000;
    act.buyBusiness(s, "dropship");
    expect(checkFirsts(s, NOW).map((f) => f.id)).toEqual(["biz2"]);
    expect(checkFirsts(s, NOW)).toEqual([]);
  });

  it("las partidas antiguas ya terminadas no reciben los avisos", () => {
    const s = freshState(NOW);
    s.meta.tutorial = 6;
    const raw = JSON.parse(JSON.stringify(s));
    delete raw.meta.firsts;
    expect(migrate(raw, NOW).meta.firsts).toEqual(FIRST_IDS);
  });
});
