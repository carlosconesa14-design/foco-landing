/**
 * Simulador de progresión: un bot juega con la lógica real del juego y mide cuánto tarda
 * en llegar a cada hito. Sirve para ajustar los números de `src/game/data.ts`.
 *
 *   npx vite-node scripts/balance.ts            # jugador activo, sin anuncios
 *   npx vite-node scripts/balance.ts --ads      # con el x2 de anuncios siempre activo
 */
import { CHAIN, LIFE } from "../src/game/data";
import { bizList } from "../src/game/economy";
import { applyStartPerks } from "../src/game/world";
import { simulate, type SimResult } from "../src/game/balance";
import { fmt, fmtTime } from "../src/game/format";

const ads = process.argv.includes("--ads");
const hours = Number(process.argv.find((a) => a.startsWith("--hours="))?.split("=")[1] ?? 72);
const city = process.argv.find((a) => a.startsWith("--city="))?.split("=")[1] ?? "madrid";
/** --stars=N reparte N estrellas en la Oficina central como haría un jugador típico. */
const stars = Number(process.argv.find((a) => a.startsWith("--stars="))?.split("=")[1] ?? 0);
const res: SimResult = simulate({
  hours,
  ads,
  city,
  setup: (s) => {
    s.world.completed = city === "madrid" ? [] : ["madrid"];
    if (stars >= 10) s.world.upgrades = { brand: 1, team: 1, floors: 1 };
    if (stars >= 20) s.world.upgrades = { brand: 3, team: 1, floors: 1, suppliers: 1 };
    applyStartPerks(s);
  },
});

console.log(`\nSimulación de ${city} ${hours} h · ${ads ? "con x2 de anuncios" : "sin anuncios"} · ${stars} ⭐\n`);
for (const e of res.events) console.log(`${fmtTime(e.t).padStart(9)}  ${e.what}`);
console.log(`\nAl final: ${fmt(res.final.cash)} € en caja · ${fmt(res.final.rate)} €/s · ganado ${fmt(res.final.totalEarned)} €`);
console.log(`Estilo de vida: ${LIFE[res.final.life].name} · acciones disponibles: ${res.final.shares}`);
console.log(`Negocios: ${bizList(res.state).filter((b) => res.state.biz[b.id].owned).map((b) => `${b.icon} ${res.state.biz[b.id].floors.length}/${CHAIN.maxFloors}`).join("  ")}`);
