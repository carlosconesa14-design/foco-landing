/**
 * Primeros 10 minutos con el bot: cuándo acaba cada paso del tutorial, cuándo salta cada momento
 * guiado (`onboarding.ts`) y los huecos más largos sin nada que pase.
 *
 *   npx vite-node scripts/first10.ts
 */
import { simulate } from "../src/game/balance";
import { advanceTutorial } from "../src/game/meta";
import { checkFirsts } from "../src/game/onboarding";
import { TUTORIAL } from "../src/game/data";
import { fmtTime } from "../src/game/format";

const marks: { t: number; what: string }[] = [];
let lastStep = 0;
const res = simulate({
  hours: 10 / 60,
  dt: 1,
  onStep: (s, now, t) => {
    if (s.meta.tutorial > lastStep) {
      lastStep = s.meta.tutorial;
      marks.push({ t, what: `Tutorial ${lastStep}/${TUTORIAL.length}: ${TUTORIAL[lastStep - 1].text}` });
    }
    advanceTutorial(s);
    for (const f of checkFirsts(s, now)) marks.push({ t, what: `Momento «${f.id}»` });
  },
});
for (const e of res.events) if (!e.what.startsWith("   ·")) marks.push(e);
marks.sort((a, b) => a.t - b.t);
let prev = 0;
for (const m of marks) {
  const gap = m.t - prev;
  console.log(`${fmtTime(m.t).padStart(6)}  ${gap >= 45 ? `(+${Math.round(gap)} s) ` : ""}${m.what}`);
  prev = m.t;
}
console.log(`\nHasta el minuto 10 no pasa nada durante ${Math.round(600 - prev)} s al final.`);
