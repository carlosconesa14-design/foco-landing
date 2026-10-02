import { describe, expect, it, vi } from "vitest";
import { analytics } from "../src/platform/analytics";
import { reportError } from "../src/platform/errors";

describe("registro de errores", () => {
  it("envía mensaje y archivo limpios, sin repetir y como mucho 5 por sesión", () => {
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    vi.spyOn(analytics, "flush").mockResolvedValue();
    const e = new TypeError("Cannot read properties of undefined (reading 'level')");
    e.stack = `TypeError: x\n    at upgrade (https://example.com/jugar/assets/index-ABC123.js?v=99:12:345)`;
    reportError(e, "biz:dropship madrid");
    reportError(e, "biz:dropship madrid"); // repetido: no
    expect(track).toHaveBeenCalledTimes(1);
    const props = track.mock.calls[0][1]!;
    expect(props.msg).toBe("TypeError: Cannot read properties of undefined (reading 'level')");
    expect(props.src).toBe("upgrade (index-ABC123.js:12:345)");
    reportError("ResizeObserver loop limit exceeded"); // ruido: no
    for (let i = 0; i < 10; i++) reportError(new Error(`fallo ${i}`));
    expect(track).toHaveBeenCalledTimes(5);
    track.mockRestore();
  });
});
