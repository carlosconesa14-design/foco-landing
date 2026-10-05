/** Derivative crops only: original generated artwork remains in source/. */
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const source='public/sprites/source/neighborhoods.png';
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const names=['madrid','miami','dubai','industrial','terrace','neon'],frames={};
for(let n=0;n<6;n++){
 const cx=n%3,cy=Math.floor(n/3),left=Math.round(cx*info.width/3),right=Math.round((cx+1)*info.width/3),top=Math.round(cy*info.height/2),bottom=Math.round((cy+1)*info.height/2);
 let x0=right,y0=bottom,x1=left,y1=top;
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const crop={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};frames[`district_${names[n]}`]=crop;
 await sharp(source).extract(crop).resize(540,380,{fit:'contain',position:'bottom',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(`public/sprites/district_${names[n]}.png`);
}
await writeFile('public/sprites/source/neighborhoods.json',JSON.stringify(frames,null,2)+'\n');
const path='public/sprites/manifest.json',manifest=JSON.parse(await readFile(path,'utf8'));
await writeFile(path,JSON.stringify([...new Set([...manifest,...Object.keys(frames)])],null,2)+'\n');
console.log('Six neighborhood dioramas exported at 540×380');
