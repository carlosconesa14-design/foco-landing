/** Reproducible original-source export; no generated text is used in marketing. */
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const site='site/img',social='marketing/tiktok/arte';
const frames=JSON.parse(await readFile(`${site}/source/assets.json`));
async function exportPNG(name,w,h,input,extract){
 let p=sharp(input);if(extract)p=p.extract(extract);
 await p.resize(w,h,{fit:'contain',background:'#00000000'}).png().toFile(`${site}/${name}.png`);
}
for(const [key,f] of Object.entries(frames)){
 const sizes={rider:[600,800],league:[800,560],'city-madrid':[800,560],'city-miami':[800,560],'city-dubai':[800,560],'step-open':[256,256],'step-manager':[256,256],'step-expand':[256,256]};
 await exportPNG(key,...sizes[key],`${site}/source/assets.png`,f);
}
await exportPNG('step-manager',256,256,`${site}/source/manager-clean.png`);
await sharp(`${site}/source/hero.png`).resize(1600,1000,{fit:'cover'}).png().toFile(`${site}/hero.png`);
for(const size of [32,180])await sharp('public/brand/app-icon-1024.png').resize(size,size).png().toFile(`${site}/favicon-${size}.png`);
const inputs={};for(const id of ['rider','city-madrid','city-miami','city-dubai','hero'])inputs[id]=`data:image/png;base64,${(await readFile(`${site}/${id}.png`)).toString('base64')}`;
inputs.logo=`data:image/svg+xml;base64,${(await readFile('public/brand/logo-dark.svg')).toString('base64')}`;
inputs.coin=`data:image/png;base64,${(await readFile('public/sprites/coin.png')).toString('base64')}`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const files=await page.evaluate(async inputs=>{
  const im={};for(const [k,v] of Object.entries(inputs)){im[k]=new Image();im[k].src=v;await im[k].decode();}
  const out={};let c,x;
  function begin(w,h){c=document.createElement('canvas');c.width=w;c.height=h;x=c.getContext('2d');}
  function save(path){out[path]=c.toDataURL('image/png').split(',')[1];}
  function bg(top='#10273e',bottom='#235672'){const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,top);g.addColorStop(1,bottom);x.fillStyle=g;x.fillRect(0,0,c.width,c.height);}
  function logo(y,w=860){x.drawImage(im.logo,(c.width-w)/2,y,w,w*149/470);}
  begin(900,1200);bg();x.drawImage(im['city-madrid'],0,360,600,420);x.drawImage(im['city-miami'],350,310,550,385);x.drawImage(im['city-dubai'],390,570,500,350);x.drawImage(im.rider,195,520,510,680);save('site/img/hero-mobile.png');
  begin(520,1040);x.fillStyle='#0e1a2b';x.beginPath();x.roundRect(0,0,520,1040,64);x.fill();x.globalCompositeOperation='destination-out';x.beginPath();x.roundRect(18,18,484,1004,48);x.fill();x.globalCompositeOperation='source-over';x.strokeStyle='#7391af';x.lineWidth=4;x.beginPath();x.roundRect(3,3,514,1034,61);x.stroke();x.fillStyle='#0e1a2b';x.beginPath();x.roundRect(174,14,172,32,15);x.fill();save('site/img/phone-frame.png');
  for(const lang of ['es','en']){
   begin(1200,630);bg();x.drawImage(im['city-madrid'],600,190,600,420);x.drawImage(im.rider,810,100,370,493);x.drawImage(im.logo,38,80,720,228);x.fillStyle='#f5c542';x.font='bold 46px sans-serif';x.fillText(lang==='es'?'De rider a millonario':'From rider to millionaire',42,392);save(`site/img/og-image${lang==='en'?'-en':''}.png`);
   begin(1080,1920);bg();logo(175);x.drawImage(im['city-miami'],0,625,1080,756);x.drawImage(im.rider,200,665,680,907);x.fillStyle='#10273e';x.beginPath();x.roundRect(100,1610,880,170,45);x.fill();save(`marketing/tiktok/arte/endcard${lang==='en'?'-en':''}.png`);
  }
  for(const [id,a,b] of [['madrid','#183e61','#61babc'],['miami','#463263','#f49c73'],['dubai','#071627','#243760']]){begin(1080,1920);bg(a,b);x.drawImage(im[`city-${id}`],-40,850,1160,812);save(`marketing/tiktok/arte/cover-template-${id}.png`);}
  begin(400,400);bg('#24b382','#24b382');x.save();x.beginPath();x.arc(200,200,196,0,Math.PI*2);x.clip();x.drawImage(im.rider,145,10,300,280,0,0,400,400);x.restore();save('marketing/tiktok/arte/avatar.png');
  for(let i=0;i<6;i++){begin(600,180);x.fillStyle=['#ff6b5b','#3ddc97','#f5c542','#8e77db','#47b9d7','#f5c542'][i];x.strokeStyle='#0e1a2b';x.lineWidth=12;x.beginPath();x.roundRect(8,14,584,152,35);x.fill();x.stroke();save(`marketing/tiktok/arte/sticker-${['atasco','gerente','x3','nivel-maximo','salida-bolsa','record'][i]}.png`);}
  begin(2048,256);for(let f=0;f<8;f++){let p=f/7;x.globalAlpha=f===7?0:Math.min(1,(1-p)*2.5);for(let n=0;n<9;n++){let a=n*Math.PI*2/9;let r=16+p*93;let s=26*(1-p*.55);x.drawImage(im.coin,f*256+128+Math.cos(a)*r-s/2,128+Math.sin(a)*r-s/2,s,s);}}x.globalAlpha=1;save('marketing/tiktok/arte/coin-burst.png');
  return out;
 },inputs);
 for(const [path,data] of Object.entries(files))await writeFile(path,Buffer.from(data,'base64'));
}finally{await browser.close();}
for(const dir of [site,social]){const {readdir}=await import('node:fs/promises');for(const name of await readdir(dir))if(name.endsWith('.png'))await sharp(`${dir}/${name}`).webp({quality:90,alphaQuality:100}).toFile(`${dir}/${name.replace('.png','.webp')}`);}
console.log('Marketing PNG and WebP exported.');
