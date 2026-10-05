import { MECHANIC_ART } from '../art/businessWorld';
import { twistOf, twistsStarted, RESEARCH, type BizTwist } from '../game/twists';
import type { GameState } from '../game/state';

/** Read-only projection: never starts, rewards or advances an economic mechanic. */
export function twistPresentation(s: GameState, id: string, now: number): { key: string; progress: number; active: boolean; completed?: boolean } | null {
  if (!twistsStarted(s)||!MECHANIC_ART[id]) return null;
  const key=MECHANIC_ART[id];
  const st: BizTwist | undefined=s.meta.twists[id];
  if (!st) return null;
  const clamp=(n:number)=>Math.max(0,Math.min(1,n));
  switch(twistOf(id)) {
    case 'orders': {
      const o=st.order;
      if(!o || (!o.done && (o.deadline || o.offerUntil)<=now))return null;
      return {key,progress:o.done?1:o.deadline?clamp((s.biz[id].earned-o.base)/Math.max(1,o.target)):0,active:!!o.deadline||o.done,completed:o.done};
    }
    case 'critic': return st.critic&&st.critic.until>now?{key,progress:clamp(st.critic.got/Math.max(1,st.critic.need)),active:true}:null;
    case 'hype': return {key,progress:st.viralEnd>now?1:clamp(st.hype/100),active:st.viralEnd>now};
    case 'research': return {key,progress:st.research>=RESEARCH.length?1:clamp(st.data/RESEARCH[st.research].cost),active:st.data>0||st.research>0};
    default:return null;
  }
}
