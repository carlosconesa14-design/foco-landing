import { CONFIG } from "./data";
import { newExec } from "./meta";
import { bump, type GameState } from "./state";
import { t } from "../i18n";

/**
 * Tienda (compras dentro de la app). Aquí solo está qué da cada producto; el cobro lo hace
 * la tienda del móvil (src/platform/store.ts). Ninguna compra da puntos de la Liga.
 *
 * Los ids tienen que coincidir con los productos creados en Google Play Console / App Store Connect.
 */

export type ProductId = "vip" | "starter_pack" | "auto_manager" | "gems_200" | "gems_1200";

export interface ProductDef {
  id: ProductId;
  icon: string;
  name: string;
  desc: string;
  /** Precio orientativo; el real (con la moneda del país) lo da la tienda. */
  price: string;
  /** Las consumibles se pueden comprar muchas veces (diamantes). */
  consumable: boolean;
  highlight?: string;
}

export const PRODUCTS: ProductDef[] = [
  {
    id: "vip",
    icon: "👑",
    name: "VIP para siempre",
    desc: "Sin anuncios: todas las recompensas al momento, sin ver vídeos. Y todo lo que ganas, x2 para siempre.",
    price: "4,99 €",
    consumable: false,
    highlight: "Lo más vendido",
  },
  {
    id: "starter_pack",
    icon: "🚀",
    name: "Pack de inicio",
    desc: "300 💎, un ejecutivo Épico y 4 h de modo hustle. Solo se puede comprar una vez.",
    price: "1,99 €",
    consumable: false,
    highlight: "Oferta única",
  },
  {
    id: "auto_manager",
    icon: "⚡",
    name: "Gestor automático",
    desc: "«Mejorar todo» sin límite: un toque y tu negocio se mejora solo con lo que más rinde. Para siempre.",
    price: "0,99 €",
    consumable: false,
  },
  { id: "gems_200", icon: "💎", name: "200 diamantes", desc: "Para maletines y paquetes de dinero.", price: "1,99 €", consumable: true },
  { id: "gems_1200", icon: "💰", name: "1.200 diamantes", desc: "Un 20 % más de diamantes por euro que el pack pequeño.", price: "9,99 €", consumable: true },
];

export const productDef = (id: ProductId) => PRODUCTS.find((p) => p.id === id)!;

export interface ShopState {
  vip: boolean;
  starter: boolean;
  /** «Mejorar todo» sin límite (0,99 €). */
  autoManager: boolean;
  /** Transacciones ya entregadas (para no dar dos veces la misma compra). */
  orders: string[];
}

export const freshShop = (): ShopState => ({ vip: false, starter: false, autoManager: false, orders: [] });

export const isVip = (s: GameState) => s.meta.shop.vip;

/** ¿Se puede comprar ahora? (las únicas, solo si no se tienen). */
export function canBuy(s: GameState, id: ProductId): boolean {
  if (id === "vip") return !s.meta.shop.vip;
  if (id === "starter_pack") return !s.meta.shop.starter;
  if (id === "auto_manager") return !s.meta.shop.autoManager && !s.meta.shop.vip;
  return true;
}

/**
 * Entrega lo comprado. `order` es el id de la transacción de la tienda: si ya se entregó, no hace nada.
 * Devuelve un texto para mostrar, o null si no había nada que dar.
 */
export function grantProduct(s: GameState, id: ProductId, order: string, now: number, rand: () => number = Math.random): string | null {
  const shop = s.meta.shop;
  if (order && shop.orders.includes(order)) return null;
  let msg: string | null = null;
  switch (id) {
    case "vip":
      if (shop.vip) break;
      shop.vip = true;
      msg = t("¡Ya eres VIP! Sin anuncios y todo x2 para siempre");
      break;
    case "starter_pack": {
      if (shop.starter) break;
      shop.starter = true;
      s.meta.gems += 300;
      s.meta.execs.push(newExec(2, rand));
      s.boostEnd = Math.min(Math.max(now, s.boostEnd) + 4 * 3600e3, now + CONFIG.boostMaxHours * 3600e3);
      bump(s, "chests");
      msg = t("¡Pack de inicio! +300 💎, un ejecutivo Épico y 4 h x2");
      break;
    }
    case "auto_manager":
      if (shop.autoManager) break;
      shop.autoManager = true;
      msg = t("¡Gestor automático! «Mejorar todo» sin límite para siempre");
      break;
    case "gems_200":
      s.meta.gems += 200;
      msg = "+200 💎";
      break;
    case "gems_1200":
      s.meta.gems += 1200;
      msg = t("+1.200 💎");
      break;
  }
  if (msg && order) shop.orders.push(order);
  if (shop.orders.length > 200) shop.orders.splice(0, shop.orders.length - 200);
  return msg;
}

export function migrateShop(raw: unknown): ShopState {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    vip: r.vip === true,
    starter: r.starter === true,
    autoManager: r.autoManager === true,
    orders: Array.isArray(r.orders) ? r.orders.filter((x): x is string => typeof x === "string").slice(-200) : [],
  };
}
