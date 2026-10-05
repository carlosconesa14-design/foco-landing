/** Crop/scale exports; originals remain untouched and are not loaded at runtime. */
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const families=[
 {file:'business-districts',cols:4,rows:3,w:540,h:380,keys:['technology','foodcourt','beachfront','marina','residential','financial','dealership','hotelfront','desertcamp','market','construction'].map(n=>`district_${n}`)},
 {file:'regional-mechanics',cols:5,rows:2,w:288,h:246,keys:['veh_excursion','prop_sold','ch_vip_client','ch_jeweler','ch_foodie','ch_inspector','prop_dj','ch_photographer','prop_mining','prop_blueprints']},
];
const exported=[];
for(const f of families){
 const source=`public/sprites/source/${f.file}.png`,frames=JSON.parse(await readFile(`public/sprites/source/${f.file}.json`,'utf8'));
 for(let n=0;n<f.keys.length;n++){
  const {source:override,...crop}=frames[f.keys[n]];
  await sharp(override?`public/sprites/source/${override}`:source).extract(crop).resize(f.w,f.h,{fit:'contain',position:'bottom',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(`public/sprites/${f.keys[n]}.png`);
  exported.push(f.keys[n]);
 }
 await writeFile(`public/sprites/source/${f.file}.json`,JSON.stringify(frames,null,2)+'\n');
}
const path='public/sprites/manifest.json',manifest=JSON.parse(await readFile(path,'utf8'));
await writeFile(path,JSON.stringify([...new Set([...manifest,...exported])],null,2)+'\n');
console.log(`${exported.length} regional world assets exported`);
