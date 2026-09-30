import { CONFIG, JOBS, PROPERTIES } from "./data";

export type BuyMode = 1 | 10 | 100 | "max";
export type Tab = "jobs" | "auto" | "city" | "ipo";

export interface JobState {
  level: number;
  auto: boolean;
  /** Segundos acumulados del ciclo en curso. */
  prog: number;
  running: boolean;
}

export interface PropertyState {
  owned: boolean;
  /** Nivel de cada estación de la cadena. */
  levels: [number, number, number];
  /** Fin del "hora punta" x3, en ms epoch. */
  rushEnd: number;
}

export interface AdStats {
  total: number;
  day: string;
  today: number;
  byPlacement: Record<string, number>;
}

export interface GameState {
  version: 1;
  cash: number;
  /** Ganado desde la última salida a bolsa: decide cuántas acciones recibes. */
  runEarned: number;
  /** Ganado desde siempre: decide el estilo de vida. */
  totalEarned: number;
  shares: number;
  ipos: number;
  jobs: JobState[];
  props: Record<string, PropertyState>;
  boostEnd: number;
  buyMode: BuyMode;
  tab: Tab;
  openProperty: string | null;
  lastSeen: number;
  nextViral: number;
  lifeSeen: number;
  ads: AdStats;
}

const freshJob = (i: number): JobState => ({ level: i === 0 ? 1 : 0, auto: false, prog: 0, running: false });
const freshProp = (): PropertyState => ({ owned: false, levels: [1, 1, 1], rushEnd: 0 });

export function freshState(now = Date.now()): GameState {
  return {
    version: 1,
    cash: 0,
    runEarned: 0,
    totalEarned: 0,
    shares: 0,
    ipos: 0,
    jobs: JOBS.map((_, i) => freshJob(i)),
    props: Object.fromEntries(PROPERTIES.map((p) => [p.id, freshProp()])),
    boostEnd: 0,
    buyMode: 1,
    tab: "jobs",
    openProperty: null,
    lastSeen: now,
    nextViral: now + 90_000,
    lifeSeen: 0,
    ads: { total: 0, day: "", today: 0, byPlacement: {} },
  };
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Convierte una partida guardada (quizá de una versión anterior) en un estado válido. */
export function migrate(raw: unknown, now = Date.now()): GameState {
  const s = freshState(now);
  if (!raw || typeof raw !== "object") return s;
  const r = raw as Partial<GameState>;
  s.cash = num(r.cash, 0);
  s.runEarned = num(r.runEarned, 0);
  s.totalEarned = num(r.totalEarned, 0);
  s.shares = num(r.shares, 0);
  s.ipos = num(r.ipos, 0);
  s.boostEnd = num(r.boostEnd, 0);
  s.lastSeen = num(r.lastSeen, now);
  s.nextViral = num(r.nextViral, s.nextViral);
  s.lifeSeen = num(r.lifeSeen, 0);
  if (r.buyMode === 1 || r.buyMode === 10 || r.buyMode === 100 || r.buyMode === "max") s.buyMode = r.buyMode;
  if (r.tab === "jobs" || r.tab === "auto" || r.tab === "city" || r.tab === "ipo") s.tab = r.tab;
  if (Array.isArray(r.jobs)) {
    r.jobs.slice(0, JOBS.length).forEach((j, i) => {
      if (!j) return;
      s.jobs[i] = { level: num(j.level, s.jobs[i].level), auto: !!j.auto, prog: num(j.prog, 0), running: !!j.running };
    });
  }
  if (r.props && typeof r.props === "object") {
    for (const p of PROPERTIES) {
      const src = r.props[p.id];
      if (!src) continue;
      const lv = Array.isArray(src.levels) ? src.levels : [];
      s.props[p.id] = {
        owned: !!src.owned,
        levels: [num(lv[0], 1), num(lv[1], 1), num(lv[2], 1)],
        rushEnd: num(src.rushEnd, 0),
      };
    }
  }
  if (r.ads && typeof r.ads === "object") {
    s.ads = {
      total: num(r.ads.total, 0),
      day: typeof r.ads.day === "string" ? r.ads.day : "",
      today: num(r.ads.today, 0),
      byPlacement: { ...(r.ads.byPlacement ?? {}) },
    };
  }
  return s;
}

/** Nueva partida tras salir a bolsa: se conserva lo permanente. */
export function afterIpo(s: GameState, gained: number, now = Date.now()): GameState {
  const n = freshState(now);
  n.shares = s.shares + gained;
  n.ipos = s.ipos + 1;
  n.totalEarned = s.totalEarned;
  n.lifeSeen = s.lifeSeen;
  n.boostEnd = s.boostEnd;
  n.ads = s.ads;
  n.buyMode = s.buyMode;
  n.nextViral = now + CONFIG.viralMinSec * 1000;
  return n;
}
