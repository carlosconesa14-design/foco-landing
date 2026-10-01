import { PRODUCTS, canBuy, grantProduct, isVip, type ProductId } from "../game/shop";
import { analytics, minutesSinceInstall } from "../platform/analytics";
import { store } from "../platform/store";
import { openExecs } from "./metaPanels";
import type { PanelCtx } from "./panels";
import { openSheet } from "./sheet";
import { t } from "../i18n";

/** Tienda: VIP, pack de inicio y diamantes. Se abre tocando los diamantes de la cabecera. */
export function openShop(ctx: PanelCtx): void {
  let busy = false;
  const sheet = openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🛍️</span><div><h3>${t("Tienda")}</h3><p class="muted">${t("Apoya el juego y avanza más rápido")}</p></div></div>
     <div class="shop" data-list></div>
     <button class="btn ghost wide" data-chests style="margin-top:10px">💼 ${t("Maletines de ejecutivos")}</button>
     <button class="btn ghost wide" data-restore style="margin-top:8px">${t("Restaurar compras")}</button>
     <p class="small muted" style="margin-top:10px">${store.simulated ? t("Versión web: las compras son simuladas y no se cobra nada.") : t("Pagos gestionados por Google Play / App Store.")} ${t("Las compras no dan puntos en la Liga.")} ${t("El dinero del juego es ficticio: no tiene valor real y no se puede canjear.")}</p>`,
    (el) => {
      const s = ctx.state();
      const list = el.querySelector<HTMLElement>("[data-list]")!;
      const html = (isVip(s) ? `<div class="shop-vip">👑 <b>${t("Eres VIP")}</b><span>${t("Sin anuncios y todo x2 para siempre. ¡Gracias!")}</span></div>` : "") +
        PRODUCTS.filter((p) => canBuy(s, p.id))
          .map(
            (p) => `<div class="shop-card ${p.highlight ? "hot" : ""}">
              ${p.highlight ? `<span class="shop-tag">${p.highlight}</span>` : ""}
              <span class="shop-ic">${p.icon}</span>
              <div><b>${p.name}</b><span class="sub">${p.desc}</span></div>
              <button class="buy" data-buy="${p.id}"><span>${t("Comprar")}</span><b>${store.price(p.id)}</b></button>
            </div>`,
          )
          .join("");
      if (list.dataset.html === html) return;
      list.dataset.html = html;
      list.innerHTML = html;
      list.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((b) => {
        b.onclick = async () => {
          if (busy) return;
          busy = true;
          b.disabled = true;
          const id = b.dataset.buy as ProductId;
          const res = await store.buy(id);
          busy = false;
          b.disabled = false;
          if (!res.ok) {
            if (res.error !== "cancelled") ctx.toast(t("La compra no se ha completado"));
            return;
          }
          const msg = grantProduct(ctx.state(), id, res.order ?? "", Date.now());
          if (!msg) return;
          analytics.track("purchase", { product: id, minutes: minutesSinceInstall() });
          void ctx.celebrate({
            icon: PRODUCTS.find((p) => p.id === id)!.icon,
            title: t("¡Gracias por tu compra!"),
            subtitle: msg,
            color: "#f5c542",
          });
        };
      });
    },
  );
  sheet.el.querySelector<HTMLButtonElement>("[data-chests]")!.onclick = () => openExecs(ctx, "chests");
  sheet.el.querySelector<HTMLButtonElement>("[data-restore]")!.onclick = async () => {
    const owned = await store.owned();
    const got = owned.map((o) => grantProduct(ctx.state(), o.id, o.order, Date.now())).filter(Boolean);
    ctx.toast(got.length ? t("Restaurado: {n} compra(s)", { n: got.length }) : store.simulated ? t("En la web no hay compras que restaurar") : t("No hay compras que restaurar"));
  };
  void store.loadPrices().then(() => sheet.update?.());
}
