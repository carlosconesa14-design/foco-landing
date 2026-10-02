import { describe, expect, it } from "vitest";
import { loopPosition, streetLoop } from "../src/scenes/streets";

const corners = [{c:0.32,r:0.32},{c:9.68,r:0.32},{c:9.68,r:11.68},{c:0.32,r:11.68}];
describe("rutas urbanas", () => {
  it("mantiene coches dentro del mapa en ambas direcciones, también al cerrar la vuelta", () => {
    for (const points of [corners,[...corners].reverse()]) {
      const route=streetLoop(points);
      for(let d=-route.total;d<route.total*2;d+=0.037) {
        const p=loopPosition(route,d);
        expect(p.c).toBeGreaterThanOrEqual(0.32-1e-9);
        expect(p.c).toBeLessThanOrEqual(9.68+1e-9);
        expect(p.r).toBeGreaterThanOrEqual(0.32-1e-9);
        expect(p.r).toBeLessThanOrEqual(11.68+1e-9);
      }
      const before=loopPosition(route,route.total-0.001),after=loopPosition(route,0.001);
      expect(Math.hypot(before.c-after.c,before.r-after.r)).toBeLessThan(0.0021);
    }
  });
  it("recorre segmentos largos y curvas con velocidad continua", () => {
    const route=streetLoop(corners);
    for(let d=0;d<route.total;d+=0.015) {
      const a=loopPosition(route,d),b=loopPosition(route,d+0.01);
      const distance=Math.hypot(b.c-a.c,b.r-a.r);
      expect(distance).toBeLessThanOrEqual(0.010001);
      expect(distance).toBeGreaterThan(0.0095);
      expect(Math.hypot(a.dc,a.dr)).toBeCloseTo(1,8);
    }
  });
});
