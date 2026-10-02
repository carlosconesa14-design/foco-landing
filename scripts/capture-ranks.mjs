/** Contact sheet of actual runtime rank textures, without changing saved levels. */
import { chromium } from 'playwright-core';
import { writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage();
 await page.route('https://**.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"error":"offline_visual_fixture"}'}));
 await page.goto(process.env.VISUAL_BASE_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__game?.state&&!document.body.classList.contains('loading'));
 const png=await page.evaluate(async()=>{
  const {rankedKey}=await import('/src/art/catalog.ts'),{artRef}=await import('/src/art/generated.ts');
  const sc=__game.game.scene.getScene('city'),c=document.createElement('canvas');c.width=720;c.height=600;const x=c.getContext('2d');
  x.fillStyle='#10273e';x.fillRect(0,0,c.width,c.height);x.font='bold 15px sans-serif';x.textAlign='center';
  const rows=['st_supercars','ch_mechanic_0','veh_flatbed','wh_shelf'];
  const labels=['Base','Bronce','Plata','Oro','Diamante','Leyenda'];
  for(let n=0;n<=5;n++){x.fillStyle='#ffe091';x.fillText(labels[n],60+n*120,26);}
  for(let r=0;r<rows.length;r++)for(let n=0;n<=5;n++) {
   const key=n?rankedKey(sc,rows[r],n):rows[r],ref=artRef(sc,key),f=sc.textures.getFrame(ref.texture,ref.frame);
   const ratio=Math.min(100/f.cutWidth,110/f.cutHeight),w=f.cutWidth*ratio,h=f.cutHeight*ratio;
   x.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,60+n*120-w/2,40+r*140+110-h,w,h);
   x.fillStyle='#cbe4ed';x.font='11px sans-serif';x.fillText(rows[r],60+n*120,40+r*140+128);
  }
  return c.toDataURL('image/png').split(',')[1];
 });
 await mkdir(resolve(root,'docs/visual-review'),{recursive:true});await writeFile(resolve(root,'docs/visual-review/ranks.png'),Buffer.from(png,'base64'));
} finally {await browser.close();}
