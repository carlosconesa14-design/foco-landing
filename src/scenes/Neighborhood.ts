import { BUSINESS_DISTRICTS } from '../art/businessWorld';
import Phaser from 'phaser';
import { art } from '../art/catalog';
import { swapArt } from '../art/generated';
import { mix } from '../art/pen';
import { calmWorld } from './common';
import { cityDef } from '../game/state';

type Point={x:number;y:number};
type Options={city:string;biz?:string;name?:string;cols:number;rows:number;iso:(c:number,r:number)=>Point};
/** Noninteractive scenery outside the playable grid; fixed small actor budget. */
export class Neighborhood {
  readonly bounds:{left:number;top:number;right:number;bottom:number};
  private elapsed=0;
  private traffic:{image:Phaser.GameObjects.Image;a:Point;b:Point;phase:number}[]=[];
  private boat?: {image:Phaser.GameObjects.Image;x:number;y:number};
  private walkers:{image:Phaser.GameObjects.Image;a:Point;b:Point;phase:number;role:string}[]=[];
  private birds:{image:Phaser.GameObjects.Graphics;x:number;y:number;phase:number}[]=[];
  private lamps:{glow:Phaser.GameObjects.Ellipse}[]=[];
  private cars:{image:Phaser.GameObjects.Image;a:Point;b:Point;g:[number,number,number,number];t:number;speed:number}[]=[];
  /** Neighbour footprints in grid units, so cars sort correctly against tall buildings. */
  private feet:{c0:number;r0:number;c1:number;r1:number;depth:number}[]=[];
  /** Camera colour behind the outermost, faded blocks. */
  backdrop?:number;
  constructor(scene:Phaser.Scene,o:Options){
    if(o.biz){this.bounds=this.district(scene,o as Options&{biz:string});return;}
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
    const district=biz?BUSINESS_DISTRICTS[biz]:city;
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
    for(let n=0;n<2;n++){
      const a=iso(1+n*.35,rows+.35),b=iso(cols-1+n*.35,rows+.35);
      const image=art(scene,a.x,a.y,`car_${n}`).setOrigin(.5,1).setDisplaySize(38,28);
      this.traffic.push({image,a,b,phase:n/2});
    }
    this.update(0);
  }
  /**
   * Business screens: the plot sits inside a real block of its city. Around it, an avenue and
   * pavements, a ring of neighbouring blocks (same trade: warehouses next to the warehouse,
   * terraces next to the restaurant…), an outer road with cross streets and a hazier far ring.
   * Fixed budget: ~30 static images, 12 cars, 6 walkers, 3 birds.
   */
  private district(scene:Phaser.Scene,o:Options&{biz:string}){
    const {iso,cols,rows,city,biz}=o;
    const mid=Math.floor(cols/2),E=10,R=6; // E: extent of the drawn world; R: outer road distance
    const miami=city==='miami',dubai=city==='dubai';
    const own=BUSINESS_DISTRICTS[biz]??city;
    // Ground palette by family: Madrid's three trades keep their own; Miami and Dubái use the city's.
    const kind=own==='industrial'||own==='terrace'?own:own==='neon'||own==='technology'?'neon':city;
    const pal={
      industrial:{lot:0xa3abad,walk:0xd5d9d6,far:0x8f999d},
      terrace:{lot:0xcdb497,walk:0xe9dccb,far:0xb9a58f},
      neon:{lot:0x6d6a8a,walk:0xa9a6c4,far:0x5d5a7a},
      madrid:{lot:0x8fae88,walk:0xd9dccf,far:0x86a283},
      miami:{lot:0xe7d6ae,walk:0xf4e8cb,far:0xd9c8a0},
      dubai:{lot:0xdcc59a,walk:0xf0e2c2,far:0xe2c48e},
    }[kind]!;
    this.backdrop=pal.far;
    const sea=(c:number)=>miami&&c>=cols+5, beach=(c:number)=>miami&&c>=cols+2;
    const inPlay=(c:number,r:number)=>c>=0&&c<cols&&r>=0&&r<rows;
    const road=(c:number,r:number):boolean=>{
      if(sea(c)||(beach(c)&&!(c<=cols&&r<=rows)))return false;
      if((c===-1||c===cols)&&r>=-1&&r<=rows)return true;
      if((r===-1||r===rows)&&c>=-1&&c<=cols)return true;
      if((c===-R-1||c===cols+R)&&r>=-R-1&&r<=rows+R)return true;
      if((r===-R-1||r===rows+R)&&c>=-R-1&&c<=cols+R)return true;
      if(c===mid&&(r<-1||r>rows))return true;
      if(r===mid&&(c<-1||c>cols))return true;
      return false;
    };
    // Under everything: the far blocks sit at negative screen y, below any small negative depth.
    const ground=scene.add.graphics().setDepth(-1e6);
    const dist=(c:number,r:number)=>Math.max(-c,c-cols+1,-r,r-rows+1);
    for(let r=-E;r<rows+E;r++)for(let c=-E;c<cols+E;c++){
      if(inPlay(c,r))continue;
      const p=iso(c,r),pts=[{x:p.x,y:p.y},{x:p.x+44,y:p.y+22},{x:p.x,y:p.y+44},{x:p.x-44,y:p.y+22}];
      const d=dist(c,r),fade=d>R+1?Math.max(.35,1-(d-R-1)*.2):1;
      if(sea(c)){
        ground.fillStyle(0x5cc0d4,1).fillPoints(pts,true);
        if((c*3+r)%4===0)ground.lineStyle(1.5,0xe9fbff,.55).lineBetween(p.x-12,p.y+20,p.x+8,p.y+30);
        continue;
      }
      if(road(c,r)){
        ground.fillStyle(mix(0x4d5b68,pal.far,1-fade),1).fillPoints(pts,true);
        const alongC=(r===-1||r===rows||r===-R-1||r===rows+R||r===mid)&&!(c===-1||c===cols||c===-R-1||c===cols+R||c===mid);
        const alongR=!alongC&&!(r===-1||r===rows||r===-R-1||r===rows+R||(r===mid&&(c<-1||c>cols)));
        if(alongC&&(c&1))ground.lineStyle(2,0xf2e6b0,.55*fade).lineBetween(p.x-12,p.y+16,p.x+12,p.y+28);
        if(alongR&&(r&1))ground.lineStyle(2,0xf2e6b0,.55*fade).lineBetween(p.x+12,p.y+16,p.x-12,p.y+28);
        continue;
      }
      const nearRoad=[[1,0],[-1,0],[0,1],[0,-1]].some(([dc,dr])=>road(c+dc,r+dr)||inPlay(c+dc,r+dr));
      const base=beach(c)?0xf1dfb4:dubai&&d>R+1?0xe6c992:nearRoad?pal.walk:pal.lot;
      ground.fillStyle(mix(base,pal.far,Math.max(.18,1-fade)),1).fillPoints(pts,true);
      ground.lineStyle(1,mix(base,0x000000,.12),.35*fade).strokePoints(pts,true);
      if(!nearRoad&&!beach(c)&&(c*7+r*3)%5===0)ground.fillStyle(0xffffff,.1*fade).fillCircle(p.x+6,p.y+22,2.5);
    }
    // Neighbouring buildings: the same trade around the plot (warehouses beside the warehouse…),
    // the rest of the city further out.
    const siblings=kind==='neon'?['tiktok','ai']:[biz];
    const trade=[`district_${own}`,`district_${own}`,...siblings.flatMap(id=>[`bld_${id}_1`,`bld_${id}_2`,`bld_${id}_3`])];
    const others=cityDef(city).businesses.map(b=>b.id).filter(id=>!siblings.includes(id)).flatMap(id=>[`bld_${id}_1`,`bld_${id}_2`,`bld_${id}_3`]);
    const near=kind===city?[...trade,...others]:trade;
    const far=[...trade,`district_${city}`,`district_${city}`,...others];
    if(kind==='neon')trade.push('district_neon','district_technology');
    let seed=biz.length*31+cols;
    const pick=(list:string[])=>{seed=(seed*9301+49297)%233280;return list[seed%list.length];};
    // Filler is quieter than the business: a touch of the backdrop colour on every neighbour.
    const filler=mix(0xffffff,pal.far,.28),fillerFar=mix(0xffffff,pal.far,.45);
    const put=(cc:number,rr:number,list:string[],alpha:number)=>{
      if(beach(Math.floor(cc))||(dubai&&alpha<1))return;
      // In front of the plot (screen-below it) a tall building would hide the business: a car park instead.
      if(alpha===1&&(cc>cols||rr>rows)&&Math.abs(cc-rr)<cols+2){parking(cc,rr);return;}
      const key=pick(list),wide=key.startsWith('district_'),scale=alpha<1?1:1.1,half=(wide?1.5:1)*scale;
      const p=iso(cc+half,rr+half);
      const img=art(scene,p.x,p.y,key).setOrigin(.5,1).setDepth(p.y).setFlipX(seed%3===0);
      this.feet.push({c0:cc-half,r0:rr-half,c1:cc+half,r1:rr+half,depth:p.y});
      img.setDisplaySize(img.displayWidth*scale,img.displayHeight*scale).setTint(alpha<1?fillerFar:filler);
      if(alpha<1)img.setAlpha(alpha);
    };
    const parkedCars=miami?['car_miami_0','car_miami_1']:['car_0','car_1','car_2','car_3','van'];
    const parking=(cc:number,rr:number)=>{
      const lot=scene.add.graphics().setDepth(-1e6+1);
      const q=(c:number,r:number)=>iso(c,r);
      const corners=[q(cc-1.5,rr-1.5),q(cc+1.5,rr-1.5),q(cc+1.5,rr+1.5),q(cc-1.5,rr+1.5)];
      lot.fillStyle(mix(0x5b6773,pal.far,.3),1).fillPoints(corners,true);
      for(let k=-1;k<=1.01;k+=1){const a=q(cc+k,rr-1.4),b=q(cc+k,rr+1.4);lot.lineStyle(2,0xf4f1e6,.55).lineBetween(a.x,a.y,b.x,b.y);}
      for(const [dc,dr] of [[-.5,-.7],[.5,.6],[-.5,.6]]){
        const p=q(cc+dc,rr+dr);
        art(scene,p.x,p.y+6,pick(parkedCars)).setOrigin(.5,.72).setDepth(p.y).setTint(filler).setFlipX(true);
      }
      const t1=q(cc+1.5,rr-1.5),t2=q(cc-1.5,rr+1.5);
      for(const t of [t1,t2])art(scene,t.x,t.y,miami?'palm':dubai?'desert_palm':'tree_0').setOrigin(.5,1).setDepth(t.y).setTint(filler);
    };
    const ring=(back:number,front:number,along:number[],list:string[],alpha:number)=>{
      const done=new Set<string>();
      for(const a of along)for(const [cc,rr] of [[a,back],[back,a],[a,front],[front,a]]){
        const k=`${cc},${rr}`;if(done.has(k))continue;done.add(k);put(cc,rr,list,alpha);
      }
    };
    ring(-R-3.5,cols+R+2.5,[-R-3.5,-3.5,.5,mid+3.5,cols+3.5,cols+R+2.5],far,.85);
    ring(-3.5,cols+3.5,[-3.5,.5,mid+3.5,cols+3.5],near,1);
    // Pavements: trees and street lamps (lamps glow at night).
    const tree=dubai?'desert_palm':miami?'palm':'tree_0';
    const lane=(fixed:number,alongC:boolean,from:number,to:number)=>{
      for(let a=from,n=0;a<=to;a+=2.6,n++){
        if(Math.abs(a-mid-.5)<1.2)continue;
        const c=alongC?a:fixed,r=alongC?fixed:a;if(beach(Math.floor(c)))continue;
        const p=iso(c,r);
        if(n%2===0){art(scene,p.x,p.y,n%4===0||kind==='neon'?tree:'tree_1').setOrigin(.5,1).setDepth(p.y);continue;}
        const glow=scene.add.ellipse(p.x,p.y,30,13,0xffdf8b,.1).setDepth(p.y-.2);
        art(scene,p.x,p.y,'lamp_post').setOrigin(.5,1).setDepth(p.y);
        this.lamps.push({glow});
      }
    };
    lane(-1.6,true,-1,cols+1);lane(-1.6,false,0,rows+1);lane(cols+1.6,false,-1,rows);lane(rows+1.6,true,0,cols+1);
    // Miami: beach, sea and a yacht off the promenade.
    if(miami){
      for(let n=0;n<3;n++){const p=iso(cols+3.2,1+n*3.4);art(scene,p.x,p.y,n%2?'palm':'decor_beachclub_2').setOrigin(.5,1).setDepth(p.y);}
      const b=iso(cols+7,3),boat=art(scene,b.x,b.y,'lux_yacht').setOrigin(.5,1).setDepth(b.y);
      this.boat={image:boat,x:boat.x,y:boat.y};
    }
    // Traffic: outer ring, cross streets and the three free sides of the avenue.
    const cars=miami?['car_miami_0','car_miami_1','car_2']:kind==='industrial'?['van','car_1','van','car_3']:['car_0','car_1','car_2','car_3','van'];
    const lanes:[number,number,number,number][]=[
      [-E,-R-.5,cols+E,-R-.5],[cols+R+.5,rows+E,cols+R+.5,-E],[cols+E,rows+R+.5,-E,rows+R+.5],[-R-.5,-E,-R-.5,rows+E],
      [mid+.3,-1,mid+.3,-E],[mid+.7,-E,mid+.7,-1],[mid+.5,rows+1,mid+.5,rows+E],
      [-1,mid+.5,-E,mid+.5],[cols+1,mid+.5,cols+E,mid+.5],
    ];
    // (The avenue hugging the plot stays free of through traffic: cars there brushed the walls.)
    // The vehicle art only has a front view: every lane runs down the screen (+c or +r),
    // otherwise cars would look like they slide sideways.
    lanes.forEach(([c0,r0,c1,r1],i)=>{
      if(c1<c0||r1<r0)[c0,r0,c1,r1]=[c1,r1,c0,r0];
      if(miami&&(c0>cols+1||c1>cols+1))return;
      const a=iso(c0,r0);
      const image=art(scene,a.x,a.y,cars[i%cars.length]).setOrigin(.5,.72);
      image.setFlipX((c1-c0)-(r1-r0)<0);
      this.cars.push({image,a:iso(c0,r0),b:iso(c1,r1),g:[c0,r0,c1,r1],t:(i*.37)%1,speed:.035+(i%3)*.01});
    });
    // The business plot stands out: a gold kerb with a soft glow and a name sign at the entrance corner.
    const plot=[iso(0,0),iso(cols,0),iso(cols,rows),iso(0,rows)];
    const kerb=scene.add.graphics().setDepth(-9);
    kerb.lineStyle(26,0xffd36b,.18).strokePoints(plot,true);
    kerb.lineStyle(7,0xffd36b,.95).strokePoints(plot,true);
    kerb.lineStyle(2,0xfff5d5,.9).strokePoints(plot,true);
    if(o.name){
      const sp=iso(cols-1.2,rows+1.7);
      const pole=scene.add.graphics().setDepth(sp.y+2);
      pole.fillStyle(0x24445c,1).fillRect(sp.x-2,sp.y-58,4,58);
      const sign=scene.add.text(sp.x,sp.y-58,o.name,{fontFamily:'Lilita One, Rubik, sans-serif',fontSize:'15px',color:'#2e2200',backgroundColor:'#ffd36b',padding:{x:8,y:4}})
        .setOrigin(.5,1).setDepth(sp.y+3).setResolution(2);
      sign.setStroke('#fff5d5',0);
    }
    // Pedestrians on the pavements.
    const roles=miami?['vendor','promoter']:dubai?['butler','guide']:['sales','rider'];
    const walks:[number,number,number,number][]=[[-1.6,0,-1.6,rows],[0,-1.6,cols,-1.6],[cols+1.6,0,cols+1.6,rows],[-1.6,rows,-1.6,-1],[cols,-1.6,0,-1.6],[0,rows+1.6,cols,rows+1.6]];
    walks.forEach(([c0,r0,c1,r1],n)=>{
      const a=iso(c0,r0),b=iso(c1,r1),role=roles[n%2];
      const image=art(scene,a.x,a.y,`ch_${role}_0`).setOrigin(.5,1).setDisplaySize(29,40);
      this.walkers.push({image,a,b,phase:n/6,role});
    });
    for(let n=0;n<3;n++){
      const p=iso(1+n*4,-3),image=scene.add.graphics().setDepth(50000);
      image.lineStyle(1.5,0x385f73,.7).beginPath().moveTo(-7,2).lineTo(-3,0).lineTo(0,3).lineTo(3,0).lineTo(7,2).strokePath();
      this.birds.push({image,x:p.x,y:p.y-75,phase:n*2});
    }
    this.update(0);
    const span=R+2.5,corners=[iso(-span,-span),iso(cols+span,-span),iso(cols+span,rows+span),iso(-span,rows+span)];
    return {left:Math.min(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y))-160,right:Math.max(...corners.map(p=>p.x)),bottom:Math.max(...corners.map(p=>p.y))};
  }
  /** Painter's order against neighbour buildings (see CityScene.actorDepth). */
  private depthAt(c:number,r:number,y:number){
    let lo=-Infinity,hi=Infinity;const x=c-r;
    for(const f of this.feet){
      if(x+.6<f.c0-f.r1||x-.6>f.c1-f.r0)continue;
      if(c>=f.c1||r>=f.r1)lo=Math.max(lo,f.depth);
      else if(c<=f.c0||r<=f.r0)hi=Math.min(hi,f.depth);
    }
    if(y<=lo)y=lo+.5;
    if(y>=hi&&hi>lo)y=hi-.5;
    return y;
  }
  update(dt:number){
    if(!calmWorld())this.elapsed+=Math.min(dt,.1);
    for(const car of this.traffic){
      const p=(this.elapsed/18+car.phase)%1;
      car.image.setPosition(car.a.x+(car.b.x-car.a.x)*p,car.a.y+(car.b.y-car.a.y)*p).setDepth(car.image.y).setAlpha(Math.min(1,p*12,(1-p)*12));
    }
    for(const w of this.walkers){
      const t=(this.elapsed/28+w.phase)%2,p=t<1?t:2-t;
      w.image.setPosition(w.a.x+(w.b.x-w.a.x)*p,w.a.y+(w.b.y-w.a.y)*p).setDepth(w.image.y).setFlipX(t>=1);
      swapArt(w.image,`ch_${w.role}_${calmWorld()?0:1+Math.floor(this.elapsed*5)%2}`);
    }
    for(const car of this.cars){
      if(!calmWorld())car.t=(car.t+car.speed*Math.min(dt,.1))%1;
      car.image.setPosition(car.a.x+(car.b.x-car.a.x)*car.t,car.a.y+(car.b.y-car.a.y)*car.t);
      const [c0,r0,c1,r1]=car.g;
      car.image.setDepth(this.depthAt(c0+(c1-c0)*car.t,r0+(r1-r0)*car.t,car.image.y+1));
      car.image.setAlpha(Phaser.Math.Clamp(Math.min(car.t,1-car.t)*12,0,1));
    }
    if(this.boat)this.boat.image.setPosition(this.boat.x+Math.sin(this.elapsed/9)*18,this.boat.y+Math.sin(this.elapsed*1.5)*3);
    for(const b of this.birds)b.image.setPosition(b.x+Math.sin(this.elapsed/8+b.phase)*65,b.y+Math.sin(this.elapsed*1.4+b.phase)*3);
    const hour=new Date().getHours(),night=hour<7||hour>=20;
    for(const l of this.lamps)l.glow.setAlpha(night?.45:.08);
  }
}
