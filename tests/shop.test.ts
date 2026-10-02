import { describe, expect, it } from "vitest";
import { saleMult } from "../src/game/economy";
import { canBuy, grantProduct, isVip } from "../src/game/shop";
import { freshState, migrate } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 1, 12);

describe("tienda", () => {
  it("VIP: x2 permanente en todo, también offline", () => {
    const s = freshState(NOW);
    const before = saleMult(s, "dropship", NOW, false);
    expect(grantProduct(s, "vip", "o1", NOW)).toMatch(/VIP/);
    expect(isVip(s)).toBe(true);
    expect(saleMult(s, "dropship", NOW, false)).toBeCloseTo(before * 2);
    expect(canBuy(s, "vip")).toBe(false);
  });

  it("la misma transacción no se entrega dos veces", () => {
    const s = freshState(NOW);
    grantProduct(s, "gems_200", "t1", NOW);
    expect(grantProduct(s, "gems_200", "t1", NOW)).toBeNull();
    grantProduct(s, "gems_200", "t2", NOW);
    expect(s.meta.gems).toBe(400);
  });

  it("pack de inicio: una sola vez, con diamantes, ejecutivo Épico y modo hustle", () => {
    const s = freshState(NOW);
    grantProduct(s, "starter_pack", "a", NOW, () => 0.5);
    expect(s.meta.gems).toBe(300);
    expect(s.meta.execs).toHaveLength(1);
    expect(s.meta.execs[0].rarity).toBe(2);
    expect(s.boostEnd).toBe(NOW + 4 * 3600e3);
    expect(canBuy(s, "starter_pack")).toBe(false);
    expect(grantProduct(s, "starter_pack", "b", NOW)).toBeNull();
    expect(s.meta.gems).toBe(300);
  });

  it("las compras no generan eventos de la Liga", () => {
    const s = freshState(NOW);
    s.meta.league.id = "p";
    s.meta.league.secret = "x";
    grantProduct(s, "vip", "v", NOW);
    grantProduct(s, "gems_1200", "g", NOW);
    expect(s.meta.league.queue).toEqual([]);
  });

  it("las compras se guardan y sobreviven a salir a bolsa", async () => {
    const act = await import("../src/game/actions");
    const s = freshState(NOW);
    grantProduct(s, "vip", "v", NOW);
    const loaded = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(loaded.meta.shop).toEqual({ vip: true, starter: false, orders: ["v"] });
    loaded.runEarned = 1e30;
    expect(act.ipo(loaded, 1, NOW)!.state.meta.shop.vip).toBe(true);
  });
});
