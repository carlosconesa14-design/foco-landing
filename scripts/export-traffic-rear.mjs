/** Normalize original rear views to the same logical box and anchor as their front view. */
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const dir='public/sprites';
const frames=JSON.parse(await readFile(`${dir}/source/traffic-rear.json`));
const manifest=JSON.parse(await readFile(`${dir}/manifest.json`));
for(const [key,crop] of Object.entries(frames)){
 const w=key==='van'?76:key.startsWith('luxcar_')?50:44;
 const h=key==='van'?46:key.startsWith('luxcar_')?42:34;
 const pixels=await sharp(`${dir}/source/traffic-rear.png`).extract(crop).resize(w*3-6,h*3-6,{fit:'contain',background:'#0000'}).png().toBuffer();
 // Shared transparent box. Anchor .76 in city / .72 in neighbourhood, same as front view.
 await sharp({create:{width:w*3,height:h*3,channels:4,background:'#0000'}}).composite([{input:pixels,left:3,top:3}]).png().toFile(`${dir}/${key}_rear.png`);
 if(!manifest.includes(`${key}_rear`))manifest.push(`${key}_rear`);
}
await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(Object.keys(frames).length,'rear traffic views exported');
