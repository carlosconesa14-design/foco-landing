import { describe, expect, it } from "vitest";
import { AUTO, autoAdLeft, autoFreeLeft, autoUpgrade, spendAutoUse } from "../src/game/autoUpgrade";
import { businessRate } from "../src/game/economy";
import { grantProduct } from "../src/game/shop";
import { freshState, migrate } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 2, 12);

describe("Mejorar todo", () => {
  it("contrata gerentes y reparte el dinero en lo que más rinde", () => {
    const s = freshState(NOW);
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
    const s = freshState(NOW);
    expect(autoUpgrade(s, "dropship", NOW).steps).toBe(0);
  });

  it("3 gratis al día y 2 con anuncio; mañana vuelven", () => {
    const s = freshState(NOW);
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
    const s = freshState(NOW);
    grantProduct(s, "auto_manager", "o1", NOW);
    expect(autoFreeLeft(s, NOW)).toBe(Infinity);
    for (let i = 0; i < 20; i++) expect(spendAutoUse(s, NOW, false)).toBe(true);
    const v = freshState(NOW);
    grantProduct(v, "vip", "o2", NOW);
    expect(autoFreeLeft(v, NOW)).toBe(Infinity);
  });
});
