import { describe, expect, it } from "vitest";
import { AUTO, autoAdLeft, autoFreeLeft, autoUpgrade, spendAutoUse } from "../src/game/autoUpgrade";
import { businessRate } from "../src/game/economy";
import { grantProduct } from "../src/game/shop";
import { freshState, migrate } from "../src/game/state";
import { withDropship } from "./fresh";

const NOW = Date.UTC(2026, 9, 2, 12);

describe("Mejorar todo", () => {
  it("contrata gerentes y reparte el dinero en lo que más rinde", () => {
    const s = withDropship(NOW);
    s.cash = 1e6;
    const before = businessRate(s, "dropship", NOW);
    const r = autoUpgrade(s, "dropship", NOW);
    expect(r.steps).toBeGreaterThan(5);
    expect(s.biz.dropship.transport.managed && s.biz.dropship.sale.managed).toBe(true);
    expect(r.after).toBeGreaterThan(before);
    expect(s.cash).toBeGreaterThanOrEqual(0);
    expect(r.spent).toBeCloseTo(1e6 - s.cash);
  });

  it("sin dinero no hace nada", () => {
    const s = withDropship(NOW);
    expect(autoUpgrade(s, "dropship", NOW).steps).toBe(0);
  });

  it("3 gratis al día y 2 con anuncio; mañana vuelven", () => {
    const s = withDropship(NOW);
    expect(autoFreeLeft(s, NOW)).toBe(AUTO.freePerDay);
    for (let i = 0; i < AUTO.freePerDay; i++) expect(spendAutoUse(s, NOW, false)).toBe(true);
    expect(spendAutoUse(s, NOW, false)).toBe(false);
    expect(autoAdLeft(s, NOW)).toBe(AUTO.adPerDay);
    for (let i = 0; i < AUTO.adPerDay; i++) expect(spendAutoUse(s, NOW, true)).toBe(true);
    expect(spendAutoUse(s, NOW, true)).toBe(false);
    const l = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(autoFreeLeft(l, NOW)).toBe(0);
    expect(autoFreeLeft(s, NOW + 86400e3)).toBe(AUTO.freePerDay);
  });

  it("sin límite con el Gestor automático (0,99 €) o con el VIP", () => {
    const s = withDropship(NOW);
    grantProduct(s, "auto_manager", "o1", NOW);
    expect(autoFreeLeft(s, NOW)).toBe(Infinity);
    for (let i = 0; i < 20; i++) expect(spendAutoUse(s, NOW, false)).toBe(true);
    const v = withDropship(NOW);
    grantProduct(v, "vip", "o2", NOW);
    expect(autoFreeLeft(v, NOW)).toBe(Infinity);
  });
});

describe("Mejorar todo, de forma casi óptima", () => {
  const managed = (s: ReturnType<typeof freshState>) => {
    const b = s.biz.dropship;
    b.floors.forEach((f) => (f.managed = true));
    b.transport.managed = b.sale.managed = true;
    return b;
  };

  it("no gasta lo que guardas para el siguiente negocio (salvo que lo pidas)", async () => {
    const { autoReserve } = await import("../src/game/autoUpgrade");
    const s = withDropship(NOW);
    managed(s);
    const price = 2e8; // restaurante
    s.cash = price + 5000;
    expect(autoReserve(s, NOW).biz).toBe("Restaurante");
    const r = autoUpgrade(s, "dropship", NOW);
    expect(s.cash).toBeGreaterThanOrEqual(price);
    expect(r.savingFor).toBe("Restaurante");
    autoUpgrade(s, "dropship", NOW, true);
    expect(s.cash).toBeLessThan(price);
  });

  it("cuenta los hitos: sube varios niveles de golpe si el x2 compensa", async () => {
    const { floorNextCost, bizDef } = await import("../src/game/economy");
    const { upgradeDiscount } = await import("../src/game/world");
    const s = withDropship(NOW);
    const b = managed(s);
    b.transport.level = b.sale.level = 200; // que frene la producción
    b.floors[0].level = 7;
    let cost = 0;
    for (let l = 7; l < 10; l++) cost += floorNextCost(bizDef("dropship"), 0, l) * upgradeDiscount(s);
    s.cash = cost * 1.001;
    autoUpgrade(s, "dropship", NOW, true);
    expect(b.floors[0].level).toBeGreaterThanOrEqual(10);
  });

  it("se puede ver antes lo que hará, sin tocar la partida", async () => {
    const { planAuto } = await import("../src/game/autoUpgrade");
    const s = withDropship(NOW);
    s.cash = 1e6;
    const plan = planAuto(s, "dropship", NOW, true);
    expect(plan.steps).toBeGreaterThan(0);
    expect(s.cash).toBe(1e6);
    expect(s.biz.dropship.transport.managed).toBe(false);
    const real = autoUpgrade(s, "dropship", NOW, true);
    expect(real.after).toBeCloseTo(plan.after);
  });
});
