import * as act from "./actions";
import { CHAIN, LIFE } from "./data";
import {
  bizDef,
  bizList,
  businessRate,
  chainRates,
  earn,
  floorUnlockCost,
  lifeIndex,
  managerCost,
  passiveRate,
  setLuck,
  sharesToGain,
  tapStation,
  tick,
  tickOne,
  upgradeQuote,
  type SaleEvent,
  type Station,
} from "./economy";
import { execMults } from "./execs";
import { FEST_ID, withFest } from "./fest";
import { buyLuxury, LUXURY, owns } from "./luxury";
import { freshState, type GameState } from "./state";
import * as tw from "./twists";

/**
 * Bot de equilibrado: juega como un jugador activo razonable y registra cuándo llega a cada hito.
 * Vive en src/ para poder usarlo también desde los tests (que protegen el ritmo del juego).
 */

export interface SimEvent {
  t: number;
  what: string;
}

export interface SimResult {
  events: SimEvent[];
  state: GameState;
  final: { cash: number; rate: number; totalEarned: number; life: number; shares: number };
  /** Primer segundo en que ocurrió cada hito, por clave. */
  at: Record<string, number>;
}

const T0 = Date.UTC(2026, 0, 1);

function stations(s: GameState, id: string): Station[] {
  return [...s.biz[id].floors.map((_, i) => ({ kind: "floor", index: i }) as Station), { kind: "transport" }, { kind: "sale" }];
}

type Option = { gain: number; cost: number; run: () => void; label: string };

/**
 * Mejor compra en un negocio, como haría un jugador: mejorar la parte en rojo (la que limita).
 * Si limita la producción, elige entre mejorar un puesto o abrir uno nuevo según €/s ganados por €.
 * La ganancia se mide en la propia parte (no en el mínimo), para no quedarse bloqueado en empates.
 */
function bestOption(s: GameState, id: string, now: number): Option | null {
  const def = bizDef(id);
  const b = s.biz[id];
  const m = execMults(s, id, now);
  const r0 = chainRates(def, b, false, m);
  const part = (r: typeof r0) => r[r0.bottleneck];
  const upgradeOpt = (st: Station): Option => {
    const q = upgradeQuote({ ...s, buyMode: 1 }, id, st);
    const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
    target.level += 1;
    const gain = part(chainRates(def, b, false, m)) - part(r0);
    target.level -= 1;
    return {
      gain,
      cost: q.cost,
      label: "mejora",
      run: () => {
        const mode = s.buyMode;
        s.buyMode = 1;
        act.upgrade(s, id, st);
        s.buyMode = mode;
      },
    };
  };
  const opts: Option[] = [];
  if (r0.bottleneck === "production") {
    b.floors.forEach((_, i) => opts.push(upgradeOpt({ kind: "floor", index: i })));
    if (b.floors.length < CHAIN.maxFloors) {
      const cost = floorUnlockCost(def, b.floors.length);
      b.floors.push({ level: 1, managed: false, stock: 0, prog: 0, running: false });
      const gain = chainRates(def, b, false, m).production - r0.production;
      b.floors.pop();
      opts.push({ gain, cost, label: "puesto", run: () => act.unlockFloor(s, id) });
    }
  } else {
    opts.push(upgradeOpt({ kind: r0.bottleneck === "transport" ? "transport" : "sale" }));
  }
  const valid = opts.filter((o) => o.gain > 0);
  if (!valid.length) return null;
  // La ganancia real para el negocio es proporcional a su ritmo total.
  const scale = r0.total / Math.max(1e-9, part(r0));
  const best = valid.reduce((a, o) => (o.gain / o.cost > a.gain / a.cost ? o : a));
  return { ...best, gain: best.gain * scale };
}

/** Lo que hace en cada paso un jugador implicado (ver `engaged` en `simulate`). */
function engagedStep(s: GameState, now: number, dt: number, sales: SaleEvent[], ads: boolean, { luxShare, mechanics }: { luxShare: number; mechanics?: tw.TwistKind[] }): void {
  const rand = () => 0.5;
  for (const [id, b] of Object.entries(s.biz)) {
    const kind = tw.twistOf(id);
    if (!kind || !b.owned || (mechanics && !mechanics.includes(kind))) continue;
    const sold = sales.filter((e) => e.biz === id).length;
    if (kind === "hype") {
      // Toca el estudio una vez por segundo y, con anuncios, pide la colaboración en cuanto puede.
      tw.hypeTick(s, id, now, dt, sold, dt);
      if (ads && tw.hypeAdReady(s, id, now)) tw.hypeAd(s, id, now);
    } else if (kind === "research") {
      tw.addData(s, id, sold);
      while (tw.buyResearch(s, id));
    } else if (kind === "orders") {
      tw.orderTick(s, id, now, businessRate(s, id, now), true, rand);
      tw.acceptOrder(s, id, now);
      const r = tw.claimOrder(s, id, now, ads, rand);
      if (r) earn(s, r.money);
    } else if (kind === "critic") {
      if (tw.criticTick(s, id, now, true, rand) === "arrived") {
        const rate = businessRate(s, id, now);
        tw.criticTaps(s, id, tw.TW.criticTaps, now);
        if (tw.serveCritic(s, id, now, false, rand)) earn(s, rate * tw.TW.criticTipMin * 60);
      }
    }
  }
  // «Mi vida»: lo más barato que no tiene, si cuesta poco comparado con su dinero.
  const next = LUXURY.filter((i) => i.price > 0 && !owns(s, i.id)).sort((a, b) => a.price - b.price)[0];
  if (next && next.price <= s.cash * luxShare) buyLuxury(s, next.id, now);
}

export function simulate(opts: {
  hours: number;
  ads?: boolean;
  dt?: number;
  /** Ciudad a simular (por defecto Madrid). */
  city?: string;
  /** Prepara el estado antes de empezar (p. ej. mejoras de la Oficina central). */
  setup?: (s: GameState) => void;
  /**
   * Jugador implicado: además usa las mecánicas de cada negocio (pedidos, críticos, hype e
   * investigación, siempre atento) y compra en «Mi vida» lo que cueste menos de `luxShare` de su dinero.
   */
  engaged?: { luxShare: number; mechanics?: tw.TwistKind[] };
}): SimResult {
  const dt = opts.dt ?? 1;
  // Suerte con semilla fija para que la simulación sea reproducible.
  let seed = 12345;
  setLuck(() => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 8) / 16777216);
  const s = freshState(T0, opts.city);
  opts.setup?.(s);
  s.buyMode = 1;
  const events: SimEvent[] = [];
  const at: Record<string, number> = {};
  const mark = (t: number, key: string, what: string) => {
    if (key in at) return;
    at[key] = t;
    events.push({ t, what });
  };
  let lifeSeen = 0;
  const end = opts.hours * 3600;
  // Fotos del ritmo de ingresos en momentos clave
  const snaps = [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 43200, 86400, 172800, 259200, 604800];

  for (let t = 0; t < end; t += dt) {
    const now = T0 + t * 1000;
    if (opts.ads) s.boostEnd = now + 3600e3;
    const sales = tick(s, dt, now);
    if (opts.engaged) engagedStep(s, now, dt, sales, opts.ads ?? false, opts.engaged);

    // Toca todo lo que no tiene gerente (jugador activo)
    for (const d of bizList(s)) {
      if (!s.biz[d.id].owned) continue;
      for (const st of stations(s, d.id)) {
        const b = s.biz[d.id];
        const managed = st.kind === "floor" ? b.floors[st.index].managed : st.kind === "transport" ? b.transport.managed : b.sale.managed;
        if (!managed) tapStation(s, d.id, st);
      }
    }

    // Decide compras varias veces por segundo simulado mientras haya dinero
    for (let guard = 0; guard < 20; guard++) {
      // 1) Gerentes: prioridad si se pueden pagar
      let bought = false;
      for (const d of bizList(s)) {
        if (!s.biz[d.id].owned || bought) continue;
        for (const st of stations(s, d.id)) {
          const b = s.biz[d.id];
          const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
          if (!target.managed && s.cash >= managerCost(d, st)) {
            act.hireManager(s, d.id, st);
            mark(t, `mgr_${d.id}_${st.kind}${st.kind === "floor" ? st.index : ""}`, `Gerente: ${d.name} · ${act.stationName(d.id, st)}`);
            bought = true;
            break;
          }
        }
      }
      if (bought) continue;
      // 2) Siguiente negocio si se puede pagar
      const next = bizList(s).find((d) => !s.biz[d.id].owned);
      if (next && s.cash >= next.price) {
        act.buyBusiness(s, next.id);
        mark(t, `biz_${next.id}`, `Compra ${next.icon} ${next.name}`);
        continue;
      }
      // 3) La mejora más rentable de todos los negocios
      let best: Option | null = null;
      for (const d of bizList(s)) {
        if (!s.biz[d.id].owned) continue;
        const o = bestOption(s, d.id, now);
        if (o && (!best || o.gain / o.cost > best.gain / best.cost)) best = o;
      }
      // Si el siguiente negocio está cerca (menos de 20 min de ingresos), el bot ahorra para él.
      const rate = passiveRate(s, now);
      if (next && rate > 0 && (next.price - s.cash) / rate < 1200 && best && best.cost > (next.price - s.cash) * 0.2) break;
      if (!best || s.cash < best.cost) break;
      best.run();
      if (best.label === "puesto") {
        for (const d of bizList(s)) if (s.biz[d.id].owned) mark(t, `floors_${d.id}_${s.biz[d.id].floors.length}`, `${d.icon} ${d.name}: ${s.biz[d.id].floors.length} puestos`);
      }
    }

    if (snaps.includes(t)) mark(t, `snap_${t}`, `   · ${passiveRate(s, now).toExponential(2)} €/s · ganado ${s.totalEarned.toExponential(2)} €`);
    const li = lifeIndex(s.totalEarned);
    if (li > lifeSeen) {
      lifeSeen = li;
      mark(t, `life_${li}`, `Estilo de vida: ${LIFE[li].icon} ${LIFE[li].name}`);
    }
    const sh = sharesToGain(s);
    if (sh >= 1) mark(t, "shares_1", "Primera acción disponible (salir a bolsa)");
    if (sh >= 10) mark(t, "shares_10", "10 acciones disponibles");
    if (sh >= 50) mark(t, "shares_50", "50 acciones disponibles");
  }
  const now = T0 + end * 1000;
  setLuck(Math.random);
  return {
    events,
    at,
    state: s,
    final: { cash: s.cash, rate: passiveRate(s, now), totalEarned: s.totalEarned, life: lifeIndex(s.totalEarned), shares: sharesToGain(s) },
  };
}

/**
 * Bot en la feria del evento (fest.ts): juega solo la feria, con sus fichas, como un jugador activo.
 * Devuelve el segundo en que abre cada caseta (`stops_<n>`). Sirve para calibrar la feria.
 */
export function simulateFest(opts: { minutes: number; dt?: number }): { at: Record<string, number>; state: GameState } {
  const dt = opts.dt ?? 1;
  const s = freshState(T0);
  s.buyMode = 1;
  const at: Record<string, number> = {};
  const id = FEST_ID;
  withFest(s, () => {
    for (let t = 0; t < opts.minutes * 60; t += dt) {
      const now = T0 + t * 1000;
      tickOne(s, id, dt, now, []);
      const b = s.biz[id];
      for (const st of stations(s, id)) {
        const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
        if (!target.managed) tapStation(s, id, st);
      }
      for (let guard = 0; guard < 20; guard++) {
        const def = bizDef(id);
        const hire = stations(s, id).find((st) => {
          const target = st.kind === "floor" ? b.floors[st.index] : st.kind === "transport" ? b.transport : b.sale;
          return !target.managed && s.cash >= managerCost(def, st);
        });
        if (hire) {
          act.hireManager(s, id, hire);
          continue;
        }
        const best = bestOption(s, id, now);
        if (!best || s.cash < best.cost) break;
        best.run();
        const n = b.floors.length;
        if (!(`stops_${n}` in at)) at[`stops_${n}`] = t;
      }
    }
  });
  return { at, state: s };
}
