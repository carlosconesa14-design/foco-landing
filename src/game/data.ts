/** Contenido y equilibrio del juego. Sin lógica. */

export const CONFIG = {
  boostHours: 4,
  boostMaxHours: 12,
  offlineCapHours: 8,
  /** Bonus por cada acción conseguida al salir a bolsa. */
  shareBonus: 0.05,
  /** acciones = floor(cbrt(ganado en la partida / shareDivisor)) */
  shareDivisor: 3e20,
  rushMinutes: 30,
  rushMult: 3,
  viralMinSec: 120,
  viralMaxSec: 240,
  viralVisibleSec: 25,
  /** Probabilidad de que una venta sea viral y cuánto multiplica (solo jugando, no offline). */
  luckyChance: 0.04,
  luckyMult: 5,
} as const;

/** Cadena de producción: parámetros comunes a todos los negocios (se escalan con `mult`). */
export const CHAIN = {
  maxFloors: 8,
  /** Duración del ciclo de un trabajador de planta (ir, producir, volver). */
  floorCycle: 5,
  /** Cada planta produce `floorGrowth` veces más que la anterior. */
  floorGrowth: 5,
  floorBaseRate: 1,
  /** Desbloquear la planta i cuesta unlockBase * unlockGrowth^i. La 0 viene gratis. */
  unlockBase: 25,
  unlockGrowth: 11,
  floorUpgradeK: 1.15,
  transportBaseCap: 15,
  transportBaseSpeed: 1.5,
  transportMaxSpeed: 8,
  transportLoadTime: 0.4,
  transportUnloadTime: 0.4,
  saleBaseCap: 20,
  saleBaseWalk: 2,
  saleMinWalk: 0.6,
  logisticsCostBase: 10,
  logisticsCostK: 1.2,
  /** Cada nivel de transporte o venta multiplica su capacidad por este factor (además del nivel y los hitos). */
  logisticsCapGrowth: 1.12,
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
  /** Multiplicador de todos sus costes: más alto = el negocio tarda más en completarse. */
  pace: number;
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
    price: 0, mult: 1, pace: 1, wall: 0xe8b04b, roof: 0x9c5b2e,
    floorName: "Estantería", worker: "🧑‍🔧", item: "📦", transportName: "Carretilla", transportIcon: "🛻",
    saleName: "Furgonetas", saleWorker: "🚚", customer: "🏠",
  },
  {
    id: "restaurant", name: "Restaurante", icon: "🍝", blurb: "Cocinas, camareros y repartidores. Si uno falla, se atasca todo.",
    price: 2e8, mult: 2e5, pace: 3, wall: 0xd9534f, roof: 0x7a2323,
    floorName: "Cocina", worker: "🧑‍🍳", item: "🍝", transportName: "Camareros", transportIcon: "🤵",
    saleName: "Repartidores", saleWorker: "🛵", customer: "🏠",
  },
  {
    id: "tiktok", name: "Estudio de TikTok", icon: "📱", blurb: "Creadores grabando sin parar y marcas pagando por salir.",
    price: 6e14, mult: 5e11, pace: 10, wall: 0x6f5bd6, roof: 0x2e2270,
    floorName: "Set de grabación", worker: "🤳", item: "🎬", transportName: "Editores", transportIcon: "✂️",
    saleName: "Marcas", saleWorker: "🤝", customer: "🏢",
  },
  {
    id: "ai", name: "Agencia de IA", icon: "🤖", blurb: "GPUs a tope y clientes que pagan por automatizarlo todo.",
    price: 6e21, mult: 5e18, pace: 30, wall: 0x2bb5a0, roof: 0x145c52,
    floorName: "Rack de GPUs", worker: "🦾", item: "🧠", transportName: "Técnicos", transportIcon: "🧑‍🔧",
    saleName: "Comerciales", saleWorker: "💼", customer: "🏦",
  },
];

/** Negocios de Miami: cinco en vez de cuatro, y cada uno más lento de completar. */
export const MIAMI_BUSINESSES: BusinessDef[] = [
  {
    id: "foodtruck", name: "Food trucks", icon: "🌮", blurb: "Tacos y batidos para los turistas del paseo marítimo.",
    price: 0, mult: 1, pace: 2.5, wall: 0xff9f43, roof: 0xee5253,
    floorName: "Food truck", worker: "🧑‍🍳", item: "🌮", transportName: "Patinadores", transportIcon: "🛼",
    saleName: "Puestos de playa", saleWorker: "🏖️", customer: "🏖️",
  },
  {
    id: "beachclub", name: "Club de playa", icon: "🏖️", blurb: "Tumbonas, cócteles y música hasta que se pone el sol.",
    price: 1.5e9, mult: 4e5, pace: 8, wall: 0x48dbfb, roof: 0x0abde3,
    floorName: "Barra", worker: "🍹", item: "🍹", transportName: "Camareros", transportIcon: "🤵",
    saleName: "Relaciones públicas", saleWorker: "📣", customer: "🏖️",
  },
  {
    id: "yachts", name: "Alquiler de yates", icon: "🛥️", blurb: "Excursiones de lujo por la bahía de Biscayne.",
    price: 3e16, mult: 1e12, pace: 25, wall: 0xf5f6fa, roof: 0x1e3799,
    floorName: "Amarre", worker: "🧑‍✈️", item: "🎫", transportName: "Lanchas", transportIcon: "🚤",
    saleName: "Agentes de viaje", saleWorker: "🧳", customer: "🛳️",
  },
  {
    id: "realestate", name: "Inmobiliaria", icon: "🏘️", blurb: "Áticos frente al mar que se venden antes de construirse.",
    price: 2e23, mult: 4e18, pace: 60, wall: 0xfeca57, roof: 0x8395a7,
    floorName: "Oficina", worker: "🧑‍💼", item: "🔑", transportName: "Gestores", transportIcon: "📁",
    saleName: "Agentes", saleWorker: "🤝", customer: "🏘️",
  },
  {
    id: "crypto", name: "Exchange de cripto", icon: "🪙", blurb: "Millones de operaciones por segundo en la capital cripto.",
    price: 2e29, mult: 1e24, pace: 150, wall: 0x341f97, roof: 0x5f27cd,
    floorName: "Servidor", worker: "🧑‍💻", item: "🪙", transportName: "Bots", transportIcon: "🤖",
    saleName: "Traders", saleWorker: "📊", customer: "🏦",
  },
];

/** Negocios de Dubái: el lujo. Cinco negocios, más lentos que los de Miami. */
export const DUBAI_BUSINESSES: BusinessDef[] = [
  {
    id: "supercars", name: "Alquiler de superdeportivos", icon: "🏎️", blurb: "Deportivos de alquiler por horas para dar una vuelta por Sheikh Zayed Road.",
    price: 0, mult: 1, pace: 4, wall: 0xe84118, roof: 0x2f3640,
    floorName: "Garaje", worker: "🧑‍🔧", item: "🔑", transportName: "Aparcacoches", transportIcon: "🏎️",
    saleName: "Recepción", saleWorker: "🤵", customer: "🏨",
  },
  {
    id: "hotel", name: "Hotel de lujo", icon: "🏨", blurb: "Suites con mayordomo y vistas al golfo.",
    price: 4e9, mult: 6e5, pace: 12, wall: 0xf5f0e1, roof: 0xc8a24a,
    floorName: "Suite", worker: "🤵", item: "🛎️", transportName: "Botones", transportIcon: "🧳",
    saleName: "Conserjes", saleWorker: "💁", customer: "✈️",
  },
  {
    id: "safari", name: "Safari en el desierto", icon: "🐪", blurb: "Dunas en 4x4, camellos y cenas bajo las estrellas.",
    price: 1e17, mult: 2e12, pace: 50, wall: 0xe1b382, roof: 0x8c5a2b,
    floorName: "Campamento", worker: "🧑‍🌾", item: "🐪", transportName: "Todoterrenos", transportIcon: "🚙",
    saleName: "Agencias", saleWorker: "🧳", customer: "🏨",
  },
  {
    id: "souk", name: "Zoco del oro", icon: "💍", blurb: "Joyas de oro al peso en el mercado más brillante del mundo.",
    price: 3e24, mult: 1e19, pace: 130, wall: 0xf6c344, roof: 0x7d5a14,
    floorName: "Taller", worker: "🧑‍🏭", item: "💍", transportName: "Escoltas", transportIcon: "🛡️",
    saleName: "Joyeros", saleWorker: "💎", customer: "🏬",
  },
  {
    id: "tower", name: "Rascacielos", icon: "🏙️", blurb: "Torres de cristal más altas que las nubes.",
    price: 1e31, mult: 3e24, pace: 300, wall: 0x9fd3e6, roof: 0x34495e,
    floorName: "Planta en obras", worker: "👷", item: "🏗️", transportName: "Grúas", transportIcon: "🏗️",
    saleName: "Inversores", saleWorker: "💼", customer: "🏦",
  },
];

/* ---------- Ciudades ---------- */

export type CityMechanic = "none" | "tourism" | "gold";

export interface CityDef {
  id: string;
  name: string;
  flag: string;
  blurb: string;
  businesses: BusinessDef[];
  /** Ganado en la ciudad (con todos sus negocios comprados) para completarla y expandirse. */
  goal: number;
  /** Divisor de las acciones de la bolsa en esta ciudad. */
  shareDivisor: number;
  mechanic: CityMechanic;
  /** Colores del mapa de la ciudad. */
  ground: { grass: number; grassAlt: number; water: number; edge: number };
  trees: string[];
}

export const CITIES: CityDef[] = [
  {
    id: "madrid", name: "Madrid", flag: "🇪🇸", blurb: "Donde empieza todo: de rider a dueño de una agencia de IA.",
    businesses: BUSINESSES, goal: 1e30, shareDivisor: 3e20, mechanic: "none",
    ground: { grass: 0x7cc96b, grassAlt: 0x76c265, water: 0x4fb8d8, edge: 0x6b4a2f },
    trees: ["tree_0", "tree_1"],
  },
  {
    id: "miami", name: "Miami", flag: "🇺🇸", blurb: "Sol, playa y turistas: la demanda llega en olas.",
    businesses: MIAMI_BUSINESSES, goal: 1e36, shareDivisor: 3e24, mechanic: "tourism",
    ground: { grass: 0xf3d99b, grassAlt: 0xeccf8a, water: 0x2ec4d6, edge: 0xc79a55 },
    trees: ["palm", "palm", "bush"],
  },
  {
    id: "dubai", name: "Dubái", flag: "🇦🇪", blurb: "Lujo en el desierto: vende cuando el oro está caro.",
    businesses: DUBAI_BUSINESSES, goal: 1e41, shareDivisor: 3e28, mechanic: "gold",
    ground: { grass: 0xe9c98f, grassAlt: 0xe2c083, water: 0x1fa3b8, edge: 0xb88a4a },
    trees: ["palm", "bush"],
  },
];

export const ALL_BUSINESSES: BusinessDef[] = CITIES.flatMap((c) => c.businesses);

/** Olas turísticas de Miami: cada 15 min llega una ola de 3 min que triplica las ventas. */
export const TOURISM = { periodMin: 15, waveMin: 3, mult: 3, adWaveMin: 3 } as const;

/**
 * Precio del oro en Dubái: sube y baja en ciclos de 20 min entre x1 y x3 (multiplica las ventas,
 * solo jugando). Con un anuncio se firma un contrato que fija el precio máximo durante 4 min.
 */
export const GOLD = { periodMin: 20, min: 1, max: 3, adLockMin: 4 } as const;

/** Carrera de fundadores: los primeros en llegar a Dubái reciben un ejecutivo exclusivo (solo premios del juego). */
export const FOUNDERS = { city: "dubai", spots: 100, bonus: 1 } as const;

/* ---------- Oficina central: mejoras permanentes con estrellas de franquicia ---------- */

export const FRANCHISE = {
  /** Bonus de ingresos por cada ciudad completada, en todas las ciudades. */
  cityBonus: 0.5,
  /** Estrellas base al completar una ciudad; crecen con la raíz cuarta de lo ganado sobre el objetivo. */
  baseStars: 10,
} as const;

export type OfficeId = "brand" | "suppliers" | "offline" | "hustle" | "luck" | "team" | "floors";

export interface OfficeUpgrade {
  id: OfficeId;
  icon: string;
  name: string;
  desc: string;
  max: number;
  /** Coste en estrellas del siguiente nivel, estando en `level`. */
  cost: (level: number) => number;
}

export const OFFICE: OfficeUpgrade[] = [
  { id: "brand", icon: "🌍", name: "Marca global", desc: "+25 % de ingresos en todas las ciudades", max: 10, cost: (l) => 2 + l * 2 },
  { id: "team", icon: "👔", name: "Equipo inicial", desc: "Empiezas cada ciudad (y cada salida a bolsa) con los gerentes del primer negocio", max: 1, cost: () => 4 },
  { id: "floors", icon: "🏗️", name: "Local reformado", desc: "Empiezas con +1 puesto abierto (y su gerente) en el primer negocio", max: 3, cost: (l) => 3 + l * 3 },
  { id: "suppliers", icon: "🤝", name: "Proveedores", desc: "Las mejoras cuestan un 8 % menos", max: 5, cost: (l) => 3 + l * 3 },
  { id: "offline", icon: "🌙", name: "Turno de noche", desc: "+2 h de ganancias con la app cerrada", max: 4, cost: (l) => 3 + l * 2 },
  { id: "hustle", icon: "⚡", name: "Coach de productividad", desc: "El modo hustle dura +1 h por anuncio", max: 4, cost: (l) => 2 + l * 2 },
  { id: "luck", icon: "🔥", name: "Marketing viral", desc: "+1 % de probabilidad de venta viral", max: 4, cost: (l) => 4 + l * 3 },
];

/** Estilo de vida según lo ganado en total. No se pierde al salir a bolsa. */
export const LIFE: { min: number; icon: string; name: string }[] = [
  { min: 0, icon: "🛏️", name: "Vives con tus padres" },
  { min: 1e3, icon: "🏚️", name: "Piso compartido" },
  { min: 1e6, icon: "🏠", name: "Estudio de alquiler" },
  { min: 1e9, icon: "🏢", name: "Piso propio" },
  { min: 1e12, icon: "🌆", name: "Ático en el centro" },
  { min: 1e15, icon: "🏡", name: "Villa con piscina" },
  { min: 1e18, icon: "🏰", name: "Mansión en Marbella" },
  { min: 1e21, icon: "🛥️", name: "Yate de lujo" },
  { min: 1e24, icon: "🏝️", name: "Isla privada" },
  { min: 1e29, icon: "🚀", name: "Viaje a Marte" },
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

export type StatKey = "tapFloor" | "tapTransport" | "sales" | "upgrades" | "hires" | "floors" | "ads" | "abilities" | "chests" | "earned" | "missions" | "milestones";

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
  { id: "earn_1t", text: "Gana 1 T € en total", metric: "totalEarned", target: 1e12, gems: 30 },
  { id: "earn_aa", text: "Gana 1 aa € en total (mil billones)", metric: "totalEarned", target: 1e15, gems: 40 },
  { id: "earn_ac", text: "Gana 1 ac € en total", metric: "totalEarned", target: 1e21, gems: 60 },
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
