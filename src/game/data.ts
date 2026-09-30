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
