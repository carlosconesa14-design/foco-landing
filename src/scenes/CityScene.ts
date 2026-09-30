import Phaser from "phaser";
import { BUSINESSES } from "../game/data";
import { businessRate } from "../game/economy";
import { fmt } from "../game/format";
import { COLORS, DragScroll, bridgeOf, emoji, floatText, label, setupCamera, type Bridge } from "./common";

const ROW_H = 262;
const AVENUE_W = 48;

/** Parcelas extra que anuncian contenido futuro. */
const COMING_SOON = [
  { name: "Gimnasio", icon: "🏋️" },
  { name: "Hotel", icon: "🏨" },
];

interface Plot {
  id: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  owned: boolean;
  bubble?: Phaser.GameObjects.Container;
  bubbleText?: Phaser.GameObjects.Text;
  sign?: Phaser.GameObjects.Container;
}

interface Mover {
  obj: Phaser.GameObjects.Text;
  axis: "x" | "y";
  speed: number;
  min: number;
  max: number;
}

/** La ciudad: parcelas con tus negocios, calles con tráfico y gente paseando. */
export class CityScene extends Phaser.Scene {
  private bridge!: Bridge;
  private w = 0;
  private top = 0;
  private plots: Plot[] = [];
  private movers: Mover[] = [];
  private drag!: DragScroll;
  private ownedKey = "";

  constructor() {
    super("city");
  }

  create(): void {
    this.bridge = bridgeOf(this);
    this.plots = [];
    this.movers = [];
    const { w, h } = setupCamera(this);
    this.w = w;
    const insets = this.bridge.insets();
    this.top = insets.top;
    const s = this.bridge.state();
    this.ownedKey = BUSINESSES.map((b) => (s.biz[b.id].owned ? 1 : 0)).join("");

    const entries: ({ id: string } | { soon: (typeof COMING_SOON)[number] })[] = [
      ...BUSINESSES.map((b) => ({ id: b.id })),
      ...COMING_SOON.map((c) => ({ soon: c })),
    ];
    const rows = Math.ceil(entries.length / 2);
    const worldH = this.top + 40 + rows * ROW_H + 60;

    this.cameras.main.setBackgroundColor(COLORS.grass);
    this.drawStreets(rows, worldH);

    const plotW = w / 2 - AVENUE_W / 2 - 22;
    entries.forEach((e, i) => {
      const row = Math.floor(i / 2);
      const left = i % 2 === 0;
      const x = left ? 12 : w / 2 + AVENUE_W / 2 + 10;
      const y = this.top + 40 + row * ROW_H;
      if ("id" in e) this.drawBusinessPlot(e.id, x, y, plotW, 180);
      else this.drawComingSoon(e.soon, x, y, plotW, 180);
    });

    this.spawnTraffic(rows, worldH);
    this.drag = new DragScroll(this, 0, worldH + insets.bottom - h);
  }

  /* ---------- Calles ---------- */

  private drawStreets(rows: number, worldH: number): void {
    const g = this.add.graphics();
    const cx = this.w / 2;
    // Texturas de césped
    for (let i = 0; i < 60; i++) {
      g.fillStyle(COLORS.grassDark, 0.5).fillCircle(Phaser.Math.Between(0, this.w), Phaser.Math.Between(0, worldH), Phaser.Math.Between(2, 5));
    }
    // Avenida principal
    g.fillStyle(COLORS.sidewalk, 1).fillRect(cx - AVENUE_W / 2 - 8, 0, AVENUE_W + 16, worldH);
    g.fillStyle(COLORS.road, 1).fillRect(cx - AVENUE_W / 2, 0, AVENUE_W, worldH);
    for (let y = 0; y < worldH; y += 36) g.fillStyle(COLORS.roadLine, 0.9).fillRect(cx - 2, y, 4, 18);
    // Calles transversales bajo cada fila
    for (let r = 0; r < rows; r++) {
      const y = this.top + 40 + r * ROW_H + 214;
      g.fillStyle(COLORS.sidewalk, 1).fillRect(0, y - 6, this.w, 44);
      g.fillStyle(COLORS.road, 1).fillRect(0, y, this.w, 32);
      for (let x = 0; x < this.w; x += 36) g.fillStyle(COLORS.roadLine, 0.9).fillRect(x, y + 14, 18, 4);
    }
    // Árboles de decoración en los bordes
    for (let r = 0; r <= rows; r++) {
      const y = this.top + 20 + r * ROW_H;
      emoji(this, 10, y, "🌳", 26).setDepth(1);
      emoji(this, this.w - 12, y + 10, "🌲", 24).setDepth(1);
    }
  }

  /* ---------- Parcelas ---------- */

  private drawBusinessPlot(id: string, x: number, y: number, w: number, h: number): void {
    const def = BUSINESSES.find((b) => b.id === id)!;
    const owned = this.bridge.state().biz[id].owned;
    const plot: Plot = { id, x, y, w, h, owned };
    const g = this.add.graphics();
    const baseY = y + h;
    if (owned) {
      const bw = w - 10;
      const bh = 118;
      const bx = x + 5;
      const by = baseY - bh;
      g.fillStyle(0x000000, 0.18).fillEllipse(x + w / 2, baseY + 2, w, 16);
      g.fillStyle(def.wall, 1).fillRect(bx, by, bw, bh);
      g.fillStyle(0x000000, 0.08).fillRect(bx + bw - 14, by, 14, bh);
      g.fillStyle(def.roof, 1).fillRect(bx - 6, by - 14, bw + 12, 16);
      // Ventanas
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 3; c++) {
          g.fillStyle(0xcfefff, 1).fillRect(bx + 12 + c * ((bw - 24) / 3), by + 40 + r * 30, (bw - 24) / 3 - 10, 20);
        }
      g.fillStyle(0x5b3b2a, 1).fillRoundedRect(x + w / 2 - 12, baseY - 30, 24, 30, { tl: 8, tr: 8, bl: 0, br: 0 });
      // Letrero
      g.fillStyle(0xffffff, 1).fillRoundedRect(x + w / 2 - 26, by - 44, 52, 34, 10);
      emoji(this, x + w / 2, by - 27, def.icon, 24);
      label(this, x + w / 2, baseY + 16, def.name, 12, "#14202f", { bold: true }).setWordWrapWidth(w).setAlign("center");
      // Bocadillo con lo que gana
      const bubbleBg = this.add.graphics();
      bubbleBg.fillStyle(0x14202f, 0.9).fillRoundedRect(-44, -13, 88, 26, 13);
      const text = label(this, 0, 0, "", 13, "#3ddc97", { bold: true });
      plot.bubble = this.add.container(x + w / 2, by - 64, [bubbleBg, text]).setDepth(10);
      plot.bubbleText = text;
      this.tweens.add({ targets: plot.bubble, y: by - 68, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
    } else {
      g.fillStyle(0xb58b5a, 1).fillRoundedRect(x, y + 30, w, h - 30, 10);
      g.lineStyle(3, 0xffffff, 0.7);
      for (let fx = x + 8; fx < x + w; fx += 18) g.lineBetween(fx, y + 34, fx, y + 50);
      g.lineBetween(x + 4, y + 42, x + w - 4, y + 42);
      const signBg = this.add.graphics();
      signBg.fillStyle(0x7a4b25, 1).fillRect(-3, 0, 6, 36);
      signBg.fillStyle(0xffffff, 1).fillRoundedRect(-58, -48, 116, 56, 10);
      signBg.lineStyle(3, COLORS.red, 1).strokeRoundedRect(-58, -48, 116, 56, 10);
      const title = label(this, 0, -34, "SE VENDE", 13, "#ff6b5b", { display: true });
      const price = label(this, 0, -12, `${fmt(def.price)} €`, 16, "#14202f", { display: true });
      plot.sign = this.add.container(x + w / 2, y + 110, [signBg, title, price]).setDepth(5);
      emoji(this, x + w / 2, y + 150, def.icon, 22).setAlpha(0.7);
      label(this, x + w / 2, baseY + 16, def.name, 12, "#14202f", { bold: true }).setWordWrapWidth(w).setAlign("center");
    }
    const zone = this.add.zone(x, y, w, h + 20).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapPlot(id);
    });
    this.plots.push(plot);
  }

  private drawComingSoon(c: (typeof COMING_SOON)[number], x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x9aa3b5, 0.6).fillRoundedRect(x, y + 30, w, h - 30, 10);
    g.lineStyle(3, 0xf5c542, 1);
    for (let i = 0; i < 6; i++) g.lineBetween(x + 10 + i * 24, y + 40, x + 22 + i * 24, y + 52);
    emoji(this, x + w / 2, y + 100, "🚧", 34);
    label(this, x + w / 2, y + 140, `${c.icon} ${c.name}`, 13, "#14202f", { bold: true });
    label(this, x + w / 2, y + h + 16, "Próximamente", 12, "#14202f");
  }

  /* ---------- Tráfico ---------- */

  private spawnTraffic(rows: number, worldH: number): void {
    const cx = this.w / 2;
    const cars = ["🚗", "🚕", "🚙", "🚌", "🛵", "🚚"];
    for (let i = 0; i < 6; i++) {
      const down = i % 2 === 0;
      const obj = emoji(this, cx + (down ? -12 : 12), Phaser.Math.Between(0, worldH), Phaser.Utils.Array.GetRandom(cars), 22).setDepth(8);
      obj.setAngle(down ? 90 : -90);
      this.movers.push({ obj, axis: "y", speed: (down ? 1 : -1) * Phaser.Math.Between(50, 90), min: -30, max: worldH + 30 });
    }
    for (let r = 0; r < rows; r++) {
      const y = this.top + 40 + r * ROW_H + 214;
      for (let k = 0; k < 2; k++) {
        const right = k === 0;
        const obj = emoji(this, Phaser.Math.Between(0, this.w), y + (right ? 24 : 9), Phaser.Utils.Array.GetRandom(cars), 20).setDepth(8);
        if (right) obj.setScale(-1, 1);
        this.movers.push({ obj, axis: "x", speed: (right ? 1 : -1) * Phaser.Math.Between(40, 80), min: -30, max: this.w + 30 });
      }
      const walker = emoji(this, Phaser.Math.Between(0, this.w), y - 2, Phaser.Utils.Array.GetRandom(["🚶", "🚶‍♀️", "🏃", "🧍"]), 16).setDepth(7);
      this.movers.push({ obj: walker, axis: "x", speed: Phaser.Math.Between(-25, 25) || 15, min: -20, max: this.w + 20 });
    }
  }

  update(_t: number, dtMs: number): void {
    const s = this.bridge.state();
    const key = BUSINESSES.map((b) => (s.biz[b.id].owned ? 1 : 0)).join("");
    if (key !== this.ownedKey) {
      this.scene.restart();
      return;
    }
    const dt = dtMs / 1000;
    for (const m of this.movers) {
      const v = m.obj[m.axis] + m.speed * dt;
      m.obj[m.axis] = v > m.max ? m.min : v < m.min ? m.max : v;
    }
    const now = Date.now();
    for (const p of this.plots) {
      if (!p.id) continue;
      if (p.owned && p.bubbleText) {
        const rate = businessRate(s, p.id, now);
        p.bubbleText.setText(rate > 0 ? `+${fmt(rate)}/s` : "Entrar ▶");
      } else if (p.sign) {
        const def = BUSINESSES.find((b) => b.id === p.id)!;
        const afford = s.cash >= def.price;
        p.sign.setScale(afford ? 1 + Math.sin(now / 200) * 0.04 : 1);
      }
    }
    for (const sale of this.bridge.drainSales(null)) {
      const p = this.plots.find((x) => x.id === sale.biz);
      if (p?.bubble && Math.random() < 0.3) floatText(this, p.bubble.x, p.bubble.y - 16, `+${fmt(sale.amount)}`);
    }
  }
}
