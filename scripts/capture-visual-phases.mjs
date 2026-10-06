/** Offline view fixtures; captures never send accounts, scores, analytics or altered saves. */
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),port=5201,url=`http://127.0.0.1:${port}`;
const out=resolve(root,process.env.VISUAL_OUTPUT||'artifacts/visual-phase-1');await mkdir(out,{recursive:true});
const service=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'pipe'});
let log='',browser;service.stdout.on('data',d=>log+=d);service.stderr.on('data',d=>log+=d);
const findings=[],errors=[];
try{
 for(let n=0;n<100;n++){if(service.exitCode!==null)throw Error(log);if(log.includes('Local:')){try{if((await fetch(url)).ok)break;}catch{}}await new Promise(r=>setTimeout(r,150));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 for(const locale of ['es-ES','en-US'])for(const motion of ['full','reduced']){
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale,deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:motion==='reduced'?'reduce':'no-preference'});
 await ctx.addInitScript(m=>localStorage.setItem('motion',m),motion);
 await ctx.route('https://**.supabase.co/**',async r=>{let a;try{a=r.request().postDataJSON()?.action;}catch{}await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(a==='time'?{now:Date.UTC(2026,9,6,10)}:a==='config'?{config:{}}:{error:'offline_visual_fixture'})});});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__game?.state&&!document.body.classList.contains('loading'));
 async function seed(count,level=1){await page.evaluate(async({count,level})=>{
 const{freshState,freshFloor}=await import('/src/game/state.ts');const{now}=await import('/src/game/clock.ts');const{FEATURES}=await import('/src/game/unlocks.ts');
 const s=__game.state;Object.assign(s,freshState(now(),'madrid'));s.cash=5e9;s.totalEarned=1e12;s.lifeSeen=9;s.meta.tutorial=99;s.meta.unlocked=FEATURES.map(f=>f.id);s.meta.founder.asked=true;s.nextViral=now()+1e12;s.meta.offers.truckAt=now()+1e12;s.meta.offers.vipAt=now()+1e12;
 const {ensureRival}=await import('/src/game/rival.ts');ensureRival(s,now());s.meta.rival.won=true;s.meta.rival.base=s.totalEarned;
 const b=s.biz.bike;b.owned=true;b.floors=Array.from({length:count},()=>({...freshFloor(),level,managed:true}));b.transport.managed=true;b.sale.managed=true;b.transport.level=level;b.sale.level=level;
 __game.game.scene.stop('route');__game.game.scene.stop('city');s.view={scene:'business',id:'bike'};const{renderBar}=await import('/src/ui/hud.ts');renderBar(s);__game.game.scene.start('route',{id:'bike',scrollY:0});
 },{count,level});await page.waitForTimeout(450);for(let i=0;i<10;i++){const b=page.locator('.celebrate .cbtn');if(!await b.count())break;await b.first().click({timeout:1500}).catch(()=>{});await page.waitForTimeout(200);}}
 async function check(label){const bad=await page.evaluate(()=>[...document.querySelectorAll('button,#hud,#bar,.sheet,.more-menu')].filter(e=>{let r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'&&(r.left<-.5||r.right>innerWidth+.5)}).map(e=>e.id||e.className));assert.deepEqual(bad,[],label+' overflow');findings.push(label);}
 for(const count of [1,8]){
 await seed(count,count===8?50:1);await check(`${locale}/${motion}/${count}/layout`);
 await page.screenshot({path:resolve(out,`${locale}-${motion}-${count}-top.png`)});
 const geometry=await page.evaluate(()=>{const sc=__game.game.scene.getScene('route');return{count:sc.stops.length,max:sc.scroll.max,buttons:sc.stops.map(s=>({w:s.button.width,h:s.button.height,x:s.button.x,y:s.button.y}))};});assert.equal(geometry.count,count);assert(geometry.buttons.every(b=>b.w>=70&&b.h>=56));findings.push(`${locale}/${motion}/${count}/level targets`);
 if(count===8){await page.evaluate(()=>{const s=__game.game.scene.getScene('route');s.cameras.main.scrollY=s.scroll.max;});await page.screenshot({path:resolve(out,`${locale}-${motion}-${count}-bottom.png`)});findings.push(`${locale}/${motion}/last stop visible`);}
 await page.evaluate(()=>{const s=__game.game.scene.getScene('route');s.cameras.main.scrollY=0;});
 const button=await page.evaluate(()=>{const s=__game.game.scene.getScene('route'),b=s.transportButton;return{x:b.x,y:b.y-s.cameras.main.scrollY};});
 const before=await page.evaluate(()=>__game.state.biz.bike.transport.level);await page.mouse.click(button.x,button.y);await page.waitForTimeout(200);assert(await page.locator('.sheet').count(),'Level should open upgrade panel');assert.equal(await page.evaluate(()=>__game.state.biz.bike.transport.level),before);await check(`${locale}/${motion}/${count}/upgrade`);await page.screenshot({path:resolve(out,`${locale}-${motion}-${count}-upgrade.png`)});await page.locator('.sheet-close').click();
 }
 await page.locator('#menuToggle').click();await check(`${locale}/${motion}/menu`);await page.screenshot({path:resolve(out,`${locale}-${motion}-menu.png`)});await page.locator('#menuClose').click();
 for(const name of ['daily','wheel','life','execs','achievements','league','settings']){
 await page.locator('#menuToggle').click();await page.locator(`#moreMenu [data-open="${name}"]`).click();await page.waitForTimeout(200);await check(`${locale}/${motion}/${name}`);await page.screenshot({path:resolve(out,`${locale}-${motion}-${name}.png`)});if(await page.locator('.sheet-close').count())await page.locator('.sheet-close').click();else if(await page.locator('.modal .btn').count())await page.locator('.modal .btn').last().click();
 }
 await ctx.close();}
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({findings,errors,viewport:'390x844',remote:'offline Supabase fixture; no writes'},null,2));console.log({checks:findings.length,errors:errors.length,out});
}finally{await browser?.close();service.kill();}
