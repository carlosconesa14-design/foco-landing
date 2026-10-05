import { describe, expect, it } from "vitest";
import { NOTE_IDS, outsideQuietHours, planNotifications } from "../src/game/notify";
import { offlineCapHours } from "../src/game/world";
import * as meta from "../src/game/meta";
import { withDropship } from "./fresh";

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const NOW = at(2026, 10, 1, 12);

/** Partida con ingresos pasivos: el almacén con gerentes en todo. */
function earning() {
  const s = withDropship(NOW);
  const b = s.biz.dropship;
  b.floors[0].managed = true;
  b.transport.managed = true;
  b.sale.managed = true;
  return s;
}

describe("avisos en el móvil", () => {
  it("nunca de noche: entre las 22:00 y las 9:00 pasan a las 9:30", () => {
    expect(outsideQuietHours(at(2026, 10, 1, 15))).toBe(at(2026, 10, 1, 15));
    expect(outsideQuietHours(at(2026, 10, 1, 23))).toBe(at(2026, 10, 2, 9, 30));
    expect(outsideQuietHours(at(2026, 10, 2, 3))).toBe(at(2026, 10, 2, 9, 30));
  });

  it("avisa cuando la caja se llena (tope de horas offline)", () => {
    const s = earning();
    const cash = planNotifications(s, NOW).find((n) => n.id === NOTE_IDS.cashFull)!;
    expect(cash).toBeDefined();
    expect(cash.at).toBe(outsideQuietHours(NOW + offlineCapHours(s) * 3600e3));
  });

  it("sin ingresos pasivos no hay aviso de caja llena", () => {
    expect(planNotifications(withDropship(NOW), NOW).some((n) => n.id === NOTE_IDS.cashFull)).toBe(false);
  });

  it("avisa del maletín gratis solo si aún no está listo", () => {
    const s = earning();
    s.meta.freeChestAt = NOW - 1;
    expect(planNotifications(s, NOW).some((n) => n.id === NOTE_IDS.freeChest)).toBe(false);
    s.meta.freeChestAt = NOW + 2 * 3600e3;
    expect(planNotifications(s, NOW).find((n) => n.id === NOTE_IDS.freeChest)!.at).toBe(NOW + 2 * 3600e3);
  });

  it("premio diario: sin cobrar avisa esta tarde; cobrado, mañana", () => {
    const s = earning();
    const daily = () => planNotifications(s, NOW).find((n) => n.id === NOTE_IDS.daily)!;
    expect(daily().at).toBe(at(2026, 10, 1, 19));
    meta.claimDaily(s, NOW, false, () => 0.5);
    expect(daily().at).toBeGreaterThan(at(2026, 10, 1, 23, 59));
    expect(new Date(daily().at).getHours()).toBe(10);
  });

  it("si los desactivas en ajustes no se programa nada", () => {
    const s = earning();
    s.settings.notify = false;
    expect(planNotifications(s, NOW)).toEqual([]);
  });

  it("todos caen en el futuro y en orden", () => {
    const notes = planNotifications(earning(), NOW);
    expect(notes.every((n) => n.at > NOW)).toBe(true);
    expect(notes.map((n) => n.at)).toEqual([...notes.map((n) => n.at)].sort((a, b) => a - b));
  });
});
