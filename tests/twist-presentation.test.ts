import {describe,it,expect} from 'vitest';
import {freshState} from '../src/game/state';
import {freshBizTwist,TW} from '../src/game/twists';
import {twistPresentation} from '../src/scenes/twistPresentation';
const fixture=()=>{const s=freshState(1000);s.meta.stats.life.floors=TW.startFloors;for(const id of ['dropship','restaurant','tiktok','ai'])s.meta.twists[id]=freshBizTwist();return s;};
describe('world mechanics presentation',()=>{
 it('shows existing offers and drops expired ones without accepting or rewarding them',()=>{
  const s=fixture(),st=s.meta.twists.dropship;
  st.order={target:100,base:0,deadline:0,offerUntil:2000,reward:500,done:false};
  const before=JSON.stringify(s);
  expect(twistPresentation(s,'dropship',1000)).toMatchObject({key:'veh_order',active:false});
  expect(twistPresentation(s,'dropship',2000)).toBeNull();expect(JSON.stringify(s)).toBe(before);
  st.order.deadline=3000;s.biz.dropship.earned=40;
  expect(twistPresentation(s,'dropship',1000)?.progress).toBeCloseTo(.4);
  st.order.done=true;expect(twistPresentation(s,'dropship',4000)?.progress).toBe(1);
 });
 it('reflects critic expiry and live broadcasts without extending their timers',()=>{
  const s=fixture();s.meta.twists.restaurant.critic={need:12,got:6,until:2000};s.meta.twists.tiktok.viralEnd=1500;
  const before=JSON.stringify(s);
  expect(twistPresentation(s,'restaurant',1000)?.progress).toBe(.5);
  expect(twistPresentation(s,'restaurant',2000)).toBeNull();
  expect(twistPresentation(s,'tiktok',1000)?.active).toBe(true);
  expect(twistPresentation(s,'tiktok',1500)?.active).toBe(false);
  expect(JSON.stringify(s)).toBe(before);
 });
 it('gates decoration until the feature exists and reads the next research cost',()=>{
  const s=fixture();s.meta.stats.life.floors=0;
  expect(twistPresentation(s,'ai',1000)).toBeNull();s.meta.stats.life.floors=TW.startFloors;
  s.meta.twists.ai.data=25;expect(twistPresentation(s,'ai',1000)?.progress).toBe(.5);
  expect(twistPresentation(s,'hotel',1000)).toBeNull();
 });
});
