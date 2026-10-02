import { now as clockNow } from "./clock";
import { freshEvent, migrateEvent, type EventState } from "./event";
import { freshRetos, migrateRetos, type RetosState } from "./challenges";
import { freshAdLadder, migrateAdLadder, type AdLadderState } from "./adLadder";
import { freshOffers, migrateOffers, type OffersState } from "./offers";
import type { ClockState } from "./clock";
import { freshShop, migrateShop, type ShopState } from "./shop";
import { freshLeague, migrateLeague, type LeagueState } from "./league";
import { freshFounder, migrateFounder, type FounderState } from "./founders";
import { freshLuxury, migrateLuxury, type LuxuryState } from "./luxury";
import { freshSeason, migrateSeason, type SeasonState } from "./season";
import { freshAccount, migrateAccount, type AccountState } from "./account";
import { migrateTwists, type TwistState } from "./twists";
import { ALL_BUSINESSES, CITIES, CONFIG, type CityDef, type ExecKind, type MissionId, type OfficeId, type StatKey } from "./data";

export type BuyMode = 1 | 10 | 50 | "max";

export interface FloorState {
  level: number;
  managed: boolean;
  /** Dinero en producto esperando en el depósito de la planta. */
  stock: number;
  /** Segundos del ciclo en curso. */
  prog: number;
  running: boolean;
}

export type TransportPhase = "idle" | "down" | "load" | "up" | "unload";

export interface TransportState {
  level: number;
  managed: boolean;
  phase: TransportPhase;
  /** Posición vertical: 0 = superficie, i + 1 = planta i. */
  pos: number;
  /** Planta que está visitando o hacia la que va. */
  target: number;
  carry: number;
  timer: number;
}

export type SalePhase = "idle" | "out" | "back";

export interface SaleState {
  level: number;
  managed: boolean;
  phase: SalePhase;
  /** 0..1 dentro del tramo actual. */
  prog: number;
  carry: number;
}

export interface BusinessState {
  owned: boolean;
  floors: FloorState[];
  transport: TransportState;
  sale: SaleState;
  /** Producto ya en superficie esperando a venderse. */
  topStock: number;
  rushEnd: number;
  /** Ganado por este negocio en la partida actual. */
  earned: number;
}

export type View = { scene: "city" } | { scene: "business"; id: string };

export interface AdStats {
  total: number;
  day: string;
  today: number;
  byPlacement: Record<string, number>;
}

export interface Exec {
  id: string;
  name: string;
  face: string;
  /** Índice en RARITIES. */
  rarity: number;
  kind: ExecKind;
  /** Negocio al que está asignado (uno por negocio). */
  assigned: string | null;
  abilityEnd: number;
  readyAt: number;
  /** Ejecutivo fundador de Dubái: su puesto de llegada (ver founders.ts). */
  founder?: number;
}

export interface Mission {
  id: MissionId;
  target: number;
  claimed: boolean;
}

export interface MetaState {
  gems: number;
  execs: Exec[];
  freeChestAt: number;
  /** Contadores de toda la vida y del día en curso. */
  stats: { life: Partial<Record<StatKey, number>>; day: Partial<Record<StatKey, number>>; dayKey: string };
  missions: { day: string; list: Mission[]; bonusClaimed: boolean };
  daily: { lastDay: string; streak: number };
  achievements: string[];
  /** Paso actual del tutorial; igual a TUTORIAL.length cuando se ha completado. */
  tutorial: number;
  /** Liga Millonario: credenciales y eventos pendientes de enviar. */
  league: LeagueState;
  /** Compras dentro de la app. */
  shop: ShopState;
  /** Evento del fin de semana. */
  event: EventState;
  /** Retos del día y de la semana. */
  retos: RetosState;
  /** Escalera diaria de anuncios. */
  adLadder: AdLadderState;
  /** Camión de suministros, cliente VIP y ruleta diaria. */
  offers: OffersState;
  /** Señales de trampa detectadas (hora del móvil cambiada, partida editada). Solo se informan a la Liga. */
  flags: string[];
  /** Carrera de fundadores de Dubái. */
  founder: FounderState;
  /** «Mi vida»: lo que se ha comprado el personaje. */
  luxury: LuxuryState;
  /** Evento de temporada (Halloween…). */
  season: SeasonState;
  /** Cuenta anónima: invitaciones y partida en la nube. */
  account: AccountState;
  /** Mecánicas propias de cada negocio (pedidos, crítico, hype, investigación). */
  twists: TwistState;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  /** Avisos en el móvil (caja llena, maletín gratis, premio diario). */
  notify: boolean;
}

/** Lo que se guarda de una ciudad mientras estás en otra. */
export interface CitySave {
  cash: number;
  runEarned: number;
  totalEarned: number;
  shares: number;
  ipos: number;
  biz: Record<string, BusinessState>;
  lifeSeen: number;
  savedAt: number;
}

/** Progreso global entre ciudades: estrellas, mejoras de la Oficina central y franquicias. */
export interface WorldState {
  stars: number;
  upgrades: Partial<Record<OfficeId, number>>;
  /** Ciudades completadas (dan el bonus de franquicia). */
  completed: string[];
  /** Ciudades en las que no estás ahora mismo. */
  archive: Record<string, CitySave>;
  /** Ganado desde siempre en todas las ciudades (para los logros). */
  lifetimeEarned: number;
}

export interface GameState {
  version: 2;
  meta: MetaState;
  settings: Settings;
  /** Ciudad en la que estás; lo que sigue (cash, biz, shares…) es de esa ciudad. */
  city: string;
  world: WorldState;
  /** Fin de la ola turística pedida con un anuncio (Miami). */
  waveEnd: number;
  /** Fin del contrato de oro pedido con un anuncio (Dubái). */
  goldEnd: number;
  cash: number;
  /** Ganado desde la última salida a bolsa: decide cuántas acciones recibes. */
  runEarned: number;
  /** Ganado desde siempre: decide el estilo de vida. */
  totalEarned: number;
  shares: number;
  ipos: number;
  biz: Record<string, BusinessState>;
  boostEnd: number;
  buyMode: BuyMode;
  view: View;
  lastSeen: number;
  nextViral: number;
  lifeSeen: number;
  ads: AdStats;
  /** Reloj del juego (ver clock.ts); se guarda aparte del resto. */
  clock?: ClockState;
}

export const freshFloor = (): FloorState => ({ level: 1, managed: false, stock: 0, prog: 0, running: false });

export function freshBusiness(owned: boolean): BusinessState {
  return {
    owned,
    floors: [freshFloor()],
    transport: { level: 1, managed: false, phase: "idle", pos: 0, target: 0, carry: 0, timer: 0 },
    sale: { level: 1, managed: false, phase: "idle", prog: 0, carry: 0 },
    topStock: 0,
    rushEnd: 0,
    earned: 0,
  };
}

export function freshMeta(now = clockNow()): MetaState {
  return {
    gems: 0,
    execs: [],
    freeChestAt: now,
    stats: { life: {}, day: {}, dayKey: "" },
    missions: { day: "", list: [], bonusClaimed: false },
    daily: { lastDay: "", streak: 0 },
    achievements: [],
    tutorial: 0,
    league: freshLeague(),
    shop: freshShop(),
    event: freshEvent(),
    retos: freshRetos(),
    adLadder: freshAdLadder(),
    offers: freshOffers(now),
    flags: [],
    founder: freshFounder(),
    luxury: freshLuxury(),
    season: freshSeason(),
    account: freshAccount(),
    twists: {},
  };
}

/** Suma a un contador de estadísticas (de por vida y del día). */
export function bump(s: GameState, key: StatKey, n = 1): void {
  const st = s.meta.stats;
  st.life[key] = (st.life[key] ?? 0) + n;
  st.day[key] = (st.day[key] ?? 0) + n;
}

export const cityDef = (id: string): CityDef => CITIES.find((c) => c.id === id) ?? CITIES[0];

export const freshWorld = (): WorldState => ({ stars: 0, upgrades: {}, completed: [], archive: {}, lifetimeEarned: 0 });

export function freshState(now = clockNow(), cityId = CITIES[0].id): GameState {
  const city = cityDef(cityId);
  return {
    version: 2,
    meta: freshMeta(now),
    settings: { music: true, sfx: true, haptics: true, notify: true },
    city: city.id,
    world: freshWorld(),
    waveEnd: 0,
    goldEnd: 0,
    cash: 0,
    runEarned: 0,
    totalEarned: 0,
    shares: 0,
    ipos: 0,
    biz: Object.fromEntries(city.businesses.map((b) => [b.id, freshBusiness(b.price === 0)])),
    boostEnd: 0,
    buyMode: 1,
    view: { scene: "business", id: city.businesses[0].id },
    lastSeen: now,
    nextViral: now + 90_000,
    lifeSeen: 0,
    ads: { total: 0, day: "", today: 0, byPlacement: {} },
  };
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function migrateBusiness(raw: unknown, def: { price: number }): BusinessState {
  const r = obj(raw);
  const b = freshBusiness(def.price === 0 || !!r.owned);
  if (Array.isArray(r.floors) && r.floors.length) {
    b.floors = r.floors.slice(0, 8).map((f) => {
      const o = obj(f);
      return { level: Math.max(1, num(o.level, 1)), managed: !!o.managed, stock: num(o.stock, 0), prog: 0, running: false };
    });
  }
  const t = obj(r.transport);
  b.transport.level = Math.max(1, num(t.level, 1));
  b.transport.managed = !!t.managed;
  // El transporte vuelve arriba al cargar: lo que llevaba se pasa a la superficie.
  const s = obj(r.sale);
  b.sale.level = Math.max(1, num(s.level, 1));
  b.sale.managed = !!s.managed;
  b.topStock = num(r.topStock, 0) + num(t.carry, 0) + num(s.carry, 0);
  b.rushEnd = num(r.rushEnd, 0);
  b.earned = num(r.earned, 0);
  return b;
}

const numMap = (v: unknown): Partial<Record<StatKey, number>> =>
  Object.fromEntries(Object.entries(obj(v)).filter(([, x]) => typeof x === "number" && Number.isFinite(x))) as Partial<Record<StatKey, number>>;

function migrateMeta(raw: unknown, now: number): MetaState {
  const m = freshMeta(now);
  const r = obj(raw);
  m.gems = Math.max(0, num(r.gems, 0));
  m.freeChestAt = num(r.freeChestAt, now);
  if (Array.isArray(r.execs)) {
    m.execs = r.execs
      .map(obj)
      .filter((e) => typeof e.id === "string" && typeof e.name === "string")
      .map((e) => ({
        id: e.id as string,
        name: e.name as string,
        face: typeof e.face === "string" ? e.face : "🧑‍💼",
        rarity: Math.min(3, Math.max(0, Math.floor(num(e.rarity, 0)))),
        kind: e.kind === "prod" || e.kind === "log" || e.kind === "sale" ? e.kind : "sale",
        assigned: typeof e.assigned === "string" && ALL_BUSINESSES.some((b) => b.id === e.assigned) ? (e.assigned as string) : null,
        abilityEnd: num(e.abilityEnd, 0),
        readyAt: num(e.readyAt, 0),
        ...(typeof e.founder === "number" && e.founder > 0 ? { founder: Math.floor(e.founder) } : {}),
      }));
  }
  const st = obj(r.stats);
  m.stats = { life: numMap(st.life), day: numMap(st.day), dayKey: typeof st.dayKey === "string" ? st.dayKey : "" };
  const ms = obj(r.missions);
  if (typeof ms.day === "string" && Array.isArray(ms.list)) {
    m.missions = {
      day: ms.day,
      list: ms.list.map(obj).map((x) => ({ id: x.id as MissionId, target: num(x.target, 1), claimed: !!x.claimed })),
      bonusClaimed: !!ms.bonusClaimed,
    };
  }
  const d = obj(r.daily);
  m.daily = { lastDay: typeof d.lastDay === "string" ? d.lastDay : "", streak: Math.max(0, num(d.streak, 0)) };
  m.achievements = Array.isArray(r.achievements) ? r.achievements.filter((x): x is string => typeof x === "string") : [];
  m.tutorial = Math.max(0, num(r.tutorial, 0));
  m.league = migrateLeague(r.league);
  m.shop = migrateShop(r.shop);
  m.event = migrateEvent(r.event);
  m.retos = migrateRetos(r.retos);
  m.adLadder = migrateAdLadder(r.adLadder);
  m.offers = migrateOffers(r.offers, now);
  m.founder = migrateFounder(r.founder);
  m.luxury = migrateLuxury(r.luxury);
  m.season = migrateSeason(r.season);
  m.account = migrateAccount(r.account);
  m.twists = migrateTwists(r.twists);
  m.flags = Array.isArray(r.flags) ? r.flags.filter((f): f is string => typeof f === "string").slice(0, 10) : [];
  return m;
}

/** Convierte una partida guardada en un estado válido. Las partidas de la versión 1 empiezan de cero. */
export function migrate(raw: unknown, now = clockNow()): GameState {
  const r = obj(raw);
  if (r.version !== 2) return freshState(now);
  // Las partidas anteriores a las ciudades pasan a ser Madrid.
  const s = freshState(now, typeof r.city === "string" ? cityDef(r.city).id : CITIES[0].id);
  s.world = migrateWorld(r.world, num(r.totalEarned, 0));
  s.waveEnd = num(r.waveEnd, 0);
  s.goldEnd = num(r.goldEnd, 0);
  s.cash = num(r.cash, 0);
  s.runEarned = num(r.runEarned, 0);
  s.totalEarned = num(r.totalEarned, 0);
  s.shares = num(r.shares, 0);
  s.ipos = num(r.ipos, 0);
  s.boostEnd = num(r.boostEnd, 0);
  s.lastSeen = num(r.lastSeen, now);
  s.nextViral = num(r.nextViral, s.nextViral);
  s.lifeSeen = num(r.lifeSeen, 0);
  if (r.buyMode === 1 || r.buyMode === 10 || r.buyMode === 50 || r.buyMode === "max") s.buyMode = r.buyMode;
  const biz = obj(r.biz);
  for (const def of cityDef(s.city).businesses) if (biz[def.id]) s.biz[def.id] = migrateBusiness(biz[def.id], def);
  const v = obj(r.view);
  if (v.scene === "business" && typeof v.id === "string" && s.biz[v.id]?.owned) s.view = { scene: "business", id: v.id };
  else if (v.scene === "city") s.view = { scene: "city" };
  s.meta = migrateMeta(r.meta, now);
  const set = obj(r.settings);
  s.settings = { music: set.music !== false, sfx: set.sfx !== false, haptics: set.haptics !== false, notify: set.notify !== false };
  const ads = obj(r.ads);
  s.ads = {
    total: num(ads.total, 0),
    day: typeof ads.day === "string" ? ads.day : "",
    today: num(ads.today, 0),
    byPlacement: { ...(obj(ads.byPlacement) as Record<string, number>) },
  };
  return s;
}

function migrateWorld(raw: unknown, totalEarned: number): WorldState {
  const w = freshWorld();
  const r = obj(raw);
  w.stars = Math.max(0, num(r.stars, 0));
  w.lifetimeEarned = Math.max(num(r.lifetimeEarned, 0), totalEarned);
  for (const [k, v] of Object.entries(obj(r.upgrades))) if (typeof v === "number" && v > 0) w.upgrades[k as OfficeId] = Math.floor(v);
  w.completed = Array.isArray(r.completed) ? r.completed.filter((c): c is string => typeof c === "string" && CITIES.some((x) => x.id === c)) : [];
  for (const [id, raw2] of Object.entries(obj(r.archive))) {
    const city = CITIES.find((c) => c.id === id);
    if (!city) continue;
    const a = obj(raw2);
    const biz: Record<string, BusinessState> = {};
    for (const def of city.businesses) biz[def.id] = migrateBusiness(obj(a.biz)[def.id] ?? {}, def);
    w.archive[id] = {
      cash: num(a.cash, 0),
      runEarned: num(a.runEarned, 0),
      totalEarned: num(a.totalEarned, 0),
      shares: num(a.shares, 0),
      ipos: num(a.ipos, 0),
      biz,
      lifeSeen: num(a.lifeSeen, 0),
      savedAt: num(a.savedAt, clockNow()),
    };
  }
  return w;
}

/** Copia a una partida nueva todo lo que no depende de la ciudad. */
function keepGlobal(from: GameState, to: GameState): GameState {
  to.meta = from.meta;
  to.settings = from.settings;
  to.world = from.world;
  to.boostEnd = from.boostEnd;
  to.ads = from.ads;
  to.buyMode = from.buyMode;
  to.waveEnd = from.waveEnd;
  to.goldEnd = from.goldEnd;
  return to;
}

/** Empieza (o reanuda) otra ciudad. La actual queda guardada en el archivo. */
export function switchCity(s: GameState, cityId: string, now = clockNow()): GameState {
  s.world.archive[s.city] = {
    cash: s.cash,
    runEarned: s.runEarned,
    totalEarned: s.totalEarned,
    shares: s.shares,
    ipos: s.ipos,
    biz: s.biz,
    lifeSeen: s.lifeSeen,
    savedAt: now,
  };
  const n = keepGlobal(s, freshState(now, cityId));
  const saved = n.world.archive[cityId];
  if (saved) {
    Object.assign(n, { cash: saved.cash, runEarned: saved.runEarned, totalEarned: saved.totalEarned, shares: saved.shares, ipos: saved.ipos, biz: saved.biz, lifeSeen: saved.lifeSeen });
    delete n.world.archive[cityId];
  }
  n.nextViral = now + CONFIG.viralMinSec * 1000;
  return n;
}

/** Nueva partida tras salir a bolsa: se conserva lo permanente. */
export function afterIpo(s: GameState, gained: number, now = clockNow()): GameState {
  const n = keepGlobal(s, freshState(now, s.city));
  n.shares = s.shares + gained;
  n.ipos = s.ipos + 1;
  n.totalEarned = s.totalEarned;
  n.lifeSeen = s.lifeSeen;
  n.nextViral = now + CONFIG.viralMinSec * 1000;
  return n;
}
