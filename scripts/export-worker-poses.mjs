/** Canonical animation exports: 132×180, shared 178px ground baseline and 170px body box.
 * Keeps source art unchanged; exports only crops/scale, with no painting or recolouring.
 */
import {chromium} from 'playwright-core';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),frames=JSON.parse(await readFile(resolve(root,'public/sprites/source/dubai-walk.json'),'utf8'));
const source='data:image/png;base64,'+(await readFile(resolve(root,'public/sprites/source/dubai-walk.png'))).toString('base64');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{const page=await browser.newPage();const exports=await page.evaluate(async({source,frames})=>{
 const im=new Image();im.src=source;await im.decode();const result={};
 for(const [key,f] of Object.entries(frames)){const c=document.createElement('canvas');c.width=132;c.height=180;const x=c.getContext('2d');const scale=Math.min(128/f.w,170/f.h),w=f.w*scale,h=f.h*scale;x.drawImage(im,f.x,f.y,f.w,f.h,(132-w)/2,178-h,w,h);result[key]=c.toDataURL('image/png').split(',')[1];}return result;
},{source,frames});for(const [key,png]of Object.entries(exports))await writeFile(resolve(root,`public/sprites/${key}.png`),Buffer.from(png,'base64'));
const contact=await page.evaluate(async(exports)=>{
 const c=document.createElement('canvas');c.width=792;c.height=600;const x=c.getContext('2d');x.fillStyle='#10273e';x.fillRect(0,0,c.width,c.height);x.font='bold 13px sans-serif';x.textAlign='center';
 const roles=['mechanic','valet','butler','guide','goldsmith','builder'];
 for(let n=0;n<3;n++)for(let col=0;col<roles.length;col++){const im=new Image();im.src='data:image/png;base64,'+exports[`ch_${roles[col]}_${n}`];await im.decode();x.drawImage(im,col*132,n*200+15);x.fillStyle='#77d7e9';x.fillRect(col*132,n*200+193,132,1);if(n===0){x.fillStyle='#ffe094';x.fillText(roles[col],col*132+66,12);}}
 return c.toDataURL('image/png').split(',')[1];
},exports);await writeFile(resolve(root,'docs/visual-review/dubai-walk.png'),Buffer.from(contact,'base64'));
}finally{await browser.close();}
const path=resolve(root,'public/sprites/manifest.json'),manifest=JSON.parse(await readFile(path,'utf8'));
await writeFile(path,JSON.stringify([...new Set([...manifest,...Object.keys(frames)])],null,2)+'\n');
console.log('18 worker frames exported at 132×180 with common ground anchor');
