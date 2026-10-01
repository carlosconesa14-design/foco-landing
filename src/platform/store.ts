import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import { PRODUCTS, productDef, type ProductId } from "../game/shop";
import { t } from "../i18n";

/**
 * Cobro de las compras: Google Play Billing / StoreKit con @capgo/native-purchases.
 * En el navegador hay una tienda simulada (no cobra nada) para poder probar el flujo.
 *
 * Los productos se crean en Google Play Console con estos ids exactos (ver docs/COMPRAS.md).
 */

export interface StoreResult {
  ok: boolean;
  /** Id de la transacción (para no entregar dos veces). */
  order?: string;
  error?: string;
}

const native = () => Capacitor.isNativePlatform();

/** Precio real con la moneda del país (si la tienda lo da), o el orientativo. */
const prices = new Map<ProductId, string>();

export const store = {
  get simulated(): boolean {
    return !native();
  },

  async loadPrices(): Promise<void> {
    if (!native()) return;
    try {
      const { products } = await NativePurchases.getProducts({ productIdentifiers: PRODUCTS.map((p) => p.id), productType: PURCHASE_TYPE.INAPP });
      for (const p of products) prices.set(p.identifier as ProductId, p.priceString);
    } catch {
      /* sin tienda (p. ej. productos aún no creados): precios orientativos */
    }
  },

  price(id: ProductId): string {
    return prices.get(id) ?? productDef(id).price;
  },

  async buy(id: ProductId): Promise<StoreResult> {
    if (!native()) {
      // Tienda simulada: confirma con el navegador, no cobra nada.
      const ok = window.confirm(`${t("Compra simulada (no se cobra nada):")}\n${productDef(id).name} · ${productDef(id).price}`);
      return ok ? { ok: true, order: `sim-${id}-${Date.now()}` } : { ok: false, error: "cancelled" };
    }
    try {
      const t = await NativePurchases.purchaseProduct({
        productIdentifier: id,
        productType: PURCHASE_TYPE.INAPP,
        isConsumable: productDef(id).consumable,
      });
      return { ok: true, order: t.transactionId };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  /** Compras únicas ya hechas en esta cuenta de la tienda (para «Restaurar compras» y móviles nuevos). */
  async owned(): Promise<{ id: ProductId; order: string }[]> {
    if (!native()) return [];
    try {
      const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
      return purchases
        .filter((p) => PRODUCTS.some((d) => d.id === p.productIdentifier && !d.consumable))
        .map((p) => ({ id: p.productIdentifier as ProductId, order: p.transactionId }));
    } catch {
      return [];
    }
  },
};
