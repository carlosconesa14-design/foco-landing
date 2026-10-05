import { CHAIN, TUTORIAL, floorLabel } from "../game/data";
import { bizDef, bizList, chainRates, floorUnlockCost, managerCost, upgradeQuote, type Station } from "../game/economy";
import { execMults } from "../game/execs";
import { rankOf } from "../game/ranks";
import type { GameState } from "../game/state";

/**
 * Lo que una pantalla de negocio necesita saber para dibujarse, calculado a partir de la partida.
 *
 * Es la frontera entre la lógica (Claude: src/game) y lo visual (ChatGPT/Codex: src/scenes,
 * src/ui, arte). La escena solo lee esto y llama al `Bridge` cuando el jugador toca algo;
 * nunca cambia la partida por su cuenta. Ver docs/VISUAL.md, «Frontera lógica / visual».
 */

/** Estado del botón «Nivel» de una parte de la cadena. */
export type LevelState = "idle" | "ready" | "bottleneck";

export interface StationView {
  station: Station;
  name: string;
  level: number;
  /** 0 sin rango; 1 bronce … 5 leyenda (cambia el arte del puesto). */
  rank: number;
  managed: boolean;
  button: LevelState;
  /** Coste de la siguiente mejora con el modo de compra actual (x1, x10…). */
  upgradeCost: number;
}

export interface StopView extends StationView {
  index: number;
  /** Producto esperando a que lo recojan. */
  stock: number;
  /** Cuántas «cajas» dibujar (0–6), en escala logarítmica. */
  pile: number;
  /** El trabajador está produciendo (si no, está quieto esperando un toque). */
  working: boolean;
  /** Progreso del ciclo de producción, 0–1. */
  progress: number;
  /** Mano del tutorial sobre este puesto. */
  hint: boolean;
}

export interface TransportView extends StationView {
  /** Posición en la ruta: 0 = sede, k = parada k-1 (con decimales mientras se mueve). */
  pos: number;
  phase: "idle" | "down" | "load" | "up" | "unload";
  carry: number;
  hint: boolean;
}

export interface SaleView extends StationView {
  phase: "idle" | "out" | "back";
  /** Progreso del viaje de ida o de vuelta, 0–1. */
  progress: number;
  carry: number;
  hint: boolean;
}

export interface BusinessView {
  id: string;
  name: string;
  /** Categoría de la sede: 1 (★), 2 (★★, 3+ puestos) o 3 (★★★, 6+ puestos). */
  tier: 1 | 2 | 3;
  stops: StopView[];
  /** Siguiente parada en obras, si queda alguna. */
  next: { index: number; name: string; cost: number; affordable: boolean } | null;
  maxStops: number;
  transport: TransportView;
  sale: SaleView;
  /** Producto en la sede esperando a la venta. */
  topStock: number;
  topPile: number;
  /** €/s de cada parte y cuál frena la cadena (solo cuenta si hay algo automatizado). */
  rates: { production: number; transport: number; sale: number; total: number; bottleneck: "production" | "transport" | "sale" | null };
  /** Paso del tutorial que toca ahora en esta pantalla, si hay. */
  tutorial: "tapFloor" | "tapTransport" | "sales" | "upgrades" | "hires" | "floors" | null;
}

const pileOf = (amount: number, unit: number) => (amount <= 0 ? 0 : Math.min(6, 1 + Math.floor(Math.log2(1 + amount / Math.max(unit, 1e-9)))));

export function businessView(s: GameState, id: string, now: number): BusinessView {
  const def = bizDef(id);
  const b = s.biz[id];
  const m = execMults(s, id, now);
  const r = chainRates(def, b, false, m);
  const automated = b.transport.managed || b.sale.managed || b.floors.some((f) => f.managed);
  const bottleneck = automated ? r.bottleneck : null;
  const unit = CHAIN.floorCycle * def.mult;
  const early = s.totalEarned < 30;
  const step = s.meta.tutorial < TUTORIAL.length && id === bizList(s)[0].id ? TUTORIAL[s.meta.tutorial].stat : null;
  const tutorial = (step ?? null) as BusinessView["tutorial"];

  const station = (st: Station, level: number, managed: boolean, part: "production" | "transport" | "sale"): StationView => {
    const cost = upgradeQuote(s, id, st).cost;
    const ready = s.cash >= cost || (!managed && s.cash >= managerCost(def, st));
    return {
      station: st,
      name: st.kind === "floor" ? floorLabel(def, st.index) : st.kind === "transport" ? def.transportName : def.saleName,
      level,
      rank: rankOf(level),
      managed,
      button: bottleneck === part ? "bottleneck" : ready ? "ready" : "idle",
      upgradeCost: cost,
    };
  };

  const stops: StopView[] = b.floors.map((f, i) => ({
    ...station({ kind: "floor", index: i }, f.level, f.managed, "production"),
    index: i,
    stock: f.stock,
    pile: pileOf(f.stock, unit),
    working: f.running,
    progress: f.running ? Math.min(1, f.prog / CHAIN.floorCycle) : 0,
    hint: step ? step === "tapFloor" && !f.running : early && !f.managed && !f.running,
  }));

  const tr = b.transport;
  const sl = b.sale;
  const nextIndex = b.floors.length;
  const nextCost = nextIndex < CHAIN.maxFloors ? floorUnlockCost(def, nextIndex) : 0;
  return {
    id,
    name: def.name,
    tier: b.floors.length >= 6 ? 3 : b.floors.length >= 3 ? 2 : 1,
    stops,
    next: nextIndex < CHAIN.maxFloors ? { index: nextIndex, name: floorLabel(def, nextIndex), cost: nextCost, affordable: s.cash >= nextCost } : null,
    maxStops: CHAIN.maxFloors,
    transport: {
      ...station({ kind: "transport" }, tr.level, tr.managed, "transport"),
      pos: tr.pos,
      phase: tr.phase,
      carry: tr.carry,
      hint: (step ? step === "tapTransport" : early && b.floors.some((f) => f.stock > 0)) && tr.phase === "idle" && !tr.managed,
    },
    sale: {
      ...station({ kind: "sale" }, sl.level, sl.managed, "sale"),
      phase: sl.phase,
      progress: sl.prog,
      carry: sl.carry,
      hint: (step ? step === "sales" : early && b.topStock > 0) && sl.phase === "idle" && !sl.managed,
    },
    topStock: b.topStock,
    topPile: pileOf(b.topStock, unit),
    rates: { production: r.production, transport: r.transport, sale: r.sale, total: r.total, bottleneck },
    tutorial,
  };
}
