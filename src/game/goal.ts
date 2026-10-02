import { CHAIN } from "./data";
import {
  bizDef,
  bizList,
  chainRates,
  floorNextCost,
  floorUnlockCost,
  geomCost,
  logisticsNextCost,
  managerCost,
  nextMilestone,
  passiveRate,
  stationLevel,
  type Station,
} from "./economy";
import { stationName } from "./actions";
import type { GameState } from "./state";
import { canExpand, nextCity } from "./world";
import { t } from "../i18n";

/**
 * "Próximo objetivo": la siguiente meta con sentido y cuánto falta.
 * Tener siempre un objetivo cercano y visible es lo que mantiene al jugador tocando.
 */
export interface Goal {
  icon: string;
  text: string;
  cost: number;
  progress: number;
  action: { kind: "station"; bizId: string; station: Station } | { kind: "floor"; bizId: string } | { kind: "business"; bizId: string } | { kind: "world" };
}

export function nextGoal(s: GameState, now: number): Goal | null {
  const owned = bizList(s).filter((d) => s.biz[d.id].owned);
  const here = s.view.scene === "business" ? s.view.id : owned[owned.length - 1]?.id;
  const goals: Goal[] = [];
  const make = (icon: string, text: string, cost: number, action: Goal["action"]): Goal => ({
    icon,
    text,
    cost,
    progress: Math.min(1, s.cash / Math.max(1, cost)),
    action,
  });

  // 0) Ciudad completada: lo siguiente es expandirse
  if (canExpand(s)) {
    const next = nextCity(s)!;
    return { icon: next.flag, text: t("¡Expándete a {city}!", { city: next.name }), cost: 0, progress: 1, action: { kind: "world" } };
  }

  // 1) Gerentes que faltan: lo más valioso al principio
  for (const d of owned) {
    const b = s.biz[d.id];
    const sts: Station[] = [...b.floors.map((_, i) => ({ kind: "floor", index: i }) as Station), { kind: "transport" }, { kind: "sale" }];
    for (const st of sts) {
      const part = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
      if (!part.managed) goals.push(make("👔", t("Contrata gerente: {name}", { name: stationName(d.id, st) }), managerCost(d, st), { kind: "station", bizId: d.id, station: st }));
    }
  }
  if (goals.length) return goals.reduce((a, g) => (g.cost < a.cost ? g : a));

  // 2) El siguiente negocio, cuando está a menos de ~3 h de ingresos
  const next = bizList(s).find((d) => !s.biz[d.id].owned);
  const rate = passiveRate(s, now);
  if (next && rate > 0 && (next.price - s.cash) / rate < 3 * 3600) {
    return make(next.icon, t("Compra {name}", { name: next.name }), next.price, { kind: "business", bizId: next.id });
  }

  if (!here) return null;
  const def = bizDef(here);
  const b = s.biz[here];
  const r = chainRates(def, b, false);

  // 3) Hito x2 de la parte que limita en el negocio actual
  const st: Station =
    r.bottleneck === "transport"
      ? { kind: "transport" }
      : r.bottleneck === "sale"
        ? { kind: "sale" }
        : { kind: "floor", index: b.floors.length - 1 };
  const lvl = stationLevel(b, st);
  const ms = nextMilestone(lvl);
  const upg = (() => {
    if (!ms) return null;
    const first = st.kind === "floor" ? floorNextCost(def, st.index, lvl) : logisticsNextCost(def, lvl);
    const k = st.kind === "floor" ? CHAIN.floorUpgradeK : CHAIN.logisticsCostK;
    return make("⚡", t("{name} a Nv {lv} (x2)", { name: stationName(here, st), lv: ms }), geomCost(first, k, ms - lvl), { kind: "station", bizId: here, station: st });
  })();

  // 4) Abrir el siguiente puesto
  const floor =
    b.floors.length < CHAIN.maxFloors
      ? make("🔓", t("Abre {name} {n}", { name: def.floorName, n: b.floors.length + 1 }), floorUnlockCost(def, b.floors.length), { kind: "floor", bizId: here })
      : null;

  // El más cercano de los dos
  const options = [upg, floor].filter((g): g is Goal => !!g);
  if (!options.length) return next ? make(next.icon, t("Compra {name}", { name: next.name }), next.price, { kind: "business", bizId: next.id }) : null;
  return options.reduce((a, g) => (g.cost < a.cost ? g : a));
}
