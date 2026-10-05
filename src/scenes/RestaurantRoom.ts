import { t } from "../i18n";
import Phaser from "phaser";
import { art, ART } from "../art/catalog";
import { swapArt } from "../art/generated";
import type { BusinessState } from "../game/state";
import { DiningRoom } from "./dining";
import { actorShadow, gait } from "./motion";
import { label, calmWorld } from "./common";

type Point = { x: number; y: number };
type Grid = [number, number];
export const RESTAURANT_SLOTS: Grid[] = [[1,1],[3,1],[5,1],[7,1],[7,3],[5,3],[3,3],[1,3]];
export const RESTAURANT_DOOR: Grid = [4.5,4.8];
export const RESTAURANT_ROUTE: Grid[] = [RESTAURANT_DOOR,[0.5,4.8],[0.5,2.5],[1.5,2.5],[3.5,2.5],[5.5,2.5],[7.5,2.5],[8.5,2.5],[8.5,4.5],[7.5,4.5],[5.5,4.5],[3.5,4.5],[1.5,4.5]];
export const RESTAURANT_STOPS = [0,3,4,5,6,9,10,11,12];
const TABLES: Grid[] = [[1.8,6],[7.2,6],[1.8,7.5],[7.2,7.5],[1.8,8.8],[7.2,8.8]];
const ENTRY: Grid = [5.6,9.3];
const HOST: Grid = [5.6,8.2];
const PASS: Grid = [4.5,5.0];

/** A restaurant interior rendered around the existing kitchen → collection → delivery chain. */
export class RestaurantRoom {
  readonly dining: DiningRoom;
  private tables: Phaser.GameObjects.Image[] = [];
  private guests = new Map<number, { image: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; bubble: Phaser.GameObjects.Text }>();
  private server!: Phaser.GameObjects.Image;
  private serverShadow!: Phaser.GameObjects.Ellipse;
  private status!: Phaser.GameObjects.Text;
  private readyGlow!: Phaser.GameObjects.Ellipse;
  private clock = 0;

  constructor(private scene: Phaser.Scene, private iso: (c: number, r: number) => Point, floors: number) {
    this.dining = new DiningRoom(floors);
  }

  private quad(g: Phaser.GameObjects.Graphics, c: number, r: number, w: number, h: number, color: number): void {
    g.fillStyle(color).fillPoints([this.iso(c,r),this.iso(c+w,r),this.iso(c+w,r+h),this.iso(c,r+h)].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
  }

  create(): void {
    const g = this.scene.add.graphics().setDepth(-10);
    const left = this.iso(0,10), bottom = this.iso(9,10), right = this.iso(9,0);
    g.fillStyle(0x946b50).fillPoints([left,bottom,{x:bottom.x,y:bottom.y+14},{x:left.x,y:left.y+14}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    g.fillStyle(0xbe946b).fillPoints([bottom,right,{x:right.x,y:right.y+14},{x:bottom.x,y:bottom.y+14}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    for (let r=0;r<10;r++) for(let c=0;c<9;c++) {
      const kitchen = r < 4.4;
      this.quad(g,c,r,1,1,r===9 ? 0x4a5861 : kitchen ? ((c+r)%2 ? 0xe7e5d8 : 0xd6ded4) : ((c+r)%2 ? 0xe8be94 : 0xf1cba7));
      if (r!==9) {
        { const e=this.iso(c+1,r+1),w=this.iso(c,r+1),n=this.iso(c+1,r); g.lineStyle(1,kitchen?0xffffff:0xb98a64,0.45).lineBetween(w.x,w.y,e.x,e.y).lineBetween(e.x,e.y,n.x,n.y); }
      } else {
        const a=this.iso(c+0.3,r+0.5),b=this.iso(c+0.7,r+0.5);
        g.lineStyle(2,0xffe6a4).lineBetween(a.x,a.y,b.x,b.y);
      }
    }
    // Burgundy service aisle separates the kitchen from the dining terrace.
    this.quad(g,0,4.5,9,0.3,0x994c47);
    this.quad(g,4.0,4.8,1,4.2,0xd5ad83);
    // Open roof: back walls, wall tiles and striped awning make the room readable at a glance.
    const wall=this.scene.add.graphics().setDepth(-3);
    const a=this.iso(0,0), b=this.iso(9,0), c=this.iso(0,4.5);
    wall.fillStyle(0xf7e8c9).fillPoints([a,b,{x:b.x,y:b.y-48},{x:a.x,y:a.y-48}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    wall.fillStyle(0xd9c6a8).fillPoints([a,c,{x:c.x,y:c.y-34},{x:a.x,y:a.y-48}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    wall.lineStyle(6,0xa64b43).lineBetween(a.x,a.y-48,b.x,b.y-48);
    for (let col=0;col<9;col++) {
      const p=this.iso(col+0.5,0);
      const hx=(this.iso(1,0).x-this.iso(0,0).x)/2,hy=(this.iso(1,0).y-this.iso(0,0).y)/2;
      wall.fillStyle(col%2?0xfff4d7:0xbc5347).fillPoints([{x:p.x-hx,y:p.y-35-hy},{x:p.x+hx,y:p.y-35+hy},{x:p.x+hx,y:p.y-26+hy},{x:p.x-hx,y:p.y-26-hy}].map(v=>new Phaser.Math.Vector2(v.x,v.y)),true);
    }
    const sign=this.iso(4.4,0);
    label(this.scene,sign.x,sign.y-57,t("LA TERRAZA"),17,"#fff4d3",{display:true,stroke:"#763e37"}).setDepth(0);
    const kitchen=this.iso(0.6,1.0);
    label(this.scene,kitchen.x,kitchen.y-47,t("COCINA ABIERTA"),9,"#70443b",{bold:true}).setDepth(0);

    for(let i=0;i<this.dining.tableCount;i++) {
      const p=this.iso(...TABLES[i]);
      const table=art(this.scene,p.x,p.y,"rest_table_empty").setOrigin(0.5,0.93).setDepth(p.y);
      table.setScale(table.scaleX*0.76,table.scaleY*0.76);
      this.tables.push(table);
    }
    const pass=this.iso(...PASS);
    const counter=art(this.scene,pass.x,pass.y-8,"rest_counter").setOrigin(0.5,1).setDepth(pass.y-4);
    counter.setScale(counter.scaleX*0.8,counter.scaleY*0.8);
    this.readyGlow=this.scene.add.ellipse(pass.x,pass.y+1,88,23,0xffd669,0.16).setStrokeStyle(1.5,0xffdd8a,0.7).setDepth(pass.y-5);
    this.status=label(this.scene,pass.x,pass.y+18,"",12,"#fff2d1",{bold:true,stroke:"#4e3029"}).setDepth(9e4);
    const host=this.iso(...HOST);
    art(this.scene,host.x+20,host.y-3,"rest_host").setOrigin(0.5,1).setDepth(host.y-2);
    label(this.scene,host.x+23,host.y+10,t("Recepción"),9,"#fff1d6",{bold:true,stroke:"#4e3029"}).setDepth(host.y+12);
    for (const [col,row] of [[0.2,5.2],[8.8,5.2],[0.2,7],[8.8,7],[0.2,8.8],[8.8,8.8]] as Grid[]) {
      const p=this.iso(col,row);
      this.scene.add.ellipse(p.x,p.y+2,30,12,0x8d6652).setDepth(p.y-2);
      art(this.scene,p.x,p.y,"bush").setOrigin(0.5,0.8).setDisplaySize(30,21).setDepth(p.y);
    }
    // Warm pendant bulbs stay above the back wall; no foreground roof hides the work.
    for(const col of [1.4,4.5,7.6]) {
      const p=this.iso(col,0.4);
      wall.lineStyle(1,0x6e6652).lineBetween(p.x,p.y-37,p.x,p.y-20);
      this.scene.add.circle(p.x,p.y-18,8,0xffdc77,0.12).setDepth(0);
      this.scene.add.circle(p.x,p.y-18,3,0xffeaa4).setDepth(0);
    }
    this.server=art(this.scene,pass.x,pass.y,"rest_waiter_a").setOrigin(0.5,1);
    this.server.setScale(this.server.scaleX*0.8,this.server.scaleY*0.8);
    this.serverShadow=actorShadow(this.scene,this.server.displayWidth);
  }

  onSale(): void { this.dining.recordSale(); }

  /** Queue, seating, serving and leaving are bounded visual states; actual sales grant service. */
  update(dt: number, business: BusinessState): void {
    this.clock+=dt;
    this.dining.update(dt);
    const calm=calmWorld();
    for(const [id,view] of this.guests) if(!this.dining.guests.some(g=>g.id===id)) {
      view.image.destroy();view.shadow.destroy();view.bubble.destroy();this.guests.delete(id);
    }
    const queue=this.dining.guests.filter(g=>g.table<0);
    for(const guest of this.dining.guests) {
      let view=this.guests.get(guest.id);
      if(!view) {
        const image=art(this.scene,0,0,"rest_guest_a").setOrigin(0.5,1);
        image.setScale(image.scaleX*0.72,image.scaleY*0.72);
        const bubble=label(this.scene,0,0,"…",13,"#a56a2a",{display:true,stroke:"#fff4df"});
        view={image,shadow:actorShadow(this.scene,image.displayWidth),bubble};
        this.guests.set(guest.id,view);
      }
      const table=TABLES[Math.max(0,guest.table)];
      const seat: Grid=[table[0]-0.35,table[1]-0.15];
      const waitingSpot: Grid=[HOST[0]+0.55,HOST[1]+queue.indexOf(guest)*0.42];
      let position: Grid=seat;
      let moving=false;
      const progress=calm ? 1 : guest.progress;
      if(guest.phase==="arriving") { position=this.path([ENTRY,waitingSpot],progress);moving=true; }
      else if(guest.phase==="queue") position=waitingSpot;
      else if(guest.phase==="seating") { position=this.path([HOST,[4.5,table[1]],seat],progress);moving=true; }
      else if(guest.phase==="leaving") { position=this.path([seat,[4.5,table[1]],ENTRY],progress);moving=true; }
      const p=this.iso(...position);
      const eating=guest.phase==="eating";
      const key=eating ? (guest.id%2 ? "rest_seated_woman" : "rest_seated_man") : moving && !calm && Math.floor(this.clock*6)%2 ? "rest_guest_b" : "rest_guest_a";
      // Apply an absolute size, so repeated pose changes cannot accumulate scale drift.
      swapArt(view.image,key);
      const spec=ART[key];
      view.image.setDisplaySize(spec.w*0.72,spec.h*0.72).setPosition(p.x,p.y).setDepth(p.y+(eating?2:-1));
      view.image.setFlipX(guest.table>=0 && table[0]>4.5 && !eating);
      gait(view.image,p.y,this.clock+guest.id,moving && !calm);
      view.shadow.setPosition(p.x,p.y).setDepth(p.y-2).setVisible(!eating);
      view.bubble.setPosition(p.x,p.y-48).setDepth(p.y+20).setVisible(guest.phase==="waiting" || guest.phase==="queue");
    }
    this.tables.forEach((table,i)=>swapArt(table,this.dining.guests.some(g=>g.table===i && g.phase==="eating") ? "rest_table_served" : "rest_table_empty"));
    const server=this.dining.server;
    const target=TABLES[server.table];
    const route: Grid[]=[[3.5,5.0],[4.5,target[1]],[target[0]+0.3,target[1]+0.1]];
    const pt=server.phase==="idle" ? 0 : calm ? (server.phase==="out" ? 1 : 0) : server.phase==="out" ? server.progress : 1-server.progress;
    const pos=this.path(route,pt),p=this.iso(...pos);
    swapArt(this.server,server.phase!=="idle" && !calm && Math.floor(this.clock*6)%2 ? "rest_waiter_b" : "rest_waiter_a");
    this.server.setPosition(p.x,p.y).setDepth(p.y+3).setFlipX(target[0]<4.5);
    gait(this.server,p.y,this.clock,server.phase!=="idle" && !calm);
    this.serverShadow.setPosition(p.x,p.y).setDepth(p.y-1);
    const stock=business.floors.some(f=>f.stock>0);
    const waiting=business.topStock>0 && business.sale.phase==="idle";
    this.status.setText(waiting && !business.sale.managed ? t("Activa el reparto") : stock && business.transport.phase==="idle" && !business.transport.managed ? t("Activa el camarero") : business.sale.phase!=="idle" ? t("Reparto en marcha") : stock ? t("Recogiendo platos") : business.floors.some(f=>f.running) ? t("Cocinando…") : t("Activa una cocina"));
    this.readyGlow.setVisible(waiting || stock).setAlpha(calm ? 0.65 : 0.5+Math.sin(this.clock*3)*0.15);
  }

  private path(points: Grid[], progress: number): Grid {
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
    let remaining=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
    for(let i=0;i<lengths.length;i++) {
      if(remaining<=lengths[i] || i===lengths.length-1) {
        const t=lengths[i] ? remaining/lengths[i] : 0;
        return [points[i][0]+(points[i+1][0]-points[i][0])*t,points[i][1]+(points[i+1][1]-points[i][1])*t];
      }
      remaining-=lengths[i];
    }
    return points[0];
  }
}
