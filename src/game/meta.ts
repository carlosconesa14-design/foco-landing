import {
  ACHIEVEMENTS,
  BUSINESSES,
  CHESTS,
  DAILY_REWARDS,
  EXEC_FACES,
  EXEC_KINDS,
  EXEC_NAMES,
  META,
  MISSIONS,
  RARITIES,
  TUTORIAL,
  type AchievementDef,
  type ChestType,
  type DailyReward,
  type ExecKind,
  type MissionId,
} from "./data";
import { earn, passiveRate } from "./economy";
import { bump, type Exec, type GameState, type Mission } from "./state";

/** Diamantes, ejecutivos y maletines, misiones diarias, racha diaria, logros y tutorial. */

type Rand = () => number;

export const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Números redondos para los objetivos: 1.2 K → 1 K, 37 M → 40 M… */
function roundNice(n: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, n))));
  return Math.max(p, Math.round(n / p) * p);
}

/* ---------- Cambio de día ---------- */

/** Prepara el día: reinicia los contadores diarios y genera 3 misiones nuevas. */
export function ensureDay(s: GameState, now: number): void {
  const today = dayKey(now);
  const m = s.meta;
  if (m.stats.dayKey !== today) {
    m.stats.day = {};
    m.stats.dayKey = today;
  }
  const valid = m.missions.list.every((x) => x.id in MISSIONS);
  if (m.missions.day === today && m.missions.list.length && valid) return;
  const ids = Object.keys(MISSIONS) as MissionId[];
  let seed = hash(today);
  const picked: MissionId[] = [];
  while (picked.length < 3) {
    // Math.imul: multiplicación entera de 32 bits (con * normal se pierde precisión y se repite siempre).
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const id = ids[(seed >>> 16) % ids.length];
    if (!picked.includes(id)) picked.push(id);
  }
  m.missions = {
    day: today,
    bonusClaimed: false,
    list: picked.map((id) => ({
      id,
      claimed: false,
      // La de ganar dinero escala con tu progreso: unos 20 minutos de tus ingresos pasivos, mínimo 500 €.
      target: id === "earned" ? roundNice(Math.max(500, passiveRate(s, now, false) * 1200)) : MISSIONS[id].target,
    })),
  };
}

/* ---------- Misiones ---------- */

export const missionProgress = (s: GameState, mi: Mission) => Math.min(mi.target, s.meta.stats.day[mi.id] ?? 0);
export const missionDone = (s: GameState, mi: Mission) => missionProgress(s, mi) >= mi.target;

export function claimMission(s: GameState, index: number): number | null {
  const mi = s.meta.missions.list[index];
  if (!mi || mi.claimed || !missionDone(s, mi)) return null;
  mi.claimed = true;
  const gems = MISSIONS[mi.id].gems;
  s.meta.gems += gems;
  return gems;
}

export const allMissionsClaimed = (s: GameState) => s.meta.missions.list.length > 0 && s.meta.missions.list.every((x) => x.claimed);

export function claimMissionBonus(s: GameState): number | null {
  if (s.meta.missions.bonusClaimed || !allMissionsClaimed(s)) return null;
  s.meta.missions.bonusClaimed = true;
  s.meta.gems += META.missionBonusGems;
  return META.missionBonusGems;
}

export const missionsToClaim = (s: GameState) =>
  s.meta.missions.list.filter((x) => !x.claimed && missionDone(s, x)).length + (allMissionsClaimed(s) && !s.meta.missions.bonusClaimed ? 1 : 0);

/* ---------- Racha diaria ---------- */

export function dailyStatus(s: GameState, now: number): { canClaim: boolean; index: number; streak: number } {
  const d = s.meta.daily;
  const today = dayKey(now);
  const yesterday = dayKey(now - 86400e3);
  const canClaim = d.lastDay !== today;
  // Si se saltó un día, la racha vuelve a empezar.
  const streak = canClaim ? (d.lastDay === yesterday ? d.streak : 0) : d.streak;
  const index = canClaim ? streak % DAILY_REWARDS.length : (streak - 1 + DAILY_REWARDS.length) % DAILY_REWARDS.length;
  return { canClaim, index, streak };
}

export interface Grant {
  gems?: number;
  cash?: number;
  exec?: Exec;
}

function grant(s: GameState, reward: DailyReward, now: number, rand: Rand, double = false): Grant {
  const k = double ? 2 : 1;
  if ("gems" in reward) {
    s.meta.gems += reward.gems * k;
    return { gems: reward.gems * k };
  }
  if ("cashHours" in reward) {
    const cash = Math.max(100, passiveRate(s, now, false) * reward.cashHours * 3600) * k;
    earn(s, cash);
    return { cash };
  }
  return rollChest(s, reward.chest, now, rand);
}

/** Cobra la recompensa del día. Con `double` (tras ver un anuncio) se duplica. */
export function claimDaily(s: GameState, now: number, double = false, rand: Rand = Math.random): Grant | null {
  const st = dailyStatus(s, now);
  if (!st.canClaim) return null;
  const reward = DAILY_REWARDS[st.index];
  s.meta.daily = { lastDay: dayKey(now), streak: st.streak + 1 };
  return grant(s, reward, now, rand, double);
}

/* ---------- Maletines y ejecutivos ---------- */

export const freeChestReady = (s: GameState, now: number) => s.meta.freeChestAt <= now;

function rollRarity(weights: number[], rand: Rand): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return 0;
}

export function newExec(rarity: number, rand: Rand): Exec {
  const kinds = Object.keys(EXEC_KINDS) as ExecKind[];
  return {
    id: `e${Math.floor(rand() * 1e9).toString(36)}${Date.now().toString(36)}`,
    name: EXEC_NAMES[Math.floor(rand() * EXEC_NAMES.length)],
    face: EXEC_FACES[Math.floor(rand() * EXEC_FACES.length)],
    rarity,
    kind: kinds[Math.floor(rand() * kinds.length)],
    assigned: null,
    abilityEnd: 0,
    readyAt: 0,
  };
}

/** Abre un maletín sin cobrarlo (uso interno: recompensas). */
function rollChest(s: GameState, type: ChestType, _now: number, rand: Rand): Grant {
  const c = CHESTS[type];
  const exec = newExec(rollRarity(c.weights, rand), rand);
  s.meta.execs.push(exec);
  const gems = c.gems[0] + Math.floor(rand() * (c.gems[1] - c.gems[0] + 1));
  s.meta.gems += gems;
  bump(s, "chests");
  return { exec, gems };
}

/** Abre un maletín pagando diamantes; el gratis solo cuando está listo (tras ver un anuncio). */
export function openChest(s: GameState, type: ChestType, now: number, rand: Rand = Math.random): Grant | null {
  const c = CHESTS[type];
  if (type === "free") {
    if (!freeChestReady(s, now)) return null;
    s.meta.freeChestAt = now + META.freeChestHours * 3600e3;
  } else {
    if (s.meta.gems < c.cost) return null;
    s.meta.gems -= c.cost;
  }
  return rollChest(s, type, now, rand);
}

/** Asigna un ejecutivo a un negocio; el que hubiera allí queda libre. */
export function assignExec(s: GameState, execId: string, bizId: string | null): boolean {
  const e = s.meta.execs.find((x) => x.id === execId);
  if (!e) return false;
  if (bizId) for (const o of s.meta.execs) if (o.assigned === bizId) o.assigned = null;
  e.assigned = bizId;
  return true;
}

export const execAt = (s: GameState, bizId: string) => s.meta.execs.find((e) => e.assigned === bizId) ?? null;

export function activateAbility(s: GameState, execId: string, now: number): boolean {
  const e = s.meta.execs.find((x) => x.id === execId);
  if (!e || !e.assigned || e.readyAt > now) return false;
  e.abilityEnd = now + RARITIES[e.rarity].abilityMin * 60e3;
  e.readyAt = now + META.abilityCooldownMin * 60e3;
  bump(s, "abilities");
  return true;
}

/** Deja la habilidad lista otra vez (tras ver un anuncio). */
export function rechargeAbility(s: GameState, execId: string, now: number): boolean {
  const e = s.meta.execs.find((x) => x.id === execId);
  if (!e || e.readyAt <= now) return false;
  e.readyAt = now;
  return true;
}

/* ---------- Tienda de diamantes ---------- */

export function buyCashPack(s: GameState, now: number): number | null {
  if (s.meta.gems < META.cashPackGems) return null;
  s.meta.gems -= META.cashPackGems;
  const cash = Math.max(1000, passiveRate(s, now, false) * META.cashPackHours * 3600);
  earn(s, cash);
  return cash;
}

/* ---------- Logros ---------- */

export function achievementProgress(s: GameState, a: AchievementDef): number {
  let v = 0;
  switch (a.metric) {
    case "totalEarned":
      v = s.totalEarned;
      break;
    case "businesses":
      v = BUSINESSES.filter((b) => s.biz[b.id].owned).length;
      break;
    case "maxFloors":
      v = Math.max(...BUSINESSES.map((b) => (s.biz[b.id].owned ? s.biz[b.id].floors.length : 0)));
      break;
    case "ipos":
      v = s.ipos;
      break;
    case "execs":
      v = s.meta.execs.length;
      break;
    default:
      v = s.meta.stats.life[a.metric] ?? 0;
  }
  return Math.min(a.target, v);
}

export function claimAchievement(s: GameState, id: string): number | null {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || s.meta.achievements.includes(id) || achievementProgress(s, a) < a.target) return null;
  s.meta.achievements.push(id);
  s.meta.gems += a.gems;
  return a.gems;
}

export const achievementsToClaim = (s: GameState) =>
  ACHIEVEMENTS.filter((a) => !s.meta.achievements.includes(a.id) && achievementProgress(s, a) >= a.target).length;

/* ---------- Tutorial ---------- */

export const TUTORIAL_LENGTH = TUTORIAL.length;

export const tutorialStep = (s: GameState) => (s.meta.tutorial < TUTORIAL.length ? TUTORIAL[s.meta.tutorial] : null);

/** Avanza el tutorial si se ha cumplido el paso actual. Devuelve los diamantes si acaba de terminarlo. */
export function advanceTutorial(s: GameState): { done: boolean; gems: number } | null {
  const step = tutorialStep(s);
  if (!step || (s.meta.stats.life[step.stat] ?? 0) < step.n) return null;
  s.meta.tutorial++;
  const done = s.meta.tutorial >= TUTORIAL.length;
  if (done) s.meta.gems += META.tutorialGems;
  return { done, gems: done ? META.tutorialGems : 0 };
}
