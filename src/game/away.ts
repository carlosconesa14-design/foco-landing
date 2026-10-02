import { retosToClaim } from "./challenges";
import { eventToClaim } from "./event";
import { LUXURY, owns } from "./luxury";
import { dailyStatus, freeChestReady, missionsToClaim } from "./meta";
import type { GameState } from "./state";
import { nextResearch, twistOf } from "./twists";
import { t } from "../i18n";

/**
 * «Mientras no estabas»: al volver, además del dinero de los gerentes, se enseña lo que espera al
 * jugador (premio diario, maletín, misiones, habilidades, investigación, algo que ya se puede comprar…).
 * Como mucho `max` cosas, de más a menos importante. `cashAfter` es la caja tras cobrar lo offline.
 */
export function awaySummary(s: GameState, now: number, cashAfter: number, max = 4): { icon: string; text: string }[] {
  const out: { icon: string; text: string }[] = [];
  if (dailyStatus(s, now).canClaim) out.push({ icon: "🎁", text: t("Tu premio diario te espera") });
  if (freeChestReady(s, now)) out.push({ icon: "💼", text: t("Tienes un maletín gratis listo") });
  const missions = missionsToClaim(s) + retosToClaim(s);
  if (missions > 0) out.push({ icon: "📋", text: t("{n} misiones o retos por cobrar", { n: missions }) });
  const ready = s.meta.execs.filter((e) => e.assigned && e.readyAt <= now && e.abilityEnd <= now).length;
  if (ready > 0) out.push({ icon: "⚡", text: t("{n} habilidades de ejecutivos listas", { n: ready }) });
  if (eventToClaim(s) > 0) out.push({ icon: "🎉", text: t("Premios del evento para cobrar") });
  for (const id of Object.keys(s.biz)) {
    const next = twistOf(id) === "research" && s.biz[id].owned ? nextResearch(s, id) : null;
    if (next && (s.meta.twists[id]?.data ?? 0) >= next.cost) out.push({ icon: "🧠", text: t("Puedes investigar una mejora nueva") });
  }
  const lux = LUXURY.filter((i) => i.price > 0 && !owns(s, i.id) && cashAfter >= i.price).pop();
  if (lux) out.push({ icon: lux.icon, text: t("Ya puedes comprarte: {name}", { name: lux.name }) });
  return out.slice(0, max);
}
