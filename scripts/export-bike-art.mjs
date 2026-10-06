import sharp from 'sharp';
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
const dir='public/sprites';
const files={shops:'exec-cb830f11-da69-4c2f-ae8f-1e3d502026fb.png',actors:'exec-dcb0241c-a85b-4c36-98fb-cd4b86d34d93.png',hubs:'exec-696490dc-5853-4f2a-a902-76545556d90c.png',street:'exec-c66a6bd0-a58f-400a-8615-d5ec9a7d18a0.png',customers:'exec-a5628543-1b94-42be-8346-68367fbe49a1.png',alternate:'exec-c00dfa04-4372-4d16-af79-aebaee9abdf2.png',workers:process.env.BIKE_WORKERS??'exec-f0b9853a-a66b-4247-b04e-61b3795cb0e5.png'};
await mkdir(`${dir}/source/bike`,{recursive:true});
for(const [role,file] of Object.entries(files)) { const generated=`/workspace/generated_images/${file}`; if(await access(generated).then(()=>true,()=>false)) await copyFile(generated,`${dir}/source/bike/${role}.png`); }
const specs=[];
async function cells(role,cols,rows,entries){
 const source=`${dir}/source/bike/${role}.png`;
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alternate=role==='workers'?await sharp(`${dir}/source/bike/alternate.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}):null;
 const boxes=entries.map(([key,w,h,col,row])=>{
  const alt=role==='workers'&&row>=4;
  const raw=alt?alternate:{data,info};
  const image=alt?`${dir}/source/bike/alternate.png`:source;
  const xs=role==='workers'?(alt?[0,480,934,1340,1774]:[0,300,540,780,1024]):null;
  const ys=role==='workers'?(alt?[0,446,887]:[0,318,613,887,1146,1356,1536]):null;
  const rr=alt?row-4:row;
  const x0=xs?xs[col]:Math.round(col*info.width/cols),x1=xs?xs[col+1]:Math.round((col+1)*info.width/cols),y0=ys?ys[rr]:Math.round(row*info.height/rows),y1=ys?ys[rr+1]:Math.round((row+1)*info.height/rows);
  let l=x1,t=y1,r=x0,b=y0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(raw.data[(y*raw.info.width+x)*4+3]>180){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
  if(r<l)throw Error(`Empty ${key}`);
  return {key,w,h,image,box:{left:l,top:t,width:r-l+1,height:b-t+1}};
 });
 // Rider frames share a source scale; separate cook sheets normalise full-body height and ground anchors.
 const scales=new Map();
 for(const o of boxes){const group=role==='workers'?o.key:role==='actors'&&o.key.startsWith('veh_bike')?'rider':o.key;const s=Math.min((o.w*2-4)/o.box.width,(o.h*2-4)/o.box.height);scales.set(group,Math.min(scales.get(group)??Infinity,s));o.group=group;}
 for(const o of boxes){const s=scales.get(o.group);const width=role==='shops'?o.w*2:Math.max(1,Math.round(o.box.width*s)),height=role==='shops'?o.h*2-2:Math.max(1,Math.round(o.box.height*s));const piece=await sharp(o.image).extract(o.box).resize(width,height).toBuffer();await sharp({create:{width:o.w*2,height:o.h*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:piece,left:Math.floor((o.w*2-width)/2),top:o.h*2-height-2}]).png().toBuffer().then(async buffer=>{const file=`${dir}/${o.key}.png`;const old=await readFile(file).catch(()=>null);if(!old?.equals(buffer))await writeFile(file,buffer);});specs.push({...o,source:o.image.replace(`${dir}/`,''),anchor:'bottom-center'});}
}
await cells('shops',4,2,Array.from({length:8},(_,i)=>[`st_bike_${i}`,104,80,i%4,Math.floor(i/4)]));
await cells('workers',4,6,Array.from({length:24},(_,i)=>{const row=Math.floor(i/4),role=(row%2)*4+i%4,pose=Math.floor(row/2);return [`ch_bike_${role}_${pose}`,64,84,i%4,row];}));
await cells('actors',4,3,[...Array.from({length:8},(_,i)=>[`veh_bike_${i<4?'':'rear_'}${i%4===3?'fast':i%4}`,74,82,i%4,Math.floor(i/4)]),['bike_portal_0',86,104,0,2],['bike_portal_1',86,104,1,2],['bike_pigeons',45,32,2,2],['item_bike_bag',22,29,3,2]]);
await cells('customers',3,1,Array.from({length:3},(_,i)=>[`ch_bike_customer_${i}`,64,84,i,0]));
await cells('hubs',3,1,Array.from({length:3},(_,i)=>[`bld_bike_${i+1}`,340,300,i,0]));
await sharp(`${dir}/source/bike/street.png`).resize(780,560,{fit:'cover'}).png().toFile(`${dir}/street_bike.png`);specs.push({key:'street_bike',w:390,h:280,source:'source/bike/street.png'});
await writeFile(`${dir}/source/bike/metadata.json`,JSON.stringify(specs,null,2)+'\n');
const manifest=JSON.parse(await readFile(`${dir}/manifest.json`,'utf8'));await writeFile(`${dir}/manifest.json`,JSON.stringify([...new Set([...manifest,...specs.map(x=>x.key)])],null,2)+'\n');
await writeFile('src/art/bikeSizes.ts','/** Logical sizes; original sources and extraction boxes: public/sprites/source/bike/metadata.json. */\nexport const BIKE_SIZES: Record<string,{w:number;h:number}> = '+JSON.stringify(Object.fromEntries(specs.map(o=>[o.key,{w:o.w,h:o.h}])),null,2)+';\n');
console.log(`Exported ${specs.length} original bicycle-world assets at 2×.`);
