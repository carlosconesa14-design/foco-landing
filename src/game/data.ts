/** Contenido y equilibrio del juego. Sin lógica. */

export const CONFIG = {
  boostHours: 4,
  boostMaxHours: 12,
  offlineCapHours: 8,
  /** Bonus por cada acción conseguida al salir a bolsa. */
  shareBonus: 0.02,
  /** acciones = floor(sqrt(ganado en la partida / shareDivisor)) */
  shareDivisor: 1e8,
  rushMinutes: 30,
  rushMult: 3,
  viralMinSec: 120,
  viralMaxSec: 240,
  viralVisibleSec: 25,
} as const;

/** Cadena de producción: parámetros comunes a todos los negocios (se escalan con `mult`). */
export const CHAIN = {
  maxFloors: 8,
  /** Duración del ciclo de un trabajador de planta (ir, producir, volver). */
  floorCycle: 5,
  /** Cada planta produce `floorGrowth` veces más que la anterior. */
  floorGrowth: 6,
  floorBaseRate: 1,
  /** Desbloquear la planta i cuesta unlockBase * unlockGrowth^i. La 0 viene gratis. */
  unlockBase: 10,
  unlockGrowth: 8,
  floorUpgradeK: 1.12,
  transportBaseCap: 15,
  transportBaseSpeed: 1.5,
  transportMaxSpeed: 8,
  transportLoadTime: 0.4,
  transportUnloadTime: 0.4,
  saleBaseCap: 20,
  saleBaseWalk: 2,
  saleMinWalk: 0.6,
  logisticsCostBase: 10,
  logisticsCostK: 1.17,
  managerFloorBase: 40,
  managerTransport: 60,
  managerSale: 80,
} as const;

/** Cada hito de nivel duplica el rendimiento de esa parte de la cadena. */
export const MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

export interface BusinessDef {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  /** Precio del edificio. El primero es gratis. */
  price: number;
  /** Multiplicador de toda la economía de este negocio. */
  mult: number;
  /** Colores del edificio y del interior. */
  wall: number;
  roof: number;
  floorName: string;
  worker: string;
  item: string;
  transportName: string;
  transportIcon: string;
  saleName: string;
  saleWorker: string;
  customer: string;
}

export const BUSINESSES: BusinessDef[] = [
  {
    id: "dropship", name: "Almacén de dropshipping", icon: "📦", blurb: "Tu primer negocio. Pedidos online que salen solos.",
    price: 0, mult: 1, wall: 0xe8b04b, roof: 0x9c5b2e,
    floorName: "Estantería", worker: "🧑‍🔧", item: "📦", transportName: "Carretilla", transportIcon: "🛻",
    saleName: "Furgonetas", saleWorker: "🚚", customer: "🏠",
  },
  {
    id: "restaurant", name: "Restaurante", icon: "🍝", blurb: "Cocinas, camareros y repartidores. Si uno falla, se atasca todo.",
    price: 5e4, mult: 400, wall: 0xd9534f, roof: 0x7a2323,
    floorName: "Cocina", worker: "🧑‍🍳", item: "🍝", transportName: "Camareros", transportIcon: "🤵",
    saleName: "Repartidores", saleWorker: "🛵", customer: "🏠",
  },
  {
    id: "tiktok", name: "Estudio de TikTok", icon: "📱", blurb: "Creadores grabando sin parar y marcas pagando por salir.",
    price: 2e7, mult: 1.5e5, wall: 0x6f5bd6, roof: 0x2e2270,
    floorName: "Set de grabación", worker: "🤳", item: "🎬", transportName: "Editores", transportIcon: "✂️",
    saleName: "Marcas", saleWorker: "🤝", customer: "🏢",
  },
  {
    id: "ai", name: "Agencia de IA", icon: "🤖", blurb: "GPUs a tope y clientes que pagan por automatizarlo todo.",
    price: 1e10, mult: 6e7, wall: 0x2bb5a0, roof: 0x145c52,
    floorName: "Rack de GPUs", worker: "🦾", item: "🧠", transportName: "Técnicos", transportIcon: "🧑‍🔧",
    saleName: "Comerciales", saleWorker: "💼", customer: "🏦",
  },
];

/** Estilo de vida según lo ganado en total. No se pierde al salir a bolsa. */
export const LIFE: { min: number; icon: string; name: string }[] = [
  { min: 0, icon: "🛏️", name: "Vives con tus padres" },
  { min: 1e3, icon: "🏚️", name: "Piso compartido" },
  { min: 1e5, icon: "🏠", name: "Estudio de alquiler" },
  { min: 1e7, icon: "🏢", name: "Piso propio" },
  { min: 1e9, icon: "🌆", name: "Ático en el centro" },
  { min: 1e11, icon: "🏝️", name: "Villa con piscina" },
  { min: 1e13, icon: "🏰", name: "Mansión en Marbella" },
  { min: 1e15, icon: "🛥️", name: "Isla privada" },
];

export const VIRAL_TITLES = [
  "Tu TikTok se ha hecho viral",
  "Has encontrado un producto ganador",
  "Un cliente te paga el triple",
  "Una marca quiere patrocinarte",
  "Tu post de LinkedIn ha petado",
];

/* ---------- Fase 2: diamantes, ejecutivos, misiones, diario, logros y tutorial ---------- */

export const META = {
  freeChestHours: 4,
  abilityCooldownMin: 120,
  cashPackGems: 20,
  cashPackHours: 1,
  missionBonusGems: 30,
  tutorialGems: 25,
} as const;

export interface Rarity {
  name: string;
  color: string;
  /** Bonus permanente del ejecutivo (0.5 = +50 %). */
  bonus: number;
  /** Multiplicador de ventas de su habilidad y cuánto dura. */
  ability: number;
  abilityMin: number;
}

export const RARITIES: Rarity[] = [
  { name: "Común", color: "#9fb3cf", bonus: 0.25, ability: 2, abilityMin: 5 },
  { name: "Raro", color: "#4aa8ff", bonus: 0.5, ability: 3, abilityMin: 5 },
  { name: "Épico", color: "#b57bff", bonus: 1, ability: 4, abilityMin: 8 },
  { name: "Legendario", color: "#f5c542", bonus: 2, ability: 5, abilityMin: 10 },
];

export type ExecKind = "prod" | "log" | "sale";

export const EXEC_KINDS: Record<ExecKind, { label: string; desc: string }> = {
  prod: { label: "Producción", desc: "más producción en los puestos" },
  log: { label: "Logística", desc: "más capacidad de transporte y venta" },
  sale: { label: "Ventas", desc: "más dinero por cada venta" },
};

export const EXEC_NAMES = [
  "Laura", "Marcos", "Sofía", "Diego", "Valeria", "Hugo", "Lucía", "Iker", "Martina", "Álex",
  "Nerea", "Bruno", "Carla", "Leo", "Irene", "Dani", "Paula", "Mateo", "Noa", "Rubén",
];
export const EXEC_FACES = ["👩‍💼", "🧑‍💼", "👨‍💼", "👩🏻‍💼", "👨🏽‍💼", "👩🏾‍💼", "🧑🏼‍💼", "👨🏿‍💼"];

export type ChestType = "free" | "normal" | "premium";

export const CHESTS: Record<ChestType, { name: string; icon: string; cost: number; weights: number[]; gems: [number, number] }> = {
  free: { name: "Maletín gratis", icon: "💼", cost: 0, weights: [75, 22, 3, 0], gems: [2, 6] },
  normal: { name: "Maletín", icon: "💼", cost: 50, weights: [60, 30, 9, 1], gems: [5, 15] },
  premium: { name: "Maletín de oro", icon: "👜", cost: 150, weights: [0, 55, 35, 10], gems: [20, 40] },
};

export type MissionId = "upgrades" | "sales" | "earned" | "hires" | "ads" | "abilities" | "chests" | "floors";

export const MISSIONS: Record<MissionId, { text: string; target: number; gems: number }> = {
  upgrades: { text: "Mejora {n} veces cualquier parte de un negocio", target: 25, gems: 15 },
  sales: { text: "Haz {n} ventas", target: 40, gems: 15 },
  earned: { text: "Gana {n} €", target: 0, gems: 20 },
  hires: { text: "Contrata {n} gerente", target: 1, gems: 15 },
  ads: { text: "Mira {n} anuncios", target: 2, gems: 15 },
  abilities: { text: "Activa {n} habilidad de un ejecutivo", target: 1, gems: 15 },
  chests: { text: "Abre {n} maletín", target: 1, gems: 10 },
  floors: { text: "Abre {n} puesto nuevo", target: 1, gems: 20 },
};

export type DailyReward = { gems: number } | { cashHours: number } | { chest: ChestType };

/** Racha de 7 días; al terminar vuelve a empezar. */
export const DAILY_REWARDS: DailyReward[] = [
  { gems: 10 },
  { cashHours: 0.25 },
  { gems: 20 },
  { chest: "normal" },
  { gems: 30 },
  { cashHours: 1 },
  { chest: "premium" },
];

export type StatKey = "tapFloor" | "tapTransport" | "sales" | "upgrades" | "hires" | "floors" | "ads" | "abilities" | "chests" | "earned";

export interface AchievementDef {
  id: string;
  text: string;
  target: number;
  gems: number;
  /** De dónde sale el progreso. */
  metric: "totalEarned" | "businesses" | "maxFloors" | "ipos" | "execs" | StatKey;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "earn_1k", text: "Gana 1 K € en total", metric: "totalEarned", target: 1e3, gems: 5 },
  { id: "earn_1m", text: "Gana 1 M € en total", metric: "totalEarned", target: 1e6, gems: 10 },
  { id: "earn_1b", text: "Gana 1 B € en total", metric: "totalEarned", target: 1e9, gems: 20 },
  { id: "earn_1t", text: "Gana 1 T € en total", metric: "totalEarned", target: 1e12, gems: 40 },
  { id: "biz_2", text: "Ten 2 negocios", metric: "businesses", target: 2, gems: 15 },
  { id: "biz_3", text: "Ten 3 negocios", metric: "businesses", target: 3, gems: 25 },
  { id: "biz_4", text: "Ten 4 negocios", metric: "businesses", target: 4, gems: 40 },
  { id: "floors_4", text: "Abre 4 puestos en un negocio", metric: "maxFloors", target: 4, gems: 15 },
  { id: "floors_8", text: "Llena un negocio con 8 puestos", metric: "maxFloors", target: 8, gems: 40 },
  { id: "hires_5", text: "Contrata 5 gerentes", metric: "hires", target: 5, gems: 10 },
  { id: "sales_500", text: "Haz 500 ventas", metric: "sales", target: 500, gems: 15 },
  { id: "execs_5", text: "Consigue 5 ejecutivos", metric: "execs", target: 5, gems: 15 },
  { id: "ipo_1", text: "Sal a bolsa por primera vez", metric: "ipos", target: 1, gems: 30 },
];

/** Tutorial de los primeros minutos (siempre empieza en el almacén). */
export const TUTORIAL: { text: string; stat: StatKey; n: number }[] = [
  { text: "Toca al mozo de la Estantería 1 para preparar un pedido", stat: "tapFloor", n: 1 },
  { text: "Toca la carretilla para recoger las cajas", stat: "tapTransport", n: 1 },
  { text: "Toca la furgoneta para vender los pedidos", stat: "sales", n: 1 },
  { text: "Pulsa el botón «Nv» de la estantería y mejórala", stat: "upgrades", n: 1 },
  { text: "Contrata un gerente para que una parte trabaje sola", stat: "hires", n: 1 },
  { text: "Abre la Estantería 2 en la parcela en obras", stat: "floors", n: 1 },
];
