import { describe, expect, it } from "vitest";
import { EVENT_TIERS, boostEvent, canBoostEvent, claimEventTier, ensureEvent, eventToClaim, eventWindow, migrateEvent } from "../src/game/event";
import { bump, freshState, migrate } from "../src/game/state";

/** Fechas en hora local (como las ve el móvil). 2 oct 2026 es viernes. */
const at = (day: number, h = 12) => new Date(2026, 9, day, h).getTime();

describe("evento del fin de semana", () => {
  it("dura de viernes 00:00 a lunes 00:00", () => {
    expect(eventWindow(at(1, 23)).active).toBe(false); // jueves
    expect(eventWindow(new Date(2026, 9, 2, 0, 0, 1).getTime()).active).toBe(true); // viernes
    expect(eventWindow(at(4, 23)).active).toBe(true); // domingo
    expect(eventWindow(new Date(2026, 9, 5, 0, 0, 1).getTime()).active).toBe(false); // lunes
    const w = eventWindow(at(3));
    expect(w.week).toBe("2026-10-02");
    expect(w.end).toBe(new Date(2026, 9, 5).getTime());
    expect(eventWindow(at(6)).next).toBe(new Date(2026, 9, 9).getTime());
  });

  it("el tema cambia cada semana", () => {
    const themes = [2, 9, 16].map((d) => eventWindow(at(d)).theme.id);
    expect(new Set(themes).size).toBe(3);
  });

  it("solo cuenta lo que se hace durante el evento", () => {
    const s = freshState(at(1));
    bump(s, "upgrades", 500); // antes del evento
    ensureEvent(s, at(2));
    expect(s.meta.event.points).toBe(0);
    bump(s, "upgrades", 10);
    bump(s, "hires", 1);
    ensureEvent(s, at(2, 13));
    const w = eventWindow(at(2));
    const up = w.theme.doubles.includes("upgrades") ? 2 : 1;
    const hi = w.theme.doubles.includes("hires") ? 2 : 1;
    expect(s.meta.event.points).toBeCloseTo(10 * up + 15 * hi);
    // Lo mismo dos veces no suma dos veces
    ensureEvent(s, at(2, 14));
    expect(s.meta.event.points).toBeCloseTo(10 * up + 15 * hi);
  });

  it("el anuncio duplica los puntos 30 minutos, con tope", () => {
    const s = freshState(at(3));
    expect(canBoostEvent(s, at(3))).toBe(false); // aún sin progreso de esta semana
    ensureEvent(s, at(3));
    expect(boostEvent(s, at(3))).toBe(true);
    const mult = eventWindow(at(3)).theme.doubles.includes("abilities") ? 2 : 1;
    bump(s, "abilities", 1);
    ensureEvent(s, at(3) + 60e3);
    expect(s.meta.event.points).toBe(10 * 2 * mult);
    for (let i = 0; i < 3; i++) boostEvent(s, at(3));
    expect(boostEvent(s, at(3))).toBe(false);
    expect(boostEvent(s, at(5))).toBe(false); // lunes: ya no hay evento
  });

  it("los premios se cobran en orden y se pueden cobrar después del evento", () => {
    const s = freshState(at(2));
    ensureEvent(s, at(2));
    s.meta.event.points = EVENT_TIERS[2].points;
    expect(eventToClaim(s)).toBe(3);
    const g = claimEventTier(s, at(2), () => 0);
    expect(g?.gems).toBe(15);
    expect(s.meta.gems).toBe(15);
    ensureEvent(s, at(6)); // miércoles: no reinicia
    expect(eventToClaim(s)).toBe(2);
    claimEventTier(s, at(6), () => 0);
    claimEventTier(s, at(6), () => 0);
    expect(claimEventTier(s, at(6), () => 0)).toBeNull();
    ensureEvent(s, at(9)); // viernes siguiente: progreso nuevo
    expect(s.meta.event.week).toBe("2026-10-09");
    expect(s.meta.event.points).toBe(0);
    expect(s.meta.event.claimed).toBe(0);
  });

  it("se guarda y se carga", () => {
    const s = freshState(at(2));
    ensureEvent(s, at(2));
    s.meta.event.points = 321;
    s.meta.event.claimed = 4;
    const back = migrate(JSON.parse(JSON.stringify(s)), at(2));
    expect(back.meta.event).toEqual(s.meta.event);
    expect(migrateEvent({ claimed: 99, points: "x" })).toMatchObject({ claimed: EVENT_TIERS.length, points: 0, week: "" });
  });
});
