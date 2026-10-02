import { afterEach, describe, expect, it } from "vitest";
import { CONFIG } from "../src/game/data";
import { LUX } from "../src/game/luxury";
import { OFFERS } from "../src/game/offers";
import { applyRemoteConfig, factoryConfig, remoteVersion } from "../src/game/remote";
import { SEASON } from "../src/game/season";

describe("ajustes desde el servidor", () => {
  afterEach(() => applyRemoteConfig({}));

  it("cambia solo lo permitido, dentro de ¼–4× del valor de fábrica", () => {
    const f = factoryConfig();
    const n = applyRemoteConfig({ version: "camion-rapido", offers: { truckMinSec: 200, vipGems: 1000, price: 5 }, lux: { dealOff: 0.7 }, season: { adMult: 0.1 } });
    expect(OFFERS.truckMinSec).toBe(200);
    expect(OFFERS.vipGems).toBe(f.offers.vipGems * 4);
    expect((OFFERS as Record<string, unknown>).price).toBeUndefined();
    expect(LUX.dealOff).toBe(0.7);
    expect(SEASON.adMult).toBe(1);
    expect(n).toBe(4);
    expect(remoteVersion).toBe("camion-rapido");
  });

  it("ignora basura y vuelve a los valores de fábrica", () => {
    applyRemoteConfig({ viral: { viralMinSec: 60 } });
    expect(CONFIG.viralMinSec).toBe(60);
    applyRemoteConfig({ viral: { viralMinSec: "x" }, offers: null });
    expect(CONFIG.viralMinSec).toBe(factoryConfig().viral.viralMinSec);
    expect(applyRemoteConfig("nada")).toBe(0);
  });

  it("un rango nunca queda al revés", () => {
    applyRemoteConfig({ offers: { truckMinSec: 1000, truckMaxSec: 400 } });
    expect(OFFERS.truckMaxSec).toBeGreaterThanOrEqual(OFFERS.truckMinSec);
  });
});
