import * as act from "./actions";
import { bestOption } from "./balance";
import { bizDef, businessRate, managerCost, type Station } from "./economy";
import type { GameState } from "./state";

/**
 * «Mejorar todo»: reparte el dinero del negocio en lo que más rinde, como lo haría un buen jugador
 * (primero los gerentes que falten; luego la mejora que más €/s da por cada euro: subir un puesto,
 * abrir uno nuevo o el transporte/la venta si son el atasco). Es la misma lógica del bot de equilibrado.
 *
 * Límite: unas veces al día gratis y alguna más con anuncio. Sin límite con el «Gestor automático»
 * (compra de 0,99 €) o con el VIP.
 */

export const AUTO = {
  freePerDay: 3,
  adPerDay: 2,
  /** Compras como mucho en un uso (para que nunca se quede colgado). */
  maxSteps: 400,
} as const;

export interface AutoState {
  day: string;
  used: number;
  adUsed: number;
}

export const freshAuto = (): AutoState => ({ day: "", used: 0, adUsed: 0 });

export function migrateAuto(raw: unknown): AutoState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (v: unknown) => (typeof v === "number" && v > 0 ? Math.floor(v) : 0);
  return { day: typeof r.day === "string" ? r.day : "", used: n(r.used), adUsed: n(r.adUsed) };
}

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

export const autoUnlimited = (s: GameState) => s.meta.shop.vip || s.meta.shop.autoManager;

function today(s: GameState, now: number): AutoState {
  const a = s.meta.auto;
  if (a.day !== dayOf(now)) Object.assign(a, { day: dayOf(now), used: 0, adUsed: 0 });
  return a;
}

/** Usos gratis que quedan hoy (Infinity si es ilimitado). */
export function autoFreeLeft(s: GameState, now: number): number {
  if (autoUnlimited(s)) return Infinity;
  return Math.max(0, AUTO.freePerDay - today(s, now).used);
}

/** Usos con anuncio que quedan hoy. */
export const autoAdLeft = (s: GameState, now: number) => (autoUnlimited(s) ? 0 : Math.max(0, AUTO.adPerDay - today(s, now).adUsed));

/** Gasta un uso (gratis o con anuncio). Devuelve false si no quedan. */
export function spendAutoUse(s: GameState, now: number, withAd: boolean): boolean {
  if (autoUnlimited(s)) return true;
  const a = today(s, now);
  if (withAd) {
    if (a.adUsed >= AUTO.adPerDay) return false;
    a.adUsed += 1;
    return true;
  }
  if (a.used >= AUTO.freePerDay) return false;
  a.used += 1;
  return true;
}

/** Mejora todo lo que se pueda en un negocio. Devuelve cuántas compras hizo y el ritmo antes y después. */
export function autoUpgrade(s: GameState, id: string, now: number): { steps: number; spent: number; before: number; after: number } {
  const b = s.biz[id];
  const before = businessRate(s, id, now);
  const cash0 = s.cash;
  let steps = 0;
  if (!b?.owned) return { steps, spent: 0, before, after: before };
  const mode = s.buyMode;
  s.buyMode = 1;
  try {
    // 1) Gerentes que falten (lo que más cambia la vida de un negocio)
    const parts: Station[] = [...b.floors.map((_, i) => ({ kind: "floor", index: i }) as Station), { kind: "transport" }, { kind: "sale" }];
    for (const st of parts) {
      const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
      if (!target.managed && s.cash >= managerCost(bizDef(id), st) && act.hireManager(s, id, st)) steps++;
    }
    // 2) La mejora que más rinde por euro, una y otra vez
    for (; steps < AUTO.maxSteps; steps++) {
      const o = bestOption(s, id, now);
      if (!o || s.cash < o.cost) break;
      o.run();
    }
  } finally {
    s.buyMode = mode;
  }
  return { steps, spent: cash0 - s.cash, before, after: businessRate(s, id, now) };
}
