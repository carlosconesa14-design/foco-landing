import { describe, expect, it } from "vitest";
import { earn, saleMult } from "../src/game/economy";
import { execMults } from "../src/game/execs";
import { freshState, migrate } from "../src/game/state";
import * as tw from "../src/game/twists";

const NOW = Date.UTC(2026, 9, 2, 12);
const fixed = () => 0;

describe("mecánicas de cada negocio", () => {
  it("cada negocio de cada ciudad tiene la suya, con la investigación en el último", () => {
    expect(["dropship", "restaurant", "tiktok", "ai"].map(tw.twistOf)).toEqual(["orders", "critic", "hype", "research"]);
    expect(["foodtruck", "beachclub", "yachts", "realestate", "crypto"].map(tw.twistOf)).toEqual(["critic", "hype", "orders", "orders", "research"]);
    expect(["supercars", "hotel", "safari", "souk", "tower"].map(tw.twistOf)).toEqual(["orders", "critic", "hype", "orders", "research"]);
    expect(tw.twistOf("nada")).toBeNull();
  });

  it("pedido urgente: se ofrece, se acepta, se cumple y se cobra (x2 con anuncio)", () => {
    const s = freshState(NOW);
    expect(tw.orderTick(s, "dropship", NOW, 10, true, fixed)).toBeNull(); // primer pedido al minuto
    const t1 = NOW + 61e3;
    expect(tw.orderTick(s, "dropship", t1, 10, true, fixed)).toBe("offered");
    const o = tw.twist(s, "dropship").order!;
    expect(o.target).toBeCloseTo(10 * 180 * tw.TW.orderTarget);
    expect(tw.acceptOrder(s, "dropship", t1)).toBe(true);
    earn(s, o.target / 2, "dropship");
    expect(tw.orderProgress(s, "dropship")).toBeCloseTo(0.5);
    earn(s, o.target, "dropship");
    expect(tw.orderTick(s, "dropship", t1 + 1000, 10, true)).toBe("done");
    const gems = s.meta.gems;
    const r = tw.claimOrder(s, "dropship", t1 + 2000, true)!;
    expect(r.money).toBeCloseTo(o.reward * 2);
    expect(s.meta.gems - gems).toBe(tw.TW.orderGems * 2);
    expect(tw.twist(s, "dropship").order).toBeNull();
  });

  it("un pedido que no se cumple o no se acepta no castiga", () => {
    const s = freshState(NOW);
    tw.twist(s, "dropship").nextOrder = NOW;
    tw.orderTick(s, "dropship", NOW, 10, true);
    expect(tw.orderTick(s, "dropship", NOW + 61e3, 10, true)).toBe("expired");
    tw.twist(s, "dropship").nextOrder = NOW;
    tw.orderTick(s, "dropship", NOW + 62e3, 10, true);
    tw.acceptOrder(s, "dropship", NOW + 62e3);
    const cash = s.cash;
    expect(tw.orderTick(s, "dropship", NOW + 62e3 + 181e3, 10, false)).toBe("failed");
    expect(s.cash).toBe(cash);
  });

  it("crítico: hay que tocar la cocina N veces; atenderle da una estrella (+5 % ventas) hasta 10", () => {
    const s = freshState(NOW);
    s.biz.restaurant.owned = true;
    const t = tw.twist(s, "restaurant");
    t.nextCritic = NOW;
    expect(tw.criticTick(s, "restaurant", NOW, true)).toBe("arrived");
    expect(t.critic!.need).toBe(tw.TW.criticTaps);
    expect(tw.serveCritic(s, "restaurant", NOW, false)).toBeNull(); // aún no ha visto la cocina
    expect(tw.criticTaps(s, "restaurant", 5, NOW)).toBe(false);
    expect(tw.criticTaps(s, "restaurant", 20, NOW)).toBe(true);
    const before = saleMult(s, "restaurant", NOW);
    expect(tw.serveCritic(s, "restaurant", NOW, false)).toEqual({ star: true });
    expect(saleMult(s, "restaurant", NOW) / before).toBeCloseTo(1.05);
    t.stars = 10;
    t.critic = { need: 12, got: 0, until: NOW + 1000 };
    expect(tw.serveCritic(s, "restaurant", NOW, true)).toEqual({ star: false }); // con anuncio, al momento
    t.critic = { need: 12, got: 0, until: NOW + 1000 };
    expect(tw.criticTick(s, "restaurant", NOW + 2000, true)).toBe("left");
  });

  it("no empiezan justo al acabar el tutorial: esperan a 3 puestos abiertos", () => {
    const s = freshState(NOW);
    s.meta.stats.life.floors = 1;
    expect(tw.twistsStarted(s)).toBe(false);
    s.meta.stats.life.floors = tw.TW.startFloors;
    expect(tw.twistsStarted(s)).toBe(true);
  });

  it("hype: sube con ventas y toques, baja solo; lleno = directo viral x3 (solo jugando)", () => {
    const s = freshState(NOW);
    expect(tw.hypeTick(s, "tiktok", NOW, 1, 5, 5)).toBe(false);
    expect(tw.twist(s, "tiktok").hype).toBe(20 + 10 - 0.5);
    tw.hypeTick(s, "tiktok", NOW, 9, 0, 0);
    expect(tw.twist(s, "tiktok").hype).toBe(25);
    // Un estudio con gerentes (≈1 venta cada 4 s) lo llena solo en unos minutos.
    let viral = false;
    let secs = 0;
    for (; secs < 600 && !viral; secs++) viral = tw.hypeTick(s, "tiktok", NOW, 1, secs % 4 === 0 ? 1 : 0, 0);
    expect(viral).toBe(true);
    expect(secs).toBeLessThan(240);
    expect(tw.viralActive(s, "tiktok", NOW + 1000)).toBe(true);
    expect(tw.hypeTick(s, "tiktok", NOW + 1000, 1, 100, 0)).toBe(false); // en directo no se acumula
    expect(tw.twistSaleMult(s, "tiktok", NOW + 1000, true)).toBe(tw.TW.viralMult);
    expect(tw.twistSaleMult(s, "tiktok", NOW + 1000, false)).toBe(1);
    // Después del directo, el público descansa: el hype no sube.
    const after = NOW + tw.TW.viralSec * 1000 + 1000;
    expect(tw.hypeRestUntil(s, "tiktok", after)).toBe(NOW + (tw.TW.viralSec + tw.TW.viralRestMin * 60) * 1000);
    tw.hypeTick(s, "tiktok", after, 1, 100, 100);
    expect(tw.twist(s, "tiktok").hype).toBe(0);
    const rested = NOW + (tw.TW.viralSec + tw.TW.viralRestMin * 60 + 1) * 1000;
    expect(tw.hypeRestUntil(s, "tiktok", rested)).toBe(0);
    tw.hypeTick(s, "tiktok", rested, 1, 1, 0);
    expect(tw.twist(s, "tiktok").hype).toBeGreaterThan(0);
    s.meta.twists.tiktok.hype = 0;
    expect(tw.hypeAd(s, "tiktok", NOW + 1000)).toBe(false); // ya está en directo
    expect(tw.hypeAd(s, "tiktok", NOW + 600e3)).toBe(true);
    expect(tw.hypeAd(s, "tiktok", NOW + 700e3)).toBe(false); // espera entre anuncios
  });

  it("investigación: los datos desbloquean mejoras en orden; el nodo 🌍 ayuda a toda la ciudad", () => {
    const s = freshState(NOW);
    tw.addData(s, "ai", 49);
    expect(tw.buyResearch(s, "ai")).toBe(false);
    tw.addData(s, "ai", 1e5);
    for (let i = 0; i < 5; i++) expect(tw.buyResearch(s, "ai")).toBe(true);
    const m = execMults(s, "ai", NOW);
    expect(m.sale).toBeCloseTo(1.75);
    expect(m.prod).toBeCloseTo(1.25);
    expect(m.log).toBeCloseTo(1.25);
    expect(tw.twistSaleMult(s, "dropship", NOW, false)).toBeCloseTo(1.1);
    expect(tw.buyResearch(s, "ai")).toBe(true);
    expect(tw.buyResearch(s, "ai")).toBe(false);
    expect(tw.nextResearch(s, "ai")).toBeNull();
  });

  it("se guarda con la partida", () => {
    const s = freshState(NOW);
    tw.twist(s, "restaurant").stars = 3;
    tw.addData(s, "ai", 77);
    const l = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(l.meta.twists.restaurant.stars).toBe(3);
    expect(l.meta.twists.ai.data).toBe(77);
  });
});
