import { describe, expect, it } from "vitest";
import * as lux from "../src/game/luxury";
import * as season from "../src/game/season";
import { bump, freshState, migrate } from "../src/game/state";

const OCT2 = new Date(2026, 9, 2, 12).getTime();
const OCT25 = new Date(2026, 9, 25, 12).getTime();
const NOV2 = new Date(2026, 10, 2, 0, 0, 1).getTime();

describe("evento de Halloween", () => {
  it("dura del 24 de octubre al 1 de noviembre, cada año", () => {
    expect(season.activeSeason(OCT2)).toBeNull();
    expect(season.activeSeason(OCT25)!.key).toBe("halloween-2026");
    expect(season.activeSeason(new Date(2026, 10, 1, 23).getTime())).not.toBeNull();
    expect(season.activeSeason(NOV2)).toBeNull();
    expect(season.activeSeason(new Date(2027, 9, 30).getTime())!.key).toBe("halloween-2027");
  });

  it("los fantasmas traen caramelos (x3 con anuncio) y las ventas también dan", () => {
    const s = freshState(OCT25);
    season.ensureSeason(s, OCT25, () => 0);
    expect(s.meta.season.key).toBe("halloween-2026");
    expect(season.visitorDue(s, OCT25)).toBe(false);
    expect(season.visitorDue(s, OCT25 + 21e3)).toBe(true);
    expect(season.collectVisitor(s, 7, OCT25, true)).toBe(21);
    expect(season.collectVisitor(s, 7, OCT25, false)).toBe(7);
    bump(s, "sales", 120);
    season.ensureSeason(s, OCT25);
    expect(s.meta.season.candy).toBe(28 + 2);
  });

  it("los objetos de Halloween se compran con caramelos y solo durante el evento", () => {
    const s = freshState(OCT25);
    season.ensureSeason(s, OCT25);
    expect(lux.buyLuxury(s, "pumpkin", OCT25)).toBe("candy");
    s.meta.season.candy = 120;
    expect(lux.buyLuxury(s, "pumpkin", OCT25)).toBe("ok");
    expect(s.meta.season.candy).toBe(20);
    expect(s.meta.luxury.equipped.pet).toBe("pumpkin");
    s.meta.season.candy = 1000;
    expect(lux.buyLuxury(s, "vampire", NOV2)).toBe("candy");
  });

  it("no cuentan para completar colecciones ni se pueden probar con anuncio", () => {
    expect(lux.collectionItems("pet").some((i) => i.season)).toBe(false);
    const s = freshState(OCT25);
    expect(lux.startTrial(s, "haunted", OCT25)).toBe(false);
  });

  it("la tienda tiene límites y la moneda caduca con el evento", () => {
    const s = freshState(OCT25);
    season.ensureSeason(s, OCT25);
    s.meta.season.candy = 1000;
    for (let i = 0; i < 3; i++) expect(season.buySeasonReward(s, "chest", OCT25, () => 0.5)).not.toBeNull();
    expect(season.buySeasonReward(s, "chest", OCT25)).toBeNull();
    const loaded = migrate(JSON.parse(JSON.stringify(s)), OCT25);
    expect(loaded.meta.season.bought.chest).toBe(3);
    season.ensureSeason(loaded, new Date(2027, 9, 25).getTime());
    expect(loaded.meta.season.candy).toBe(0);
  });
});
