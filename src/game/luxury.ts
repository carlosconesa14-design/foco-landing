import { spendCandy } from "./season";
import type { GameState } from "./state";

/**
 * «Mi vida»: la tienda de lujo del personaje (ver docs/GDD.md, «Mi vida»).
 * Con el dinero del juego (o diamantes, en los exclusivos) el jugador se compra ropa, joyas, coches,
 * casas, mascotas y caprichos. Lo comprado es para siempre (también al salir a bolsa y en todas las
 * ciudades), se ve en su personaje y da **prestigio**: +0,5 % de ingresos por punto y +5 % por cada
 * colección completa. Con un anuncio se puede probar algo 1 hora o comprar la oferta del día a mitad de precio.
 * Nada de esto da puntos de Liga ni tiene valor real.
 */

export type LuxuryCat = "outfit" | "jewel" | "car" | "home" | "pet" | "extreme";

export interface LuxuryItem {
  id: string;
  cat: LuxuryCat;
  name: string;
  icon: string;
  /** Precio en dinero del juego (0 = de serie). */
  price: number;
  /** Precio en diamantes (exclusivos). */
  gems?: number;
  /** Objeto de temporada: solo se compra durante ese evento, con su moneda (🍬). */
  season?: "halloween";
  candy?: number;
  prestige: number;
}

export const LUXURY_CATS: { id: LuxuryCat; name: string; icon: string }[] = [
  { id: "outfit", name: "Ropa", icon: "👕" },
  { id: "jewel", name: "Relojes y joyas", icon: "⌚" },
  { id: "car", name: "Garaje", icon: "🚗" },
  { id: "home", name: "Casas", icon: "🏠" },
  { id: "pet", name: "Mascotas", icon: "🐶" },
  { id: "extreme", name: "Lujo extremo", icon: "🛥️" },
];

/** Catálogo, de barato a carísimo dentro de cada colección. Los de precio 0 se tienen desde el principio. */
export const LUXURY: LuxuryItem[] = [
  { id: "tracksuit", cat: "outfit", name: "Chándal de rider", icon: "🧥", price: 0, prestige: 0 },
  { id: "hoodie", cat: "outfit", name: "Sudadera de marca", icon: "👕", price: 2e3, prestige: 1 },
  { id: "suit", cat: "outfit", name: "Traje a medida", icon: "👔", price: 5e6, prestige: 2 },
  { id: "designer", cat: "outfit", name: "Traje de diseñador", icon: "🕴️", price: 2e12, prestige: 4 },
  { id: "goldtux", cat: "outfit", name: "Esmoquin dorado", icon: "🤵", price: 5e20, prestige: 7 },
  { id: "neonsuit", cat: "outfit", name: "Traje de neón (exclusivo)", icon: "✨", price: 0, gems: 300, prestige: 5 },

  { id: "digital", cat: "jewel", name: "Reloj digital", icon: "⌚", price: 500, prestige: 1 },
  { id: "luxwatch", cat: "jewel", name: "Reloj de lujo", icon: "⏱️", price: 2e9, prestige: 3 },
  { id: "goldchain", cat: "jewel", name: "Cadena de oro", icon: "📿", price: 5e15, prestige: 5 },
  { id: "diamondring", cat: "jewel", name: "Anillo de diamantes", icon: "💍", price: 1e24, prestige: 8 },
  { id: "crown", cat: "jewel", name: "Corona de diamantes (exclusiva)", icon: "👑", price: 0, gems: 500, prestige: 6 },

  { id: "deliverybike", cat: "car", name: "Moto de reparto", icon: "🛵", price: 0, prestige: 0 },
  { id: "scooter", cat: "car", name: "Patinete eléctrico", icon: "🛴", price: 1.5e3, prestige: 1 },
  { id: "motorbike", cat: "car", name: "Moto deportiva", icon: "🏍️", price: 2e5, prestige: 1 },
  { id: "sportscar", cat: "car", name: "Deportivo", icon: "🚗", price: 3e10, prestige: 3 },
  { id: "supercar", cat: "car", name: "Superdeportivo", icon: "🏎️", price: 1e18, prestige: 6 },
  { id: "limo", cat: "car", name: "Limusina", icon: "🚘", price: 2e26, prestige: 9 },
  { id: "goldcar", cat: "car", name: "Deportivo de oro (exclusivo)", icon: "🏆", price: 0, gems: 400, prestige: 6 },

  { id: "parents", cat: "home", name: "Casa de tus padres", icon: "🛏️", price: 0, prestige: 0 },
  { id: "flat", cat: "home", name: "Piso de alquiler", icon: "🏠", price: 5e4, prestige: 1 },
  { id: "penthouse", cat: "home", name: "Ático en el centro", icon: "🌆", price: 5e11, prestige: 3 },
  { id: "villa", cat: "home", name: "Villa con piscina", icon: "🏡", price: 1e19, prestige: 6 },
  { id: "mansion", cat: "home", name: "Mansión", icon: "🏰", price: 1e27, prestige: 9 },
  { id: "island", cat: "home", name: "Isla privada", icon: "🏝️", price: 1e33, prestige: 12 },

  { id: "cat", cat: "pet", name: "Gato", icon: "🐱", price: 1e4, prestige: 1 },
  { id: "dog", cat: "pet", name: "Perro", icon: "🐶", price: 3e7, prestige: 2 },
  { id: "parrot", cat: "pet", name: "Loro", icon: "🦜", price: 2e14, prestige: 4 },
  { id: "tiger", cat: "pet", name: "Tigre blanco", icon: "🐯", price: 3e22, prestige: 8 },
  { id: "penguin", cat: "pet", name: "Pingüino (exclusivo)", icon: "🐧", price: 0, gems: 250, prestige: 4 },

  // Halloween (del 24 de octubre al 1 de noviembre), con caramelos
  { id: "vampire", cat: "outfit", name: "Disfraz de vampiro", icon: "🧛", price: 0, season: "halloween", candy: 150, prestige: 4 },
  { id: "skullring", cat: "jewel", name: "Anillo de calavera", icon: "💀", price: 0, season: "halloween", candy: 80, prestige: 2 },
  { id: "hearse", cat: "car", name: "Coche fúnebre", icon: "⚰️", price: 0, season: "halloween", candy: 250, prestige: 5 },
  { id: "haunted", cat: "home", name: "Mansión encantada", icon: "🏚️", price: 0, season: "halloween", candy: 400, prestige: 6 },
  { id: "pumpkin", cat: "pet", name: "Calabaza mascota", icon: "🎃", price: 0, season: "halloween", candy: 100, prestige: 3 },

  { id: "yacht", cat: "extreme", name: "Yate", icon: "🛥️", price: 1e21, prestige: 7 },
  { id: "jet", cat: "extreme", name: "Jet privado", icon: "🛩️", price: 1e28, prestige: 10 },
  { id: "rocket", cat: "extreme", name: "Cohete", icon: "🚀", price: 1e35, prestige: 15 },
];

export const LUX = {
  /** Ingresos extra por cada punto de prestigio. */
  perPrestige: 0.005,
  /** Ingresos extra por cada colección completa. */
  perCollection: 0.05,
  /** Prueba con anuncio. */
  trialMin: 60,
  trialsPerDay: 5,
  /** Descuento de la oferta del día (con anuncio). */
  dealOff: 0.5,
} as const;

export interface LuxuryState {
  owned: string[];
  /** Lo que lleva puesto o usa en cada colección (id del objeto). */
  equipped: Partial<Record<LuxuryCat, string>>;
  /** Objeto en prueba (con anuncio) y hasta cuándo. */
  trial: { id: string; until: number } | null;
  /** Pruebas usadas hoy. */
  trialDay: string;
  trialsToday: number;
  /** Oferta del día ya desbloqueada con el anuncio. */
  dealDay: string;
}

const DEFAULTS = LUXURY.filter((i) => i.price === 0 && !i.gems && !i.candy);

export function freshLuxury(): LuxuryState {
  return {
    owned: DEFAULTS.map((i) => i.id),
    equipped: Object.fromEntries(DEFAULTS.map((i) => [i.cat, i.id])),
    trial: null,
    trialDay: "",
    trialsToday: 0,
    dealDay: "",
  };
}

export function migrateLuxury(raw: unknown): LuxuryState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const l = freshLuxury();
  if (Array.isArray(r.owned)) for (const id of r.owned) if (typeof id === "string" && itemById(id) && !l.owned.includes(id)) l.owned.push(id);
  const eq = r.equipped && typeof r.equipped === "object" ? (r.equipped as Record<string, unknown>) : {};
  for (const c of LUXURY_CATS) {
    const id = eq[c.id];
    if (typeof id === "string" && l.owned.includes(id) && itemById(id)?.cat === c.id) l.equipped[c.id] = id;
  }
  const tr = r.trial && typeof r.trial === "object" ? (r.trial as Record<string, unknown>) : null;
  if (tr && typeof tr.id === "string" && itemById(tr.id) && typeof tr.until === "number") l.trial = { id: tr.id, until: tr.until };
  if (typeof r.trialDay === "string") l.trialDay = r.trialDay;
  if (typeof r.trialsToday === "number") l.trialsToday = Math.max(0, Math.floor(r.trialsToday));
  if (typeof r.dealDay === "string") l.dealDay = r.dealDay;
  return l;
}

export const itemById = (id: string) => LUXURY.find((i) => i.id === id);
const day = (now: number) => new Date(now).toISOString().slice(0, 10);

export const owns = (s: GameState, id: string) => s.meta.luxury.owned.includes(id);

/** Objeto en prueba ahora mismo (o null). */
export function activeTrial(s: GameState, now: number): string | null {
  const tr = s.meta.luxury.trial;
  return tr && tr.until > now && !owns(s, tr.id) ? tr.id : null;
}

/** Lo que se ve en el personaje: lo equipado y, encima, lo que está probando. */
export function shownItems(s: GameState, now: number): Partial<Record<LuxuryCat, string>> {
  const eq = { ...s.meta.luxury.equipped };
  const tr = activeTrial(s, now);
  if (tr) eq[itemById(tr)!.cat] = tr;
  return eq;
}

/** Prestigio total (lo comprado y lo que está probando). */
export function prestige(s: GameState, now: number): number {
  const ids = new Set(s.meta.luxury.owned);
  const tr = activeTrial(s, now);
  if (tr) ids.add(tr);
  let p = 0;
  for (const id of ids) p += itemById(id)?.prestige ?? 0;
  return p;
}

/** Objetos que cuentan para completar una colección: los de dinero y diamantes (no los de temporada). */
export const collectionItems = (cat: LuxuryCat) => LUXURY.filter((i) => i.cat === cat && (i.price > 0 || i.gems));

/** Colecciones completas: todos sus objetos de pago (dinero o diamantes) comprados. */
export function completedCollections(s: GameState): LuxuryCat[] {
  return LUXURY_CATS.filter((c) => collectionItems(c.id).every((i) => owns(s, i.id))).map((c) => c.id);
}

/** Multiplicador de ingresos de «Mi vida» (prestigio y colecciones). */
export function luxuryMult(s: GameState, now: number): number {
  return 1 + LUX.perPrestige * prestige(s, now) + LUX.perCollection * completedCollections(s).length;
}

/** Oferta del día: entre los objetos de dinero que aún no tienes, el más barato rota cada día con los 3 siguientes. */
export function dailyDeal(s: GameState, now: number): LuxuryItem | null {
  const pool = LUXURY.filter((i) => i.price > 0 && !owns(s, i.id)).sort((a, b) => a.price - b.price).slice(0, 4);
  if (!pool.length) return null;
  const d = day(now);
  let h = 0;
  for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

export const dealUnlocked = (s: GameState, now: number) => s.meta.luxury.dealDay === day(now);

/** Precio de un objeto hoy (con la oferta del día aplicada si está desbloqueada). */
export function priceOf(s: GameState, item: LuxuryItem, now: number): number {
  const deal = dailyDeal(s, now);
  return deal?.id === item.id && dealUnlocked(s, now) ? item.price * (1 - LUX.dealOff) : item.price;
}

export type BuyResult = "ok" | "owned" | "cash" | "gems" | "candy" | "unknown";

/** Compra un objeto (y se lo pone). */
export function buyLuxury(s: GameState, id: string, now: number): BuyResult {
  const item = itemById(id);
  if (!item) return "unknown";
  if (owns(s, id)) return "owned";
  if (item.candy) {
    if (!spendCandy(s, item.candy, now)) return "candy";
  } else if (item.gems) {
    if (s.meta.gems < item.gems) return "gems";
    s.meta.gems -= item.gems;
  } else {
    const price = priceOf(s, item, now);
    if (s.cash < price) return "cash";
    s.cash -= price;
  }
  s.meta.luxury.owned.push(id);
  s.meta.luxury.equipped[item.cat] = id;
  if (s.meta.luxury.trial?.id === id) s.meta.luxury.trial = null;
  return "ok";
}

/** Se pone un objeto que ya tiene. */
export function equipLuxury(s: GameState, id: string): boolean {
  const item = itemById(id);
  if (!item || !owns(s, id)) return false;
  s.meta.luxury.equipped[item.cat] = id;
  return true;
}

/** Quedan pruebas hoy. */
export function trialsLeft(s: GameState, now: number): number {
  const l = s.meta.luxury;
  return l.trialDay === day(now) ? Math.max(0, LUX.trialsPerDay - l.trialsToday) : LUX.trialsPerDay;
}

/** Prueba un objeto 1 hora (tras ver un anuncio). Solo objetos de dinero que no tienes. */
export function startTrial(s: GameState, id: string, now: number): boolean {
  const item = itemById(id);
  if (!item || item.gems || item.candy || owns(s, id) || trialsLeft(s, now) <= 0) return false;
  const l = s.meta.luxury;
  if (l.trialDay !== day(now)) {
    l.trialDay = day(now);
    l.trialsToday = 0;
  }
  l.trialsToday += 1;
  l.trial = { id, until: now + LUX.trialMin * 60e3 };
  return true;
}

/** Desbloquea la oferta del día (tras ver un anuncio). */
export function unlockDeal(s: GameState, now: number): boolean {
  if (!dailyDeal(s, now) || dealUnlocked(s, now)) return false;
  s.meta.luxury.dealDay = day(now);
  return true;
}

/** El siguiente objeto que puede comprar con lo que tiene en caja (para avisarle con un punto rojo). */
export function affordable(s: GameState, now: number): LuxuryItem | null {
  return LUXURY.find((i) => i.price > 0 && !owns(s, i.id) && s.cash >= priceOf(s, i, now)) ?? null;
}
