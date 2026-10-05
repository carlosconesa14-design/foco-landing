import Phaser from 'phaser';
import { art } from '../art/catalog';
import { swapArt } from '../art/generated';
import { calmWorld } from './common';

type Point={x:number;y:number};
type Options={city:string;biz?:string;cols:number;rows:number;iso:(c:number,r:number)=>Point};
/** Noninteractive scenery outside the playable grid; fixed small actor budget. */
export class Neighborhood {
  readonly bounds:{left:number;top:number;right:number;bottom:number};
  private elapsed=0;
  private boat?: {image:Phaser.GameObjects.Image;x:number;y:number};
  private walkers:{image:Phaser.GameObjects.Image;a:Point;b:Point;phase:number;role:string}[]=[];
  private birds:{image:Phaser.GameObjects.Graphics;x:number;y:number;phase:number}[]=[];
  private lamps:{glow:Phaser.GameObjects.Ellipse}[]=[];
  constructor(scene:Phaser.Scene,o:Options){
    const {iso,cols,rows,city,biz}=o;
    const outer=3;
    const corners=[iso(-outer,-outer),iso(cols+outer,-outer),iso(cols+outer,rows+outer),iso(-outer,rows+outer)];
    this.bounds={left:Math.min(...corners.map(p=>p.x))-50,top:Math.min(...corners.map(p=>p.y))-230,right:Math.max(...corners.map(p=>p.x))+50,bottom:Math.max(...corners.map(p=>p.y))+60};
    const ground=scene.add.graphics().setDepth(-16);
    for(let r=-outer;r<rows+outer;r++)for(let c=-outer;c<cols+outer;c++){
      if(c>=0&&c<cols&&r>=0&&r<rows)continue;
      const p=iso(c,r),avenue=c===-1||r===-1||c===cols||r===rows;
      const pts=[{x:p.x,y:p.y},{x:p.x+44,y:p.y+22},{x:p.x,y:p.y+44},{x:p.x-44,y:p.y+22}];
      ground.fillStyle(avenue?0x526575:city==='miami'?0xe4d4ad:city==='dubai'?0xd7bd91:0x79968b,1).fillPoints(pts,true);
      if(avenue){ground.lineStyle(1,0xdce6de,.42).lineBetween(p.x-15,p.y+14,p.x+15,p.y+29);}
      else {
        ground.lineStyle(1,city==='miami'?0xc9b993:city==='dubai'?0xc6a678:0x68877b,.3).strokePoints(pts,true);
        if((c+r)%3===0)ground.fillStyle(0xffffff,.12).fillCircle(p.x+7,p.y+23,2);
      }
    }
    // Soft atmospheric edge across the outermost paving; no vertical cliff.
    const rim=scene.add.graphics().setDepth(-14);
    for(let width=24;width>=8;width-=8)rim.lineStyle(width,city==='miami'?0xe8d6ad:city==='dubai'?0xe8cd9b:0x90b5a2,.08).strokePoints(corners,true);
    const district=biz==='dropship'?'industrial':biz==='restaurant'?'terrace':biz==='tiktok'||biz==='ai'?'neon':city;
    for(const [c,r] of [[1,-2],[cols-2,-2],[-2,3],[-2,rows-2],[cols+2,3],[2,rows+2]]){
      const p=iso(c,r);art(scene,p.x,p.y+22,`district_${district}`).setOrigin(.5,1).setDepth(p.y-5).setAlpha(.92);
    }
    // A visible promenade on the ocean side, rather than a sheer island wall.
    if(city==='miami'){
      const a=iso(cols+2,rows+1),b=iso(cols+2,1);
      ground.lineStyle(28,0xf3d7ad,.9).lineBetween(a.x,a.y,b.x,b.y);
      ground.lineStyle(5,0xb9edef,.65).lineBetween(a.x+22,a.y+11,b.x+22,b.y+11);
      const boat=art(scene,b.x+75,b.y+90,'lux_yacht').setOrigin(.5,1).setDepth(-12);
      this.boat={image:boat,x:boat.x,y:boat.y};
    }
    for(let n=0;n<4;n++){
      const p=iso(n%2?cols+.6:-1.5,1+n*3);
      art(scene,p.x,p.y,city==='dubai'?'dubai_planter':city==='miami'?'palm':'tree_0').setOrigin(.5,1).setDepth(p.y);
      const glow=scene.add.ellipse(p.x+20,p.y,28,12,0xffdf8b,.12).setDepth(p.y-.2);
      const pole=scene.add.graphics().setDepth(p.y);
      pole.lineStyle(3,0x31495b,1).lineBetween(p.x+20,p.y,p.x+20,p.y-38);
      pole.fillStyle(0xffe7a0,1).fillRoundedRect(p.x+15,p.y-43,10,6,2);this.lamps.push({glow});
    }
    const roles=city==='miami'?['vendor','promoter']:city==='dubai'?['butler','guide']:['sales','rider'];
    for(let n=0;n<6;n++){
      const a=iso(n%2?cols+.7:-.7,n%2?1:rows-1),b=iso(n%2?cols+.7:-.7,n%2?rows-1:1);
      const role=roles[n%2],image=art(scene,a.x,a.y,`ch_${role}_0`).setOrigin(.5,1).setDisplaySize(29,40);
      this.walkers.push({image,a,b,phase:n/6,role});
    }
    for(let n=0;n<3;n++){
      const p=iso(2+n*3,-1),image=scene.add.graphics().setDepth(50000);
      image.lineStyle(1.5,0x385f73,.7).beginPath().moveTo(-7,2).lineTo(-3,0).lineTo(0,3).lineTo(3,0).lineTo(7,2).strokePath();
      this.birds.push({image,x:p.x,y:p.y-75,phase:n*2});
    }
    this.update(0);
  }
  update(dt:number){
    if(!calmWorld())this.elapsed+=Math.min(dt,.1);
    for(const w of this.walkers){
      const t=(this.elapsed/28+w.phase)%2,p=t<1?t:2-t;
      w.image.setPosition(w.a.x+(w.b.x-w.a.x)*p,w.a.y+(w.b.y-w.a.y)*p).setDepth(w.image.y).setFlipX(t>=1);
      swapArt(w.image,`ch_${w.role}_${calmWorld()?0:1+Math.floor(this.elapsed*5)%2}`);
    }
    if(this.boat)this.boat.image.setPosition(this.boat.x+Math.sin(this.elapsed/9)*18,this.boat.y+Math.sin(this.elapsed*1.5)*3);
    for(const b of this.birds)b.image.setPosition(b.x+Math.sin(this.elapsed/8+b.phase)*65,b.y+Math.sin(this.elapsed*1.4+b.phase)*3);
    const hour=new Date().getHours(),night=hour<7||hour>=20;
    for(const l of this.lamps)l.glow.setAlpha(night?.45:.08);
  }
}
