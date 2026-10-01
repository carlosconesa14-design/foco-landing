import Phaser from "phaser";
import { ART, art, artScale, buildingKey, placeTile } from "../art/catalog";
import { mix } from "../art/pen";
import { ALL_BUSINESSES, type CityDef } from "../game/data";
import { cityDef } from "../game/state";
import { bizTier, businessRate } from "../game/economy";
import { fmt } from "../game/format";
import { DragScroll, bridgeOf, floatText, label, setupCamera, type Bridge } from "./common";

/* Rejilla isométrica */
const TW = 88;
const TH = 44;
const COLS = 10;
const ROWS = 12;
const ROAD_ROWS = [3, 7, 11];
const ROAD_COL = 4;

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
const SOON_LABELS: Record<string, string[]> = {
  madrid: ["🏋️ Gimnasio", "🏨 Hotel"],
  miami: ["🏨 Resort"],
};

function lotsFor(city: CityDef): { c: number; r: number; kind: LotKind }[] {
  const soon = SOON_LABELS[city.id] ?? [];
  return LOT_POSITIONS.map((p, i) => ({
    ...p,
    kind: i < city.businesses.length ? { id: city.businesses[i].id } : { soon: soon[i - city.businesses.length] ?? "🏗️ Solar" },
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
  role?: string;
  c: number;
  r: number;
  dc: number;
  dr: number;
  speed: number;
  min: number;
  max: number;
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
    this.placeDecor();
    for (const lot of this.lots) this.drawLot(lot.c, lot.r, lot.kind);
    this.spawnTraffic();
    this.spawnClouds(worldH);

    this.drag = new DragScroll(this, this.worldW, worldH, { zoom: 0.85, minZoom: 0.5, maxZoom: 1.4 });
    // Empezar centrados en el primer negocio
    const first = this.iso(this.lots[0].c + 1, this.lots[0].r + 1);
    this.drag.centerOn(first.x, first.y);
  }

  private drawWater(worldH: number): void {
    const g = this.add.graphics().setDepth(-20);
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
    const onCol = c === ROAD_COL;
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
          g.fillStyle(0xbfc5cc, 1).fillPoints(diamond(c, r), true);
          g.fillStyle(0x4a5160, 1).fillPoints(diamond(c, r, kind === "cross" ? 2 : 8), true);
          g.lineStyle(2, 0xf5f5f5, 0.9);
          if (kind === "road_c") g.lineBetween(cx - TW / 8, cy - TH / 8, cx + TW / 8, cy + TH / 8);
          if (kind === "road_r") g.lineBetween(cx + TW / 8, cy - TH / 8, cx - TW / 8, cy + TH / 8);
          if (kind === "cross") {
            g.lineStyle(3, 0xffffff, 0.7);
            for (let i = -2; i <= 2; i++) g.lineBetween(cx - 20 + i * 2, cy + i * 5, cx - 10 + i * 2, cy + i * 5 - 5);
          }
        }
      }
  }

  private placeDecor(): void {
    const rand = rng(42);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (this.tileKind(c, r) !== "grass") continue;
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
        }
      }
  }

  /* ---------- Parcelas ---------- */

  private drawLot(c: number, r: number, kind: LotKind): void {
    const bottom = this.iso(c + 2, r + 2);
    const center = this.iso(c + 1, r + 1);
    if ("soon" in kind) {
      const img = art(this, bottom.x, bottom.y + 2, "bld_soon");
      img.setOrigin(0.5, (ART.bld_soon.h - 6) / ART.bld_soon.h).setDepth(bottom.y);
      label(this, bottom.x, bottom.y + 14, `${kind.soon} · Próximamente`, 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9e4);
      return;
    }
    const id = kind.id;
    const def = ALL_BUSINESSES.find((b) => b.id === id)!;
    const owned = this.bridge.state().biz[id].owned;
    const view: PlotView = { id, owned };
    let topY = bottom.y - 90;
    if (owned) {
      const key = buildingKey(this, id, bizTier(this.bridge.state().biz[id]));
      const spec = ART[key];
      const img = art(this, bottom.x, bottom.y + 2, key);
      img.setOrigin(0.5, (spec.h - 6) / spec.h).setDepth(bottom.y);
      topY = bottom.y - spec.h + 10;
      const bg = this.add.graphics();
      bg.fillStyle(0x14202f, 0.92).fillRoundedRect(-46, -14, 92, 28, 14);
      bg.fillStyle(0x3ddc97, 1).fillCircle(-32, 0, 7);
      const coin = this.add.image(-32, 0, "coin").setScale(artScale(this, "coin") * 0.7);
      const text = label(this, 8, 0, "", 13, "#3ddc97", { bold: true });
      view.bubble = this.add.container(bottom.x, topY - 8, [bg, coin, text]).setDepth(9e4);
      view.bubbleText = text;
      this.tweens.add({ targets: view.bubble, y: topY - 13, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
    } else {
      // Solar en venta: tierra, valla y cartel
      const g = this.add.graphics().setDepth(-5);
      const pts = [this.iso(c, r), this.iso(c + 2, r), this.iso(c + 2, r + 2), this.iso(c, r + 2)].map((p) => new Phaser.Math.Vector2(p.x, p.y));
      g.fillStyle(0xc19a6b, 1).fillPoints(pts, true);
      g.lineStyle(3, 0xffffff, 0.8).strokePoints(pts, true);
      view.sign = art(this, center.x, center.y + 10, "sign_sale").setOrigin(0.5, 0.95).setDepth(center.y + 10);
      const price = label(this, center.x, center.y - 46, `${fmt(def.price)} €`, 17, "#14202f", { display: true }).setDepth(center.y + 11);
      this.tweens.add({ targets: price, scale: 1.08, yoyo: true, repeat: -1, duration: 700 });
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
    ROAD_ROWS.forEach((row, i) => {
      for (let k = 0; k < 2; k++) {
        const obj = art(this, 0, 0, `car_${(i + k) % 4}`);
        this.movers.push({ obj, c: rand() * COLS, r: row + (k ? 0.68 : 0.32), dc: 1, dr: 0, speed: 1 + rand() * 0.8, min: -1, max: COLS + 1 });
      }
    });
    for (let k = 0; k < 3; k++) {
      const obj = art(this, 0, 0, `car_${k % 4}`).setFlipX(true);
      this.movers.push({ obj, c: ROAD_COL + (k % 2 ? 0.68 : 0.32), r: rand() * ROWS, dc: 0, dr: 1, speed: 1 + rand() * 0.8, min: -1, max: ROWS + 1 });
    }
    // Peatones por las aceras
    const roles = ["ped0", "ped1", "ped2"];
    for (let k = 0; k < 7; k++) {
      const role = roles[k % 3];
      const obj = art(this, 0, 0, `ch_${role}_0`).setOrigin(0.5, 0.95);
      obj.setDisplaySize(ART[`ch_${role}_0`].w * 0.55, ART[`ch_${role}_0`].h * 0.55);
      const alongC = k % 2 === 0;
      const dir = rand() < 0.5 ? 1 : -1;
      if (alongC) {
        const row = ROAD_ROWS[k % ROAD_ROWS.length];
        this.movers.push({ obj, role, c: rand() * COLS, r: row + (rand() < 0.5 ? -0.08 : 1.08), dc: dir, dr: 0, speed: 0.25 + rand() * 0.15, min: 0, max: COLS });
      } else {
        this.movers.push({ obj, role, c: ROAD_COL + (rand() < 0.5 ? -0.08 : 1.08), r: rand() * ROWS, dc: 0, dr: dir, speed: 0.25 + rand() * 0.15, min: 0, max: ROWS });
      }
    }
  }

  private spawnClouds(worldH: number): void {
    const rand = rng(5);
    for (let i = 0; i < 4; i++) {
      const x = rand() * this.worldW;
      const y = this.oy + rand() * (worldH - this.oy - 200);
      const shadow = art(this, x + 60, y + 170, "cloud").setTint(0x000000).setAlpha(0.1).setDepth(8e4);
      shadow.setDisplaySize(ART.cloud.w * 1.1, ART.cloud.h * 0.6);
      const cloud = art(this, x, y, "cloud").setAlpha(0.92).setDepth(1e5);
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
    const frame = Math.floor(this.walkClock * 6) % 2 ? 1 : 2;
    for (const m of this.movers) {
      m.c += m.dc * m.speed * dt;
      m.r += m.dr * m.speed * dt;
      if (m.role) {
        // Los peatones dan media vuelta en los extremos
        const v = m.dc ? m.c : m.r;
        if (v > m.max || v < m.min) {
          m.dc = -m.dc;
          m.dr = -m.dr;
        }
        m.obj.setTexture(`ch_${m.role}_${frame}`);
        // +c y -r van hacia la derecha en pantalla
        m.obj.setFlipX(m.dc < 0 || m.dr > 0);
      } else {
        if (m.c > m.max) m.c = m.min;
        if (m.r > m.max) m.r = m.min;
      }
      const p = this.iso(m.c, m.r);
      m.obj.setPosition(p.x, p.y).setDepth(p.y + 1);
    }
    for (const cl of this.clouds) {
      cl.cloud.x += cl.speed * dt;
      cl.shadow.x += cl.speed * dt;
      if (cl.cloud.x > this.worldW + 100) {
        cl.cloud.x -= this.worldW + 260;
        cl.shadow.x -= this.worldW + 260;
      }
    }
    const now = Date.now();
    for (const p of this.plots) {
      if (p.owned && p.bubbleText) {
        const rate = businessRate(s, p.id, now);
        p.bubbleText.setText(rate > 0 ? `+${fmt(rate)}/s` : "Entrar ▶");
      } else if (p.sign) {
        const def = ALL_BUSINESSES.find((b) => b.id === p.id)!;
        p.sign.setTint(s.cash >= def.price ? 0xffffff : mix(0xffffff, 0x999999, 0.5));
      }
    }
    for (const sale of this.bridge.drainSales(null)) {
      const p = this.plots.find((x) => x.id === sale.biz);
      if (p?.bubble && (sale.lucky || Math.random() < 0.25))
        floatText(this, p.bubble.x, p.bubble.y - 18, sale.lucky ? `🔥 +${fmt(sale.amount)}` : `+${fmt(sale.amount)}`, sale.lucky ? "#f5c542" : undefined);
    }
  }
}
