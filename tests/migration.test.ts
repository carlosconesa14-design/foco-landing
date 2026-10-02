import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planAuto } from "../src/game/autoUpgrade";
import { awaySummary } from "../src/game/away";
import { offlineEarnings, passiveRate, tick } from "../src/game/economy";
import { luxuryMult } from "../src/game/luxury";
import { ensureRival } from "../src/game/rival";
import { migrate } from "../src/game/state";
import { pickSave } from "../src/platform/storage";

/**
 * Partidas reales de la beta publicada (rama `main`, PR 1), generadas con su propio código:
 * 15 minutos de juego, Madrid a medias (10 h, ejecutivos, VIP, Liga) y Miami tras salir a bolsa
 * con Madrid archivada. Tienen que cargarse con la versión nueva sin perder nada.
 */
type Raw = Record<string, any>;
const NOW = Date.UTC(2026, 9, 2, 12);
const load = (name: string): { text: string; raw: Raw } => {
  const text = readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
  return { text, raw: JSON.parse(text) };
};
const FIXTURES = ["beta-15min.json", "beta-madrid-10h.json", "beta-miami.json"];

describe.each(FIXTURES)("partida antigua de la beta: %s", (name) => {
  const { text, raw } = load(name);

  it("no cuenta como editada (sin firma y sin copia: se acepta y se firma al guardar)", async () => {
    const r = await pickSave(text, null, true);
    expect(r.tampered).toBe(false);
    expect(r.data).toEqual(raw);
  });

  it("conserva el progreso de la ciudad", () => {
    const s = migrate(raw, NOW);
    expect(s.city).toBe(raw.city);
    expect(s.cash).toBe(raw.cash);
    expect(s.totalEarned).toBe(raw.totalEarned);
    expect(s.runEarned).toBe(raw.runEarned);
    expect(s.shares).toBe(raw.shares);
    expect(s.ipos).toBe(raw.ipos);
    for (const [id, b] of Object.entries<Raw>(raw.biz)) {
      expect(s.biz[id].owned, id).toBe(b.owned);
      expect(s.biz[id].floors.map((f) => [f.level, f.managed]), id).toEqual(b.floors.map((f: Raw) => [f.level, f.managed]));
      expect([s.biz[id].transport.level, s.biz[id].transport.managed], id).toEqual([b.transport.level, b.transport.managed]);
      expect([s.biz[id].sale.level, s.biz[id].sale.managed], id).toEqual([b.sale.level, b.sale.managed]);
    }
  });

  it("conserva lo global: diamantes, ejecutivos, logros, tutorial, diario, compras, Liga y ciudades", () => {
    const s = migrate(raw, NOW);
    const m = raw.meta;
    expect(s.meta.gems).toBe(m.gems);
    expect(s.meta.execs.map((e) => [e.id, e.rarity, e.kind, e.assigned])).toEqual(m.execs.map((e: Raw) => [e.id, e.rarity, e.kind, e.assigned]));
    expect(s.meta.achievements).toEqual(m.achievements);
    expect(s.meta.tutorial).toBe(m.tutorial);
    expect(s.meta.daily).toEqual(m.daily);
    expect(s.meta.shop.vip).toBe(m.shop.vip);
    expect(s.meta.league.id).toBe(m.league.id);
    expect(s.world.stars).toBe(raw.world.stars);
    expect(s.world.upgrades).toEqual(raw.world.upgrades);
    expect(s.world.completed).toEqual(raw.world.completed);
    expect(Object.keys(s.world.archive)).toEqual(Object.keys(raw.world.archive));
    for (const [city, a] of Object.entries<Raw>(raw.world.archive)) {
      expect(s.world.archive[city].totalEarned).toBe(a.totalEarned);
      for (const [id, b] of Object.entries<Raw>(a.biz)) expect(s.world.archive[city].biz[id].owned, `${city}/${id}`).toBe(b.owned);
    }
    expect(s.settings).toEqual(raw.settings);
  });

  it("estrena lo nuevo vacío (Mi vida, mecánicas, Mejorar todo, rival, temporada, cuenta)", () => {
    const s = migrate(raw, NOW);
    expect(s.meta.luxury.owned.length).toBeGreaterThan(0); // lo gratis de partida
    expect(luxuryMult(s, NOW)).toBe(1);
    expect(s.meta.twists).toEqual({});
    expect(s.meta.auto.used).toBe(0);
    expect(s.meta.shop.autoManager).toBe(false);
    for (const k of ["rival", "season", "account", "founder"] as const) expect(s.meta[k], k).toBeTruthy();
  });

  it("sigue jugando: ingresos, offline y lo nuevo funcionan sin errores ni NaN", () => {
    const s = migrate(raw, NOW);
    s.lastSeen = NOW - 3600e3;
    const off = offlineEarnings(s, NOW);
    expect(Number.isFinite(off.amount)).toBe(true);
    const cash0 = s.cash;
    for (let i = 0; i < 60; i++) tick(s, 1, NOW + i * 1000);
    expect(Number.isFinite(s.cash)).toBe(true);
    if (passiveRate(s, NOW) > 0) expect(s.cash).toBeGreaterThan(cash0);
    expect(() => awaySummary(s, NOW, s.cash)).not.toThrow();
    expect(() => ensureRival(s, NOW, passiveRate(s, NOW))).not.toThrow();
    const owned = Object.keys(s.biz).find((id) => s.biz[id].owned);
    if (owned) expect(Number.isFinite(planAuto(s, owned, NOW).after)).toBe(true);
  });

  it("guardar y volver a cargar no cambia nada", () => {
    const s = migrate(raw, NOW);
    expect(migrate(JSON.parse(JSON.stringify(s)), NOW)).toEqual(s);
  });
});
