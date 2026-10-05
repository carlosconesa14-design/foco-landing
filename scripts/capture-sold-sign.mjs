/** Focused review of completed-sale text; isolated local state, no remote writes. */
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=5198,url=`http://127.0.0.1:${port}`,out='artifacts/sold-sign';
const service=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let log='',browser;const checks=[],errors=[];
service.stdout.on('data',d=>log+=d);service.stderr.on('data',d=>log+=d);
try{
 await mkdir(out,{recursive:true});
 let ready=false;for(let n=0;n<60;n++){if(service.exitCode!==null)throw new Error(log);if(log.includes('Local:')){ready=true;break;}await new Promise(r=>setTimeout(r,200));}assert(ready,log);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 for(const locale of ['es-ES','en-US']){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale,timezoneId:'Europe/Madrid'});
  await ctx.route('https://**.supabase.co/**',async r=>await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({error:'offline_visual_fixture'})}));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__game?.state&&!document.body.classList.contains('loading'));
  await page.evaluate(async()=>{
   const {freshState,freshFloor}=await import('/src/game/state.ts'),{freshBizTwist,TW}=await import('/src/game/twists.ts'),{now}=await import('/src/game/clock.ts'),{FEATURES}=await import('/src/game/unlocks.ts'),{renderBar}=await import('/src/ui/hud.ts');
   const s=__game.state,n=now();Object.assign(s,freshState(n,'miami'));s.cash=1e15;s.meta.tutorial=99;s.lifeSeen=9;s.meta.founder.asked=true;s.meta.unlocked=FEATURES.map(f=>f.id);s.meta.stats.life.floors=TW.startFloors;
   s.biz.realestate.owned=true;s.biz.realestate.floors=[{...freshFloor(),level:1}];s.meta.twists.realestate={...freshBizTwist(),intro:true,nextOrder:n+1e12,order:{target:1e30,base:0,deadline:0,offerUntil:n+120000,reward:500,done:false}};
   s.view={scene:'business',id:'realestate'};renderBar(s);__game.game.scene.stop('city');__game.game.scene.start('business',{id:'realestate'});
  });
  await page.waitForFunction(()=>!!__game.game.scene.getScene('business').twistWorld?.saleMarker);
  assert.equal(await page.evaluate(()=>__game.game.scene.getScene('business').twistWorld.saleMarker.visible),false);checks.push(`${locale}: pending sale has no sold marker`);
  await page.evaluate(()=>__game.state.meta.twists.realestate.order.done=true);
  await page.waitForFunction(()=>__game.game.scene.getScene('business').twistWorld.saleMarker.visible);
  assert.equal(await page.evaluate(()=>__game.game.scene.getScene('business').twistWorld.saleMarker.text),locale==='en-US'?'Sold':'Vendido');checks.push(`${locale}: completed sale has translated marker`);
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/${locale}-sold.png`});await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({checks,errors,remote:'Supabase stubbed; no remote writes'},null,2)+'\n');console.log({checks:checks.length,errors:errors.length});
}finally{await browser?.close();service.kill('SIGTERM');}
