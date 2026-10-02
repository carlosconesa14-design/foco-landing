import { now as clockNow } from "../game/clock";
import { money, t } from "../i18n";
import { constructionPop, revealScene } from "./feedback";
import { actorShadow, gait, loopPosition, streetLoop, type StreetLoop } from "./motion";
import { artRef, hasGeneratedArt, swapArt } from "../art/generated";
import { groundDetail } from "../art/ground";
import Phaser from "phaser";
import { ART, art, artScale, buildingKey, buildingTier, placeTile } from "../art/catalog";
import { mix } from "../art/pen";
import { ALL_BUSINESSES, type CityDef } from "../game/data";
import { cityDef } from "../game/state";
import { bizTier, businessRate } from "../game/economy";
import { fmt } from "../game/format";
import { DragScroll, reducedMotion, rewardCoins, bridgeOf, floatText, label, setupCamera, type Bridge } from "./common";

/* Rejilla isométrica */
const TW = 88;
const TH = 44;
const COLS = 10;
const ROWS = 12;
const ROAD_ROWS = [0, 3, 7, 11];
const ROAD_COLS = [0, 4, 9];

const seenStages = new Map<string, Record<string, number>>();

type LotKind = { id: string } | { soon: string };
/** Parcelas del mapa: los negocios de la ciudad se colocan en orden y el resto queda en obras. */
const LOT_POSITIONS: { c: number; r: number }[] = [
  { c: 1, r: 1 },
  { c: 6, r: 1 },
  { c: 1, r: 5 },
  { c: 6, r: 5 },
  { c: 1, r: 9 },
  { c: 6, r: 9 },
];
const SOON_LABELS = (): Record<string, string[]> => ({
  madrid: ["🏋️ " + t("Gimnasio"), "🏨 " + t("Hotel")],
  miami: ["🏨 " + t("Resort")],
});

function lotsFor(city: CityDef): { c: number; r: number; kind: LotKind }[] {
  const soon = SOON_LABELS()[city.id] ?? [];
  return LOT_POSITIONS.map((p, i) => ({
    ...p,
    kind: i < city.businesses.length ? { id: city.businesses[i].id } : { soon: soon[i - city.businesses.length] ?? "🏗️ " + t("Solar") },
  }));
}

interface PlotView {
  id: string;
  owned: boolean;
  bubble?: Phaser.GameObjects.Container;
  bubbleText?: Phaser.GameObjects.Text;
  sign?: Phaser.GameObjects.Image;
}

interface Walker {
  obj: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  role?: string;
  route: StreetLoop;
  distance: number;
  speed: number;
  velocity?: number;
  phase: number;
  wait: number;
  crossing: string;
}

/** Semilla fija: la ciudad siempre tiene los mismos árboles. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** La ciudad en isométrico: parcelas con tus negocios, tráfico, gente y nubes. */
export class CityScene extends Phaser.Scene {
  private bridge!: Bridge;
  private ox = 0;
  private oy = 0;
  private plots: PlotView[] = [];
  private movers: Walker[] = [];
  private clouds: { cloud: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; speed: number }[] = [];
  private drag!: DragScroll;
  private ownedKey = "";
  private city!: CityDef;
  private lots: { c: number; r: number; kind: LotKind }[] = [];
  private worldW = 0;
  private walkClock = 0;
  private growing = new Set<string>();
  private atmosphere!: Phaser.GameObjects.Graphics;
  private atmosphereClock = 0;
  private waterLines!: Phaser.GameObjects.Graphics;

  constructor() {
    super("city");
  }

  /** Punto de la rejilla (esquinas de casilla) en pantalla. */
  private iso(c: number, r: number): { x: number; y: number } {
    return { x: this.ox + ((c - r) * TW) / 2, y: this.oy + ((c + r) * TH) / 2 };
  }

  create(): void {
    this.bridge = bridgeOf(this);
    this.plots = [];
    this.movers = [];
    this.clouds = [];
    setupCamera(this);
    const insets = this.bridge.insets();
    const s = this.bridge.state();
    this.city = cityDef(s.city);
    const stages=Object.fromEntries(this.city.businesses.map(b=>[b.id,s.biz[b.id].owned ? buildingTier(s.biz[b.id].floors.length) : 0]));
    const previous=seenStages.get(s.city);
    this.growing=new Set(previous ? Object.keys(stages).filter(id=>stages[id]>previous[id]) : []);
    seenStages.set(s.city,stages);
    this.walkClock=0;
    this.atmosphereClock=0;
    this.lots = lotsFor(this.city);
    this.ownedKey = this.stateKey();

    const margin = 40;
    this.ox = (ROWS * TW) / 2 + margin;
    this.oy = insets.top + 120;
    this.worldW = ((COLS + ROWS) * TW) / 2 + margin * 2;
    const worldH = this.oy + ((COLS + ROWS) * TH) / 2 + 60 + insets.bottom;

    this.cameras.main.setBackgroundColor(this.city.ground.water);
    this.drawWater(worldH);
    this.drawGround();
    this.drawPublicSpaces();
    this.placeDecor();
    for (const lot of this.lots) this.drawLot(lot.c, lot.r, lot.kind);
    this.spawnTraffic();
    this.spawnClouds(worldH);
    this.atmosphere=this.add.graphics().setDepth(-4);
    this.drawAtmosphere(0);

    this.drag = new DragScroll(this, this.worldW, worldH, { zoom: 0.72, minZoom: 0.3, maxZoom: 1.4, memoryKey: `city:${s.city}` });
    // Show the first neighbourhood, with less empty water above the starter business.
    const first = this.iso(4.5, 5);
    if (!this.drag.restore()) this.drag.centerOn(first.x, first.y);
    this.drag.addControls({ x: first.x, y: first.y }, { left: margin, top: this.oy - 90, right: this.worldW - margin, bottom: this.oy + (COLS + ROWS) * TH / 2 + 35 });
    revealScene(this);
  }

  private drawWater(worldH: number): void {
    const g = this.add.graphics().setDepth(-20);
    this.waterLines = g;
    const rand = rng(3);
    for (let i = 0; i < 70; i++) {
      const x = rand() * this.worldW;
      const y = rand() * worldH;
      g.lineStyle(2, 0xffffff, 0.25).lineBetween(x, y, x + 14 + rand() * 12, y);
    }
  }

  /* ---------- Suelo ---------- */

  private tileKind(c: number, r: number): "road_c" | "road_r" | "cross" | "lot" | "grass" {
    const onRow = ROAD_ROWS.includes(r);
    const onCol = ROAD_COLS.includes(c);
    if (onRow && onCol) return "cross";
    if (onRow) return "road_c";
    if (onCol) return "road_r";
    if (this.lots.some((l) => c >= l.c && c < l.c + 2 && r >= l.r && r < l.r + 2)) return "lot";
    return "grass";
  }

  private drawGround(): void {
    const g = this.add.graphics().setDepth(-10);
    const diamond = (c: number, r: number, inset = 0): Phaser.Math.Vector2[] => {
      const t = this.iso(c, r);
      const hw = TW / 2 - inset;
      const hh = TH / 2 - inset / 2;
      const cx = t.x;
      const cy = t.y + TH / 2;
      return [
        new Phaser.Math.Vector2(cx, cy - hh),
        new Phaser.Math.Vector2(cx + hw, cy),
        new Phaser.Math.Vector2(cx, cy + hh),
        new Phaser.Math.Vector2(cx - hw, cy),
      ];
    };
    const rand = rng(7);
    // Shoreline shadows and a light turquoise shelf beneath the island.
    const coast = [this.iso(0, 0), this.iso(COLS, 0), this.iso(COLS, ROWS), this.iso(0, ROWS)].map(p => new Phaser.Math.Vector2(p.x, p.y + 20));
    g.lineStyle(22, 0x103f62, 0.16).strokePoints(coast, true);
    g.lineStyle(9, 0xa2efed, 0.38).strokePoints(coast, true);
    // Borde de tierra bajo la isla
    const L = this.iso(0, ROWS);
    const B = this.iso(COLS, ROWS);
    const R = this.iso(COLS, 0);
    g.fillStyle(this.city.ground.edge, 1).fillPoints([new Phaser.Math.Vector2(L.x, L.y), new Phaser.Math.Vector2(B.x, B.y), new Phaser.Math.Vector2(B.x, B.y + 26), new Phaser.Math.Vector2(L.x, L.y + 26)], true);
    g.fillStyle(mix(this.city.ground.edge, 0xffffff, 0.15), 1).fillPoints([new Phaser.Math.Vector2(B.x, B.y), new Phaser.Math.Vector2(R.x, R.y), new Phaser.Math.Vector2(R.x, R.y + 26), new Phaser.Math.Vector2(B.x, B.y + 26)], true);

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const kind = this.tileKind(c, r);
        const t = this.iso(c, r);
        const cx = t.x;
        const cy = t.y + TH / 2;
        const tileKey = kind === "grass" ? `tile_${this.city.id}_ground` : kind === "lot" ? "tile_lot" : `tile_${kind}`;
        if (placeTile(this, cx, t.y, tileKey, rand)) continue;
        if (kind === "grass") {
          const base = (c + r) % 2 ? this.city.ground.grass : this.city.ground.grassAlt;
          g.fillStyle(mix(base, 0xffffff, rand() * 0.12), 1).fillPoints(diamond(c, r), true);
          if (rand() < 0.3) g.fillStyle(0xffffff, 0.8).fillCircle(cx + (rand() - 0.5) * 30, cy + (rand() - 0.5) * 12, 1.6);
          if (rand() < 0.2) g.fillStyle(0xffd166, 0.9).fillCircle(cx + (rand() - 0.5) * 30, cy + (rand() - 0.5) * 12, 1.6);
        } else if (kind === "lot") {
          g.fillStyle(0xd5d8dc, 1).fillPoints(diamond(c, r), true);
          g.fillStyle(0xc4c8ce, 1).fillPoints(diamond(c, r, 6), true);
        } else {
          // Asphalt reaches neighbouring tiles: continuous streets, not disconnected diamonds.
          g.fillStyle(0x46586a, 1).fillPoints(diamond(c, r), true);
          const quad = (c0: number, r0: number, c1: number, r1: number, color: number) => {
            g.fillStyle(color, 1).fillPoints([this.iso(c0,r0),this.iso(c1,r0),this.iso(c1,r1),this.iso(c0,r1)].map(p => new Phaser.Math.Vector2(p.x,p.y)), true);
          };
          if (kind === "road_c") {
            quad(c,r,c+1,r+0.14,0xe5ded0);
            quad(c,r+0.86,c+1,r+1,0xe5ded0);
            const a = this.iso(c+0.28,r+0.5), b = this.iso(c+0.72,r+0.5);
            g.lineStyle(2,0xffedb0,0.9).lineBetween(a.x,a.y,b.x,b.y);
          } else if (kind === "road_r") {
            quad(c,r,c+0.14,r+1,0xe5ded0);
            quad(c+0.86,r,c+1,r+1,0xe5ded0);
            const a = this.iso(c+0.5,r+0.28), b = this.iso(c+0.5,r+0.72);
            g.lineStyle(2,0xffedb0,0.9).lineBetween(a.x,a.y,b.x,b.y);
          } else if (r > 0 && c > 0 && c < COLS-1) {
            for (let n=0;n<5;n++) {
              const start=0.22+n*0.12;
              quad(c+start,r+0.08,c+start+0.06,r+0.25,0xecf2f3);
              quad(c+start,r+0.75,c+start+0.06,r+0.92,0xecf2f3);
              quad(c+0.08,r+start,c+0.25,r+start+0.06,0xecf2f3);
              quad(c+0.75,r+start,c+0.92,r+start+0.06,0xecf2f3);
            }
          }
        }
        if (kind === "grass" || kind === "lot") groundDetail(g, cx, cy, kind === "grass" ? (this.city.id === "miami" ? "sand" : "grass") : kind === "lot" ? "paving" : "road", c + r * COLS);
      }
  }

  /** Central pedestrian boulevard, pocket plazas and a distinct waterfront. */
  private drawPublicSpaces(): void {
    const g = this.add.graphics().setDepth(-8);
    const tropical = this.city.id === "miami";
    for (const row of [1, 5, 9]) {
      const pts = [this.iso(5,row),this.iso(6,row),this.iso(6,row+2),this.iso(5,row+2)].map(p=>new Phaser.Math.Vector2(p.x,p.y));
      g.fillStyle(tropical ? 0xf4ddae : 0xe5d9c4).fillPoints(pts,true);
      g.lineStyle(2,0xfff5de,0.9).strokePoints(pts,true);
      const p = this.iso(5.5,row+1);
      if (tropical) {
        // Beach plaza: striped parasol, table and loungers, all original geometry.
        g.fillStyle(0x73513b).fillRect(p.x-1,p.y-24,2,26);
        g.fillStyle(0x164563,0.18).fillEllipse(p.x+7,p.y+4,28,10);
        g.fillStyle(0xff7855).fillEllipse(p.x,p.y-22,34,16);
        g.fillStyle(0xfff1c3).fillTriangle(p.x,p.y-30,p.x-10,p.y-15,p.x+4,p.y-14);
        g.fillStyle(0xfff1c3).fillTriangle(p.x,p.y-30,p.x+16,p.y-20,p.x+11,p.y-15);
        g.lineStyle(3,0xffffff).lineBetween(p.x-18,p.y+4,p.x-7,p.y+10).lineBetween(p.x+8,p.y+13,p.x+20,p.y+19);
        g.lineStyle(2,0x63c9c2).lineBetween(p.x-17,p.y+1,p.x-6,p.y+7).lineBetween(p.x+9,p.y+10,p.x+21,p.y+16);
      } else {
        // Raised stone fountain, blue basin and sculpture; no new texture allocations.
        g.fillStyle(0x163349,0.2).fillEllipse(p.x+4,p.y+9,44,18);
        g.fillStyle(0x889aab).fillEllipse(p.x,p.y+4,42,21);
        g.fillStyle(0xf4ead7).fillEllipse(p.x,p.y,42,21);
        g.fillStyle(0x4dbed8).fillEllipse(p.x,p.y,33,14);
        g.lineStyle(2,0xc7f6ff,0.9).strokeEllipse(p.x,p.y,23,9);
        g.fillStyle(0xa8bfce).fillRect(p.x-3,p.y-18,6,20);
        g.fillStyle(0xe9f3f2).fillEllipse(p.x,p.y-19,16,7);
        g.lineStyle(1.5,0xe2fbff).lineBetween(p.x-5,p.y-17,p.x-10,p.y-2).lineBetween(p.x+5,p.y-17,p.x+10,p.y-2);
      }
      art(this,p.x-18,p.y+35,"bench").setDepth(p.y+35);
      art(this,p.x+4,p.y+46,"bush").setScale(artScale(this,"bush")*0.65).setDepth(p.y+46);
    }
    // Waterfront stone coping instead of an unfinished earth slab.
    for (const [a,b] of [[this.iso(0,ROWS),this.iso(COLS,ROWS)],[this.iso(COLS,ROWS),this.iso(COLS,0)]]) {
      g.lineStyle(6,tropical?0xe7c999:0xd0d6d5).lineBetween(a.x,a.y,b.x,b.y);
      g.lineStyle(1,0xffffff,0.8).lineBetween(a.x,a.y-2,b.x,b.y-2);
    }
  }

  /** Coast foam and fountain jets are batched into one small Graphics at 10 Hz. */
  private drawAtmosphere(t: number): void {
    const g=this.atmosphere;
    g.clear();
    for(let i=0;i<12;i++) {
      const c=(i+0.5)*COLS/12;
      const p=this.iso(c,ROWS);
      const wave=Math.sin(t*1.2+i*0.65);
      g.lineStyle(2,0xe3fff5,0.15+(wave+1)*0.12).lineBetween(p.x-9,p.y+31+wave*2,p.x+10,p.y+40+wave*2);
    }
    if(this.city.id!=="miami") for(const row of [1,5,9]) {
      const p=this.iso(5.5,row+1);
      const jet=1+Math.sin(t*3+row)*1.6;
      g.lineStyle(1.5,0xf1ffff,0.8).lineBetween(p.x,p.y-20,p.x,p.y-28-jet);
      for(let i=0;i<3;i++) g.fillStyle(0xd4fcff,0.7).fillCircle(p.x+(i-1)*4,p.y-8+Math.sin(t*4+i)*3,1);
    }
  }

  private placeDecor(): void {
    const rand = rng(42);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (this.tileKind(c, r) !== "grass" || c === 5) continue;
        const p = this.iso(c + 0.5, r + 0.5);
        const roll = rand();
        if (roll < 0.34) {
          const key = this.city.trees[Math.floor(rand() * this.city.trees.length)];
          const tree = art(this, p.x + (rand() - 0.5) * 14, p.y + 8, key).setOrigin(0.5, 0.92);
          tree.setDepth(tree.y);
        } else if (roll < 0.5) {
          art(this, p.x, p.y + 4, "bush").setOrigin(0.5, 0.8).setDepth(p.y);
        } else if (roll < 0.58 && (ROAD_ROWS.includes(r + 1) || ROAD_ROWS.includes(r - 1))) {
          art(this, p.x, p.y, "lamp_post").setOrigin(0.5, 0.95).setDepth(p.y);
        } else if (roll < 0.64) {
          art(this, p.x, p.y + 4, "bench").setDepth(p.y + 4);
        } else if (roll < 0.68) {
          art(this, p.x, p.y + 4, "recycling_bin").setDepth(p.y + 4);
        }
      }
  }

  /* ---------- Parcelas ---------- */

  private drawLot(c: number, r: number, kind: LotKind): void {
    const bottom = this.iso(c + 2, r + 2);
    const center = this.iso(c + 1, r + 1);
    if ("soon" in kind) {
      const img = art(this, bottom.x, bottom.y + 2, "bld_soon");
      img.setOrigin(0.5, hasGeneratedArt(this, "bld_soon") ? 1 : (ART.bld_soon.h - 6) / ART.bld_soon.h).setDepth(bottom.y);
      label(this, bottom.x, bottom.y + 14, `${kind.soon} · ${t("Próximamente")}`, 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9e4);
      return;
    }
    const id = kind.id;
    const def = ALL_BUSINESSES.find((b) => b.id === id)!;
    const owned = this.bridge.state().biz[id].owned;
    const view: PlotView = { id, owned };
    let topY = bottom.y - 90;
    if (owned) {
      const key = buildingKey(id, this.bridge.state().biz[id].floors.length);
      const spec = ART[key];
      const img = art(this, bottom.x, bottom.y + 2, key);
      img.setOrigin(0.5, hasGeneratedArt(this, key) ? 1 : (spec.h - 6) / spec.h).setDepth(bottom.y);
      if (this.growing.has(id)) constructionPop(this,img,t("¡Negocio ampliado!"));
      topY = bottom.y - spec.h + 10;
      const bg = this.add.graphics();
      bg.fillStyle(0x14202f, 0.92).fillRoundedRect(-46, -14, 92, 28, 14);
      bg.fillStyle(0x3ddc97, 1).fillCircle(-32, 0, 7);
      const coinRef = artRef(this, "coin");
      const coin = this.add.image(-32, 0, coinRef.texture, coinRef.frame).setScale(artScale(this, "coin") * 0.7);
      const text = label(this, 8, 0, "", 13, "#3ddc97", { bold: true });
      view.bubble = this.add.container(bottom.x, topY - 8, [bg, coin, text]).setDepth(9e4);
      view.bubbleText = text;
      if (!reducedMotion()) this.tweens.add({ targets: view.bubble, y: topY - 13, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
    } else {
      // Solar en venta: tierra, valla y cartel
      const g = this.add.graphics().setDepth(-5);
      const pts = [this.iso(c, r), this.iso(c + 2, r), this.iso(c + 2, r + 2), this.iso(c, r + 2)].map((p) => new Phaser.Math.Vector2(p.x, p.y));
      g.fillStyle(0xc19a6b, 1).fillPoints(pts, true);
      g.lineStyle(3, 0xffffff, 0.8).strokePoints(pts, true);
      view.sign = art(this, center.x, center.y + 10, "sign_sale").setOrigin(0.5, 0.95).setDepth(center.y + 10);
      const price = label(this, center.x, center.y - 46, money(def.price), 17, "#14202f", { display: true }).setDepth(center.y + 11);
      const priceWidth = view.sign.displayWidth * 0.78;
      if (price.width > priceWidth) price.setFontSize(Math.floor(17 * priceWidth / price.width));
      if (!reducedMotion()) this.tweens.add({ targets: price, scale: 1.08, yoyo: true, repeat: -1, duration: 700 });
      topY = center.y - 90;
    }
    // Estrellas de categoría junto al nombre (★ con 1–2 puestos, ★★ con 3–5, ★★★ con 6–8)
    const stars = owned ? ` ${"★".repeat(bizTier(this.bridge.state().biz[id]))}` : "";
    label(this, bottom.x, bottom.y + 14, def.name + stars, 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9e4);

    const zone = this.add.zone(center.x - TW, topY, TW * 2, bottom.y - topY + 10).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.setDepth(9.5e4);
    zone.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapPlot(id);
    });
    this.plots.push(view);
  }

  /** Cambia al comprar un negocio o al subir de categoría: entonces se redibuja la ciudad. */
  private stateKey(): string {
    const s = this.bridge.state();
    return s.city + this.city.businesses.map((b) => (s.biz[b.id]?.owned ? bizTier(s.biz[b.id]) : 0)).join("");
  }

  /* ---------- Tráfico, gente y nubes ---------- */

  private spawnTraffic(): void {
    const rand = rng(99);
    // Opposing lanes run around real closed city blocks, never through water.
    const loops = [
      [{c:0.32,r:0.32},{c:9.68,r:0.32},{c:9.68,r:11.68},{c:0.32,r:11.68}],
      [{c:0.68,r:0.68},{c:0.68,r:11.32},{c:9.32,r:11.32},{c:9.32,r:0.68}],
      [{c:0.32,r:3.32},{c:4.68,r:3.32},{c:4.68,r:7.68},{c:0.32,r:7.68}],
      [{c:4.32,r:3.32},{c:9.68,r:3.32},{c:9.68,r:7.68},{c:4.32,r:7.68}],
    ].map(points => streetLoop(points));
    for (let i=0;i<8;i++) {
      const obj = art(this,0,0,`car_${i%4}`).setOrigin(0.5,0.76);
      const route = loops[i%loops.length];
      this.movers.push({obj,shadow:actorShadow(this,obj.displayWidth),route,distance:route.total*(Math.floor(i/4)*0.5+rand()*0.2),speed:0.8+rand()*0.35,phase:rand()*6,wait:0,crossing:""});
    }
    // Walking loops follow the inner pavements, not the carriageway or the buildings.
    for (let i=0;i<8;i++) {
      const role = `ped${i%3}`;
      const obj = art(this,0,0,`ch_${role}_0`).setOrigin(0.5,0.98);
      obj.setDisplaySize(ART[`ch_${role}_0`].w*0.55,ART[`ch_${role}_0`].h*0.55);
      const left = i%2 ? 4.93 : 0.93, right = i%2 ? 9.07 : 4.07;
      const top = i%4 < 2 ? 3.93 : 7.93, bottom = i%4 < 2 ? 7.07 : 11.07;
      const corners = [{c:left,r:top},{c:right,r:top},{c:right,r:bottom},{c:left,r:bottom}];
      const route = streetLoop(i%3===0 ? corners.reverse() : corners,0.1);
      this.movers.push({obj,role,shadow:actorShadow(this,obj.displayWidth),route,distance:rand()*route.total,speed:0.27+rand()*0.08,phase:rand()*6,wait:0,crossing:""});
    }
  }

  private spawnClouds(_worldH: number): void {
    const rand = rng(5);
    for (let i = 0; i < 4; i++) {
      const x = rand() * this.worldW;
      const y = this.oy - 110 - rand() * 90;
      const shadow = art(this, x + 60, y + 170, "cloud").setTint(0x000000).setAlpha(0.055).setDepth(-7);
      shadow.setDisplaySize(ART.cloud.w * 1.1, ART.cloud.h * 0.6);
      const cloud = art(this, x, y, "cloud").setAlpha(0.38).setDepth(-6);
      this.clouds.push({ cloud, shadow, speed: 8 + rand() * 8 });
    }
  }

  update(_t: number, dtMs: number): void {
    const s = this.bridge.state();
    const key = this.stateKey();
    if (key !== this.ownedKey) {
      this.scene.restart();
      return;
    }
    const dt = Math.min(dtMs, 100) / 1000;
    this.walkClock += dt;
    this.atmosphereClock += dt;
    if (!reducedMotion() && this.atmosphereClock > 0.1) {
      this.drawAtmosphere(this.walkClock);
      this.atmosphereClock=0;
    }
    this.waterLines.x = reducedMotion() ? 0 : Math.sin(this.walkClock * 0.6) * 6;
    this.waterLines.alpha = reducedMotion() ? 1 : 0.75 + Math.sin(this.walkClock * 0.8) * 0.2;
    const calm = reducedMotion();
    const frame = calm ? 0 : Math.floor(this.walkClock * 6) % 2 ? 1 : 2;
    for (const m of this.movers) {
      // Ambient traffic respects reduced motion; production actors remain informative.
      if (!calm) {
        if (m.wait > 0) m.wait = Math.max(0,m.wait-dt);
        else {
          let pace=1;
          if (!m.role) for (const other of this.movers) {
            if (other===m || other.role || other.route!==m.route) continue;
            const gap=((other.distance-m.distance)%m.route.total+m.route.total)%m.route.total;
            pace=Math.min(pace,Phaser.Math.Clamp((gap-1.2)/1.2,0,1));
          }
          const target=m.speed*pace;
          m.velocity=(m.velocity ?? m.speed)+(target-(m.velocity ?? m.speed))*Math.min(1,dt*5);
          m.distance += m.velocity*dt;
        }
      }
      const v = loopPosition(m.route,m.distance);
      if (!m.role) {
        const crossing = Math.abs(v.c-4.5)<0.27 && ROAD_ROWS.some(row=>Math.abs(v.r-row-0.5)<0.28) ? `${Math.round(v.r)}` : "";
        if (crossing && crossing!==m.crossing) m.wait=0.45;
        m.crossing=crossing;
      }
      if (m.role) swapArt(m.obj,`ch_${m.role}_${frame}`);
      const dx=v.dc-v.dr;
      if (Math.abs(dx)>0.05) m.obj.setFlipX(dx<0);
      const p=this.iso(v.c,v.r);
      m.obj.setPosition(p.x,p.y).setDepth(p.y+1);
      gait(m.obj,p.y,this.walkClock*m.speed*2.5+m.phase,!calm && m.wait===0,!m.role);
      m.shadow.setPosition(p.x,p.y+1).setDepth(p.y-1);
    }
    for (const cl of this.clouds) {
      cl.cloud.x += reducedMotion() ? 0 : cl.speed * dt;
      cl.shadow.x += reducedMotion() ? 0 : cl.speed * dt;
      if (cl.cloud.x > this.worldW + 100) {
        cl.cloud.x -= this.worldW + 260;
        cl.shadow.x -= this.worldW + 260;
      }
    }
    const now = clockNow();
    for (const p of this.plots) {
      if (p.owned && p.bubbleText) {
        const rate = businessRate(s, p.id, now);
        p.bubbleText.setText(rate > 0 ? `+${fmt(rate)}/s` : t("Entrar") + " ▶");
      } else if (p.sign) {
        const def = ALL_BUSINESSES.find((b) => b.id === p.id)!;
        p.sign.setTint(s.cash >= def.price ? 0xffffff : mix(0xffffff, 0x999999, 0.5));
      }
    }
    for (const sale of this.bridge.drainSales(null)) {
      const p = this.plots.find((x) => x.id === sale.biz);
      if (p?.bubble && (sale.lucky || Math.random() < 0.25)) {
        rewardCoins(this, p.bubble.x, p.bubble.y, sale.lucky);
        floatText(this, p.bubble.x, p.bubble.y - 18, sale.lucky ? `🔥 +${fmt(sale.amount)}` : `+${fmt(sale.amount)}`, sale.lucky ? "#f5c542" : undefined);
      }
    }
  }
}
