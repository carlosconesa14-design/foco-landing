import type Phaser from 'phaser';
import { ART } from './catalog';
import { WORLD_SIZES } from './worldSizes';
import { ROUTE_SIZES } from './routeSizes';
import { IMG_EXT } from './imgExt';
import { alphaBounds } from './alphaBounds';

/** Large scene-only textures load when needed; retain at most two extra worlds on the GPU. */
const worlds = ['dropship','restaurant','tiktok','ai','foodtruck','beachclub','yachts','realestate','crypto','supercars','hotel','safari','souk','tower','fest'];
const cache = new Map<string,string[]>();
export function isSceneWorldAsset(key:string):boolean{
 if(key==='ui_office_room')return true;
 return worlds.some(id=>key===`street_${id}`||key===`band_${id}`||key.startsWith(`route_${id}_`)||key.startsWith(`st_${id}_`)||key.startsWith(`bld_${id}_`));
}
export function prepareWorld(scene:Phaser.Scene,id:string):void{
 if(!worlds.includes(id))return;
 const files=Object.keys({...WORLD_SIZES,...ROUTE_SIZES}).filter(key=>key===`street_${id}`||key===`band_${id}`||key.startsWith(`route_${id}_`)||key.startsWith(`st_${id}_`)||key.startsWith(`bld_${id}_`));
 const textures=files.map(key=>key.startsWith('bld_')?key.replace('bld_','hub_'):key);
 cache.delete(id);cache.set(id,textures);
 while(cache.size>2){const old=cache.keys().next().value!;for(const key of cache.get(old)!)if(scene.textures.exists(key))scene.textures.remove(key);for(const key of scene.textures.getTextureKeys())if(key.startsWith(`st_${old}_`)&&/_r[1-5]$/.test(key))scene.textures.remove(key);cache.delete(old);}
 files.forEach((file,i)=>{const key=textures[i];if(file.startsWith('bld_')&&!scene.textures.exists(key))ART[key]={...WORLD_SIZES[file]};if(!scene.textures.exists(key))scene.load.image(key,`sprites/${file}.${IMG_EXT}`);});
}
export function fitWorldHubs(scene:Phaser.Scene,id:string):void{
 for(const tier of [1,2,3]){
  const key=`hub_${id}_${tier}`;if(!scene.textures.exists(key))continue;
  const texture=scene.textures.get(key);if((texture.get('__BASE').customData as {fittedWorldHub?:boolean}|undefined)?.fittedWorldHub)continue;
  const image=texture.getSourceImage() as HTMLImageElement|HTMLCanvasElement;const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const ctx=probe.getContext('2d',{willReadFrequently:true});if(!ctx)continue;ctx.drawImage(image,0,0);
  const box=alphaBounds(ctx.getImageData(0,0,probe.width,probe.height).data,probe.width,probe.height);if(!box)continue;
  const out=document.createElement('canvas');out.width=box.w;out.height=box.h;out.getContext('2d')!.drawImage(probe,box.x,box.y,box.w,box.h,0,0,box.w,box.h);
  scene.textures.remove(key);const fitted=scene.textures.addCanvas(key,out);if(fitted)fitted.get('__BASE').customData={fittedWorldHub:true};ART[key]={w:340,h:Math.round(340*box.h/box.w)};
 }
}
export const cachedWorlds=()=>[...cache.keys()];
