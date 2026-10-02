import { describe, expect, it } from "vitest";
import { saleMult } from "../src/game/economy";
import * as lux from "../src/game/luxury";
import { freshState, migrate } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 2, 12);

describe("Mi vida: tienda de lujo", () => {
  it("empiezas con chándal, moto de reparto y casa de tus padres, sin bonus", () => {
    const s = freshState(NOW);
    expect(s.meta.luxury.equipped).toEqual({ outfit: "tracksuit", car: "deliverybike", home: "parents" });
    expect(lux.prestige(s, NOW)).toBe(0);
    expect(lux.luxuryMult(s, NOW)).toBe(1);
  });

  it("comprar con dinero lo pone, da prestigio y sube los ingresos", () => {
    const s = freshState(NOW);
    const before = saleMult(s, "dropship", NOW);
    expect(lux.buyLuxury(s, "scooter", NOW)).toBe("cash");
    s.cash = 2000;
    expect(lux.buyLuxury(s, "scooter", NOW)).toBe("ok");
    expect(s.cash).toBe(500);
    expect(s.meta.luxury.equipped.car).toBe("scooter");
    expect(lux.buyLuxury(s, "scooter", NOW)).toBe("owned");
    expect(saleMult(s, "dropship", NOW) / before).toBeCloseTo(1 + lux.LUX.perPrestige);
    expect(lux.equipLuxury(s, "deliverybike")).toBe(true);
    expect(lux.equipLuxury(s, "limo")).toBe(false);
  });

  it("los exclusivos se pagan con diamantes", () => {
    const s = freshState(NOW);
    s.cash = 1e40;
    expect(lux.buyLuxury(s, "penguin", NOW)).toBe("gems");
    s.meta.gems = 300;
    expect(lux.buyLuxury(s, "penguin", NOW)).toBe("ok");
    expect(s.meta.gems).toBe(50);
    expect(s.cash).toBe(1e40);
  });

  it("una colección completa da un extra", () => {
    const s = freshState(NOW);
    s.cash = 1e40;
    s.meta.gems = 1e4;
    for (const i of lux.LUXURY.filter((x) => x.cat === "pet")) lux.buyLuxury(s, i.id, NOW);
    expect(lux.completedCollections(s)).toEqual(["pet"]);
    expect(lux.luxuryMult(s, NOW)).toBeCloseTo(1 + 0.01 * 19 + 0.1);
  });

  it("probar con anuncio: 1 hora, cuenta para el bonus y se ve puesto; 5 al día", () => {
    const s = freshState(NOW);
    expect(lux.startTrial(s, "limo", NOW)).toBe(true);
    expect(lux.shownItems(s, NOW).car).toBe("limo");
    expect(lux.prestige(s, NOW)).toBe(9);
    expect(lux.prestige(s, NOW + 61 * 60e3)).toBe(0);
    for (let i = 0; i < 4; i++) expect(lux.startTrial(s, "yacht", NOW)).toBe(true);
    expect(lux.startTrial(s, "yacht", NOW)).toBe(false);
    expect(lux.trialsLeft(s, NOW + 86400e3)).toBe(5);
    expect(lux.startTrial(s, "penguin", NOW + 86400e3)).toBe(false);
  });

  it("oferta del día: con anuncio, a mitad de precio", () => {
    const s = freshState(NOW);
    const deal = lux.dailyDeal(s, NOW)!;
    expect(deal.price).toBeGreaterThan(0);
    expect(lux.priceOf(s, deal, NOW)).toBe(deal.price);
    expect(lux.unlockDeal(s, NOW)).toBe(true);
    expect(lux.priceOf(s, deal, NOW)).toBe(deal.price / 2);
    expect(lux.unlockDeal(s, NOW)).toBe(false);
  });

  it("se conserva al guardar y al salir a bolsa", () => {
    const s = freshState(NOW);
    s.cash = 1e6;
    lux.buyLuxury(s, "flat", NOW);
    const l = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(l.meta.luxury.owned).toContain("flat");
    expect(l.meta.luxury.equipped.home).toBe("flat");
  });
});
