/** Rasterise original SVG pictograms and source app icon. Requires a running Vite server.
 * Source atlas pixels are never repainted. Android exports preserve the generated emblem.
 */
import { chromium } from 'playwright-core';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage();await page.goto(process.env.VISUAL_BASE_URL||'http://127.0.0.1:5173/');
 const shapes=await page.evaluate(async()=>{const {VISUAL_ICON_SHAPES}=await import('/src/ui/visualIcons.ts');return VISUAL_ICON_SHAPES});
 const manager=await page.evaluate(async()=>{const {icon}=await import('/src/ui/icons.ts');return icon('manager')});
 for(const key of ['coin','rank_1','rank_2','rank_3','rank_4','rank_5','wheel','hand','construction','manager']) {
  const file=['wheel','hand','construction','manager'].includes(key)?'ic_'+key:key;
  const svg=key==='manager'?manager.replace('class="game-icon"','xmlns="http://www.w3.org/2000/svg" width="96" height="96"'):`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="96" height="96" fill="none" stroke="#24445c" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${shapes[key]}</svg>`;
  await writeFile(resolve(root,`public/sprites/${file}.svg`),svg+'\n');
  await page.setViewportSize({width:96,height:96});await page.setContent(`<style>*{margin:0}body{background:transparent}</style>${svg}`);
  await page.screenshot({path:resolve(root,`public/sprites/${file}.png`),omitBackground:true});
 }
 await page.goto(process.env.VISUAL_BASE_URL||'http://127.0.0.1:5173/');
 const raster=async(size,mask='square')=>Buffer.from(await page.evaluate(async({size,mask})=>{
  const im=new Image();im.src='/brand/app-icon-source.png';await im.decode();const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
  if(mask==='round'){x.beginPath();x.arc(size/2,size/2,size/2,0,Math.PI*2);x.clip();}
  if(mask==='foreground'){x.clearRect(0,0,size,size);x.drawImage(im,size*.16,size*.16,size*.68,size*.68);}else x.drawImage(im,0,0,size,size);
  return c.toDataURL('image/png').split(',')[1];
 },{size,mask}),'base64');
 for(const size of [512,1024])await writeFile(resolve(root,`public/brand/app-icon-${size}.png`),await raster(size));
 for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
  for(const [name,mask] of [['ic_launcher','square'],['ic_launcher_round','round'],['ic_launcher_foreground','foreground']]) {
   await writeFile(resolve(root,`android/app/src/main/res/mipmap-${density}/${name}.png`),await raster(name==='ic_launcher_foreground'?Math.round(size*2.25):size,mask));
  }
 }
 // A single vector splash replaces the old per-orientation blank PNG resources.
 const logo=await readFile(resolve(root,'public/brand/logo-dark.svg'),'utf8');
 const body=logo.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
 await writeFile(resolve(root,'public/brand/splash.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#10273e"/><g transform="translate(120 760) scale(1.025)">${body}</g></svg>\n`);
} finally {await browser.close()}
