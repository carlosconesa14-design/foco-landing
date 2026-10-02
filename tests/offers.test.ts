import { describe, expect, it } from "vitest";
import { TUTORIAL } from "../src/game/data";
import { OFFERS, WHEEL, claimVip, dueOffer, migrateOffers, pickSlot, rescheduleOffer, spinWheel, truckReward, wheelStatus } from "../src/game/offers";
import { freshState, migrate } from "../src/game/state";

const T0 = new Date(2026, 9, 2, 12).getTime();
const MIN = 60_000;

function played(now = T0) {
  const s = freshState(now);
  s.meta.tutorial = TUTORIAL.length;
  return s;
}

describe("camión de suministros y cliente VIP", () => {
  it("no aparecen durante el tutorial ni en la ciudad", () => {
    const s = freshState(T0);
    expect(dueOffer(s, T0 + 60 * MIN)).toBeNull();
    s.meta.tutorial = TUTORIAL.length;
    s.view = { scene: "city" };
    expect(dueOffer(s, T0 + 60 * MIN)).toBeNull();
  });

  it("el camión llega a los pocos minutos y después vuelve entre 5 y 9 min", () => {
    const s = played();
    expect(dueOffer(s, T0 + MIN)).toBeNull();
    expect(dueOffer(s, T0 + OFFERS.truckMinSec * 1000)).toBe("truck");
    const now = T0 + OFFERS.truckMinSec * 1000;
    rescheduleOffer(s, "truck", now, () => 0.5);
    expect(s.meta.offers.truckAt - now).toBe(((OFFERS.truckMinSec + OFFERS.truckMaxSec) / 2) * 1000);
  });

  it("el camión trae 15 min de ventas del negocio (mínimo 100 €)", () => {
    const s = played();
    const id = s.view.scene === "business" ? s.view.id : "";
    expect(truckReward(s, id, T0)).toBeGreaterThanOrEqual(100);
    s.biz[id].floors[0].level = 400;
    s.biz[id].transport.level = 200;
    s.biz[id].sale.level = 200;
    const big = truckReward(s, id, T0);
    expect(big).toBeGreaterThan(1e4);
    s.boostEnd = T0 + 3600e3; // el x2 del anuncio no cuenta: el camión ya es un premio de anuncio
    expect(truckReward(s, id, T0)).toBe(big);
  });

  it("como mucho 4 clientes VIP al día, con 10 diamantes cada uno", () => {
    const s = played();
    s.meta.offers.truckAt = Infinity;
    const later = T0 + OFFERS.vipMaxSec * 1000;
    for (let i = 0; i < OFFERS.vipPerDay; i++) {
      expect(dueOffer(s, later)).toBe("vip");
      expect(claimVip(s, later)).toBe(OFFERS.vipGems);
    }
    expect(dueOffer(s, later)).toBeNull();
    expect(claimVip(s, later)).toBeNull();
    expect(s.meta.gems).toBe(OFFERS.vipPerDay * OFFERS.vipGems);
    // Al día siguiente vuelven
    expect(dueOffer(s, later + 86400e3)).toBe("vip");
  });
});

describe("ruleta diaria", () => {
  it("las probabilidades suman 100 y cada casilla puede salir", () => {
    expect(WHEEL.reduce((a, w) => a + w.weight, 0)).toBe(100);
    expect(pickSlot(() => 0)).toBe(0);
    expect(pickSlot(() => 0.9999)).toBe(WHEEL.length - 1);
    const seen = new Set(Array.from({ length: 1000 }, (_, i) => pickSlot(() => i / 1000)));
    expect(seen.size).toBe(WHEEL.length);
  });

  it("un giro gratis al día y 3 más con anuncio", () => {
    const s = played();
    expect(wheelStatus(s, T0)).toEqual({ free: true, adsLeft: OFFERS.wheelAdSpins });
    expect(spinWheel(s, T0, false, () => 0)).not.toBeNull();
    expect(spinWheel(s, T0, false, () => 0)).toBeNull();
    for (let i = 0; i < OFFERS.wheelAdSpins; i++) expect(spinWheel(s, T0, true, () => 0)).not.toBeNull();
    expect(spinWheel(s, T0, true, () => 0)).toBeNull();
    expect(wheelStatus(s, T0)).toEqual({ free: false, adsLeft: 0 });
    expect(wheelStatus(s, T0 + 86400e3)).toEqual({ free: true, adsLeft: OFFERS.wheelAdSpins });
  });

  it("entrega el premio de la casilla", () => {
    const s = played();
    const gemsSlot = WHEEL.findIndex((w) => "gems" in w.reward && w.reward.gems === 5);
    const total = WHEEL.reduce((a, w) => a + w.weight, 0);
    const before = WHEEL.slice(0, gemsSlot).reduce((a, w) => a + w.weight, 0);
    const r = spinWheel(s, T0, false, () => (before + 0.5) / total);
    expect(r?.slot).toBe(gemsSlot);
    expect(r?.grant.gems).toBe(5);
    expect(s.meta.gems).toBe(5);
    const cash = spinWheel(s, T0, true, () => 0);
    expect(cash?.grant.cash).toBeGreaterThanOrEqual(100);
  });

  it("se guarda y se recupera", () => {
    const s = played();
    spinWheel(s, T0, false, () => 0);
    claimVip(s, T0);
    const back = migrate(JSON.parse(JSON.stringify(s)), T0);
    expect(wheelStatus(back, T0).free).toBe(false);
    expect(back.meta.offers.vipToday).toBe(1);
    // Partidas viejas o datos rotos
    const o = migrateOffers({ truckAt: "x", vipToday: -3, wheelAdsUsed: 2.7 }, T0);
    expect(o.truckAt).toBe(T0 + OFFERS.truckMinSec * 1000);
    expect(o.vipToday).toBe(0);
    expect(o.wheelAdsUsed).toBe(2);
    expect(migrateOffers({ truckAt: T0 + 1e12 }, T0).truckAt).toBe(T0 + OFFERS.truckMaxSec * 1000);
  });
});
