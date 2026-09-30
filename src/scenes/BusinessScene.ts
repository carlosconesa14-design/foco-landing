import Phaser from "phaser";
import { ART, BIZ_ART, art, artScale } from "../art/catalog";
import { Pen, shade } from "../art/pen";
import { CHAIN } from "../game/data";
import { bizDef, chainRates, floorUnlockCost, managerCost, upgradeQuote, type Station } from "../game/economy";
import { fmt } from "../game/format";
import type { BusinessState } from "../game/state";
import { COLORS, DragScroll, Pill, bridgeOf, emoji, floatText, label, setupCamera, type Bridge } from "./common";

const SURFACE_H = 236;
const FLOOR_H = 142;
const SHAFT_X = 14;
const SHAFT_W = 66;
const WALK_FPS = 8;

/** Colores de pared y suelo de las salas de cada negocio. */
const ROOM: Record<string, { wall: number; floor: number }> = {
  dropship: { wall: 0xf3e3c3, floor: 0xa47148 },
  restaurant: { wall: 0xfbe9e7, floor: 0x8d6e63 },
  tiktok: { wall: 0xede7f6, floor: 0x5e548e },
  ai: { wall: 0xe0f2f1, floor: 0x37474f },
};

interface FloorView {
  worker: Phaser.GameObjects.Image;
  carry: Phaser.GameObjects.Image;
  pile: Phaser.GameObjects.Image[];
  stock: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Rectangle;
  hint: Phaser.GameObjects.Text;
  pill: Pill;
  manager: Phaser.GameObjects.Text;
  station: Phaser.GameObjects.Image;
  floorY: number;
  level: number;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Interior de un negocio: plantas de producción → transporte → venta, todo animado. */
export class BusinessScene extends Phaser.Scene {
  private bridge!: Bridge;
  private bizId = "";
  private startScroll = 0;
  private w = 0;
  private top = 0;
  private groundY = 0;
  private floors: FloorView[] = [];
  private floorCount = 0;
  private cabin!: Phaser.GameObjects.Container;
  private cabinItem!: Phaser.GameObjects.Image;
  private cabinCarry!: Phaser.GameObjects.Text;
  private cable!: Phaser.GameObjects.Rectangle;
  private pulley!: Phaser.GameObjects.Image;
  private transportPill!: Pill;
  private transportHint!: Phaser.GameObjects.Text;
  private transportMgr!: Phaser.GameObjects.Text;
  private seller!: Phaser.GameObjects.Image;
  private sellerItem!: Phaser.GameObjects.Image;
  private sellerCarry!: Phaser.GameObjects.Text;
  private salePill!: Pill;
  private saleHint!: Phaser.GameObjects.Text;
  private saleMgr!: Phaser.GameObjects.Text;
  private topPile: Phaser.GameObjects.Image[] = [];
  private topStock!: Phaser.GameObjects.Text;
  private unlockPill: Pill | null = null;
  private clouds: Phaser.GameObjects.Image[] = [];
  private coins!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;
  private drag!: DragScroll;
  private sellFrom = 0;
  private sellTo = 0;
  private levels = { transport: 0, sale: 0 };
  private puffClock = 0;

  constructor() {
    super("business");
  }

  init(data: { id: string; scroll?: number }): void {
    this.bizId = data.id;
    this.startScroll = data.scroll ?? 0;
    this.floors = [];
    this.topPile = [];
    this.clouds = [];
    this.unlockPill = null;
  }

  private get look() {
    return BIZ_ART[this.bizId] ?? BIZ_ART.dropship;
  }

  create(): void {
    this.bridge = bridgeOf(this);
    const { w, h } = setupCamera(this);
    this.w = w;
    const insets = this.bridge.insets();
    this.top = insets.top;
    const b = this.biz();
    this.floorCount = b.floors.length;
    this.levels = { transport: b.transport.level, sale: b.sale.level };

    this.cameras.main.setBackgroundColor(0x3b2a20);
    this.drawSurface();
    b.floors.forEach((_, i) => this.drawFloor(i));
    this.drawShaft();
    this.drawUnlockSlot();
    this.makeParticles();

    const worldBottom = this.floorY(this.floorCount) + (this.floorCount < CHAIN.maxFloors ? FLOOR_H : 20);
    this.drag = new DragScroll(this, 0, worldBottom + insets.bottom - h);
    this.cameras.main.scrollY = this.startScroll;
    this.drag.setBounds(0, worldBottom + insets.bottom - h);
  }

  private biz(): BusinessState {
    return this.bridge.state().biz[this.bizId];
  }

  private floorY(i: number): number {
    return this.top + SURFACE_H + i * FLOOR_H + FLOOR_H / 2;
  }

  private cabinY(pos: number): number {
    const surface = this.groundY - 26;
    const first = this.floorY(0) + 22;
    return pos <= 1 ? Phaser.Math.Linear(surface, first, pos) : first + (pos - 1) * FLOOR_H;
  }

  private tapZone(x: number, y: number, w: number, h: number, st: Station): void {
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapStation(this.bizId, st);
    });
  }

  private pill(x: number, y: number, st: Station): Pill {
    const p = new Pill(this, x, y, "Nv 1").setDepth(40);
    p.setInteractive({ useHandCursor: true });
    p.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.openStation(this.bizId, st);
    });
    return p;
  }

  private plaque(x: number, y: number, text: string): void {
    const t = label(this, x, y, text, 12, "#ffffff", { bold: true }).setDepth(31);
    // Que no se salga por los bordes de la pantalla
    x = Phaser.Math.Clamp(x, t.width / 2 + 16, this.w - t.width / 2 - 16);
    t.setX(x);
    const g = this.add.graphics().setDepth(30);
    g.fillStyle(0x14202f, 0.82).fillRoundedRect(x - t.width / 2 - 10, y - 11, t.width + 20, 22, 11);
  }

  /** Pila de objetos que crece con la cantidad acumulada. */
  private pile(x: number, y: number, depth: number): Phaser.GameObjects.Image[] {
    const spots = [
      [0, 0],
      [18, 0],
      [9, -14],
      [-18, 0],
      [-9, -14],
      [0, -28],
    ];
    return spots.map(([dx, dy]) => art(this, x + dx, y + dy, this.look.item).setDepth(depth).setVisible(false));
  }

  private showPile(pile: Phaser.GameObjects.Image[], amount: number, unit: number): void {
    const n = amount <= 0 ? 0 : Math.min(pile.length, 1 + Math.floor(Math.log2(1 + amount / Math.max(unit, 1e-9))));
    pile.forEach((img, i) => img.setVisible(i < n));
  }

  /* ---------- Superficie: calle, fachada y venta ---------- */

  private drawSurface(): void {
    const def = bizDef(this.bizId);
    const w = this.w;
    const y0 = this.top;
    this.groundY = y0 + SURFACE_H - 44;
    const g = this.add.graphics();
    const p = new Pen(g);

    // Cielo, sol y skyline
    p.vgrad(0, 0, w, this.groundY, 0x6ec3f4, 0xd8f1ff);
    g.fillStyle(0xfff3b0, 0.35).fillCircle(w - 70, y0 + 46, 34);
    g.fillStyle(0xffe066, 1).fillCircle(w - 70, y0 + 46, 20);
    const rand = rng(11);
    for (let x = 0; x < w; x += 26 + rand() * 18) {
      const bh = 30 + rand() * 70;
      g.fillStyle(0x9fc9e6, 1).fillRect(x, this.groundY - bh, 22 + rand() * 16, bh);
    }
    for (let x = 10; x < w; x += 34 + rand() * 20) {
      const bh = 20 + rand() * 46;
      const bw = 20 + rand() * 18;
      g.fillStyle(0x86b7da, 1).fillRect(x, this.groundY - bh, bw, bh);
      g.fillStyle(0xd8f1ff, 0.6);
      for (let yy = this.groundY - bh + 6; yy < this.groundY - 6; yy += 9) g.fillRect(x + 4, yy, bw - 8, 3);
    }
    for (let i = 0; i < 2; i++) {
      const c = art(this, rand() * w, y0 + 24 + i * 34, "cloud").setAlpha(0.9);
      c.setDisplaySize(ART.cloud.w * 0.6, ART.cloud.h * 0.6);
      this.clouds.push(c);
    }

    // Acera y calzada
    g.fillStyle(0xc9cdd6, 1).fillRect(0, this.groundY - 4, w, 18);
    g.fillStyle(0xaab0bb, 1).fillRect(0, this.groundY + 12, w, 3);
    g.fillStyle(0x4a5160, 1).fillRect(0, this.groundY + 15, w, y0 + SURFACE_H - this.groundY - 15);
    for (let x = 0; x < w; x += 40) g.fillStyle(0xf5f5f5, 0.85).fillRect(x, this.groundY + 27, 20, 3);

    // Fachada del negocio sobre el hueco del ascensor
    const fw = SHAFT_X + SHAFT_W + 38;
    const fh = 112;
    const fy = this.groundY - fh;
    g.fillStyle(shade(def.wall, -0.25), 1).fillRect(0, fy + 8, fw + 6, fh - 8);
    g.fillStyle(def.wall, 1).fillRect(0, fy + 8, fw, fh - 8);
    g.fillStyle(def.roof, 1).fillRect(-4, fy, fw + 12, 14);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 2; c++) {
        g.fillStyle(0xcfefff, 1).fillRoundedRect(12 + c * 50, fy + 24 + r * 28, 34, 18, 3);
        g.fillStyle(0xffffff, 0.5).fillRect(14 + c * 50, fy + 26 + r * 28, 10, 4);
      }
    g.fillStyle(0x2c3e50, 1).fillRoundedRect(SHAFT_X + 6, this.groundY - 44, SHAFT_W - 12, 44, { tl: 8, tr: 8, bl: 0, br: 0 });
    emoji(this, fw / 2, fy + 82, def.icon, 18).setDepth(3);

    // Destino de la venta: tienda del cliente
    this.sellFrom = fw + 64;
    this.sellTo = w - 70;
    const sx = w - 64;
    g.fillStyle(0xecf0f1, 1).fillRect(sx - 6, this.groundY - 78, 70, 78);
    g.fillStyle(0x16a085, 1).fillRect(sx - 10, this.groundY - 84, 78, 10);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0xffffff : 0x16a085, 1).fillTriangle(sx - 10 + i * 13, this.groundY - 74, sx + 3 + i * 13, this.groundY - 74, sx - 3.5 + i * 13, this.groundY - 64);
    }
    g.fillStyle(0x7fc8f8, 1).fillRect(sx + 4, this.groundY - 56, 26, 22);
    g.fillStyle(0x6d4c41, 1).fillRect(sx + 36, this.groundY - 46, 18, 46);

    // Pila de producto en superficie
    this.topPile = this.pile(fw + 26, this.groundY - 6, 8);
    this.topStock = label(this, fw + 26, this.groundY - 58, "", 13, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9);

    // Vendedor: furgoneta o persona
    const sellerKey = this.look.vehicle ? this.look.seller : `ch_${this.look.seller}_0`;
    this.seller = art(this, this.sellFrom, this.groundY + (this.look.vehicle ? 8 : 0), sellerKey).setOrigin(0.5, 0.95).setDepth(10);
    this.sellerItem = art(this, this.sellFrom, this.groundY - 64, this.look.item).setDepth(11).setVisible(false);
    this.sellerCarry = label(this, this.sellFrom, this.groundY - 80, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(12);
    this.saleHint = emoji(this, this.sellFrom, this.groundY - 92, "👆", 26).setDepth(13);
    this.tweens.add({ targets: this.saleHint, y: this.groundY - 82, yoyo: true, repeat: -1, duration: 500 });

    const midX = (this.sellFrom + this.sellTo) / 2 - 6;
    this.saleMgr = emoji(this, midX + 58, y0 + 58, "👔", 18).setDepth(41);
    this.plaque(midX, y0 + 26, def.saleName);
    this.salePill = this.pill(midX, y0 + 58, { kind: "sale" });
    this.tapZone(fw + 30, y0 + 40, w - fw - 30, SURFACE_H - 40, { kind: "sale" });
  }

  /* ---------- Plantas ---------- */

  private drawFloor(i: number): void {
    const def = bizDef(this.bizId);
    const room = ROOM[this.bizId] ?? ROOM.dropship;
    const w = this.w;
    const yc = this.floorY(i);
    const yTop = yc - FLOOR_H / 2;
    const roomX = SHAFT_X + SHAFT_W + 6;
    const roomW = w - roomX - 8;
    const roomY = yTop + 10;
    const roomH = FLOOR_H - 18;
    const floorY = roomY + roomH - 16;
    const g = this.add.graphics();
    const p = new Pen(g);

    // Tierra con piedras
    g.fillStyle(i % 2 ? 0x5b3b2a : 0x654331, 1).fillRect(0, yTop, w, FLOOR_H);
    const rand = rng(100 + i);
    for (let k = 0; k < 14; k++) g.fillStyle(0x000000, 0.12 + rand() * 0.1).fillEllipse(rand() * w, yTop + rand() * FLOOR_H, 6 + rand() * 14, 4 + rand() * 8);

    // Sala: pared con degradado, zócalo, suelo de lamas y lámpara con haz de luz
    g.fillStyle(0x000000, 0.35).fillRoundedRect(roomX + 3, roomY + 4, roomW, roomH, 12);
    p.vgrad(roomX, roomY, roomW, roomH, room.wall, shade(room.wall, -0.12), 16);
    g.fillStyle(shade(room.wall, -0.2), 1).fillRect(roomX, floorY - 22, roomW, 22);
    g.fillStyle(room.floor, 1).fillRect(roomX, floorY, roomW, roomY + roomH - floorY);
    g.lineStyle(1, shade(room.floor, -0.25), 1);
    for (let x = roomX + 18; x < roomX + roomW; x += 30) g.lineBetween(x, floorY, x - 6, roomY + roomH);
    g.fillStyle(0xffffff, 0.12).fillRect(roomX, floorY, roomW, 3);
    const lampX = roomX + roomW * 0.55;
    g.fillStyle(0xfff3b0, 0.18).fillTriangle(lampX, roomY + 10, lampX - 70, floorY, lampX + 70, floorY);
    g.fillStyle(0x2c3e50, 1).fillRect(lampX - 1, roomY, 2, 8).fillRoundedRect(lampX - 10, roomY + 6, 20, 8, 4);
    g.fillStyle(0xfff3b0, 1).fillCircle(lampX, roomY + 14, 4);
    g.lineStyle(3, 0x2b1d14, 0.6).strokeRoundedRect(roomX, roomY, roomW, roomH, 12);

    const station = art(this, roomX + roomW - 56, floorY + 6, this.look.station).setOrigin(0.5, 1).setDepth(4);
    const depX = roomX + 30;
    g.fillStyle(0x8d6e63, 1).fillRoundedRect(depX - 22, floorY - 6, 44, 8, 2);
    g.fillStyle(0x6d4c41, 1).fillRect(depX - 20, floorY + 2, 6, 5).fillRect(depX + 14, floorY + 2, 6, 5);
    const pile = this.pile(depX, floorY - 16, 5);

    this.plaque(roomX + 70, roomY + 16, `${def.floorName} ${i + 1}`);
    const stock = label(this, depX, floorY - 62, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(12);
    const worker = art(this, depX + 40, floorY + 4, `ch_${this.look.worker}_0`).setOrigin(0.5, 0.95).setDepth(8);
    const carry = art(this, depX + 40, floorY - 58, this.look.item).setDepth(9).setVisible(false);
    const bar = this.add.rectangle(roomX + 12, roomY + roomH - 5, 0, 4, COLORS.green).setOrigin(0, 0.5).setDepth(6);
    const hint = emoji(this, depX + 40, floorY - 70, "👆", 24).setDepth(20);
    this.tweens.add({ targets: hint, y: floorY - 62, yoyo: true, repeat: -1, duration: 500 });
    const manager = emoji(this, roomX + 18, roomY + 16, "👔", 16).setDepth(32);
    const pill = this.pill(roomX + roomW - 42, roomY + 18, { kind: "floor", index: i });

    this.tapZone(roomX, roomY, roomW, roomH, { kind: "floor", index: i });
    this.floors[i] = { worker, carry, pile, stock, bar, hint, pill, manager, station, floorY, level: this.biz().floors[i].level };
  }

  private drawUnlockSlot(): void {
    const n = this.floorCount;
    if (n >= CHAIN.maxFloors) return;
    const yc = this.floorY(n);
    const roomX = SHAFT_X + SHAFT_W + 6;
    const roomW = this.w - roomX - 8;
    const g = this.add.graphics();
    g.fillStyle(0x3b2a20, 1).fillRect(0, yc - FLOOR_H / 2, this.w, FLOOR_H);
    g.fillStyle(0xffffff, 0.04).fillRoundedRect(roomX, yc - FLOOR_H / 2 + 10, roomW, FLOOR_H - 20, 12);
    g.lineStyle(2, 0xffffff, 0.3).strokeRoundedRect(roomX, yc - FLOOR_H / 2 + 10, roomW, FLOOR_H - 20, 12);
    label(this, roomX + roomW / 2, yc - 22, `🔒 ${bizDef(this.bizId).floorName} ${n + 1}`, 15, "#ffffff", { bold: true });
    this.unlockPill = new Pill(this, roomX + roomW / 2, yc + 14, "").setDepth(40);
    this.unlockPill.setInteractive({ useHandCursor: true });
    this.unlockPill.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.openUnlockFloor(this.bizId);
    });
  }

  /* ---------- Hueco del ascensor ---------- */

  private drawShaft(): void {
    const def = bizDef(this.bizId);
    const yTop = this.groundY - 44;
    const yBottom = this.floorY(this.floorCount - 1) + FLOOR_H / 2;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x1f2630, 1).fillRect(SHAFT_X, yTop, SHAFT_W, yBottom - yTop);
    g.fillStyle(0x5d6d7e, 1).fillRect(SHAFT_X + 4, yTop, 4, yBottom - yTop).fillRect(SHAFT_X + SHAFT_W - 8, yTop, 4, yBottom - yTop);
    g.lineStyle(2, 0x34495e, 1);
    for (let y = yTop + 20; y < yBottom; y += 34) {
      g.lineBetween(SHAFT_X + 8, y, SHAFT_X + SHAFT_W - 8, y + 20);
      g.lineBetween(SHAFT_X + SHAFT_W - 8, y, SHAFT_X + 8, y + 20);
    }
    this.pulley = art(this, SHAFT_X + SHAFT_W / 2, yTop - 12, "pulley").setDepth(5);
    this.cable = this.add.rectangle(SHAFT_X + SHAFT_W / 2, yTop - 4, 2, 10, 0xbdc3c7).setOrigin(0.5, 0).setDepth(3);

    // Cabina de cristal
    const c = this.add.graphics();
    c.fillStyle(0x000000, 0.35).fillRoundedRect(-27, -24, 56, 52, 6);
    c.fillStyle(COLORS.cabin, 1).fillRoundedRect(-28, -27, 56, 52, 6);
    c.fillStyle(0xcfefff, 0.85).fillRoundedRect(-22, -21, 44, 34, 4);
    c.fillStyle(0xffffff, 0.5).fillRect(-18, -18, 8, 26);
    c.fillStyle(shade(COLORS.cabin, -0.25), 1).fillRect(-28, 15, 56, 10);
    this.cabinItem = art(this, 0, -2, this.look.item).setVisible(false);
    this.cabinCarry = label(this, 0, -40, "", 12, "#ffffff", { bold: true, stroke: "#14202f" });
    this.cabin = this.add.container(SHAFT_X + SHAFT_W / 2, this.cabinY(0), [c, this.cabinItem, this.cabinCarry]).setDepth(4);

    this.plaque(SHAFT_X + SHAFT_W / 2 + 4, this.top + 26, def.transportName);
    this.transportPill = this.pill(SHAFT_X + SHAFT_W / 2 + 12, this.top + 58, { kind: "transport" });
    this.transportHint = emoji(this, SHAFT_X + SHAFT_W + 20, this.cabinY(0), "👈", 24).setDepth(20);
    this.tweens.add({ targets: this.transportHint, x: SHAFT_X + SHAFT_W + 28, yoyo: true, repeat: -1, duration: 500 });
    this.transportMgr = emoji(this, SHAFT_X + SHAFT_W / 2, yTop + 16, "👔", 16).setDepth(6);
    this.tapZone(SHAFT_X, yTop, SHAFT_W, yBottom - yTop, { kind: "transport" });
  }

  /* ---------- Partículas ---------- */

  private makeParticles(): void {
    const cs = artScale(this, "coin");
    this.coins = this.add
      .particles(0, 0, "coin", {
        speed: { min: 90, max: 170 },
        angle: { min: 225, max: 315 },
        gravityY: 420,
        lifespan: 900,
        scale: { start: cs, end: cs * 0.7 },
        rotate: { min: -180, max: 180 },
        emitting: false,
      })
      .setDepth(60);
    const ss = artScale(this, "spark");
    this.sparks = this.add
      .particles(0, 0, "spark", {
        speed: { min: 40, max: 120 },
        lifespan: 600,
        scale: { start: ss * 0.9, end: 0 },
        tint: [0xf5c542, 0xffffff, 0x3ddc97],
        emitting: false,
      })
      .setDepth(60);
    const ps = artScale(this, "puff");
    this.puffs = this.add
      .particles(0, 0, "puff", {
        speedY: { min: -40, max: -20 },
        speedX: { min: -8, max: 8 },
        lifespan: 1200,
        scale: { start: ps * 0.4, end: ps * 1.1 },
        alpha: { start: 0.5, end: 0 },
        emitting: false,
      })
      .setDepth(7);
  }

  /* ---------- Actualización ---------- */

  update(_t: number, dtMs: number): void {
    const s = this.bridge.state();
    const b = this.biz();
    if (!b) return;
    if (b.floors.length !== this.floorCount) {
      this.scene.restart({ id: this.bizId, scroll: this.cameras.main.scrollY });
      return;
    }
    const def = bizDef(this.bizId);
    const t = this.time.now / 1000;
    const dt = Math.min(dtMs, 100) / 1000;
    const walkFrame = Math.floor(t * WALK_FPS) % 2 ? 1 : 2;
    const tutorial = s.totalEarned < 30;
    const roomX = SHAFT_X + SHAFT_W + 6;
    const roomW = this.w - roomX - 8;
    const unit = CHAIN.floorCycle * def.mult;

    for (const c of this.clouds) {
      c.x += 6 * dt;
      if (c.x > this.w + 80) c.x = -80;
    }

    // Plantas
    this.puffClock += dt;
    const puffNow = this.puffClock > 0.35;
    if (puffNow) this.puffClock = 0;
    b.floors.forEach((f, i) => {
      const v = this.floors[i];
      const depX = roomX + 30 + 40;
      const workX = roomX + roomW - 110;
      const p = f.running ? f.prog / CHAIN.floorCycle : 0;
      let x = depX;
      let state: "idle" | "out" | "work" | "back" = "idle";
      if (f.running) {
        if (p < 0.3) {
          x = Phaser.Math.Linear(depX, workX, p / 0.3);
          state = "out";
        } else if (p < 0.7) {
          x = workX;
          state = "work";
        } else {
          x = Phaser.Math.Linear(workX, depX, (p - 0.7) / 0.3);
          state = "back";
        }
      }
      const walking = state === "out" || state === "back";
      v.worker.setTexture(`ch_${this.look.worker}_${walking ? walkFrame : 0}`);
      v.worker.setPosition(x, v.floorY + 4 - (state === "work" ? Math.abs(Math.sin(t * 14)) * 3 : 0));
      v.worker.setFlipX(state === "back");
      v.carry.setVisible(state === "back").setPosition(x - 10, v.floorY - 34);
      if (state === "work" && puffNow) {
        const sx = v.station.x;
        const sy = v.station.y - 70;
        if (this.bizId === "restaurant") this.puffs.emitParticleAt(sx - 20 + Math.random() * 40, sy + 20);
        else this.sparks.emitParticleAt(sx - 20 + Math.random() * 40, sy + 20 + Math.random() * 40, 1);
      }
      this.showPile(v.pile, f.stock, unit);
      v.stock.setText(f.stock > 0 ? fmt(f.stock) : "");
      v.bar.width = (roomW - 24) * p;
      v.hint.setVisible(tutorial && !f.managed && !f.running).setX(x);
      v.manager.setVisible(f.managed);
      if (f.level > v.level) {
        this.sparks.explode(14, v.station.x, v.station.y - 40);
        v.level = f.level;
      }
      const q = upgradeQuote(s, this.bizId, { kind: "floor", index: i });
      v.pill.setText(`Nv ${f.level} ⬆`).setAlert(s.cash >= q.cost || (!f.managed && s.cash >= managerCost(def, { kind: "floor", index: i })));
    });

    // Transporte
    const tr = b.transport;
    const cy = this.cabinY(tr.pos);
    this.cabin.y = cy;
    this.cable.height = Math.max(4, cy - 27 - this.cable.y);
    if (tr.phase === "down" || tr.phase === "up") this.pulley.rotation += (tr.phase === "down" ? 4 : -4) * dt;
    this.cabinItem.setVisible(tr.carry > 0);
    this.cabinCarry.setText(tr.carry > 0 ? fmt(tr.carry) : "");
    this.transportHint.setVisible(tutorial && tr.phase === "idle" && !tr.managed && b.floors.some((f) => f.stock > 0));
    this.transportMgr.setVisible(tr.managed);
    if (tr.level > this.levels.transport) {
      this.sparks.explode(14, this.cabin.x, cy);
      this.levels.transport = tr.level;
    }
    const tq = upgradeQuote(s, this.bizId, { kind: "transport" });
    this.transportPill
      .setText(`Nv ${tr.level} ⬆`)
      .setAlert(s.cash >= tq.cost || (!tr.managed && s.cash >= managerCost(def, { kind: "transport" })));

    // Venta
    const sl = b.sale;
    let sx = this.sellFrom;
    if (sl.phase === "out") sx = Phaser.Math.Linear(this.sellFrom, this.sellTo, sl.prog);
    else if (sl.phase === "back") sx = Phaser.Math.Linear(this.sellTo, this.sellFrom, sl.prog);
    const moving = sl.phase !== "idle";
    if (!this.look.vehicle) this.seller.setTexture(`ch_${this.look.seller}_${moving ? walkFrame : 0}`);
    const baseY = this.groundY + (this.look.vehicle ? 8 : 0);
    this.seller.setPosition(sx, baseY - (moving && this.look.vehicle ? Math.abs(Math.sin(t * 20)) * 1.5 : 0));
    this.seller.setFlipX(sl.phase === "back");
    this.sellerItem.setVisible(sl.carry > 0).setPosition(sx, this.groundY - (this.look.vehicle ? 52 : 62));
    this.sellerCarry.setText(sl.carry > 0 ? fmt(sl.carry) : "").setPosition(sx, this.groundY - 84);
    this.showPile(this.topPile, b.topStock, unit);
    this.topStock.setText(b.topStock > 0 ? fmt(b.topStock) : "");
    this.saleHint.setVisible(tutorial && sl.phase === "idle" && !sl.managed && b.topStock > 0).setX(this.sellFrom);
    this.saleMgr.setVisible(sl.managed);
    if (sl.level > this.levels.sale) {
      this.sparks.explode(14, this.salePill.x, this.salePill.y);
      this.levels.sale = sl.level;
    }
    const sq = upgradeQuote(s, this.bizId, { kind: "sale" });
    this.salePill.setText(`Nv ${sl.level} ⬆`).setAlert(s.cash >= sq.cost || (!sl.managed && s.cash >= managerCost(def, { kind: "sale" })));

    if (this.unlockPill) {
      const cost = floorUnlockCost(def, b.floors.length);
      this.unlockPill.setText(`Abrir · ${fmt(cost)} €`).setAlert(s.cash >= cost).setAlpha(s.cash >= cost ? 1 : 0.6);
    }

    // La parte que limita la cadena se marca en rojo (cuando ya hay algo automatizado).
    const rates = chainRates(def, b, false);
    const auto = tr.managed || sl.managed || b.floors.some((f) => f.managed);
    this.floors.forEach((v) => v.pill.setWarn(auto && rates.bottleneck === "production"));
    this.transportPill.setWarn(auto && rates.bottleneck === "transport");
    this.salePill.setWarn(auto && rates.bottleneck === "sale");

    for (const sale of this.bridge.drainSales(this.bizId)) {
      this.coins.explode(7, this.sellTo, this.groundY - 40);
      floatText(this, this.sellTo, this.groundY - 96, `+${fmt(sale.amount)}`);
    }
  }
}
