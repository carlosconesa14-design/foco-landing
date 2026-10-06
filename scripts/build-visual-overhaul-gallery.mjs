/** Review artifacts only: resize screenshots; never alter game artwork. */
import sharp from 'sharp';import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve}from'node:path';
const input=resolve(process.env.VISUAL_OUTPUT||'artifacts/visual-phases-3-9'),out=resolve('docs/visual-review/phases-3-9');await mkdir(out,{recursive:true});
const report=JSON.parse(await readFile(`${input}/report.json`,'utf8'));await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
const ids=['bike','dropship','restaurant','tiktok','ai','foodtruck','beachclub','yachts','realestate','crypto','supercars','hotel','safari','souk','tower','fest'];
const panels=['upgrade','unlock','plot','ipo','world','office','school','missions','daily','execs','achievements','settings','wheel','shop','life','league','event','season','empire','invite','cloud','feedback','legal'];
async function contact(name,entries,columns=4){const width=195,height=447,rows=Math.ceil(entries.length/columns),items=[];
 for(let i=0;i<entries.length;i++){const[file,label]=entries[i],x=i%columns*width,y=Math.floor(i/columns)*height;items.push({input:await sharp(`${input}/${file}.png`).resize(195,422).toBuffer(),left:x,top:y});items.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="195" height="25"><rect width="195" height="25" fill="#163a52"/><text x="8" y="17" font-family="sans-serif" font-size="12" fill="#ffe4a5">${label}</text></svg>`),left:x,top:y+422});}
 await sharp({create:{width:width*columns,height:height*rows,channels:3,background:'#163a52'}}).composite(items).jpeg({quality:86}).toFile(`${out}/${name}.jpg`);
}
await contact('worlds-1-stop',ids.map(id=>[`es-ES-reduced-${id}-1-top`,id]));
await contact('worlds-8-stops',ids.map(id=>[`es-ES-reduced-${id}-8-top`,id]));
await contact('middle-stops-3-4',ids.map(id=>[`es-ES-reduced-${id}-stops-3-4`,id]));
await contact('middle-stops-5-6',ids.map(id=>[`es-ES-reduced-${id}-stops-5-6`,id]));
await contact('last-stops',ids.map(id=>[`en-US-reduced-${id}-8-bottom`,id]));
await contact('panels',panels.map(id=>[`es-ES-reduced-panel-${id}`,id]));
await contact('cities', ['madrid','miami','dubai'].map(id=>[`es-ES-reduced-city-${id}`,id]),3);
for(const[filename,source]of Object.entries({'school':'es-ES-reduced-panel-school','office':'es-ES-reduced-panel-office','world':'en-US-reduced-panel-world','upgrade':'en-US-reduced-panel-upgrade','festival':'en-US-reduced-fest-8-top'}))await sharp(`${input}/${source}.png`).webp({quality:88}).toFile(`${out}/${filename}.webp`);
console.log(`Gallery: ${report.findings.length} checks, ${report.errors.length} console errors`);
