import { describe, expect, it } from "vitest";
import { CLOUD_EVERY_MS, cloudDue, hasAccount, refGoalReached, refQualifyPending } from "../src/game/account";
import { freshState, migrate } from "../src/game/state";

const NOW = Date.UTC(2026, 9, 2, 12);

describe("cuenta anónima: invitaciones y nube", () => {
  it("sin cuenta no hay nada que sincronizar", () => {
    const s = freshState(NOW);
    expect(hasAccount(s)).toBe(false);
    expect(cloudDue(s, NOW)).toBe(false);
    expect(refQualifyPending(s)).toBe(false);
  });

  it("el amigo cuenta al tener dos negocios o al expandirse", () => {
    const s = freshState(NOW);
    expect(refGoalReached(s)).toBe(false);
    s.biz.dropship.owned = s.biz.restaurant.owned = true;
    expect(refGoalReached(s)).toBe(true);
    const t = freshState(NOW, "miami");
    t.world.completed = ["madrid"];
    expect(refGoalReached(t)).toBe(true);
  });

  it("avisa una vez de que el amigo llegó y sube la partida cada 5 minutos", () => {
    const s = freshState(NOW);
    Object.assign(s.meta.account, { id: "a", secret: "b", code: "ABC234", recovery: "AAAA-BBBB-CCCC", refUsed: true });
    s.biz.dropship.owned = s.biz.restaurant.owned = true;
    expect(refQualifyPending(s)).toBe(true);
    s.meta.account.refQualified = true;
    expect(refQualifyPending(s)).toBe(false);
    expect(cloudDue(s, NOW)).toBe(true);
    s.meta.account.cloudAt = NOW;
    expect(cloudDue(s, NOW + CLOUD_EVERY_MS - 1)).toBe(false);
    expect(cloudDue(s, NOW + CLOUD_EVERY_MS)).toBe(true);
  });

  it("la cuenta se guarda con la partida y se conserva al salir a bolsa", () => {
    const s = freshState(NOW);
    Object.assign(s.meta.account, { id: "a", secret: "b", code: "ABC234", recovery: "AAAA-BBBB-CCCC" });
    const l = migrate(JSON.parse(JSON.stringify(s)), NOW);
    expect(l.meta.account.code).toBe("ABC234");
    expect(hasAccount(l)).toBe(true);
  });
});
