import Phaser from "phaser";
import { ART, BIZ_ART, art, artScale, buildingKey, placeTile } from "../art/catalog";
import { mix, shade } from "../art/pen";
import { CHAIN } from "../game/data";
import { bizDef, bizTier, chainRates, floorUnlockCost, managerCost, upgradeQuote, type Station } from "../game/economy";
import { fmt } from "../game/format";
import { cityDef, type BusinessState } from "../game/state";
import { COLORS, DPR, DragScroll, Pill, bridgeOf, emoji, floatText, label, setupCamera, type Bridge } from "./common";

/* Rejilla isométrica del recinto */
const TW = 88;
const TH = 44;
const COLS = 9;
const ROWS = 9;
const ROAD_ROW = 9;
const HUB = { c: 3, r: 0 };
/** Puestos de producción, en el orden en que se construyen y los visita el transporte. */
const SLOTS: [number, number][] = [
  [1, 3],
  [3, 3],
  [5, 3],
  [7, 3],
  [7, 6],
  [5, 6],
  [3, 6],
  [1, 6],
];
type Pt = [number, number];
const DOOR: Pt = [4, 2.5];
/** Ruta del transporte: puerta → puestos 0..7 (con la curva entre filas). */
const ROUTE: Pt[] = [DOOR, [1.5, 2.5], [3.5, 2.5], [5.5, 2.5], [7.5, 2.5], [8.5, 2.5], [8.5, 5.5], [7.5, 5.5], [5.5, 5.5], [3.5, 5.5], [1.5, 5.5]];
const STOPS = [0, 1, 2, 3, 4, 7, 8, 9, 10];
/** Ruta de venta: aparcamiento junto al camino → portón → calle. */
const SALE_ROUTE: Pt[] = [[4.5, 3.4], [4.5, 8.6], [4.5, 9.5], [10.5, 9.5]];
const WALK_FPS = 8;

/** Suelo del recinto de cada negocio. */
const GROUND: Record<string, { a: number; b: number; path: number; pad: number }> = {
  dropship: { a: 0xcfd3d8, b: 0xc5c9cf, path: 0xf1c40f, pad: 0x95a5a6 },
  restaurant: { a: 0xeccfae, b: 0xe3c29e, path: 0xffffff, pad: 0xc0392b },
  tiktok: { a: 0xdcd3f2, b: 0xd2c8ec, path: 0xff6fb5, pad: 0x6c5ce7 },
  ai: { a: 0xd3e6e3, b: 0xc8dfdb, path: 0x1abc9c, pad: 0x2c3e50 },
  foodtruck: { a: 0xf6e3b4, b: 0xefd9a4, path: 0xff9f43, pad: 0xee5253 },
  beachclub: { a: 0xf8e7c0, b: 0xf1dcae, path: 0x48dbfb, pad: 0x0abde3 },
  yachts: { a: 0xd9c3a5, b: 0xd0b999, path: 0x1e3799, pad: 0x576574 },
  realestate: { a: 0xe9e4d6, b: 0xe0dac9, path: 0xfeca57, pad: 0x8395a7 },
  crypto: { a: 0xd9d3ee, b: 0xcfc8e8, path: 0xff9f1a, pad: 0x341f97 },
};

interface SlotView {
  worker: Phaser.GameObjects.Image;
  pile: Phaser.GameObjects.Image[];
  stock: Phaser.GameObjects.Text;
  barBg: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
  hint: Phaser.GameObjects.Text;
  pill: Pill;
  manager: Phaser.GameObjects.Text;
  station: Phaser.GameObjects.Image;
  x: number;
  y: number;
  level: number;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Punto a una fracción `t` (0..1) de una polilínea, medido por longitud. */
function along(pts: Pt[], t: number): { c: number; r: number; dc: number; dr: number } {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = Phaser.Math.Clamp(t, 0, 1) * total;
  for (let i = 0; i < lens.length; i++) {
    const [c0, r0] = pts[i];
    const [c1, r1] = pts[i + 1];
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 0;
      return { c: c0 + (c1 - c0) * f, r: r0 + (r1 - r0) * f, dc: c1 - c0, dr: r1 - r0 };
    }
    d -= lens[i];
  }
  return { c: pts[0][0], r: pts[0][1], dc: 0, dr: 0 };
}

const isVehicle = (key: string) => key.startsWith("car_");

/**
 * Recinto de un negocio visto en un mapa isométrico: edificio principal, caminos y puestos.
 * El transporte recorre los puestos recogiendo lo producido y la venta sale por el portón.
 */
export class BusinessScene extends Phaser.Scene {
  private bridge!: Bridge;
  private bizId = "";
  private start: { x: number; y: number; z?: number } = { x: -1, y: -1 };
  private ox = 0;
  private oy = 0;
  private worldW = 0;
  private slots: SlotView[] = [];
  private floorCount = 0;
  private mover!: Phaser.GameObjects.Image;
  private moverItem!: Phaser.GameObjects.Image;
  private moverCarry!: Phaser.GameObjects.Text;
  private moverHint!: Phaser.GameObjects.Text;
  private seller!: Phaser.GameObjects.Image;
  private sellerItem!: Phaser.GameObjects.Image;
  private sellerCarry!: Phaser.GameObjects.Text;
  private sellerHint!: Phaser.GameObjects.Text;
  private topPile: Phaser.GameObjects.Image[] = [];
  private topStock!: Phaser.GameObjects.Text;
  private unlockPill: Pill | null = null;
  private traffic: { obj: Phaser.GameObjects.Image; c: number; speed: number }[] = [];
  private coins!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;
  private drag!: DragScroll;
  private levels = { transport: 0, sale: 0 };
  private puffClock = 0;

  constructor() {
    super("business");
  }

  init(data: { id: string; scrollX?: number; scrollY?: number; zoom?: number }): void {
    this.bizId = data.id;
    this.start = { x: data.scrollX ?? -1, y: data.scrollY ?? -1, z: data.zoom };
    this.slots = [];
    this.topPile = [];
    this.traffic = [];
    this.unlockPill = null;
  }

  private get look() {
    return BIZ_ART[this.bizId] ?? BIZ_ART.dropship;
  }

  private iso(c: number, r: number): { x: number; y: number } {
    return { x: this.ox + ((c - r) * TW) / 2, y: this.oy + ((c + r) * TH) / 2 };
  }

  private biz(): BusinessState {
    return this.bridge.state().biz[this.bizId];
  }

  create(): void {
    this.bridge = bridgeOf(this);
    setupCamera(this);
    const insets = this.bridge.insets();
    const b = this.biz();
    this.floorCount = b.floors.length;
    this.levels = { transport: b.transport.level, sale: b.sale.level };

    const hubKey = buildingKey(this, this.bizId, bizTier(b));
    const margin = 70;
    this.ox = (ROWS * TW) / 2 + margin;
    this.oy = insets.top + Math.max(120, ART[hubKey].h - 40);
    this.worldW = ((COLS + ROWS) * TW) / 2 + margin * 2;
    const worldH = this.oy + ((COLS + ROWS + 2) * TH) / 2 + 40 + insets.bottom;

    this.cameras.main.setBackgroundColor(mix(cityDef(this.bridge.state().city).ground.grass, 0x000000, 0.06));
    this.drawGround();
    this.drawFence();
    this.drawDecor();
    this.drawHub();
    SLOTS.forEach((_, i) => this.drawSlot(i));
    this.makeActors();
    this.makeParticles();

    this.drag = new DragScroll(this, this.worldW, worldH, { zoom: this.start.z ?? 0.75, minZoom: 0.5, maxZoom: 1.4 });
    if (this.start.x >= 0) this.drag.scrollTo(this.start.x, this.start.y);
    else {
      // Arrancar viendo el edificio principal y la primera fila de puestos
      const focus = this.iso(4, 3);
      this.drag.centerOn(focus.x, focus.y);
    }
  }

  /* ---------- Suelo, caminos y calle ---------- */

  private tileKind(c: number, r: number): "road" | "path" | "hub" | "slot" | "ground" {
    if (r === ROAD_ROW) return "road";
    if (c >= HUB.c && c < HUB.c + 2 && r >= HUB.r && r < HUB.r + 2) return "hub";
    if (SLOTS.some(([sc, sr]) => sc === c && sr === r)) return "slot";
    if (r === 2 || r === 5) return "path";
    if (c === 8 && r >= 2 && r <= 5) return "path";
    if (c === 4 && r >= 2 && r < ROAD_ROW) return "path";
    return "ground";
  }

  private diamond(c: number, r: number, inset = 0): Phaser.Math.Vector2[] {
    const t = this.iso(c, r);
    const hw = TW / 2 - inset;
    const hh = TH / 2 - inset / 2;
    const cy = t.y + TH / 2;
    return [
      new Phaser.Math.Vector2(t.x, cy - hh),
      new Phaser.Math.Vector2(t.x + hw, cy),
      new Phaser.Math.Vector2(t.x, cy + hh),
      new Phaser.Math.Vector2(t.x - hw, cy),
    ];
  }

  private drawGround(): void {
    const theme = GROUND[this.bizId] ?? GROUND.dropship;
    const g = this.add.graphics().setDepth(-10);
    // Zócalo del recinto
    const L = this.iso(0, ROWS + 1);
    const B = this.iso(COLS, ROWS + 1);
    const R = this.iso(COLS, 0);
    g.fillStyle(0x4e7f3f, 1).fillPoints([new Phaser.Math.Vector2(L.x, L.y), new Phaser.Math.Vector2(B.x, B.y), new Phaser.Math.Vector2(B.x, B.y + 14), new Phaser.Math.Vector2(L.x, L.y + 14)], true);
    g.fillStyle(0x5a9148, 1).fillPoints([new Phaser.Math.Vector2(B.x, B.y), new Phaser.Math.Vector2(R.x, R.y), new Phaser.Math.Vector2(R.x, R.y + 14), new Phaser.Math.Vector2(B.x, B.y + 14)], true);

    let seed = 17;
    const tileRand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let r = 0; r <= ROAD_ROW; r++)
      for (let c = 0; c < COLS; c++) {
        const kind = this.tileKind(c, r);
        const t = this.iso(c, r);
        const cx = t.x;
        const cy = t.y + TH / 2;
        const tileKey = kind === "road" ? "tile_road_c" : kind === "path" ? "tile_path" : `tile_biz_${this.bizId}`;
        if (placeTile(this, cx, t.y, tileKey, tileRand)) continue;
        if (kind === "road") {
          g.fillStyle(0xbfc5cc, 1).fillPoints(this.diamond(c, r), true);
          g.fillStyle(0x4a5160, 1).fillPoints(this.diamond(c, r, 8), true);
          g.lineStyle(2, 0xf5f5f5, 0.9).lineBetween(cx - TW / 8, cy - TH / 8, cx + TW / 8, cy + TH / 8);
        } else if (kind === "path") {
          g.fillStyle(0x9aa1ab, 1).fillPoints(this.diamond(c, r), true);
          g.fillStyle(0xb8bec6, 1).fillPoints(this.diamond(c, r, 4), true);
          g.fillStyle(theme.path, 0.55).fillCircle(cx, cy, 2.2);
        } else {
          g.fillStyle((c + r) % 2 ? theme.a : theme.b, 1).fillPoints(this.diamond(c, r), true);
          g.lineStyle(1, shade(theme.a, -0.08), 0.6).strokePoints(this.diamond(c, r), true);
        }
      }
  }

  private drawFence(): void {
    const g = this.add.graphics().setDepth(1);
    const post = (c: number, r: number) => {
      const p = this.iso(c, r);
      g.fillStyle(0x6d4c41, 1).fillRect(p.x - 1.5, p.y - 14, 3, 14);
    };
    const rail = (c0: number, r0: number, c1: number, r1: number) => {
      const a = this.iso(c0, r0);
      const b = this.iso(c1, r1);
      g.lineStyle(2, 0x8d6e63, 1).lineBetween(a.x, a.y - 10, b.x, b.y - 10).lineBetween(a.x, a.y - 5, b.x, b.y - 5);
    };
    // Lados de atrás (arriba) y laterales; delante, portón en la columna del camino
    rail(0, 0, COLS, 0);
    rail(0, 0, 0, ROAD_ROW);
    rail(COLS, 0, COLS, ROAD_ROW);
    rail(0, ROAD_ROW, 4, ROAD_ROW);
    rail(5, ROAD_ROW, COLS, ROAD_ROW);
    for (let c = 0; c <= COLS; c++) post(c, 0);
    for (let r = 0; r <= ROAD_ROW; r++) {
      post(0, r);
      post(COLS, r);
    }
    for (let c = 0; c <= COLS; c++) if (c !== 4 && c !== 5) post(c, ROAD_ROW);
    // Portón
    for (const c of [4, 5]) {
      const p = this.iso(c, ROAD_ROW);
      g.fillStyle(0x2c3e50, 1).fillRect(p.x - 3, p.y - 34, 6, 34);
      g.fillStyle(COLORS.gold, 1).fillCircle(p.x, p.y - 36, 4);
    }
  }

  private drawDecor(): void {
    const rand = rng(21 + this.bizId.length);
    for (let r = 0; r < ROAD_ROW; r++)
      for (let c = 0; c < COLS; c++) {
        if (this.tileKind(c, r) !== "ground") continue;
        const p = this.iso(c + 0.5, r + 0.5);
        const roll = rand();
        if (roll < 0.22) art(this, p.x, p.y + 4, "bush").setOrigin(0.5, 0.8).setDepth(p.y);
        else if (roll < 0.3) art(this, p.x, p.y, "lamp_post").setOrigin(0.5, 0.95).setDepth(p.y);
      }
    // Árboles fuera de la valla
    for (let i = -1; i <= COLS; i++) {
      for (const [c, r] of [
        [i + 0.5, -0.8],
        [-0.8, i + 0.5],
      ] as Pt[]) {
        if (rand() < 0.55) continue;
        const p = this.iso(c, r);
        const trees = cityDef(this.bridge.state().city).trees;
        const tree = art(this, p.x, p.y + 8, trees[Math.floor(rand() * trees.length)]).setOrigin(0.5, 0.92);
        tree.setDepth(tree.y);
      }
    }
  }

  /* ---------- Edificio principal ---------- */

  private drawHub(): void {
    const key = buildingKey(this, this.bizId, bizTier(this.biz()));
    const spec = ART[key];
    const bottom = this.iso(HUB.c + 2, HUB.r + 2);
    art(this, bottom.x, bottom.y + 2, key).setOrigin(0.5, (spec.h - 6) / spec.h).setDepth(bottom.y);

    // Pila de producto listo para vender, junto a la puerta
    const pileAt = this.iso(3.2, 2.35);
    this.topPile = this.pile(pileAt.x, pileAt.y, pileAt.y + 2);
    this.topStock = label(this, pileAt.x, pileAt.y - 44, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9e4);

    // El nivel y la mejora del transporte y la venta están en la barra de la cadena (abajo, fija).
    // Zonas de toque: puerta (transporte) y portón (venta)
    const door = this.iso(DOOR[0], DOOR[1]);
    this.tapZone(door.x - 60, door.y - 60, 120, 80, { kind: "transport" });
    const gate = this.iso(4.5, 8.8);
    this.tapZone(gate.x - 50, gate.y - 50, 100, 70, { kind: "sale" });
  }

  /* ---------- Puestos ---------- */

  private drawSlot(i: number): void {
    const [c, r] = SLOTS[i];
    const theme = GROUND[this.bizId] ?? GROUND.dropship;
    const center = this.iso(c + 0.5, r + 0.5);
    const g = this.add.graphics().setDepth(-5);
    const def = bizDef(this.bizId);

    if (i >= this.floorCount) {
      if (i === this.floorCount) {
        // Siguiente puesto: en obras, con el precio
        g.fillStyle(0xc19a6b, 1).fillPoints(this.diamond(c, r, 2), true);
        g.lineStyle(2, 0xf5c542, 1).strokePoints(this.diamond(c, r, 6), true);
        emoji(this, center.x, center.y - 10, "🚧", 26).setDepth(center.y);
        this.unlockPill = new Pill(this, center.x, center.y - 44, "").setDepth(9.3e4);
        this.unlockPill.setInteractive({ useHandCursor: true });
        this.unlockPill.on("pointerup", () => {
          if (!this.drag.wasDrag()) this.bridge.openUnlockFloor(this.bizId);
        });
        const z = this.add.zone(center.x - TW / 2, center.y - 30, TW, 50).setOrigin(0).setInteractive({ useHandCursor: true });
        z.on("pointerup", () => {
          if (!this.drag.wasDrag()) this.bridge.openUnlockFloor(this.bizId);
        });
      } else {
        g.lineStyle(2, 0xffffff, 0.35).strokePoints(this.diamond(c, r, 8), true);
      }
      return;
    }

    // Plataforma elevada del puesto
    const top = this.diamond(c, r, 4).map((v) => new Phaser.Math.Vector2(v.x, v.y - 5));
    const base = this.diamond(c, r, 4);
    g.fillStyle(shade(theme.pad, -0.3), 1).fillPoints([base[3], base[2], top[2], top[3]], true);
    g.fillStyle(shade(theme.pad, -0.15), 1).fillPoints([base[2], base[1], top[1], top[2]], true);
    g.fillStyle(theme.pad, 1).fillPoints(top, true);
    g.fillStyle(mix(theme.pad, 0xffffff, 0.2), 1).fillPoints(this.diamond(c, r, 14).map((v) => new Phaser.Math.Vector2(v.x, v.y - 5)), true);

    const station = art(this, center.x + 10, center.y + 4, this.look.station).setOrigin(0.5, 1);
    station.setDisplaySize(ART[this.look.station].w * 0.62, ART[this.look.station].h * 0.62).setDepth(center.y + 4);
    const worker = art(this, center.x - 24, center.y + 12, `ch_${this.look.worker}_0`).setOrigin(0.5, 0.95);
    worker.setDisplaySize(ART[`ch_${this.look.worker}_0`].w * 0.8, ART[`ch_${this.look.worker}_0`].h * 0.8).setDepth(center.y + 12);
    const pile = this.pile(center.x - 2, center.y + 20, center.y + 20, 0.7);
    const stock = label(this, center.x - 4, center.y - 8, "", 11, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9e4);
    const barBg = this.add.rectangle(center.x, center.y + 26, 44, 5, 0x14202f, 0.6).setDepth(center.y + 30);
    const bar = this.add.rectangle(center.x - 22, center.y + 26, 0, 5, COLORS.green).setOrigin(0, 0.5).setDepth(center.y + 31);
    const hint = emoji(this, center.x - 24, center.y - 44, "👆", 22).setDepth(9.4e4);
    this.tweens.add({ targets: hint, y: center.y - 36, yoyo: true, repeat: -1, duration: 500 });
    const pill = this.pill(center.x, center.y - 62, { kind: "floor", index: i });
    const manager = emoji(this, center.x + 38, center.y - 62, "👔", 14).setDepth(9.2e4);
    const nameTag = label(this, center.x, center.y + 40, `${def.floorName} ${i + 1}`, 10, "#ffffff", { bold: true, stroke: "#14202f" });
    nameTag.setDepth(9e4);
    this.tapZone(center.x - TW / 2, center.y - 46, TW, 80, { kind: "floor", index: i });
    this.slots[i] = { worker, pile, stock, barBg, bar, hint, pill, manager, station, x: center.x, y: center.y, level: this.biz().floors[i].level };
  }

  /* ---------- Transporte y venta ---------- */

  private actor(key: string, depthY: number): Phaser.GameObjects.Image {
    const k = isVehicle(key) ? key : `ch_${key}_0`;
    const img = art(this, 0, 0, k).setOrigin(0.5, isVehicle(key) ? 0.7 : 0.95).setDepth(depthY);
    if (!isVehicle(key)) img.setDisplaySize(ART[k].w * 0.85, ART[k].h * 0.85);
    return img;
  }

  private makeActors(): void {
    this.mover = this.actor(this.look.mover, 0).setInteractive({ useHandCursor: true });
    this.mover.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapStation(this.bizId, { kind: "transport" });
    });
    this.moverItem = art(this, 0, 0, this.look.item).setVisible(false);
    this.moverCarry = label(this, 0, 0, "", 11, "#ffffff", { bold: true, stroke: "#14202f" });
    this.moverHint = emoji(this, 0, 0, "👆", 22);

    this.seller = this.actor(this.look.seller, 0).setInteractive({ useHandCursor: true });
    this.seller.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapStation(this.bizId, { kind: "sale" });
    });
    this.sellerItem = art(this, 0, 0, this.look.item).setVisible(false);
    this.sellerCarry = label(this, 0, 0, "", 11, "#ffffff", { bold: true, stroke: "#14202f" });
    this.sellerHint = emoji(this, 0, 0, "👆", 22);

    // Tráfico por la calle de delante
    for (let k = 0; k < 2; k++) {
      const obj = art(this, 0, 0, `car_${k}`).setOrigin(0.5, 0.7);
      this.traffic.push({ obj, c: k * 5, speed: 0.9 + k * 0.3 });
    }
  }

  /** Coloca un actor en la rejilla, orientado según su dirección de marcha. */
  private place(img: Phaser.GameObjects.Image, key: string, c: number, r: number, dc: number, dr: number, frame: number): { x: number; y: number } {
    const p = this.iso(c, r);
    img.setPosition(p.x, p.y).setDepth(p.y + 2);
    if (isVehicle(key)) {
      // El coche está dibujado hacia abajo-derecha (eje de columnas); el otro eje, volteado.
      img.setFlipX(Math.abs(dr) > Math.abs(dc));
    } else {
      img.setTexture(`ch_${key}_${frame}`);
      const screenDx = dc - dr;
      if (screenDx !== 0) img.setFlipX(screenDx < 0);
    }
    return p;
  }

  /* ---------- Utilidades ---------- */

  private tapZone(x: number, y: number, w: number, h: number, st: Station): void {
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapStation(this.bizId, st);
    });
  }

  private pill(x: number, y: number, st: Station): Pill {
    const p = new Pill(this, x, y, "Nv 1").setDepth(9.3e4);
    p.setInteractive({ useHandCursor: true });
    p.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.openStation(this.bizId, st);
    });
    return p;
  }


  private pile(x: number, y: number, depth: number, scale = 0.85): Phaser.GameObjects.Image[] {
    const spots: Pt[] = [
      [0, 0],
      [14, 5],
      [-14, 5],
      [7, -10],
      [-7, -10],
      [0, -20],
    ];
    const spec = ART[this.look.item];
    return spots.map(([dx, dy]) =>
      art(this, x + dx * scale, y + dy * scale, this.look.item)
        .setDisplaySize(spec.w * scale, spec.h * scale)
        .setDepth(depth)
        .setVisible(false),
    );
  }

  private showPile(pile: Phaser.GameObjects.Image[], amount: number, unit: number): void {
    const n = amount <= 0 ? 0 : Math.min(pile.length, 1 + Math.floor(Math.log2(1 + amount / Math.max(unit, 1e-9))));
    pile.forEach((img, i) => img.setVisible(i < n));
  }

  private makeParticles(): void {
    const cs = artScale(this, "coin");
    this.coins = this.add
      .particles(0, 0, "coin", {
        speed: { min: 80, max: 160 },
        angle: { min: 225, max: 315 },
        gravityY: 400,
        lifespan: 900,
        scale: { start: cs, end: cs * 0.7 },
        rotate: { min: -180, max: 180 },
        emitting: false,
      })
      .setDepth(9.6e4);
    const ss = artScale(this, "spark");
    this.sparks = this.add
      .particles(0, 0, "spark", {
        speed: { min: 40, max: 120 },
        lifespan: 600,
        scale: { start: ss * 0.9, end: 0 },
        tint: [0xf5c542, 0xffffff, 0x3ddc97],
        emitting: false,
      })
      .setDepth(9.6e4);
    const ps = artScale(this, "puff");
    this.puffs = this.add
      .particles(0, 0, "puff", {
        speedY: { min: -40, max: -20 },
        speedX: { min: -8, max: 8 },
        lifespan: 1200,
        scale: { start: ps * 0.35, end: ps * 0.9 },
        alpha: { start: 0.55, end: 0 },
        emitting: false,
      })
      .setDepth(9.5e4);
  }

  /* ---------- Actualización ---------- */

  update(_t: number, dtMs: number): void {
    const s = this.bridge.state();
    const b = this.biz();
    if (!b) return;
    if (b.floors.length !== this.floorCount) {
      const cam = this.cameras.main;
      this.scene.restart({ id: this.bizId, scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom / DPR });
      return;
    }
    const def = bizDef(this.bizId);
    const t = this.time.now / 1000;
    const dt = Math.min(dtMs, 100) / 1000;
    const walkFrame = Math.floor(t * WALK_FPS) % 2 ? 1 : 2;
    const tutorial = s.totalEarned < 30;
    const unit = CHAIN.floorCycle * def.mult;

    // Puestos
    this.puffClock += dt;
    const puffNow = this.puffClock > 0.4;
    if (puffNow) this.puffClock = 0;
    b.floors.forEach((f, i) => {
      const v = this.slots[i];
      const p = f.running ? f.prog / CHAIN.floorCycle : 0;
      const working = f.running;
      v.worker.setY(v.y + 12 - (working ? Math.abs(Math.sin(t * 12)) * 3 : 0));
      if (working && puffNow) {
        if (this.bizId === "restaurant") this.puffs.emitParticleAt(v.station.x + (Math.random() - 0.5) * 20, v.station.y - 40);
        else this.sparks.emitParticleAt(v.station.x + (Math.random() - 0.5) * 30, v.station.y - 30 - Math.random() * 20, 1);
      }
      this.showPile(v.pile, f.stock, unit);
      v.stock.setText(f.stock > 0 ? fmt(f.stock) : "");
      v.bar.width = 44 * p;
      v.hint.setVisible(tutorial && !f.managed && !f.running);
      v.manager.setVisible(f.managed);
      if (f.level > v.level) {
        this.sparks.explode(14, v.station.x, v.station.y - 30);
        v.level = f.level;
      }
      const q = upgradeQuote(s, this.bizId, { kind: "floor", index: i });
      v.pill.setText(`Nv ${f.level}`).setAlert(s.cash >= q.cost || (!f.managed && s.cash >= managerCost(def, { kind: "floor", index: i })));
    });

    // Transporte: recorre la ruta parando en cada puesto
    const tr = b.transport;
    const seg = Math.min(Math.floor(tr.pos), STOPS.length - 2);
    const sub = ROUTE.slice(STOPS[seg], STOPS[seg + 1] + 1);
    const mv = along(sub, tr.pos - seg);
    const back = tr.phase === "up";
    const moving = tr.phase === "down" || tr.phase === "up";
    const mp = this.place(this.mover, this.look.mover, mv.c, mv.r, back ? -mv.dc : mv.dc, back ? -mv.dr : mv.dr, moving ? walkFrame : 0);
    const carryY = mp.y - (isVehicle(this.look.mover) ? 34 : 50);
    this.moverItem.setVisible(tr.carry > 0).setPosition(mp.x, carryY).setDepth(mp.y + 3);
    this.moverCarry.setText(tr.carry > 0 ? fmt(tr.carry) : "").setPosition(mp.x, carryY - 18).setDepth(9e4);
    this.moverHint.setVisible(tutorial && tr.phase === "idle" && !tr.managed && b.floors.some((f) => f.stock > 0));
    this.moverHint.setPosition(mp.x, mp.y - 64 + Math.sin(t * 8) * 4).setDepth(9.4e4);
    if (tr.level > this.levels.transport) {
      this.sparks.explode(14, mp.x, mp.y - 20);
      this.levels.transport = tr.level;
    }

    // Venta: sale por el portón hacia la calle y vuelve
    const sl = b.sale;
    const st = sl.phase === "out" ? sl.prog : sl.phase === "back" ? 1 - sl.prog : 0;
    const sv = along(SALE_ROUTE, st);
    const sBack = sl.phase === "back";
    const sp = this.place(this.seller, this.look.seller, sv.c, sv.r, sBack ? -sv.dc : sv.dc, sBack ? -sv.dr : sv.dr, sl.phase !== "idle" ? walkFrame : 0);
    const sCarryY = sp.y - (isVehicle(this.look.seller) ? 34 : 50);
    this.sellerItem.setVisible(sl.carry > 0).setPosition(sp.x, sCarryY).setDepth(sp.y + 3);
    this.sellerCarry.setText(sl.carry > 0 ? fmt(sl.carry) : "").setPosition(sp.x, sCarryY - 18).setDepth(9e4);
    this.sellerHint.setVisible(tutorial && sl.phase === "idle" && !sl.managed && b.topStock > 0);
    this.sellerHint.setPosition(sp.x, sp.y - 64 + Math.sin(t * 8) * 4).setDepth(9.4e4);
    this.showPile(this.topPile, b.topStock, unit);
    this.topStock.setText(b.topStock > 0 ? fmt(b.topStock) : "");
    if (sl.level > this.levels.sale) {
      this.sparks.explode(14, sp.x, sp.y - 20);
      this.levels.sale = sl.level;
    }

    if (this.unlockPill) {
      const cost = floorUnlockCost(def, b.floors.length);
      this.unlockPill.setText(`Abrir · ${fmt(cost)} €`).setAlert(s.cash >= cost).setAlpha(s.cash >= cost ? 1 : 0.65);
    }

    // Tráfico
    for (const car of this.traffic) {
      car.c += car.speed * dt;
      if (car.c > COLS + 2) car.c = -2;
      const p = this.iso(car.c, ROAD_ROW + 0.35);
      car.obj.setPosition(p.x, p.y).setDepth(p.y + 1);
    }

    // La parte que limita la cadena, en rojo (cuando ya hay algo automatizado)
    const rates = chainRates(def, b, false);
    const auto = tr.managed || sl.managed || b.floors.some((f) => f.managed);
    this.slots.forEach((v) => v.pill.setWarn(auto && rates.bottleneck === "production"));

    for (const sale of this.bridge.drainSales(this.bizId)) {
      const gate = this.iso(4.5, 9.3);
      if (sale.lucky) {
        // Venta viral: lluvia de monedas y texto dorado grande
        this.coins.explode(24, gate.x, gate.y - 20);
        this.sparks.explode(20, gate.x, gate.y - 40);
        floatText(this, gate.x, gate.y - 90, `🔥 ¡VIRAL! +${fmt(sale.amount)}`, "#f5c542");
        this.cameras.main.shake(180, 0.004);
      } else {
        this.coins.explode(7, gate.x, gate.y - 20);
        floatText(this, gate.x, gate.y - 60, `+${fmt(sale.amount)}`);
      }
    }
  }
}
