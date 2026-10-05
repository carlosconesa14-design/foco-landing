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
  st.order.done=true;expect(twistPresentation(s,'dropship',4000)).toMatchObject({progress:1,completed:true});
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

it('projects the ten regional mechanics without accepting offers or mutating progress, and removes expired visitors',()=>{
  const groups={miami:['foodtruck','beachclub','yachts','realestate','crypto'],dubai:['supercars','hotel','safari','souk','tower']} as const;
  const expected:Record<string,string>={foodtruck:'ch_foodie',beachclub:'prop_dj',yachts:'veh_excursion',realestate:'prop_sold',crypto:'prop_mining',supercars:'ch_vip_client',hotel:'ch_inspector',safari:'ch_photographer',souk:'ch_jeweler',tower:'prop_blueprints'};
  for(const city of ['miami','dubai'] as const)for(const id of groups[city]){
    const s=freshState(1000,city),st=freshBizTwist();s.meta.twists[id]=st;s.meta.stats.life.floors=TW.startFloors;
    st.order={target:100,base:0,deadline:3000,offerUntil:2000,reward:500,done:false};s.biz[id].earned=50;
    st.critic={need:10,got:5,until:3000};st.hype=50;st.data=25;
    const before=JSON.stringify(s),view=twistPresentation(s,id,1000);
    expect(view?.key).toBe(expected[id]);expect(view?.progress).toBe(.5);
    if(['yachts','realestate','supercars','souk','foodtruck','hotel'].includes(id))expect(twistPresentation(s,id,3000)).toBeNull();
    expect(JSON.stringify(s)).toBe(before);
    s.meta.stats.life.floors=0;expect(twistPresentation(s,id,1000)).toBeNull();
  }
});
