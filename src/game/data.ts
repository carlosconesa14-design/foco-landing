/** Contenido del juego: todo lo que se equilibra está aquí, sin lógica. */

export const CONFIG = {
  boostHours: 4,
  boostMaxHours: 12,
  offlineCapHours: 8,
  /** Bonus por cada acción conseguida al salir a bolsa. */
  shareBonus: 0.02,
  /** acciones = floor(sqrt(ganado en la partida / shareDivisor)) */
  shareDivisor: 1e9,
  rushMinutes: 30,
  rushMult: 3,
  viralMinSec: 120,
  viralMaxSec: 240,
  viralVisibleSec: 25,
} as const;

/** Cada hito de nivel duplica la velocidad de un trabajo. */
export const JOB_MILESTONES = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
/** Cada hito de nivel duplica la capacidad de una estación de un negocio de la ciudad. */
export const STATION_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500];

export interface JobDef {
  id: string;
  name: string;
  icon: string;
  /** Coste del primer nivel y crecimiento geométrico por nivel. */
  cost: number;
  k: number;
  /** Ingreso por ciclo y por nivel, y duración base del ciclo en segundos. */
  rev: number;
  time: number;
  /** La automatización que lo convierte en ingreso pasivo. */
  auto: string;
  autoIcon: string;
  autoCost: number;
}

/** La carrera: de trabajos mal pagados a negocios de IA. */
export const JOBS: JobDef[] = [
  { id: "rider", name: "Repartidor en bici", icon: "🚲", cost: 4, k: 1.07, rev: 1, time: 0.6, auto: "Moto de reparto", autoIcon: "🛵", autoCost: 1e3 },
  { id: "wallapop", name: "Reventa en Wallapop", icon: "📦", cost: 60, k: 1.15, rev: 60, time: 3, auto: "Bot de respuestas", autoIcon: "💬", autoCost: 15e3 },
  { id: "dropship", name: "Tienda dropshipping", icon: "🛒", cost: 720, k: 1.14, rev: 540, time: 6, auto: "Proveedor automático", autoIcon: "🚚", autoCost: 1e5 },
  { id: "tiktok", name: "Canal de TikTok", icon: "📱", cost: 8640, k: 1.13, rev: 4320, time: 12, auto: "Editor de vídeo", autoIcon: "🎬", autoCost: 5e5 },
  { id: "marketing", name: "Agencia de marketing", icon: "📊", cost: 103680, k: 1.12, rev: 51840, time: 24, auto: "Community manager", autoIcon: "🧑‍💻", autoCost: 1.2e6 },
  { id: "ai_agency", name: "Agencia de IA", icon: "🤖", cost: 1244160, k: 1.11, rev: 622080, time: 96, auto: "Agente IA 24/7", autoIcon: "🦾", autoCost: 1e7 },
  { id: "saas", name: "App SaaS de IA", icon: "🧠", cost: 14929920, k: 1.1, rev: 7464960, time: 384, auto: "Equipo de ventas", autoIcon: "🤝", autoCost: 1.11e8 },
  { id: "unicorn", name: "Startup unicornio", icon: "🦄", cost: 179159040, k: 1.09, rev: 89579520, time: 1536, auto: "CEO contratado", autoIcon: "👔", autoCost: 5.55e8 },
];

export interface StationDef {
  name: string;
  icon: string;
  /** Qué mide su capacidad, p. ej. "platos cocinados". */
  verb: string;
  /** Unidades por segundo en el nivel 1. */
  baseCap: number;
}

export interface PropertyDef {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  price: number;
  /** Nombre en plural de lo que vende, p. ej. "platos". */
  unit: string;
  /** Euros por unidad vendida. */
  unitPrice: number;
  /** Coste del primer nivel de mejora de cada estación y su crecimiento. */
  upgradeCost: number;
  upgradeK: number;
  /** Cadena de producción: vende al ritmo de la estación más lenta. */
  stations: [StationDef, StationDef, StationDef];
}

/** La ciudad: negocios con su propio idle dentro. */
export const PROPERTIES: PropertyDef[] = [
  {
    id: "cafe", name: "Cafetería", icon: "☕", blurb: "Tu primer local físico. Café de especialidad a precio de oro.",
    price: 5e4, unit: "cafés", unitPrice: 90, upgradeCost: 800, upgradeK: 1.12,
    stations: [
      { name: "Cafeteras", icon: "☕", verb: "cafés preparados", baseCap: 1 },
      { name: "Baristas", icon: "🧑‍🍳", verb: "cafés servidos", baseCap: 0.8 },
      { name: "Terraza", icon: "🪑", verb: "clientes sentados", baseCap: 1.2 },
    ],
  },
  {
    id: "restaurant", name: "Restaurante", icon: "🍝", blurb: "Cocina, sala y mesas. Si una falla, se atasca todo.",
    price: 2e6, unit: "platos", unitPrice: 3500, upgradeCost: 3e4, upgradeK: 1.12,
    stations: [
      { name: "Cocina", icon: "🔥", verb: "platos cocinados", baseCap: 1 },
      { name: "Camareros", icon: "🤵", verb: "platos servidos", baseCap: 0.9 },
      { name: "Mesas", icon: "🍽️", verb: "clientes atendidos", baseCap: 1.1 },
    ],
  },
  {
    id: "gym", name: "Gimnasio", icon: "🏋️", blurb: "Cuotas mensuales: el sueño de todo emprendedor.",
    price: 8e7, unit: "cuotas", unitPrice: 1.4e5, upgradeCost: 1.2e6, upgradeK: 1.12,
    stations: [
      { name: "Máquinas", icon: "🏋️", verb: "socios entrenando", baseCap: 1 },
      { name: "Entrenadores", icon: "🧑‍🏫", verb: "socios atendidos", baseCap: 0.85 },
      { name: "Publicidad", icon: "📣", verb: "altas nuevas", baseCap: 1.15 },
    ],
  },
  {
    id: "warehouse", name: "Almacén de dropshipping", icon: "🏭", blurb: "Deja de depender de proveedores: el stock es tuyo.",
    price: 3e9, unit: "paquetes", unitPrice: 5e6, upgradeCost: 4.5e7, upgradeK: 1.12,
    stations: [
      { name: "Estanterías", icon: "📦", verb: "paquetes en stock", baseCap: 1 },
      { name: "Mozos", icon: "🦺", verb: "paquetes preparados", baseCap: 0.9 },
      { name: "Furgonetas", icon: "🚚", verb: "paquetes entregados", baseCap: 1.1 },
    ],
  },
  {
    id: "hotel", name: "Hotel", icon: "🏨", blurb: "Turistas todo el año y una piscina en la azotea.",
    price: 1.2e11, unit: "noches", unitPrice: 1.9e8, upgradeCost: 1.8e9, upgradeK: 1.12,
    stations: [
      { name: "Habitaciones", icon: "🛏️", verb: "noches disponibles", baseCap: 1 },
      { name: "Recepción", icon: "🛎️", verb: "check-ins", baseCap: 0.85 },
      { name: "Limpieza", icon: "🧹", verb: "habitaciones listas", baseCap: 1.15 },
    ],
  },
  {
    id: "club", name: "Discoteca", icon: "🪩", blurb: "La cola da la vuelta a la manzana cada sábado.",
    price: 5e12, unit: "entradas", unitPrice: 7.5e9, upgradeCost: 7.5e10, upgradeK: 1.12,
    stations: [
      { name: "DJs", icon: "🎧", verb: "entradas vendidas", baseCap: 1 },
      { name: "Barra", icon: "🍸", verb: "copas servidas", baseCap: 0.9 },
      { name: "Porteros", icon: "🕴️", verb: "personas dentro", baseCap: 1.1 },
    ],
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
