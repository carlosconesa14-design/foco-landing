/** Original vector enamel symbols; no third-party fonts or assets. */
import sharp from 'sharp';
import ts from 'typescript';
import{readFile,writeFile}from'node:fs/promises';
const code=ts.transpileModule(await readFile('src/ui/visualIcons.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const{VISUAL_ICON_SHAPES:shapes}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const branches={prod:'<path d="M5 22 19 13v9l14-9v9h10v20H5Z" fill="#ffd36b"/><path d="M13 29h5m7 0h5m-17 7h5m7 0h5M35 7h6v15"/>',log:'<rect x="5" y="13" width="24" height="23" rx="4" fill="#91d7fb"/><path d="M29 19h8l6 9v8H29Z" fill="#ffd36b"/><circle cx="13" cy="37" r="5"/><circle cx="35" cy="37" r="5"/>',sale:shapes.coin,mgr:'<circle cx="24" cy="14" r="9" fill="#ffcda0"/><path d="M8 43v-8q1-12 16-12t16 12v8Z" fill="#74afdc"/><path d="m16 24 8 9 8-9-4 18h-8Z" fill="#fff"/>',start:shapes.extreme};
const keys={...Object.fromEntries(['idea','school','skill','ticket','fest_trophy'].map(id=>[`ic_${id}`,shapes[id]])),...Object.fromEntries(Object.entries(branches).map(([id,svg])=>[`ic_school_${id}`,svg]))};
const manifest=JSON.parse(await readFile('public/sprites/manifest.json','utf8'));
for(const[key,svg]of Object.entries(keys)){await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48" fill="none" stroke="#24445c" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`)).png().toFile(`public/sprites/${key}.png`);if(!manifest.includes(key))manifest.push(key);}
await writeFile('public/sprites/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(`Exported ${Object.keys(keys).length} original icons`);
