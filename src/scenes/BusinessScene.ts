import Phaser from "phaser";
import { CHAIN } from "../game/data";
import { bizDef, chainRates, floorUnlockCost, managerCost, upgradeQuote, type Station } from "../game/economy";
import { fmt } from "../game/format";
import type { BusinessState } from "../game/state";
import { COLORS, DragScroll, Pill, bridgeOf, emoji, floatText, label, setupCamera, type Bridge } from "./common";

const SURFACE_H = 200;
const FLOOR_H = 132;
const SHAFT_X = 16;
const SHAFT_W = 64;

interface FloorView {
  worker: Phaser.GameObjects.Text;
  carry: Phaser.GameObjects.Text;
  stock: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Rectangle;
  hint: Phaser.GameObjects.Text;
  pill: Pill;
  manager: Phaser.GameObjects.Text;
}

/** Interior de un negocio: plantas de producción → transporte → venta, todo animado. */
export class BusinessScene extends Phaser.Scene {
  private bridge!: Bridge;
  private bizId = "";
  private w = 0;
  private top = 0;
  private floors: FloorView[] = [];
  private floorCount = 0;
  private cabin!: Phaser.GameObjects.Container;
  private cabinCarry!: Phaser.GameObjects.Text;
  private cable!: Phaser.GameObjects.Rectangle;
  private transportPill!: Pill;
  private transportHint!: Phaser.GameObjects.Text;
  private transportMgr!: Phaser.GameObjects.Text;
  private seller!: Phaser.GameObjects.Text;
  private sellerCarry!: Phaser.GameObjects.Text;
  private salePill!: Pill;
  private saleHint!: Phaser.GameObjects.Text;
  private saleMgr!: Phaser.GameObjects.Text;
  private topStock!: Phaser.GameObjects.Text;
  private unlockPill: Pill | null = null;
  private drag!: DragScroll;
  private sellFrom = 0;
  private sellTo = 0;
  private groundY = 0;

  constructor() {
    super("business");
  }

  private startScroll = 0;

  init(data: { id: string; scroll?: number }): void {
    this.bizId = data.id;
    this.startScroll = data.scroll ?? 0;
    this.floors = [];
    this.unlockPill = null;
  }

  create(): void {
    this.bridge = bridgeOf(this);
    const { w, h } = setupCamera(this);
    this.w = w;
    const insets = this.bridge.insets();
    this.top = insets.top;
    const b = this.biz();
    this.floorCount = b.floors.length;

    this.cameras.main.setBackgroundColor(COLORS.earthDark);
    this.drawSurface();
    b.floors.forEach((_, i) => this.drawFloor(i));
    this.drawShaft();
    this.drawUnlockSlot();

    const worldBottom = this.floorY(this.floorCount) + (this.floorCount < CHAIN.maxFloors ? FLOOR_H : 20);
    this.drag = new DragScroll(this, 0, worldBottom + insets.bottom - h);
    this.cameras.main.scrollY = this.startScroll;
    this.drag.setBounds(0, worldBottom + insets.bottom - h);

  }

  private biz(): BusinessState {
    return this.bridge.state().biz[this.bizId];
  }

  /** Y del centro de la planta i. */
  private floorY(i: number): number {
    return this.top + SURFACE_H + i * FLOOR_H + FLOOR_H / 2;
  }

  /** Y del ascensor para una posición (0 = superficie, i + 1 = planta i). */
  private cabinY(pos: number): number {
    const surface = this.top + SURFACE_H - 34;
    const first = this.floorY(0) + 4;
    return pos <= 1 ? Phaser.Math.Linear(surface, first, pos) : first + (pos - 1) * FLOOR_H;
  }

  private tapZone(x: number, y: number, w: number, h: number, st: Station): void {
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapStation(this.bizId, st);
    });
  }

  private pill(x: number, y: number, st: Station): Pill {
    const p = new Pill(this, x, y, "Nv 1").setDepth(20);
    p.setInteractive({ useHandCursor: true });
    p.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.openStation(this.bizId, st);
    });
    return p;
  }

  /* ---------- Superficie: venta ---------- */

  private drawSurface(): void {
    const def = bizDef(this.bizId);
    const w = this.w;
    const y0 = this.top;
    const g = this.add.graphics();
    // Cielo por encima (queda bajo la cabecera HTML) y fachada
    g.fillStyle(COLORS.sky, 1).fillRect(0, 0, w, y0 + SURFACE_H);
    g.fillStyle(0xffffff, 0.55).fillEllipse(w * 0.7, y0 + 30, 90, 26).fillEllipse(w * 0.25, y0 + 50, 70, 20);
    this.groundY = y0 + SURFACE_H - 34;
    g.fillStyle(COLORS.grass, 1).fillRect(0, this.groundY + 14, w, 20);
    g.fillStyle(COLORS.sidewalk, 1).fillRect(SHAFT_X + SHAFT_W, this.groundY - 4, w, 20);
    // Edificio del negocio a la izquierda, encima del hueco del ascensor
    g.fillStyle(def.wall, 1).fillRect(SHAFT_X - 8, y0 + 64, SHAFT_W + 16, SURFACE_H - 80);
    g.fillStyle(def.roof, 1).fillTriangle(SHAFT_X - 16, y0 + 66, SHAFT_X + SHAFT_W / 2, y0 + 30, SHAFT_X + SHAFT_W + 16, y0 + 66);
    emoji(this, SHAFT_X + SHAFT_W / 2, y0 + 70, def.icon, 22);
    // Cliente al fondo
    this.sellFrom = SHAFT_X + SHAFT_W + 70;
    this.sellTo = w - 64;
    g.fillStyle(0xffffff, 0.9).fillRoundedRect(this.sellTo - 6, this.groundY - 64, 58, 52, 10);
    emoji(this, this.sellTo + 23, this.groundY - 38, def.customer, 30);
    // Pila de producto en superficie
    g.fillStyle(0x000000, 0.15).fillEllipse(SHAFT_X + SHAFT_W + 34, this.groundY + 10, 48, 10);
    emoji(this, SHAFT_X + SHAFT_W + 34, this.groundY - 6, def.item, 26);
    this.topStock = label(this, SHAFT_X + SHAFT_W + 34, this.groundY - 34, "", 13, "#ffffff", { bold: true, stroke: "#14202f" });

    this.seller = emoji(this, this.sellFrom, this.groundY - 8, def.saleWorker, 34).setDepth(5);
    this.sellerCarry = label(this, this.sellFrom, this.groundY - 44, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(6);
    this.saleHint = emoji(this, this.sellFrom, this.groundY - 62, "👆", 26).setDepth(7);
    this.tweens.add({ targets: this.saleHint, y: this.groundY - 52, yoyo: true, repeat: -1, duration: 500 });
    this.saleMgr = emoji(this, this.sellTo - 30, y0 + 30 + 58, "👔", 20).setDepth(6);

    label(this, (this.sellFrom + this.sellTo) / 2 + 10, y0 + 76, def.saleName, 15, "#14202f", { bold: true });
    this.salePill = this.pill((this.sellFrom + this.sellTo) / 2 + 10, y0 + 102, { kind: "sale" });
    this.tapZone(SHAFT_X + SHAFT_W + 60, y0 + 60, w - SHAFT_X - SHAFT_W - 60, SURFACE_H - 60, { kind: "sale" });
  }

  /* ---------- Plantas ---------- */

  private drawFloor(i: number): void {
    const def = bizDef(this.bizId);
    const w = this.w;
    const yc = this.floorY(i);
    const yTop = yc - FLOOR_H / 2;
    const roomX = SHAFT_X + SHAFT_W + 8;
    const roomW = w - roomX - 10;
    const g = this.add.graphics();
    g.fillStyle(i % 2 ? COLORS.earth : 0x654331, 1).fillRect(0, yTop, w, FLOOR_H);
    g.fillStyle(COLORS.room, 1).fillRoundedRect(roomX, yTop + 10, roomW, FLOOR_H - 20, 12);
    g.fillStyle(COLORS.roomLine, 1).fillRect(roomX + 8, yc + 30, roomW - 16, 4);
    // Depósito junto al ascensor y puesto de trabajo al fondo
    const depX = roomX + 30;
    const workX = roomX + roomW - 40;
    g.fillStyle(0x8a5a33, 1).fillRoundedRect(depX - 20, yc + 6, 40, 24, 5);
    emoji(this, depX, yc + 4, def.item, 20);
    g.fillStyle(0xffffff, 0.8).fillRoundedRect(workX - 24, yc - 26, 48, 50, 10);
    emoji(this, workX, yc - 2, def.item, 28);

    label(this, roomX + roomW / 2, yTop + 26, `${def.floorName} ${i + 1}`, 14, "#5b3b2a", { bold: true });
    const stock = label(this, depX, yc - 24, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(6);
    const worker = emoji(this, depX + 36, yc + 8, def.worker, 34).setDepth(5);
    const carry = emoji(this, depX + 36, yc - 24, def.item, 16).setDepth(6).setVisible(false);
    const bar = this.add.rectangle(roomX + 10, yTop + FLOOR_H - 16, 0, 4, COLORS.green).setOrigin(0, 0.5);
    const hint = emoji(this, depX + 36, yc - 34, "👆", 24).setDepth(7);
    this.tweens.add({ targets: hint, y: yc - 26, yoyo: true, repeat: -1, duration: 500 });
    const manager = emoji(this, roomX + 18, yTop + 26, "👔", 18).setDepth(6);
    const pill = this.pill(roomX + roomW - 44, yTop + 28, { kind: "floor", index: i });

    this.tapZone(roomX, yTop + 10, roomW, FLOOR_H - 20, { kind: "floor", index: i });
    this.floors[i] = { worker, carry, stock, bar, hint, pill, manager };
  }

  private drawUnlockSlot(): void {
    const n = this.floorCount;
    if (n >= CHAIN.maxFloors) return;
    const yc = this.floorY(n);
    const roomX = SHAFT_X + SHAFT_W + 8;
    const g = this.add.graphics();
    g.fillStyle(COLORS.earthDark, 1).fillRect(0, yc - FLOOR_H / 2, this.w, FLOOR_H);
    g.lineStyle(2, 0xffffff, 0.35).strokeRoundedRect(roomX, yc - FLOOR_H / 2 + 10, this.w - roomX - 10, FLOOR_H - 20, 12);
    label(this, roomX + (this.w - roomX - 10) / 2, yc - 22, `🔒 ${bizDef(this.bizId).floorName} ${n + 1}`, 15, "#ffffff", { bold: true });
    this.unlockPill = new Pill(this, roomX + (this.w - roomX - 10) / 2, yc + 14, "").setDepth(20);
    this.unlockPill.setInteractive({ useHandCursor: true });
    this.unlockPill.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.openUnlockFloor(this.bizId);
    });
  }

  /* ---------- Hueco del ascensor ---------- */

  private drawShaft(): void {
    const def = bizDef(this.bizId);
    const yTop = this.top + SURFACE_H - 60;
    const yBottom = this.floorY(this.floorCount - 1) + FLOOR_H / 2;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(COLORS.shaft, 1).fillRect(SHAFT_X, yTop, SHAFT_W, yBottom - yTop);
    g.fillStyle(0x000000, 0.2).fillRect(SHAFT_X + 6, yTop, 4, yBottom - yTop).fillRect(SHAFT_X + SHAFT_W - 10, yTop, 4, yBottom - yTop);
    this.cable = this.add.rectangle(SHAFT_X + SHAFT_W / 2, yTop, 2, 10, COLORS.cable).setOrigin(0.5, 0).setDepth(3);

    const cabinBg = this.add.graphics();
    cabinBg.fillStyle(0x000000, 0.3).fillRoundedRect(-27, -21, 54, 48, 8);
    cabinBg.fillStyle(COLORS.cabin, 1).fillRoundedRect(-27, -24, 54, 48, 8);
    cabinBg.fillStyle(0xffffff, 0.35).fillRect(-21, -18, 42, 6);
    const icon = emoji(this, 0, 4, def.transportIcon, 24);
    this.cabinCarry = label(this, 0, -36, "", 12, "#ffffff", { bold: true, stroke: "#14202f" });
    this.cabin = this.add.container(SHAFT_X + SHAFT_W / 2, this.cabinY(0), [cabinBg, icon, this.cabinCarry]).setDepth(4);

    label(this, SHAFT_X + SHAFT_W / 2, yTop - 40, def.transportName, 11, "#14202f", { bold: true }).setDepth(5).setWordWrapWidth(90).setAlign("center");
    this.transportPill = this.pill(SHAFT_X + SHAFT_W / 2 + 6, yTop - 14, { kind: "transport" });
    this.transportHint = emoji(this, SHAFT_X + SHAFT_W + 18, this.cabinY(0), "👈", 24).setDepth(7);
    this.tweens.add({ targets: this.transportHint, x: SHAFT_X + SHAFT_W + 26, yoyo: true, repeat: -1, duration: 500 });
    this.transportMgr = emoji(this, SHAFT_X + SHAFT_W / 2, yTop + 18, "👔", 18).setDepth(5);
    this.tapZone(SHAFT_X, yTop, SHAFT_W, yBottom - yTop, { kind: "transport" });
  }

  /* ---------- Actualización ---------- */

  update(): void {
    const s = this.bridge.state();
    const b = this.biz();
    if (!b) return;
    // Si se desbloqueó una planta, se reconstruye la escena.
    if (b.floors.length !== this.floorCount) {
      this.scene.restart({ id: this.bizId, scroll: this.cameras.main.scrollY });
      return;
    }
    const def = bizDef(this.bizId);
    const t = this.time.now / 1000;
    const tutorial = s.totalEarned < 30;

    // Plantas
    b.floors.forEach((f, i) => {
      const v = this.floors[i];
      const yc = this.floorY(i);
      const roomX = SHAFT_X + SHAFT_W + 8;
      const depX = roomX + 30 + 36;
      const workX = this.w - 10 - 40 - 30;
      const p = f.running ? f.prog / CHAIN.floorCycle : 0;
      let x = depX;
      let working = false;
      if (p < 0.3) x = Phaser.Math.Linear(depX, workX, p / 0.3);
      else if (p < 0.7) {
        x = workX;
        working = true;
      } else x = Phaser.Math.Linear(workX, depX, (p - 0.7) / 0.3);
      v.worker.setPosition(x, yc + 8 + (working ? Math.sin(t * 18) * 3 : Math.abs(Math.sin(t * 10)) * (f.running ? -3 : 0)));
      v.worker.setScale(p >= 0.7 || p < 0.3 ? (p < 0.3 ? 1 : -1) : 1, 1);
      v.carry.setVisible(p >= 0.7).setPosition(x, yc - 22);
      v.stock.setText(f.stock > 0 ? fmt(f.stock) : "");
      v.bar.width = (this.w - roomX - 30) * p;
      v.hint.setVisible(tutorial && !f.managed && !f.running).setX(x);
      v.manager.setVisible(f.managed);
      const q = upgradeQuote(s, this.bizId, { kind: "floor", index: i });
      v.pill.setText(`Nv ${f.level} ⬆`).setAlert(s.cash >= q.cost || (!f.managed && s.cash >= managerCost(def, { kind: "floor", index: i })));
    });

    // Transporte
    const tr = b.transport;
    const cy = this.cabinY(tr.pos);
    this.cabin.y = cy;
    this.cable.height = Math.max(4, cy - 24 - this.cable.y);
    this.cabinCarry.setText(tr.carry > 0 ? fmt(tr.carry) : "");
    this.transportHint.setVisible(tutorial && tr.phase === "idle" && !tr.managed && b.floors.some((f) => f.stock > 0));
    this.transportMgr.setVisible(tr.managed);
    const tq = upgradeQuote(s, this.bizId, { kind: "transport" });
    this.transportPill
      .setText(`Nv ${tr.level} ⬆`)
      .setAlert(s.cash >= tq.cost || (!tr.managed && s.cash >= managerCost(def, { kind: "transport" })));

    // Venta
    const sl = b.sale;
    let sx = this.sellFrom;
    if (sl.phase === "out") sx = Phaser.Math.Linear(this.sellFrom, this.sellTo - 8, sl.prog);
    else if (sl.phase === "back") sx = Phaser.Math.Linear(this.sellTo - 8, this.sellFrom, sl.prog);
    this.seller.setPosition(sx, this.groundY - 8 - (sl.phase !== "idle" ? Math.abs(Math.sin(t * 12)) * 3 : 0));
    this.seller.setScale(sl.phase === "back" ? -1 : 1, 1);
    this.sellerCarry.setText(sl.carry > 0 ? fmt(sl.carry) : "").setPosition(sx, this.groundY - 46);
    this.topStock.setText(b.topStock > 0 ? fmt(b.topStock) : "");
    this.saleHint.setVisible(tutorial && sl.phase === "idle" && !sl.managed && b.topStock > 0).setX(this.sellFrom);
    this.saleMgr.setVisible(sl.managed);
    const sq = upgradeQuote(s, this.bizId, { kind: "sale" });
    this.salePill.setText(`Nv ${sl.level} ⬆`).setAlert(s.cash >= sq.cost || (!sl.managed && s.cash >= managerCost(def, { kind: "sale" })));

    // Planta por desbloquear
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

    for (const sale of this.bridge.drainSales(this.bizId)) floatText(this, this.sellTo + 23, this.groundY - 70, `+${fmt(sale.amount)}`);
  }
}
