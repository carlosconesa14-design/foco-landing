import { describe, expect, it } from "vitest";
import * as act from "../src/game/actions";
import { tapStation, tick } from "../src/game/economy";
import { advanceTutorial } from "../src/game/meta";
import { freshState } from "../src/game/state";
import { businessView } from "../src/view/businessView";

const NOW = Date.UTC(2026, 9, 5, 12);

describe("vista de un negocio (frontera lógica / visual)", () => {
  it("una partida nueva: reparto en bici con su primera parada, la siguiente en obras y el tutorial", () => {
    const s = freshState(NOW);
    const v = businessView(s, "bike", NOW);
    expect(v.stops).toHaveLength(1);
    expect(v.stops[0].name).toBe("Hamburguesería");
    expect(v.stops[0].hint).toBe(true);
    expect(v.next).toMatchObject({ index: 1, name: "Pizzería", affordable: false });
    expect(v.tutorial).toBe("tapFloor");
    expect(v.tier).toBe(1);
    expect(v.rates.bottleneck).toBeNull();
    expect(v.transport.button).toBe("idle");
  });

  it("tocar la bici sin pedidos no cuenta ni arranca un viaje en vacío (atasco del tutorial)", () => {
    const s = freshState(NOW);
    expect(tapStation(s, "bike", { kind: "transport" })).toBeTruthy();
    expect(s.biz.bike.transport.phase).toBe("idle");
    expect(s.meta.stats.life.tapTransport ?? 0).toBe(0);
    tapStation(s, "bike", { kind: "floor", index: 0 });
    advanceTutorial(s);
    expect(businessView(s, "bike", NOW).tutorial).toBe("tapTransport");
    expect(businessView(s, "bike", NOW).transport.hint).toBe(false);
    tick(s, 6, NOW + 6000);
    expect(s.biz.bike.floors[0].stock).toBeGreaterThan(0);
    expect(businessView(s, "bike", NOW).transport.hint).toBe(true);
    expect(tapStation(s, "bike", { kind: "transport" })).toBeNull();
    expect(s.biz.bike.transport.phase).toBe("down");
    expect(s.meta.stats.life.tapTransport).toBe(1);
  });

  it("refleja lo que pasa: producir, recoger y botones listos para mejorar", () => {
    const s = freshState(NOW);
    tapStation(s, "bike", { kind: "floor", index: 0 });
    expect(businessView(s, "bike", NOW).stops[0].working).toBe(true);
    s.cash = 1e6;
    const v = businessView(s, "bike", NOW);
    expect(v.stops[0].button).toBe("ready");
    expect(v.next?.affordable).toBe(true);
    act.unlockFloor(s, "bike");
    expect(businessView(s, "bike", NOW).stops).toHaveLength(2);
  });

  it("marca el atasco solo cuando hay algo automatizado", () => {
    const s = freshState(NOW);
    const b = s.biz.bike;
    b.floors[0].managed = true;
    b.floors[0].level = 200;
    const v = businessView(s, "bike", NOW);
    expect(v.rates.bottleneck).not.toBeNull();
    const part = v.rates.bottleneck === "production" ? v.stops[0] : v.rates.bottleneck === "transport" ? v.transport : v.sale;
    expect(part.button).toBe("bottleneck");
  });

  it("no cambia la partida", () => {
    const s = freshState(NOW);
    const before = JSON.stringify(s);
    businessView(s, "bike", NOW);
    expect(JSON.stringify(s)).toBe(before);
  });
});
