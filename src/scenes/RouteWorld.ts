import Phaser from 'phaser';
import { art } from '../art/catalog';
import { calmWorld } from './common';
import { ROUTE_MATERIAL } from '../art/worldThemes';

/** Bounded cosmetic world details; all production/stock/upgrade decisions stay in businessView. */
export class RouteWorld {
 private fx: Phaser.GameObjects.Graphics;
 private street: Phaser.GameObjects.Graphics;
 private lighting: Phaser.GameObjects.Graphics;
 private pulse=0;
 private hour=-1;
 private lightAt=-Infinity;
 constructor(private scene:Phaser.Scene,private id:string,private width:number,private ground:number,private crossings:number[],private city:string){
  this.fx=scene.add.graphics().setDepth(4.4);this.street=scene.add.graphics().setDepth(29);this.lighting=scene.add.graphics().setDepth(5.5);
  if(id==='fest'&&scene.textures.exists('prop_fest_ticketbooth'))art(scene,width*.74,ground+15,'prop_fest_ticketbooth').setOrigin(.5,1).setDepth(6);
 }
 update(dt:number):void{
  if(!calmWorld())this.pulse+=dt;
  const t=this.pulse,W=this.width,g=this.ground,type=ROUTE_MATERIAL[this.id];
  const f=this.fx;f.clear();
  const top=this.scene.cameras.main.scrollY,bottom=top+this.scene.scale.height/this.scene.cameras.main.zoom;
  for(const y of this.crossings){if(y<top-40||y>bottom+40)continue;
   if(type==='conveyor')for(let x=45;x<W-120;x+=13){const shift=calmWorld()?0:Math.sin(t*4+x)*1.5;f.lineStyle(3,0xc4d1d9,.9).lineBetween(x,y-10+shift,x,y+10+shift);}
   if(type==='fibre'||type==='cable')for(let k=0;k<3;k++){const x=45+(t*48+k*67)%(W-170);f.fillStyle(type==='fibre'?0x6fffe5:0xff78da,.9).fillCircle(x,y,3);}
   if(type==='sand')for(let x=50;x<W-120;x+=16){f.fillStyle(0x936e42,.42).fillEllipse(x,y-5,5,3).fillEllipse(x+8,y+5,5,3);}
   if(type==='boardwalk'||type==='pier'||type==='scaffold')for(let x=45;x<W-120;x+=19){f.lineStyle(1.5,0x513b2b,.55).lineBetween(x,y-12,x,y+12);f.fillStyle(0xc3c8cf,.9).fillCircle(x+3,y-9,1).fillCircle(x+3,y+9,1);}
   if(type==='track')for(let x=48;x<W-120;x+=15){f.fillStyle((Math.floor(x/15)%2)?0xf4f7fc:0xdf5547).fillRect(x,y-15,15,4).fillRect(x,y+11,15,4);}
   if(type==='carpet'){f.lineStyle(2,0xffcf6b,.85).lineBetween(45,y-12,W-125,y-12).lineBetween(45,y+12,W-125,y+12);}
   if(type==='fair')for(let x=46;x<W-120;x+=22)f.fillStyle((Math.floor(x/22)%2)?0xffde76:0xff8cce,.5+Math.sin(t*2+x)*.2).fillCircle(x,y-13,2);
  }
  const a=this.street;a.clear();
  if(['foodtruck','beachclub','yachts'].includes(this.id)){
   for(let k=0;k<3;k++){const x=20+k*120+(calmWorld()?0:Math.sin(t*.7+k)*8);a.lineStyle(2,0xecfcff,.55).beginPath().moveTo(x,g+20).lineTo(x+38,g+20).strokePath();}
   for(let k=0;k<2;k++){const x=(t*15+k*180)%(W+40)-20,y=g-215+Math.sin(t+k)*4;a.lineStyle(2,0xffffff,.9).beginPath().moveTo(x-6,y).lineTo(x,y-3).lineTo(x+6,y).strokePath();}
  }else if(this.id==='restaurant'){
   for(let k=0;k<3;k++)a.lineStyle(2,0xffffff,.3).beginPath().moveTo(W*.42+k*9,g-90).lineTo(W*.42+k*9+Math.sin(t+k)*5,g-110-((t*9+k*8)%15)).strokePath();
  }else if(this.id==='tiktok'){
   for(let k=0;k<2;k++){a.fillStyle(k?0xff79bd:0x86f4ff,.07).fillTriangle(22+k*(W-44),g-230,W*.45+Math.sin(t+k)*30,g-15,W*.55+Math.sin(t+k)*30,g-15);}
  }else if(this.id==='ai'||this.id==='crypto'){
   for(let k=0;k<5;k++)a.fillStyle(this.id==='ai'?0x5bf0db:0xffd36b,.55+Math.sin(t*2+k)*.3).fillRoundedRect(W/2-38+k*19,g-190,5,3,1);
  }else if(this.id==='hotel'){
   for(const x of [24,W-24]){a.fillStyle(0x67bed7,.6).fillEllipse(x,g+4,32,9);for(let k=0;k<3;k++)a.lineStyle(1.5,0xb5f4ff,.65).beginPath().moveTo(x+k*3-3,g).lineTo(x+Math.sin(t+k)*4,g-18-k*3).strokePath();}
  }else if(this.id==='realestate'){
   for(const x of [25,W-25])a.lineStyle(1.5,0x8dddeb,.65).beginPath().moveTo(x,g-1).lineTo(x+(Math.sin(t)*7),g-16).lineTo(x+20,g-2).strokePath();
  }else if(this.id==='safari'){
   for(let k=0;k<3;k++)a.fillStyle(0xe1b879,.2).fillEllipse((t*12+k*120)%(W+50)-25,g+18-k*5,45,10);
  }else if(this.id==='souk'||this.id==='fest'){
   const count=this.id==='fest'?9:4;a.lineStyle(2,0x21364b,.8).lineBetween(8,g-238,W-8,g-238);
   for(let k=0;k<count;k++){const x=18+k*(W-36)/Math.max(1,count-1),y=g-233+Math.sin(t+k)*1.5;a.fillStyle(k%2?0xffd36b:0xff94b6,.8).fillRoundedRect(x-3,y,6,this.id==='fest'?7:13,3);}
  }else if(this.id==='supercars'){
   for(const x of [17,W-17]){a.lineStyle(2,0x0b2440).lineBetween(x,g-130,x,g-80);for(let r=0;r<3;r++)for(let c=0;c<3;c++)a.fillStyle((r+c)%2?0x182e44:0xfff8e6).fillRect(x+c*4,g-130+r*4,4,4);}
  }else if(this.id==='tower'){
   const x=23;a.lineStyle(3,0xe0a13c).lineBetween(x,g-30,x,g-205).lineBetween(x-12,g-205,x+60,g-205);a.lineStyle(1,0x1e384c).lineBetween(x+42+Math.sin(t)*5,g-204,x+42+Math.sin(t)*5,g-166);
  }else if(this.id==='dropship'){
   for(let k=0;k<3;k++)a.fillStyle(0xffc24c,.5+Math.sin(t*3+k)*.3).fillCircle(W/2+35+k*12,g-44,2);
  }
  this.updateLighting();
 }
 private updateLighting():void{
  if(this.scene.time.now<this.lightAt)return;this.lightAt=this.scene.time.now+60000;
  const zone=this.city==='miami'?'America/New_York':this.city==='dubai'?'Asia/Dubai':'Europe/Madrid';
  const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:zone}).format(new Date()));
  if(hour===this.hour)return;this.hour=hour;
  const night=hour<7||hour>=20||['tiktok','ai','crypto','fest'].includes(this.id);
  this.lighting.clear();if(!night)return;
  const g=this.ground,W=this.width;this.lighting.fillStyle(0x183357,.18).fillRect(0,g-280,W,280);
  for(let k=0;k<5;k++){this.lighting.fillStyle(0xffd98b,.22).fillCircle(W/2-40+k*20,g-110-(k%2)*30,8);this.lighting.fillStyle(0xffe7a9,.65).fillRoundedRect(W/2-42+k*20,g-113-(k%2)*30,4,7,1);}
 }
}
