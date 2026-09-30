/**
 * Simulador de progresión: un bot juega con la lógica real del juego y mide cuánto tarda
 * en llegar a cada hito. Sirve para ajustar los números de `src/game/data.ts`.
 *
 *   npx vite-node scripts/balance.ts            # jugador activo, sin anuncios
 *   npx vite-node scripts/balance.ts --ads      # con el x2 de anuncios siempre activo
 */
import * as act from "../src/game/actions";
import { BUSINESSES, CHAIN, LIFE } from "../src/game/data";
import { simulate, type SimResult } from "../src/game/balance";
import { fmt, fmtTime } from "../src/game/format";

const ads = process.argv.includes("--ads");
const hours = Number(process.argv.find((a) => a.startsWith("--hours="))?.split("=")[1] ?? 72);
const res: SimResult = simulate({ hours, ads });

console.log(`\nSimulación ${hours} h · ${ads ? "con x2 de anuncios" : "sin anuncios"}\n`);
for (const e of res.events) console.log(`${fmtTime(e.t).padStart(9)}  ${e.what}`);
console.log(`\nAl final: ${fmt(res.final.cash)} € en caja · ${fmt(res.final.rate)} €/s · ganado ${fmt(res.final.totalEarned)} €`);
console.log(`Estilo de vida: ${LIFE[res.final.life].name} · acciones disponibles: ${res.final.shares}`);
console.log(`Negocios: ${BUSINESSES.filter((b) => res.state.biz[b.id].owned).map((b) => `${b.icon} ${res.state.biz[b.id].floors.length}/${CHAIN.maxFloors}`).join("  ")}`);
void act;
