/** Original vector sidewalk / asphalt kit; the scene uses these same sizes and colours. */
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const root='public/sprites';
const shapes={
 h:[60,30,'<path d="M0 15H60"/>'],v:[30,60,'<path d="M15 0V60"/>'],
 turn_ne:[48,48,'<path d="M24 48V24H48"/>'],turn_nw:[48,48,'<path d="M24 48V24H0"/>'],
 turn_se:[48,48,'<path d="M24 0V24H48"/>'],turn_sw:[48,48,'<path d="M24 0V24H0"/>'],
 stop:[60,40,'<path d="M0 20H60"/>'],ghost:[60,30,'<path d="M0 15H60"/>'],works:[60,44,'<path d="M0 22H60"/>']};
const keys=[];
for(const[name,[w,h,path]]of Object.entries(shapes)){
 const opacity=name==='ghost'?'.35':'1';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w*2}" height="${h*2}" viewBox="0 0 ${w} ${h}"><g fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="${opacity}"><g stroke="#283442" stroke-width="36">${path}</g><g stroke="#56606e" stroke-width="30">${path}</g><g stroke="#f5f1dc" stroke-width="2" stroke-dasharray="8 12">${path}</g></g>${name==='works'?'<rect x="12" y="8" width="36" height="8" rx="2" fill="#ffb94b"/><path d="M16 8l6 8m8-8l6 8m8-8l4 6" stroke="#0b2440" stroke-width="4"/><path d="M17 16v13m26-13v13" stroke="#0b2440" stroke-width="3"/>':''}</svg>`;
 const key=`route_bike_${name}`;await sharp(Buffer.from(svg)).png().toFile(`${root}/${key}.png`);keys.push(key);
}
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="780" height="344" viewBox="0 0 390 172"><defs><pattern id="p" width="26" height="32" patternUnits="userSpaceOnUse"><rect width="26" height="32" fill="#d9e4c9"/><path d="M0 0h26v32" fill="none" stroke="#aebcaa" opacity=".4"/></pattern></defs><rect width="390" height="172" fill="url(#p)"/><path d="M0 170H390" stroke="#a5b59d" stroke-width="3"/></svg>';
await sharp(Buffer.from(svg)).png().toFile(`${root}/band_bike.png`);keys.push('band_bike');
const manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8'));await writeFile(`${root}/manifest.json`,JSON.stringify([...new Set([...manifest,...keys])],null,2)+'\n');
console.log(`${keys.length} original route / sidewalk pieces exported.`);
