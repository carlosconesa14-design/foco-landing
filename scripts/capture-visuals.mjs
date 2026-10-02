/** Deterministic local visual validation and honest store screenshots.
 * Supabase is stubbed: these checks never register players, save progress or send analytics.
 * Browser must be installed separately (CHROMIUM_PATH, or /usr/bin/chromium).
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, process.env.VISUAL_OUTPUT || 'artifacts/visual');
const port = Number(process.env.VISUAL_PORT || 5175);
const url = process.env.VISUAL_BASE_URL || `http://127.0.0.1:${port}`;
const baseline = process.argv.includes('--baseline');
const storeOnly = process.argv.includes('--store-only');
const store = storeOnly || process.argv.includes('--store');
const full = !baseline && !store && !process.argv.includes('--quick');
const service = process.env.VISUAL_BASE_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' });
let serverLog = '';
service?.stdout.on('data', d => serverLog += d);
service?.stderr.on('data', d => serverLog += d);
let browser;
const findings = [];
const errors = [];
const serverDate = Date.UTC(2026, 9, 26, 12);
async function ready() {
  for (let i = 0; i < 60; i++) {
    if (service?.exitCode !== null && service?.exitCode !== undefined) throw new Error(serverLog);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Vite did not start: ${serverLog}`);
}
async function closeOverlays(page) {
  for (let i=0;i<8;i++) {
    const celebration=page.locator('.celebrate .cbtn');
    if (!await celebration.count()) break;
    await celebration.first().click(); await page.waitForTimeout(280);
  }
  if (await page.locator('.sheet-close').count()) await page.locator('.sheet-close').click();
  if (await page.locator('#moreMenu[open]').count()) await page.locator('#menuClose').click();
  await page.waitForTimeout(250);
}
async function seed(page, city='madrid', level=50) {
  await page.evaluate(async ({city,level}) => {
    const {freshState, freshFloor}=await import('/src/game/state.ts');
    const {now}=await import('/src/game/clock.ts');
    const {FEATURES}=await import('/src/game/unlocks.ts');
    const {ensureRival}=await import('/src/game/rival.ts');
    const {ensureSeason}=await import('/src/game/season.ts');
    const {LUXURY}=await import('/src/game/luxury.ts');
    const s=__game.state, n=now();
    Object.assign(s, freshState(n,city));
    s.cash=1e24; s.totalEarned=1e30; s.lifeSeen=9; s.meta.gems=1234;
    s.meta.tutorial=99; s.meta.unlocked=FEATURES.map(f=>f.id);
    s.nextViral=n+1e12; s.meta.offers.truckAt=n+1e12; s.meta.offers.vipAt=n+1e12;
    s.meta.founder.asked=true;
    s.meta.luxury.owned=LUXURY.map(i=>i.id);
    s.meta.luxury.equipped={outfit:'goldtux',jewel:'goldchain',car:'sportscar',home:'villa',pet:'dog',extreme:'yacht'};
    for (const b of Object.values(s.biz)) {
      b.owned=true; b.floors=Array.from({length:6},()=>({...freshFloor(),level,managed:true}));
      b.transport.level=level; b.transport.managed=true;
      b.sale.level=level; b.sale.managed=true;
    }
    ensureSeason(s,n);s.meta.season.candy=500;s.meta.season.nextVisitor=n+1e12;
    ensureRival(s,n);s.meta.rival.base=s.totalEarned;s.meta.rival.won=true;
    const {renderBar}=await import('/src/ui/hud.ts');
    const game=__game.game;
    game.scene.stop('business');game.scene.stop('city');
    s.view={scene:'city'};renderBar(s);game.scene.start('city');
  },{city,level});
  await page.waitForTimeout(550);await closeOverlays(page);
}
async function business(page,id) {
  await closeOverlays(page);
  await page.evaluate(async id=>{
    __game.game.scene.stop('city');__game.game.scene.stop('business');
    __game.state.view={scene:'business',id};const {renderBar}=await import('/src/ui/hud.ts');renderBar(__game.state);__game.game.scene.start('business',{id});
  },id);
  await page.waitForTimeout(400);await closeOverlays(page);
}
async function panel(page, name) {
  await closeOverlays(page);
  if (name==='world') await page.locator('[data-nav="world"]').click();
  else if (name==='ipo') await page.locator('[data-nav="ipo"]').click();
  else {
    await page.locator('#menuToggle').click();
    await page.locator(`#moreMenu [data-open="${name}"]`).click();
  }
  await page.locator('.sheet').waitFor();await page.waitForTimeout(450);
}
async function layout(page,label) {
  const bad=await page.evaluate(()=>[...document.querySelectorAll('.sheet,.modal,#hud,#bar,#moreMenu[open],.menu-grid,.lux-card,.tw-card')]
    .filter(el=>el.getClientRects().length && el.scrollWidth>el.clientWidth+3)
    .map(el=>({class:el.className,id:el.id,width:el.clientWidth,scroll:el.scrollWidth})));
  assert.deepEqual(bad,[],`${label}: horizontal overflow ${JSON.stringify(bad)}`);
  findings.push(label);
}
async function snap(page,name) {await page.screenshot({path:resolve(out,`${name}.png`)});}
try {
  await mkdir(out,{recursive:true});await ready();
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const widths=full?[320,390,560]:[390];
  for(const locale of full?['es-ES','en-US']:['es-ES']) {
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:store?2:1,isMobile:true,hasTouch:true,locale,timezoneId:'Europe/Madrid'});
    await ctx.route('https://**.supabase.co/**',async route=>{
      const action=route.request().postDataJSON()?.action;
      const data=action==='time'?{now:serverDate}:action==='config'?{config:{}}:{error:'offline_visual_fixture'};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    const page=await ctx.newPage();
    page.setDefaultTimeout(60000);
    page.on('pageerror',e=>errors.push(`${locale}: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`${locale}: ${m.text()}`)});
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__game?.state&&!document.body.classList.contains('loading'));
    await snap(page,`${locale}-starter`);
    assert.equal(await page.locator('canvas').count(),1);
    if(!storeOnly) {
    for(const width of widths) {
      await page.setViewportSize({width,height:844});
      await seed(page);
      await layout(page,`${locale}/${width}/HUD`);
      await page.locator('#menuToggle').click();await page.waitForTimeout(300);await layout(page,`${locale}/${width}/menu`);
      if(width===390)await snap(page,`${locale}-menu`);
      for(const name of full?['life','wheel','daily','execs','achievements','league','event','invite','settings','world','ipo']:['life']) {
        await panel(page,name);await layout(page,`${locale}/${width}/${name}`);
        if(width===390)await snap(page,`${locale}-${name}`);
      }
      await closeOverlays(page);
    }
    await page.setViewportSize({width:390,height:844});
    for(const city of ['madrid','miami','dubai']) {
      await seed(page,city);await snap(page,`${locale}-${city}-city`);
      const ids=await page.evaluate(()=>Object.keys(__game.state.biz));
      for(const id of ids) {
        await business(page,id);await snap(page,`${locale}-${id}`);await layout(page,`${locale}/${id}/business`);
        if(!baseline) {
          const loaded=await page.evaluate(async id=>{
            const {artRef}=await import('/src/art/generated.ts');const {BIZ_ART}=await import('/src/art/catalog.ts');
            const sc=__game.game.scene.getScene('business'),look=BIZ_ART[id];
            return [look.station,look.item,`ch_${look.worker}_0`].map(key=>({key,ref:artRef(sc,key)}));
          },id);
          assert(loaded.every(i=>i.ref.texture!=='__MISSING'),`Missing art for ${id}`);
        }
      }
    }
    if(!baseline) {
      const baselines=await page.evaluate(async()=>{
        const result=[];
        for(const role of ['mechanic','valet','butler','guide','goldsmith','builder'])for(let pose=0;pose<3;pose++) {
          const im=new Image();im.src=`/sprites/ch_${role}_${pose}.png`;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const rgba=x.getImageData(0,0,c.width,c.height).data;let top=180,bottom=-1;
          for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++)if(rgba[(y*c.width+xx)*4+3]>8){top=Math.min(top,y);bottom=Math.max(bottom,y);}
          result.push({role,pose,w:im.width,h:im.height,top,bottom});
        }
        return result;
      });
      assert(baselines.every(f=>f.w===132&&f.h===180&&f.bottom===177&&f.top>=7&&f.top<=9),'Worker frames drift from their canonical baseline/body box');
      findings.push(`${locale}: 18 walking frames share canonical bounds`);
      await seed(page,'madrid');
      await page.evaluate(async()=>{
        const {freshBizTwist,TW}=await import('/src/game/twists.ts');const {now}=await import('/src/game/clock.ts');const s=__game.state,n=now();s.meta.stats.life.floors=TW.startFloors;
        for(const id of ['dropship','restaurant','tiktok','ai'])s.meta.twists[id]={...freshBizTwist(),intro:true,nextOrder:n+1e12,nextCritic:n+1e12};
        s.meta.twists.dropship.order={target:1e30,base:0,deadline:0,offerUntil:n+60000,reward:500,done:false};
        s.meta.twists.restaurant.critic={need:12,got:3,until:n+60000};s.meta.twists.tiktok.viralEnd=n+60000;s.meta.twists.ai.data=25;
      });
      for(const [id,key] of [['dropship','veh_order'],['restaurant','ch_critic_0'],['tiktok','prop_broadcast'],['ai','prop_research']]) {
        await business(page,id);await page.waitForTimeout(650);await snap(page,`${locale}-world-${id}`);
        assert(await page.evaluate(async key=>{const {artRef}=await import('/src/art/generated.ts');const sc=__game.game.scene.getScene('business'),ref=artRef(sc,key);return sc.children.list.some(o=>o.type==='Image'&&o.visible&&o.texture.key===ref.texture&&o.frame.name===ref.frame)},key),`Missing physical mechanic ${id}`);
        findings.push(`${locale}: world mechanic ${id}`);
      }
      await seed(page,'dubai');await business(page,'supercars');
      // Presentation responds to the existing timers, with no changes to economy/rewards.
      for(const kind of ['truck','vip']) {
        await page.evaluate(async kind=>{
          const {now}=await import('/src/game/clock.ts');const s=__game.state;
          s.meta.offers.truckAt=kind==='truck'?now()-1:now()+1e12;
          s.meta.offers.vipAt=kind==='vip'?now()-1:now()+1e12;
        },kind);
        await page.locator(`.world-visitor.${kind}`).waitFor();await page.waitForTimeout(1600);
        await snap(page,`${locale}-visitor-${kind}`);
        const name=kind==='truck'?'veh_supply':'ch_vip_0';
        assert(await page.evaluate(async name=>{const {artRef}=await import('/src/art/generated.ts');const sc=__game.game.scene.getScene('business');const ref=artRef(sc,name);return sc.children.list.some(o=>o.type==='Image'&&o.texture.key===ref.texture&&o.frame.name===ref.frame)},name));
        await page.locator(`.world-visitor.${kind}`).click();await page.locator('.modal').waitFor();
        await page.locator('.modal .actions button').last().click();await page.waitForTimeout(750);
      }
      // Actual purchases and equipping from the UI; preserve its economic logic.
      await panel(page,'life');
      await page.evaluate(()=>{const s=__game.state;s.meta.luxury.owned=s.meta.luxury.owned.filter(id=>id!=='hoodie');s.meta.luxury.equipped.outfit='tracksuit';s.cash=10000});
      await page.waitForTimeout(200);await page.locator('[data-buy="hoodie"]').click();
      assert.equal(await page.evaluate(()=>__game.state.meta.luxury.equipped.outfit),'hoodie');
      assert(await page.locator('.avatar-img svg').count());
      await page.locator('[data-equip="vampire"]').click();
      assert.equal(await page.evaluate(()=>__game.state.meta.luxury.equipped.outfit),'vampire');
      await snap(page,`${locale}-halloween-life`);
      await closeOverlays(page);
      // Rendering all ranks does not add any levels, income or saved presentation data.
      const ranks=await page.evaluate(async()=>{
        const {ART,BIZ_ART,rankedKey}=await import('/src/art/catalog.ts');const {artRef}=await import('/src/art/generated.ts');const sc=__game.game.scene.getScene('business');
        const bases=[...new Set([...Object.values(BIZ_ART).flatMap(l=>[l.station,`ch_${l.worker}_0`,l.mover.startsWith('veh_')?l.mover:`ch_${l.mover}_1`,l.seller.startsWith('veh_')?l.seller:`ch_${l.seller}_2`]),'wh_shelf','wh_van_open','wh_van_rear','wh_forklift_loaded','wh_forklift_rear','rest_chef_a','rest_chef_b','rest_waiter_a','rest_waiter_b'])];
        const results=[];
        for(const base of bases)for(let rank=1;rank<=5;rank++){const key=rankedKey(sc,base,rank);const ref=artRef(sc,key),frame=sc.textures.getFrame(ref.texture,ref.frame);results.push({base,rank,key,w:frame.cutWidth,h:frame.cutHeight,shared:ref.texture!==key,size:ART[key]});}
        return results;
      });
      assert(ranks.every(r=>r.key.includes(`_r${r.rank}`)), 'Rank art fell back to base');
      assert(ranks.every(r=>r.shared?r.w<=384&&r.h<=384:r.w<=300&&r.h<=258),'Rank textures exceed mobile size budget');
      findings.push(`${locale}: ${ranks.length} rank textures validated`);
      // Collect the real seasonal opportunity through its existing modal.
      const candyBefore=await page.evaluate(async()=>{const {now}=await import('/src/game/clock.ts');const s=__game.state;s.meta.season.nextVisitor=now()-1;return s.meta.season.candy});
      await page.locator('.season-ghost').waitFor();await page.locator('.season-ghost').click({force:true});
      await page.locator('.modal .actions button').last().click();
      assert(await page.evaluate(()=>__game.state.meta.season.candy)>candyBefore);
      findings.push(`${locale}: ghost collected through UI`);
      await page.emulateMedia({reducedMotion:'reduce'});
      await seed(page,'dubai');await snap(page,`${locale}-reduced-motion`);
      await page.waitForTimeout(250);await layout(page,`${locale}/reduced-motion`);
      const emojis=await page.evaluate(()=>document.getElementById('app').innerText.match(/\p{Extended_Pictographic}/gu) || []);
      assert.deepEqual(emojis,[],'System emoji remains in visible UI');
    }
    }
    if(store) {
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.setViewportSize({width:540,height:960});
      for(const city of ['madrid','miami','dubai']) {await seed(page,city);await snap(page,`store-${locale}-${city}`);}
      await business(page,'supercars');await snap(page,`store-${locale}-supercars`);
      await panel(page,'life');await snap(page,`store-${locale}-life`);
    }
    await ctx.close();
  }
  assert.deepEqual(errors,[],'Browser errors');
  await writeFile(resolve(out,'report.json'),JSON.stringify({baseline,checks:findings,errors,remote:'Supabase stubbed; no remote integration or writes',date:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify({screenshots:out,checks:findings.length,errors:errors.length}));
} catch(error) {
  await writeFile(resolve(out,'failure.json'),JSON.stringify({checks:findings,errors,error:String(error)},null,2));
  throw error;
} finally {
  await browser?.close();service?.kill('SIGTERM');
}
