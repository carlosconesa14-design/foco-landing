import { Capacitor } from "@capacitor/core";

/**
 * Beta pública en la web (GitHub Pages, ver .github/workflows/pages.yml).
 * Se activa al compilar con VITE_WEB_BETA=true. En esa versión:
 * - no hay compras (la tienda remite a la app);
 * - la analítica sí se envía (plataforma «web»);
 * - la Liga funciona, pero sin premios en dinero (el servidor marca al jugador como «web»);
 * - los anuncios son simulados y la recompensa se da igualmente.
 * En `npm run dev` sigue la tienda simulada, para poder probar las compras.
 */
export const WEB_BETA = !Capacitor.isNativePlatform() && import.meta.env.VITE_WEB_BETA === "true";
