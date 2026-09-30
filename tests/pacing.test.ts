import { describe, expect, it } from "vitest";
import { simulate } from "../src/game/balance";
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
