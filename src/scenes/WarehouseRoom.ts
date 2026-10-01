import Phaser from "phaser";
import { art } from "../art/catalog";
import type { BusinessState } from "../game/state";
import { CHAIN } from "../game/data";
import { label, reducedMotion } from "./common";

type Point = { x: number; y: number };
type Grid = [number, number];
export const WAREHOUSE_SLOTS: Grid[] = [[1,1],[3,1],[5,1],[7,1],[7,4],[5,4],[3,4],[1,4]];
export const WAREHOUSE_DOOR: Grid = [2.2,7.0];
export const WAREHOUSE_ROUTE: Grid[] = [WAREHOUSE_DOOR,[.5,7.0],[.5,2.5],[1.5,2.5],[3.5,2.5],[5.5,2.5],[7.5,2.5],[8.5,2.5],[8.5,5.5],[7.5,5.5],[5.5,5.5],[3.5,5.5],[1.5,5.5]];
export const WAREHOUSE_STOPS = [0,3,4,5,6,9,10,11,12];

/** Open industrial warehouse around the existing production and delivery loop. */
export class WarehouseRoom {
  private status!: Phaser.GameObjects.Text;
  private boxes: Phaser.GameObjects.Image[] = [];
  private piles: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene, private iso: (c: number, r: number) => Point, private floors: number) {}

  private quad(g: Phaser.GameObjects.Graphics, c: number, r: number, w: number, h: number, color: number): void {
    const points = [this.iso(c,r), this.iso(c+w,r), this.iso(c+w,r+h), this.iso(c,r+h)];
    g.fillStyle(color).fillPoints(points.map(p => new Phaser.Math.Vector2(p.x,p.y)), true);
  }

  create(): void {
    const ground = this.scene.add.graphics().setDepth(-10);
    const l=this.iso(0,10), b=this.iso(9,10), r=this.iso(9,0);
    ground.fillStyle(0x858b89).fillPoints([l,b,{x:b.x,y:b.y+14},{x:l.x,y:l.y+14}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    ground.fillStyle(0x697875).fillPoints([b,r,{x:r.x,y:r.y+14},{x:b.x,y:b.y+14}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    for(let row=0;row<10;row++) for(let col=0;col<9;col++) {
      const base = row===9 ? 0x48575b : ((col+row)%2 ? 0xd8d8d0 : 0xcecfc7);
      this.quad(ground,col,row,1,1,base);
      const p=this.iso(col+.5,row+.5);
      if(row<9) ground.lineStyle(1,0xf1f0e8,.3).lineBetween(p.x-44,p.y,p.x,p.y+22).lineBetween(p.x,p.y+22,p.x+44,p.y);
      else {
        const a=this.iso(col+.25,row+.5),z=this.iso(col+.75,row+.5);
        ground.lineStyle(2,0xf4d15b,.9).lineBetween(a.x,a.y,z.x,z.y);
      }
    }

    // Route is one connected pair of broad forklift aisles with visible yellow edges.
    const aisle=this.scene.add.graphics().setDepth(-7);
    const route=WAREHOUSE_ROUTE.map(([c,row])=>this.iso(c,row));
    aisle.lineStyle(25,0xe9bd44,.34).strokePoints(route.map(p=>new Phaser.Math.Vector2(p.x,p.y)),false,false);
    aisle.lineStyle(3,0xf2c84b,.94).strokePoints(route.map(p=>new Phaser.Math.Vector2(p.x,p.y)),false,false);
    aisle.lineStyle(1,0xffe9a0,.8).strokePoints(route.map(p=>new Phaser.Math.Vector2(p.x,p.y)),false,false);
    // Painted loading bays sit outside the station footprints.
    for(const [c,row] of [[1.5,1.45],[3.5,1.45],[5.5,1.45],[7.5,1.45],[7.5,3.55],[5.5,3.55],[3.5,3.55],[1.5,3.55]] as Grid[]) {
      const p=this.iso(c,row);
      aisle.lineStyle(2,0x648c83,.8).strokePoints([
        new Phaser.Math.Vector2(p.x-21,p.y-9),new Phaser.Math.Vector2(p.x,p.y-19),new Phaser.Math.Vector2(p.x+21,p.y-9),
      ],false,false);
    }

    // Low rear walls leave the whole operation visible; teal band ties the room together.
    const wall=this.scene.add.graphics().setDepth(-3);
    const a=this.iso(0,0), z=this.iso(9,0), side=this.iso(0,1.35);
    wall.fillStyle(0xc7cec9).fillPoints([a,z,{x:z.x,y:z.y-31},{x:a.x,y:a.y-31}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    wall.fillStyle(0xaebbb5).fillPoints([a,side,{x:side.x,y:side.y-23},{x:a.x,y:a.y-31}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
    wall.lineStyle(6,0x278c83).lineBetween(a.x,a.y-30,z.x,z.y-30);
    wall.lineStyle(2,0xeff2e7,.8).lineBetween(a.x,a.y-22,z.x,z.y-22);
    // High bay markers and restrained floor tier stars add visible progression.
    for(const col of [1,3,5,7]) {
      const p=this.iso(col+.5,0);
      wall.fillStyle(0x315c59).fillRoundedRect(p.x-13,p.y-19,26,13,3);
      wall.fillStyle(0xf4d15b).fillPoints([
        new Phaser.Math.Vector2(p.x,p.y-17),new Phaser.Math.Vector2(p.x+2,p.y-13),new Phaser.Math.Vector2(p.x+7,p.y-13),new Phaser.Math.Vector2(p.x+3,p.y-10),new Phaser.Math.Vector2(p.x+5,p.y-6),new Phaser.Math.Vector2(p.x,p.y-8),new Phaser.Math.Vector2(p.x-5,p.y-6),new Phaser.Math.Vector2(p.x-3,p.y-10),new Phaser.Math.Vector2(p.x-7,p.y-13),new Phaser.Math.Vector2(p.x-2,p.y-13),
      ],true);
    }
    const sign=this.iso(4.5,0);
    wall.fillStyle(0x204d4c).fillRoundedRect(sign.x-68,sign.y-57,136,23,5);
    label(this.scene,sign.x,sign.y-45,"CARGA Y REPARTO",11,"#fff5d8",{bold:true}).setDepth(0);
    if(this.floors>=3) {
      const badge=this.iso(8.25,.55);
      wall.fillStyle(0x315c59).fillRoundedRect(badge.x-32,badge.y-15,64,20,5);
      label(this.scene,badge.x,badge.y-5,"★  ZONA B",9,"#ffe08a",{bold:true}).setDepth(0);
    }
    if(this.floors>=6) {
      const badge=this.iso(.75,1.0);
      wall.fillStyle(0x315c59).fillRoundedRect(badge.x-32,badge.y-15,64,20,5);
      label(this.scene,badge.x,badge.y-5,"★  ZONA C",9,"#ffe08a",{bold:true}).setDepth(0);
    }

    const dock=this.iso(4.5,7.6);
    art(this.scene,dock.x,dock.y-30,"wh_dock").setOrigin(.5,1).setDepth(dock.y-40);
    this.status=label(this.scene,dock.x,dock.y+32,"",12,"#fff5d8",{bold:true,stroke:"#263b3a"}).setDepth(dock.y+40);
    for (const [c,r] of [[3.1,7.1],[5.9,7.1],[6.4,7.6]]) {
      const p=this.iso(c,r);
      this.piles.push(art(this.scene,p.x,p.y,"wh_pallet").setOrigin(.5,1).setDepth(p.y).setVisible(false));
    }
    // One compact box sprite per station, animated on the production loop only.
    for(let i=0;i<WAREHOUSE_SLOTS.length;i++) {
      const p=this.iso(...WAREHOUSE_SLOTS[i]);
      this.boxes.push(art(this.scene,p.x,p.y-17,"item_box").setDisplaySize(18,18).setDepth(p.y+14).setVisible(false));
    }
  }

  update(_dt: number, business: BusinessState, showStatus = true): void {
    const calm=reducedMotion();
    const anyStock=business.topStock>0;
    this.piles.forEach((pile,i)=>pile.setVisible(anyStock && i<Math.min(3,Math.ceil(business.topStock/CHAIN.floorCycle))));
    this.status.setVisible(showStatus).setText(business.sale.phase!=="idle" ? "Reparto en marcha" : business.transport.phase!=="idle" ? (business.transport.phase==="unload" ? "Descargando pedidos" : "Recogida en curso") : anyStock ? "Listo para repartir" : business.floors.some(f=>f.running) ? "Preparando paquetes…" : "Muelle de carga");
    this.boxes.forEach((box,index)=>{
      const slot=business.floors[index];
      if(!slot?.running) { box.setVisible(false); return; }
      const amount=CHAIN.floorCycle ? Phaser.Math.Clamp(slot.prog/CHAIN.floorCycle,0,1) : 0;
      const t=calm ? 1 : amount;
      const [c,r]=WAREHOUSE_SLOTS[index];
      const from=this.iso(c+.8,r+.2);
      const to=this.iso(c+1.3,r+.2);
      box.setVisible(true).setPosition(Phaser.Math.Linear(from.x,to.x,t),Phaser.Math.Linear(from.y-18,to.y-14,t));
      box.setDepth(box.y+4);
    });
  }
}
