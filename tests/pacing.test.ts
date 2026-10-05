import { describe, expect, it } from "vitest";
import { simulate } from "../src/game/balance";
import { LUXURY } from "../src/game/luxury";
import type { GameState } from "../src/game/state";
import { applyStartPerks } from "../src/game/world";

/**
 * Protege el ritmo del juego: un bot activo (sin anuncios) debe llegar a cada hito
 * dentro de estos márgenes. Si cambias los números de data.ts, ejecuta
 * `npx vite-node scripts/balance.ts` para ver la progresión completa.
 */
const min = 60;
const h = 3600;

describe("ritmo de progresión", () => {
  const res = simulate({ hours: 40, dt: 2 });

  it("gerentes del almacén en los primeros minutos", () => {
    expect(res.at["mgr_dropship_sale"]).toBeLessThan(3 * min);
  });

  it("restaurante hacia los 45 minutos", () => {
    expect(res.at["biz_restaurant"]).toBeGreaterThan(25 * min);
    expect(res.at["biz_restaurant"]).toBeLessThan(70 * min);
  });

  it("estudio de TikTok entre 3 y 8 horas", () => {
    expect(res.at["biz_tiktok"]).toBeGreaterThan(3 * h);
    expect(res.at["biz_tiktok"]).toBeLessThan(8 * h);
  });

  it("agencia de IA pasado medio día y antes de día y medio", () => {
    expect(res.at["biz_ai"]).toBeGreaterThan(14 * h);
    expect(res.at["biz_ai"]).toBeLessThan(36 * h);
  });

  it("primera acción en bolsa pasadas unas horas", () => {
    expect(res.at["shares_1"]).toBeGreaterThan(4 * h);
    expect(res.at["shares_1"]).toBeLessThan(16 * h);
  });

  it("el último estilo de vida no llega el primer día", () => {
    expect(res.at["life_9"] ?? Infinity).toBeGreaterThan(24 * h);
  });

  it("con anuncios se avanza bastante más rápido", () => {
    const ads = simulate({ hours: 8, dt: 2, ads: true });
    expect(ads.at["biz_tiktok"]).toBeLessThan(res.at["biz_tiktok"] * 0.75);
  });
}, 120_000);

describe("ritmo de Miami (segunda ciudad, con 10 ⭐ repartidas)", () => {
  const res = simulate({
    hours: 90,
    dt: 2,
    city: "miami",
    setup: (s) => {
      s.world.completed = ["madrid"];
      s.world.upgrades = { brand: 1, team: 1, floors: 1 };
      applyStartPerks(s);
    },
  });

  it("el arranque es rápido gracias a la Oficina central", () => {
    expect(res.at["biz_beachclub"]).toBeLessThan(2 * h);
  });

  it("cada negocio tarda más que su equivalente de Madrid", () => {
    expect(res.at["biz_yachts"]).toBeGreaterThan(6 * h);
    expect(res.at["biz_realestate"]).toBeGreaterThan(24 * h);
    expect(res.at["biz_crypto"]).toBeGreaterThan(48 * h);
    expect(res.at["biz_crypto"]).toBeLessThan(90 * h);
  });
}, 300_000);

describe("ritmo de Dubái (tercera ciudad, con unas 20 ⭐ repartidas)", () => {
  const res = simulate({
    hours: 130,
    dt: 2,
    city: "dubai",
    setup: (s) => {
      s.world.completed = ["madrid", "miami"];
      s.world.upgrades = { brand: 3, team: 1, floors: 1, suppliers: 1 };
      applyStartPerks(s);
    },
  });

  it("el hotel llega pronto", () => {
    expect(res.at["biz_hotel"]).toBeLessThan(2 * h);
  });

  it("es la ciudad más larga: el rascacielos tarda más que el exchange de Miami", () => {
    expect(res.at["biz_safari"]).toBeGreaterThan(3 * h);
    expect(res.at["biz_souk"]).toBeGreaterThan(30 * h);
    expect(res.at["biz_tower"]).toBeGreaterThan(80 * h);
    expect(res.at["biz_tower"]).toBeLessThan(130 * h);
  });
}, 600_000);

/** Da los objetos de «Mi vida» que un jugador ya tendría al llegar a la ciudad. */
const ownLuxury = (s: GameState, upTo: number) => {
  for (const i of LUXURY) if (i.price > 0 && i.price <= upTo && !s.meta.luxury.owned.includes(i.id)) s.meta.luxury.owned.push(i.id);
};

describe("ritmo del jugador implicado (mecánicas y «Mi vida»): más rápido, pero no rompe el juego", () => {
  it("Miami: el exchange de cripto sigue pidiendo más de 40 h", () => {
    const res = simulate({
      hours: 70,
      dt: 2,
      city: "miami",
      engaged: { luxShare: 0.25 },
      setup: (s) => {
        s.world.completed = ["madrid"];
        s.world.upgrades = { brand: 1, team: 1, floors: 1 };
        applyStartPerks(s);
        ownLuxury(s, 1e20);
      },
    });
    expect(res.at["biz_crypto"]).toBeGreaterThan(40 * h); // ~51 h (bot normal ~77 h)
  });

  it("Madrid: la IA llega antes que con el bot normal, pero no antes de 10 h", () => {
    const res = simulate({ hours: 24, dt: 2, engaged: { luxShare: 0.25 } });
    expect(res.at["biz_tiktok"]).toBeGreaterThan(2 * h);
    expect(res.at["biz_ai"]).toBeGreaterThan(10 * h);
    expect(res.at["biz_ai"]).toBeLessThan(20 * h);
  });

  // Con las mecánicas propias de Dubái (encargos, inspector, atardecer viral, joyas e ingeniería)
  // el implicado llega en ~57 h, frente a ~106 h del bot normal: es la cota alta (siempre mirando).
  it("Dubái: el rascacielos sigue pidiendo más de 2 días", () => {
    const res = simulate({
      hours: 100,
      dt: 2,
      city: "dubai",
      engaged: { luxShare: 0.25 },
      setup: (s) => {
        s.world.completed = ["madrid", "miami"];
        s.world.upgrades = { brand: 3, team: 1, floors: 1, suppliers: 1 };
        applyStartPerks(s);
        ownLuxury(s, 1e28);
      },
    });
    expect(res.at["biz_tower"]).toBeGreaterThan(50 * h);
  });
}, 600_000);
