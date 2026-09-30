import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { CITIES, FRANCHISE, OFFICE, TOURISM } from "../src/game/data";
import { bizList, passiveRate, saleMult, tapStation, tick } from "../src/game/economy";
import { freshState, migrate, type GameState } from "../src/game/state";
import * as world from "../src/game/world";

const NOW = Date.UTC(2026, 8, 30, 12, 5); // 12:05, fuera de una ola turística
const MADRID = CITIES[0];

/** Madrid terminada: todos los negocios comprados y el objetivo ganado. */
function completedMadrid(): GameState {
  const s = freshState(NOW);
  for (const b of MADRID.businesses) s.biz[b.id].owned = true;
  s.totalEarned = MADRID.goal;
  s.cash = 1e12;
  s.meta.gems = 77;
  return s;
}

describe("completar una ciudad y expandirse", () => {
  it("no se puede expandir sin completar la ciudad", () => {
    const s = freshState(NOW);
    expect(world.canExpand(s)).toBe(false);
    expect(world.expand(s, NOW)).toBeNull();
    for (const b of MADRID.businesses) s.biz[b.id].owned = true;
    expect(world.canExpand(s)).toBe(false); // falta el objetivo de dinero
  });

  it("expandirse da estrellas, empieza Miami de cero y conserva lo global", () => {
    const s = completedMadrid();
    expect(world.starsToGain(s)).toBe(FRANCHISE.baseStars);
    const res = world.expand(s, NOW, true)!;
    expect(res.stars).toBe(FRANCHISE.baseStars * 2);
    const n = res.state;
    expect(n.city).toBe("miami");
    expect(n.cash).toBe(0);
    expect(n.totalEarned).toBe(0);
    expect(bizList(n).map((b) => b.id)).toEqual(CITIES[1].businesses.map((b) => b.id));
    expect(n.biz.foodtruck.owned).toBe(true);
    expect(n.meta.gems).toBe(77);
    expect(n.world.completed).toEqual(["madrid"]);
    expect(n.world.archive.madrid.biz.ai.owned).toBe(true);
  });

  it("las ciudades completadas dan el bonus de franquicia en todas las demás", () => {
    const n = world.expand(completedMadrid(), NOW)!.state;
    expect(world.worldIncomeMult(n)).toBeCloseTo(1 + FRANCHISE.cityBonus);
    expect(saleMult(n, "foodtruck", NOW)).toBeCloseTo(1 + FRANCHISE.cityBonus);
  });

  it("se puede volver a Madrid y cobrar lo ganado mientras tanto", () => {
    const miami = world.expand(completedMadrid(), NOW)!.state;
    miami.cash = 123;
    const back = world.travel(miami, "madrid", NOW + 3600e3)!;
    expect(back.state.city).toBe("madrid");
    expect(back.state.biz.ai.owned).toBe(true);
    expect(back.offline).toBe(3600);
    expect(back.state.world.archive.miami.cash).toBe(123);
    // Y de vuelta a Miami se conserva
    const again = world.travel(back.state, "miami", NOW + 7200e3)!;
    expect(again.state.cash).toBe(123);
  });

  it("no se puede viajar a una ciudad que no has abierto", () => {
    expect(world.travel(freshState(NOW), "miami", NOW)).toBeNull();
  });
});

describe("Oficina central", () => {
  it("las mejoras cuestan estrellas y tienen un máximo", () => {
    const s = freshState(NOW);
    expect(world.buyOffice(s, "brand")).toBe(false);
    s.world.stars = 1000;
    const brand = OFFICE.find((o) => o.id === "brand")!;
    for (let i = 0; i < brand.max; i++) expect(world.buyOffice(s, "brand")).toBe(true);
    expect(world.buyOffice(s, "brand")).toBe(false);
    expect(world.worldIncomeMult(s)).toBeCloseTo(1 + 0.25 * brand.max);
  });

  it("las ventajas de arranque se aplican al empezar ciudad y al salir a bolsa", () => {
    const s = completedMadrid();
    s.world.upgrades = { team: 1, floors: 2 };
    const miami = world.expand(s, NOW)!.state;
    const ft = miami.biz.foodtruck;
    expect(ft.floors).toHaveLength(3);
    expect(ft.floors.every((f) => f.managed)).toBe(true);
    expect(ft.transport.managed && ft.sale.managed).toBe(true);
    miami.runEarned = CITIES[1].shareDivisor;
    const ipo = act.ipo(miami, 1, NOW)!;
    expect(ipo.state.city).toBe("miami");
    expect(ipo.state.biz.foodtruck.floors).toHaveLength(3);
    expect(ipo.state.biz.foodtruck.transport.managed).toBe(true);
  });

  it("proveedores abarata las mejoras y turno de noche amplía el offline", () => {
    const s = freshState(NOW);
    s.world.upgrades = { offline: 2, hustle: 1, luck: 3 };
    expect(world.offlineCapHours(s)).toBe(12);
    expect(world.boostHours(s)).toBe(5);
    expect(world.luckyChance(s)).toBeCloseTo(0.07);
    s.world.upgrades = { suppliers: 5 };
    expect(world.upgradeDiscount(s)).toBeCloseTo(0.6);
  });
});

describe("olas turísticas de Miami", () => {
  const miamiState = () => world.expand(completedMadrid(), NOW)!.state;

  it("solo existen en Miami", () => {
    expect(world.tourism(freshState(NOW), NOW)).toBeNull();
    expect(world.tourism(miamiState(), NOW)).not.toBeNull();
  });

  it("cada 15 minutos llega una ola de 3 que triplica las ventas en vivo", () => {
    const s = miamiState();
    const period = TOURISM.periodMin * 60e3;
    const inWave = Math.ceil(NOW / period) * period + 60e3;
    const out = inWave + TOURISM.waveMin * 60e3;
    expect(world.tourism(s, inWave)!.active).toBe(true);
    expect(world.tourism(s, out)!.active).toBe(false);
    expect(world.tourismMult(s, inWave, true)).toBe(TOURISM.mult);
    expect(world.tourismMult(s, inWave, false)).toBe(1);
  });

  it("un anuncio atrae una ola al momento", () => {
    const s = miamiState();
    const period = TOURISM.periodMin * 60e3;
    const calm = Math.ceil(NOW / period) * period + (TOURISM.waveMin + 1) * 60e3;
    expect(world.callWave(s, calm)).toBe(true);
    expect(world.tourism(s, calm + 1000)!.active).toBe(true);
    expect(world.callWave(s, calm + 1000)).toBe(false);
  });

  it("Miami funciona con la cadena de producción normal", () => {
    const s = miamiState();
    tapStation(s, "foodtruck", { kind: "floor", index: 0 });
    for (let t = 0; t < 6; t += 1 / 30) tick(s, 1 / 30, NOW);
    expect(s.biz.foodtruck.floors[0].stock).toBeGreaterThan(0);
    expect(passiveRate(s, NOW)).toBe(0);
  });
});

describe("partidas guardadas", () => {
  it("una partida de antes de las ciudades se convierte en Madrid", () => {
    const s = migrate({ version: 2, cash: 5, totalEarned: 42, biz: { dropship: { floors: [{ level: 3 }] } } }, NOW);
    expect(s.city).toBe("madrid");
    expect(s.biz.dropship.floors[0].level).toBe(3);
    expect(s.world.lifetimeEarned).toBe(42);
  });

  it("guardar y cargar conserva la ciudad, el archivo y las estrellas", () => {
    const n = world.expand(completedMadrid(), NOW)!.state;
    n.world.upgrades = { brand: 2 };
    const loaded = migrate(JSON.parse(JSON.stringify(n)), NOW);
    expect(loaded.city).toBe("miami");
    expect(loaded.world.stars).toBe(n.world.stars);
    expect(loaded.world.upgrades.brand).toBe(2);
    expect(loaded.world.archive.madrid.biz.ai.owned).toBe(true);
    expect(loaded.biz.foodtruck.owned).toBe(true);
  });
});
