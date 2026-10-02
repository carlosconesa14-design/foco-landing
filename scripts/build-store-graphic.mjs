/** Compose a Play feature graphic from the original logo and real captured gameplay.
 * Run VISUAL_OUTPUT=artifacts/store npm run capture:visuals -- --store first. No simulated UI or invented gameplay.
 */
import { chromium } from 'playwright-core';
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'public/brand/store');
await mkdir(out,{recursive:true});
const uri=async(path,type='image/png')=>`data:${type};base64,${(await readFile(resolve(root,path))).toString('base64')}`;
const sources={logo:await uri('public/brand/logo-dark.svg','image/svg+xml'),city:await uri('artifacts/store/store-es-ES-dubai.png'),life:await uri('artifacts/store/store-es-ES-life.png')};
for(const id of ['madrid','miami','dubai','supercars','life'])await copyFile(resolve(root,`artifacts/store/store-es-ES-${id}.png`),resolve(out,`${id}-1080x1920.png`));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 const png=await page.evaluate(async sources=>{
  const imgs={};for(const [id,url] of Object.entries(sources)){const im=new Image();im.src=url;await im.decode();imgs[id]=im;}
  const c=document.createElement('canvas');c.width=1024;c.height=500;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,1024,500);g.addColorStop(0,'#10273e');g.addColorStop(1,'#235672');x.fillStyle=g;x.fillRect(0,0,1024,500);
  x.globalAlpha=.1;x.strokeStyle='#f5c542';x.lineWidth=2;
  for(let i=-500;i<1500;i+=110){x.beginPath();x.moveTo(i,0);x.lineTo(i+500,500);x.stroke();}
  x.globalAlpha=1;x.drawImage(imgs.logo,36,112,470,149);
  x.fillStyle='#cceaf2';x.font='bold 23px sans-serif';x.fillText('Tu imperio empieza con una entrega',46,322);
  x.fillStyle='#f5c542';x.fillRect(46,350,270,4);
  for(const [id,xx,yy,w] of [['city',535,34,237],['life',779,64,205]]) {
   const h=w*1920/1080;x.save();x.shadowColor='#0008';x.shadowBlur=22;x.shadowOffsetY=12;
   x.fillStyle='#10273e';x.beginPath();x.roundRect(xx-5,yy-5,w+10,h+10,22);x.fill();x.restore();
   x.save();x.beginPath();x.roundRect(xx,yy,w,h,18);x.clip();x.drawImage(imgs[id],xx,yy,w,h);x.restore();
   x.strokeStyle='#9ad4df';x.lineWidth=2;x.beginPath();x.roundRect(xx-2,yy-2,w+4,h+4,20);x.stroke();
  }
  return c.toDataURL('image/png').split(',')[1];
 },sources);
 await writeFile(resolve(out,'feature-graphic-1024x500.png'),Buffer.from(png,'base64'));
} finally {await browser.close();}
console.log(out);
