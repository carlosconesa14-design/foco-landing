import { Neighborhood } from "./Neighborhood";
import { TwistWorld } from "./TwistWorld";
import { TWIST_WORLD_ART } from "../game/twists";
import { WorldVisitor } from "./WorldVisitor";
import type { OfferKind } from "../game/offers";
import { money, t } from "../i18n";
import { WarehouseRoom, WAREHOUSE_SLOTS, WAREHOUSE_DOOR, WAREHOUSE_ROUTE, WAREHOUSE_STOPS } from "./WarehouseRoom";
import { RestaurantRoom, RESTAURANT_SLOTS, RESTAURANT_DOOR, RESTAURANT_ROUTE, RESTAURANT_STOPS } from "./RestaurantRoom";
import { constructionPop, revealScene, transferProduct, upgradePop } from "./feedback";
import { actorShadow, gait } from "./motion";
import { artRef, hasGeneratedArt, swapArt } from "../art/generated";
import { groundDetail } from "../art/ground";
import Phaser from "phaser";
import { buildingKey, ART, BIZ_ART, art, artScale, placeTile, rankedKey } from "../art/catalog";
import { rankInfo, rankOf } from "../game/ranks";
import { rankBadge, rankBurst, rankGlow, rankPedestal } from "./rankFx";
import { mix, shade } from "../art/pen";
import { CHAIN, TUTORIAL } from "../game/data";
import { bizDef, bizList, bizTier, chainRates, floorLoad, floorUnlockCost, managerCost, upgradeQuote, type Station } from "../game/economy";
import { fmt } from "../game/format";
import { cityDef, type BusinessState } from "../game/state";
import { COLORS, DPR, reducedMotion, rewardCoins, DragScroll, Pill, bridgeOf, floatText, label, setupCamera, type Bridge, calmWorld } from "./common";

/* Rejilla isométrica del recinto */
/**
 * Separación del recinto: la rejilla es un 40 % más ancha que la baldosa base (88×44) y los dibujos
 * conservan su tamaño. Así los puestos, los caminos y las zonas quedan más separados y manejables.
 */
const SPREAD = 1.4;
const TW = 88 * SPREAD;
const TH = 44 * SPREAD;
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
const DEFAULT_LAYOUT = { slots: SLOTS, door: DOOR, route: ROUTE, stops: STOPS, saleRoute: SALE_ROUTE,
  pile: [3.2,2.35] as Pt, transportBadge: [6.9,1.0] as Pt, saleBadge: [5.9,8.8] as Pt, focus: [3,4.5] as Pt };
const RESTAURANT_LAYOUT = { slots: RESTAURANT_SLOTS, door: RESTAURANT_DOOR, route: RESTAURANT_ROUTE, stops: RESTAURANT_STOPS,
  saleRoute: [[4.5,5],[4.5,8.6],[4.5,9.5],[10.5,9.5]] as Pt[], pile: [4.5,4.8] as Pt,
  transportBadge: [8.2,4.8] as Pt, saleBadge: [4.0,8.9] as Pt, focus: [4.5,4.5] as Pt };

const WAREHOUSE_LAYOUT = { slots: WAREHOUSE_SLOTS, door: WAREHOUSE_DOOR, route: WAREHOUSE_ROUTE, stops: WAREHOUSE_STOPS,
  saleRoute: [[4.5,8.1],[4.5,8.6],[4.6,9],[4.9,9.35],[5.3,9.5],[10.5,9.5]] as Pt[],
  pile: [3.2,7.3] as Pt, transportBadge: [4.5,7.6] as Pt, saleBadge: [4.5,8.1] as Pt, focus: [3.6,4.8] as Pt };

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
  supercars: { a: 0xe2e4e8, b: 0xd8dbe0, path: 0xe84118, pad: 0x2f3640 },
  hotel: { a: 0xf3ead6, b: 0xebe0c8, path: 0xc8a24a, pad: 0x8c6d2e },
  safari: { a: 0xebcf9c, b: 0xe2c48e, path: 0x8c5a2b, pad: 0xb7793d },
  souk: { a: 0xf2e2bd, b: 0xead6aa, path: 0xf6c344, pad: 0x7d5a14 },
  tower: { a: 0xdbe6ec, b: 0xd0dde4, path: 0x9fd3e6, pad: 0x34495e },
};

interface SlotView {
  worker: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  pile: Phaser.GameObjects.Image[];
  stock: Phaser.GameObjects.Text;
  barBg: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
  hint: Phaser.GameObjects.Image;
  pill: Pill;
  manager: Phaser.GameObjects.Image;
  station: Phaser.GameObjects.Image;
  x: number;
  y: number;
  level: number;
  lastStock: number;
  /** Rango del puesto (0–5) y lo que lo enseña: pedestal, brillo y medalla. */
  rank: number;
  rankG: Phaser.GameObjects.Graphics;
  rim: Phaser.Math.Vector2[];
  inner: Phaser.Math.Vector2[];
  glow: Phaser.GameObjects.Ellipse | null;
  badge: Phaser.GameObjects.Container;
  stationKey: string;
  workerKey: string;
  sparkleAt: number;
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

const isVehicle = (key: string) => key.startsWith("car_") || key.startsWith("veh_");

/** Vehículos propios de un negocio que, si aún no tienen PNG, se sustituyen por un coche. */
const VEHICLE_FALLBACK: Record<string, string> = { veh_forklift: "car_3", veh_van: "car_2" };

/**
 * Recinto de un negocio visto en un mapa isométrico: edificio principal, caminos y puestos.
 * El transporte recorre los puestos recogiendo lo producido y la venta sale por el portón.
 */
export class BusinessScene extends Phaser.Scene {
  private bridge!: Bridge;
  private visitor: WorldVisitor | null = null;
  private twistWorld: TwistWorld | null = null;
  private restaurant: RestaurantRoom | null = null;
  private warehouse: WarehouseRoom | null = null;
  private get layout() { return this.bizId === "restaurant" ? RESTAURANT_LAYOUT : this.bizId === "dropship" ? WAREHOUSE_LAYOUT : DEFAULT_LAYOUT; }
  private bizId = "";
  private start: { x: number; y: number; z?: number } = { x: -1, y: -1 };
  private ox = 0;
  private oy = 0;
  private stockFocus = -1;
  private stockFocusUntil = 0;
  private worldW = 0;
  private neighborhood?: Neighborhood;
  private slots: SlotView[] = [];
  private floorCount = 0;
  private mover!: Phaser.GameObjects.Image;
  private moverItem!: Phaser.GameObjects.Image;
  private moverCarry!: Phaser.GameObjects.Text;
  private moverHint!: Phaser.GameObjects.Image;
  private moverTag!: Phaser.GameObjects.Text;
  private moverRing!: Phaser.GameObjects.Ellipse;
  private sellerRing!: Phaser.GameObjects.Ellipse;
  private sellerTag!: Phaser.GameObjects.Text;
  private seller!: Phaser.GameObjects.Image;
  private sellerItem!: Phaser.GameObjects.Image;
  private sellerCarry!: Phaser.GameObjects.Text;
  private sellerHint!: Phaser.GameObjects.Image;
  private topPile: Phaser.GameObjects.Image[] = [];
  private topStock!: Phaser.GameObjects.Text;
  private unlockPill: Pill | null = null;
  private traffic: { obj: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; c: number; speed: number }[] = [];
  private coins!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;
  private drag!: DragScroll;
  private levels = { transport: 0, sale: 0 };
  /** Rango del transporte y de la venta, y su aro de color en el suelo. */
  private ranks = { transport: 0, sale: 0 };
  private moverAura!: Phaser.GameObjects.Ellipse;
  private sellerAura!: Phaser.GameObjects.Ellipse;
  private puffClock = 0;
  private previousFloors = 0;
  private lastTopStock = 0;

  constructor() {
    super("business");
  }

  init(data: { id: string; scrollX?: number; scrollY?: number; zoom?: number; previousFloors?: number }): void {
    this.bizId = data.id;
    this.previousFloors = data.previousFloors ?? 0;
    this.puffClock=0;
    this.start = { x: data.scrollX ?? -1, y: data.scrollY ?? -1, z: data.zoom };
    this.slots = [];
    this.topPile = [];
    this.traffic = [];
    this.unlockPill = null;
    this.visitor = null;
    this.twistWorld = null;
    this.restaurant = null;
    this.warehouse = null;
  }

  presentVisitor(kind: OfferKind, button: HTMLButtonElement): void {
    if (this.visitor) return;
    this.visitor = new WorldVisitor(this, kind, button, this.iso(10.5, 9.5), this.iso(kind === "truck" ? 5.6 : 4.9, 8.4), () => this.drag.wasDrag());
  }

  dismissVisitor(): void {
    this.visitor?.depart();
    this.visitor = null;
  }

  private get look() {
    const look = BIZ_ART[this.bizId] ?? BIZ_ART.dropship;
    const pick = (k: string) => (VEHICLE_FALLBACK[k] && !this.textures.exists(k) && !hasGeneratedArt(this,k) ? VEHICLE_FALLBACK[k] : k);
    return { ...look, station: this.warehouse ? "wh_shelf" : look.station, mover: pick(look.mover), seller: pick(look.seller) };
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
    this.lastTopStock=b.topStock;
    this.levels = { transport: b.transport.level, sale: b.sale.level };
    this.ranks = { transport: rankOf(b.transport.level), sale: rankOf(b.sale.level) };

    const hubKey = buildingKey(this.bizId, b.floors.length);
    const margin = 70;
    this.ox = (ROWS * TW) / 2 + margin;
    this.oy = insets.top + ((this.bizId === "restaurant" || this.bizId === "dropship") ? 90 : Math.max(120, ART[hubKey].h - 40));
    this.worldW = ((COLS + ROWS) * TW) / 2 + margin * 2;
    const worldH = this.oy + ((COLS + ROWS + 2) * TH) / 2 + 40 + insets.bottom;

    this.neighborhood = new Neighborhood(this,{city:this.bridge.state().city,biz:this.bizId,name:this.bizId === "dropship" ? t("Almacén") : bizDef(this.bizId).name,cols:COLS,rows:ROWS,iso:(c,r)=>this.iso(c,r)});
    this.cameras.main.setBackgroundColor(this.neighborhood.backdrop ?? mix(cityDef(this.bridge.state().city).ground.grass, 0x000000, 0.06));
    if (this.bizId === "restaurant") {
      this.restaurant = new RestaurantRoom(this,(c,r)=>this.iso(c,r),this.floorCount);
      this.restaurant.create();
    } else if (this.bizId === "dropship") {
      this.warehouse = new WarehouseRoom(this,(c,r)=>this.iso(c,r),this.floorCount);
      this.warehouse.create();
    } else {
      this.drawGround();
      this.drawFence();
      this.drawDecor();
      this.drawTierDecor(bizTier(b));
    }
    this.drawHub();
    this.layout.slots.forEach((_, i) => this.drawSlot(i));
    this.makeActors();
    this.makeParticles();

    this.drag = new DragScroll(this, this.worldW, worldH, { zoom: this.start.z ?? (this.warehouse ? 0.66 : 0.62), minZoom: 0.3, maxZoom: 1.4, memoryKey: `business:${this.bridge.state().city}:${this.bizId}` });
    if (this.start.x >= 0) this.drag.scrollTo(this.start.x, this.start.y);
    else if (!this.drag.restore()) {
      // Arrancar viendo el edificio principal y la primera fila de puestos
      const focus = this.iso(...this.layout.focus);
      this.drag.centerOn(focus.x, focus.y);
    }
    const focus = this.iso(...this.layout.focus);
    this.drag.addControls(focus, this.neighborhood.bounds);
    if (TWIST_WORLD_ART.includes(this.bizId)) this.twistWorld = new TwistWorld(this,this.bizId,this.iso(this.bizId === "restaurant" ? 7.6 : this.bizId === "dropship" ? 1.5 : 6.9, 8.7));
    revealScene(this);
  }

  /* ---------- Suelo, caminos y calle ---------- */

  private tileKind(c: number, r: number): "road" | "path" | "hub" | "slot" | "ground" {
    if (r === ROAD_ROW) return "road";
    if (c >= HUB.c && c < HUB.c + 2 && r >= HUB.r && r < HUB.r + 2) return "hub";
    if (this.layout.slots.some(([sc, sr]) => sc === c && sr === r)) return "slot";
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
        if (placeTile(this, cx, t.y, tileKey, tileRand, TW)) continue;
        if (kind === "road") {
          g.fillStyle(0x46586a, 1).fillPoints(this.diamond(c, r), true);
          const quad=(r0:number,r1:number) => [this.iso(c,r0),this.iso(c+1,r0),this.iso(c+1,r1),this.iso(c,r1)].map(p=>new Phaser.Math.Vector2(p.x,p.y));
          g.fillStyle(0xe5ded0).fillPoints(quad(r,r+0.14),true).fillPoints(quad(r+0.86,r+1),true);
          const a=this.iso(c+0.28,r+0.5),b=this.iso(c+0.72,r+0.5);
          g.lineStyle(2,0xffedb0,0.9).lineBetween(a.x,a.y,b.x,b.y);
        } else if (kind === "path") {
          g.fillStyle(0xb8bec6, 1).fillPoints(this.diamond(c, r), true);
          g.lineStyle(1,0x8c9baa,0.28).strokePoints(this.diamond(c, r),true);
          g.fillStyle(theme.path, 0.55).fillCircle(cx, cy, 2.2);
        } else {
          g.fillStyle((c + r) % 2 ? theme.a : theme.b, 1).fillPoints(this.diamond(c, r), true);
          g.lineStyle(1, shade(theme.a, -0.08), 0.6).strokePoints(this.diamond(c, r), true);
        }
        if(kind!=="road") groundDetail(g, cx, cy, "paving", c + r * COLS);
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
    const key = buildingKey(this.bizId, this.biz().floors.length);
    const spec = ART[key];
    const bottom = this.iso(HUB.c + 2, HUB.r + 2);
    if (!this.restaurant && !this.warehouse) {
      const hub=art(this, bottom.x, bottom.y + 2, key).setOrigin(0.5, hasGeneratedArt(this, key) ? 1 : (spec.h - 6) / spec.h).setDepth(bottom.y);
      if (this.previousFloors && buildingKey(this.bizId,this.previousFloors)!==key) constructionPop(this,hub,t("¡Nueva sede!"));
    }

    // Pila de producto listo para vender, junto a la puerta
    const pileAt = this.iso(...this.layout.pile);
    this.topPile = this.pile(pileAt.x, pileAt.y, pileAt.y + 2);
    this.topStock = label(this, pileAt.x, pileAt.y - 44, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9e4);

    // El nivel y la mejora del transporte y la venta están en la barra de la cadena (abajo, fija).
    // Zonas de toque: puerta (transporte) y portón (venta)
    const door = this.iso(this.layout.door[0], this.layout.door[1]);
    this.tapZone(door.x - 60, door.y - 60, 120, 80, { kind: "transport" });
    const gate = this.iso(4.5, 8.8);
    this.tapZone(gate.x - 50, gate.y - 50, 100, 70, { kind: "sale" });
  }

  /* ---------- Puestos ---------- */

  private drawSlot(i: number): void {
    const [c, r] = this.layout.slots[i];
    const theme = GROUND[this.bizId] ?? GROUND.dropship;
    const center = this.iso(c + 0.5, r + 0.5);
    const g = this.add.graphics().setDepth(-5);
    const def = bizDef(this.bizId);

    if (i >= this.floorCount) {
      if (i === this.floorCount) {
        // Siguiente puesto: en obras, con el precio
        g.fillStyle(0xc19a6b, 1).fillPoints(this.diamond(c, r, 2), true);
        g.lineStyle(2, 0xf5c542, 1).strokePoints(this.diamond(c, r, 6), true);
        art(this, center.x, center.y - 10, "ic_construction").setDepth(center.y);
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

    const rank = rankOf(this.biz().floors[i].level);
    const rankG = this.add.graphics().setDepth(-4);
    const rim = this.diamond(c, r, 4).map((v) => new Phaser.Math.Vector2(v.x, v.y - 5));
    const inner = this.diamond(c, r, 14).map((v) => new Phaser.Math.Vector2(v.x, v.y - 5));
    rankPedestal(rankG, rim, inner, rank);
    const glow = rankGlow(this, center.x + 6, center.y + 2, 84, center.y + 3, rank);
    const station = art(this, center.x + 10, center.y + 4, this.look.station).setOrigin(0.5, 1);
    station.setDisplaySize(ART[this.look.station].w * 0.62, ART[this.look.station].h * 0.62).setDepth(center.y + 4);
    if (rank) swapArt(station, rankedKey(this, this.look.station, rank));
    if(this.previousFloors && i>=this.previousFloors) constructionPop(this,station,t("¡Puesto nuevo!"));
    const workerKey = this.restaurant ? "rest_chef_a" : `ch_${this.look.worker}_0`;
    const worker = art(this, center.x - 24, center.y + 12, workerKey).setOrigin(0.5, 0.95);
    worker.setDisplaySize(ART[workerKey].w * 0.8, ART[workerKey].h * 0.8).setDepth(center.y + 12);
    if (rank) swapArt(worker, rankedKey(this, workerKey, rank));
    const pile = this.pile(center.x - 2, center.y + 20, center.y + 20, 0.7);
    const stock = label(this, center.x - 4, center.y - 8, "", 11, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(9e4);
    const barBg = this.add.rectangle(center.x, center.y + 26, 44, 5, 0x14202f, 0.6).setDepth(center.y + 30);
    const bar = this.add.rectangle(center.x - 22, center.y + 26, 0, 5, COLORS.green).setOrigin(0, 0.5).setDepth(center.y + 31);
    const hint = art(this, center.x - 24, center.y - 44, "ic_hand").setDepth(9.4e4);
    if (!reducedMotion()) this.tweens.add({ targets: hint, y: center.y - 36, yoyo: true, repeat: -1, duration: 500 });
    const pill = this.pill(center.x, center.y - 62, { kind: "floor", index: i });
    const manager = art(this, center.x + 38, center.y - 62, "ic_manager").setDepth(9.2e4);
    const badge = rankBadge(this, center.x - 40, center.y - 62, rank).setDepth(9.31e4);
    const nameTag = label(this, center.x, center.y + 40, `${def.floorName} ${i + 1}`, 10, "#ffffff", { bold: true, stroke: "#14202f" });
    // Pantalla limpia: el nombre de cada puesto solo con 1–2 puestos (al aprender); luego se sobreentiende.
    nameTag.setDepth(9e4).setVisible(this.biz().floors.length <= 2);
    this.tapZone(center.x - TW / 2, center.y - 46, TW, 80, { kind: "floor", index: i });
    const shadow = actorShadow(this,worker.displayWidth).setPosition(worker.x,center.y+13).setDepth(center.y+10);
    this.slots[i] = { worker, shadow, pile, stock, barBg, bar, hint, pill, manager, station, x: center.x, y: center.y, level: this.biz().floors[i].level, lastStock: this.biz().floors[i].stock,
      rank, rankG, rim, inner, glow, badge, stationKey: this.look.station, workerKey, sparkleAt: 0 };
  }

  /* ---------- Transporte y venta ---------- */

  private actor(key: string, depthY: number): Phaser.GameObjects.Image {
    const k = this.restaurant && key === "waiter" ? "rest_waiter_a" : isVehicle(key) ? key : `ch_${key}_0`;
    const img = art(this, 0, 0, k).setOrigin(0.5, isVehicle(key) ? (this.warehouse ? 0.92 : 0.7) : 0.95).setDepth(depthY);
    if (!isVehicle(key)) img.setDisplaySize(ART[k].w * 0.85, ART[k].h * 0.85);
    img.setData("groundShadow",actorShadow(this,img.displayWidth));
    return img;
  }

  private makeActors(): void {
    this.mover = this.actor(this.look.mover, 0).setInteractive({ useHandCursor: true });
    this.mover.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapStation(this.bizId, { kind: "transport" });
    });
    this.moverItem = art(this, 0, 0, this.look.item).setVisible(false);
    this.moverCarry = label(this, 0, 0, "", 11, "#ffffff", { bold: true, stroke: "#14202f" });
    this.moverHint = art(this, 0, 0, "ic_hand");
    // Durante el tutorial, cartel con el nombre encima: si no, no se sabe cuál es «la carretilla».
    // Aro dorado en el suelo bajo quien hay que tocar en el tutorial (que no haya dudas entre dos vehículos)
    const ring = () => {
      const e = this.add.ellipse(0, 0, 64, 28, 0xf5c542, 0.3).setStrokeStyle(3, 0xf5c542, 1).setVisible(false);

      return e;
    };
    this.moverRing = ring();
    this.sellerRing = ring();
    const aura = (rank: number) => this.add.ellipse(0, 0, 58, 24, rankInfo(rank)?.color ?? 0xffffff, 0.45).setStrokeStyle(2, rankInfo(rank)?.color ?? 0xffffff, 0.9).setVisible(rank > 0);
    this.moverAura = aura(this.ranks.transport);
    this.sellerAura = aura(this.ranks.sale);
    this.moverTag = label(this, 0, 0, bizDef(this.bizId).transportName, 12, "#14202f", { bold: true }).setBackgroundColor("#f5c542").setPadding(6, 2, 6, 2).setVisible(false);

    this.seller = this.actor(this.look.seller, 0).setInteractive({ useHandCursor: true });
    this.vehicleRank(this.mover, this.look.mover, this.ranks.transport);
    this.vehicleRank(this.seller, this.look.seller, this.ranks.sale);
    this.seller.on("pointerup", () => {
      if (!this.drag.wasDrag()) this.bridge.tapStation(this.bizId, { kind: "sale" });
    });
    this.sellerItem = art(this, 0, 0, this.look.item).setVisible(false);
    this.sellerCarry = label(this, 0, 0, "", 11, "#ffffff", { bold: true, stroke: "#14202f" });
    this.sellerHint = art(this, 0, 0, "ic_hand");
    this.sellerTag = label(this, 0, 0, bizDef(this.bizId).saleName, 12, "#14202f", { bold: true }).setBackgroundColor("#f5c542").setPadding(6, 2, 6, 2).setVisible(false);

    // Tráfico por la calle de delante
    for (let k = 0; k < (this.warehouse ? 0 : 2); k++) {
      const obj = art(this, 0, 0, `car_${k}`).setOrigin(0.5, 0.7);
      this.traffic.push({ obj, shadow: actorShadow(this,obj.displayWidth), c: k * 5, speed: 0.9 + k * 0.3 });
    }
  }

  /** Coloca un actor en la rejilla, orientado según su dirección de marcha. */
  private place(img: Phaser.GameObjects.Image, key: string, c: number, r: number, dc: number, dr: number, frame: number): { x: number; y: number } {
    const p = this.iso(c, r);
    img.setPosition(p.x, p.y).setDepth(p.y + 2);
    if (isVehicle(key)) {
      if (this.warehouse && (key === "veh_forklift" || key === "veh_van")) {
        const rear = dc + dr < 0;
        const b = this.biz();
        const parked = key === "veh_van" && (b.sale.phase === "idle" || (b.sale.phase === "out" && b.sale.prog < 0.1));
        const loading = parked && (b.topStock > 0 || b.sale.carry > 0);
        const pose = key === "veh_forklift"
          ? (rear ? "wh_forklift_rear" : b.transport.carry > 0 ? "wh_forklift_loaded" : "veh_forklift")
          : loading ? "wh_van_open" : parked || rear ? "wh_van_rear" : "veh_van";
        swapArt(img, rankedKey(this, pose, img === this.mover ? this.ranks.transport : this.ranks.sale));
        img.setFlipX(parked ? false : dc-dr < 0);
      } else img.setFlipX(Math.abs(dr) > Math.abs(dc));
    } else {
      const rank = img === this.mover ? this.ranks.transport : img === this.seller ? this.ranks.sale : 0;
      const base = this.restaurant && key === "waiter" ? (frame === 2 ? "rest_waiter_b" : "rest_waiter_a") : `ch_${key}_${frame}`;
      swapArt(img, rank ? rankedKey(this, base, rank) : base);
      const screenDx = dc - dr;
      if (screenDx !== 0) img.setFlipX(screenDx < 0);
    }
    gait(img,p.y,this.time.now / 1000,frame!==0,isVehicle(key));
    const shadow=img.getData("groundShadow") as Phaser.GameObjects.Ellipse;
    shadow.setPosition(p.x,p.y+1).setDepth(p.y-1);
    return p;
  }

  /** Vehículo con arte propio del rango (si existe; los del almacén cambian de pose y no se tocan). */
  private vehicleRank(img: Phaser.GameObjects.Image, key: string, rank: number): void {
    if (rank && isVehicle(key)) swapArt(img, rankedKey(this, key, rank));
  }

  /** Cambia el aspecto de un puesto a su rango; con `burst`, lo celebra en la escena. */
  private applySlotRank(i: number, rank: number, burst: boolean): void {
    const v = this.slots[i];
    v.rank = rank;
    rankPedestal(v.rankG, v.rim, v.inner, rank);
    v.glow?.destroy();
    v.glow = rankGlow(this, v.x + 6, v.y + 2, 84, v.y + 3, rank);
    v.badge.destroy();
    v.badge = rankBadge(this, v.x - 40, v.y - 62, rank).setDepth(9.31e4);
    swapArt(v.station, rankedKey(this, v.stationKey, rank));
    swapArt(v.worker, rankedKey(this, v.workerKey, rank));
    if (burst) rankBurst(this, v.station.x, v.station.y - 10, rank, `${rankInfo(rank)!.name}!`);
  }

  /**
   * Decoración del recinto según la categoría del negocio (★★ con 3 puestos, ★★★ con 6):
   * farolas y jardineras junto al camino y, con ★★★, guirnaldas de luces y alfombra dorada.
   * Si existe el PNG `decor_<negocio>_<categoría>`, se pone junto al edificio principal.
   */
  private drawTierDecor(tier: number): void {
    if (tier < 2) return;
    const decorKey = `decor_${this.bizId}_${tier}`;
    if (this.textures.exists(decorKey) || hasGeneratedArt(this, decorKey)) {
      const p = this.iso(HUB.c + 2.6, HUB.r + 1.6);
      art(this, p.x, p.y, decorKey).setOrigin(0.5, 0.9).setDepth(p.y);
    }
    const g = this.add.graphics().setDepth(-3);
    // Jardineras y farolas a lo largo del camino central
    for (const r of [4, 7, 8]) {
      for (const side of [-0.15, 1.15]) {
        const p = this.iso(4 + side, r + 0.5);
        g.fillStyle(0x6d4c41, 1).fillRect(p.x - 7, p.y - 4, 14, 6);
        g.fillStyle(0x3ddc97, 1).fillEllipse(p.x, p.y - 6, 16, 8);
        g.fillStyle(tier >= 3 ? 0xf5c542 : 0xff7aa8, 1).fillCircle(p.x - 3, p.y - 8, 2).fillCircle(p.x + 3, p.y - 7, 2);
      }
    }
    for (const r of [2.6, 8.4]) {
      const p = this.iso(3.9, r);
      art(this, p.x, p.y, "lamp_post").setOrigin(0.5, 0.95).setDepth(p.y);
    }
    if (tier < 3) return;
    // Alfombra dorada desde el portón hasta la puerta
    const carpet = [this.iso(4.35, 2.6), this.iso(4.65, 2.6), this.iso(4.65, 8.9), this.iso(4.35, 8.9)].map((p) => new Phaser.Math.Vector2(p.x, p.y));
    g.fillStyle(0xc0392b, 0.85).fillPoints(carpet, true);
    g.lineStyle(2, 0xf5c542, 1).strokePoints(carpet, true);
    // Guirnaldas de luces sobre las filas de puestos
    const lights = this.add.graphics().setDepth(9e3);
    const bulbs: Phaser.GameObjects.Arc[] = [];
    for (const r of [2.2, 5.2]) {
      const a = this.iso(0.6, r), b = this.iso(8.4, r);
      const n = 14;
      lights.lineStyle(1.5, 0x2c3e50, 0.8);
      let prev: { x: number; y: number } | null = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t - 46 + Math.sin(t * Math.PI * 3) * 6;
        if (prev) lights.lineBetween(prev.x, prev.y, x, y);
        prev = { x, y };
        bulbs.push(this.add.circle(x, y + 3, 2.6, [0xf5c542, 0xff7aa8, 0x6fe3ff][i % 3]).setDepth(9e3 + 1));
      }
    }
    if (!reducedMotion()) this.tweens.add({ targets: bulbs, alpha: 0.45, duration: 700, yoyo: true, repeat: -1, delay: this.tweens.stagger(90, {}) });
  }

  /* ---------- Utilidades ---------- */

  private tapZone(x: number, y: number, w: number, h: number, st: Station): void {
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      if (!this.drag.wasDrag()) {
        if(st.kind === "floor") {this.stockFocus=st.index;this.stockFocusUntil=this.time.now+3500;}
        this.bridge.tapStation(this.bizId, st);
      }
    });
  }

  private pill(x: number, y: number, st: Station): Pill {
    const p = new Pill(this, x, y, `${t("Nv")} 1`).setDepth(9.3e4);
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
    const coinRef = artRef(this, "coin");
    this.coins = this.add
      .particles(0, 0, coinRef.texture, {
        frame: coinRef.frame,
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
    this.neighborhood?.update(Math.min(dtMs,100)/1000);
    this.visitor?.update();
    const s = this.bridge.state();
    this.twistWorld?.update(s);
    const b = this.biz();
    if (!b) return;
    if (b.floors.length !== this.floorCount) {
      const cam = this.cameras.main;
      this.scene.restart({ id: this.bizId, scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom / DPR, previousFloors: this.floorCount });
      return;
    }
    const def = bizDef(this.bizId);
    const clk = this.time.now / 1000;
    const dt = Math.min(dtMs, 100) / 1000;
    const walkFrame = calmWorld() ? 0 : Math.floor(clk * WALK_FPS) % 2 ? 1 : 2;
    const tutorial = s.totalEarned < 30;
    // Paso del tutorial en curso: las pistas siguen al paso, no al stock (así nunca falta la mano).
    const tutStat = s.meta.tutorial < TUTORIAL.length && this.bizId === bizList(s)[0].id ? TUTORIAL[s.meta.tutorial].stat : null;
    const unit = CHAIN.floorCycle * def.mult;

    // Puestos
    this.puffClock += dt;
    const puffNow = this.puffClock > 0.4;
    if (puffNow) this.puffClock = 0;
    b.floors.forEach((f, i) => {
      const v = this.slots[i];
      const p = f.running ? f.prog / CHAIN.floorCycle : 0;
      const working = f.running;
      const active=working && !calmWorld();
      if (this.restaurant) swapArt(v.worker, rankedKey(this, active && Math.floor(clk*4+i)%2 ? "rest_chef_b" : "rest_chef_a", v.rank));
      v.worker.setY(v.y + 12 - (active ? Math.abs(Math.sin(clk * 6 + i)) * 1.8 : 0));
      v.worker.setAngle(active ? Math.sin(clk * 6 + i) * 3 : 0);
      v.shadow.setAlpha(active ? 0.13 + Math.abs(Math.sin(clk*6+i))*0.05 : 0.18);
      if (working && puffNow && !reducedMotion()) {
        if (this.bizId === "restaurant") this.puffs.emitParticleAt(v.station.x + (Math.random() - 0.5) * 20, v.station.y - 40);
        else this.sparks.emitParticleAt(v.station.x + (Math.random() - 0.5) * 30, v.station.y - 30 - Math.random() * 20, 1);
      }
      if(f.stock>v.lastStock) {
        transferProduct(this,this.look.item,{x:v.station.x,y:v.station.y-24},{x:v.x-2,y:v.y+13});
        upgradePop(this,v.station);
      } else if(f.stock<v.lastStock) transferProduct(this,this.look.item,{x:v.x-2,y:v.y+13},{x:this.mover.x,y:this.mover.y-34});
      v.lastStock=f.stock;
      this.showPile(v.pile, f.stock, unit);
      v.stock.setText(f.stock > 0 ? fmt(f.stock) : "").setVisible(f.stock >= floorLoad(def,i,f.level) * 10 || this.stockFocus === i && this.time.now < this.stockFocusUntil);
      v.bar.width = 44 * p;
      v.hint.setVisible(tutStat ? tutStat === "tapFloor" && !f.running : tutorial && !f.managed && !f.running);
      v.manager.setVisible(f.managed);
      if (f.level > v.level) {
        if (!reducedMotion()) this.sparks.explode(14, v.station.x, v.station.y - 30);
        upgradePop(this,v.station);
        v.level = f.level;
        const rank = rankOf(f.level);
        if (rank > v.rank) this.applySlotRank(i, rank, true);
      }
      // Diamante y leyenda: destellos de vez en cuando
      if (v.rank >= 4 && !reducedMotion() && clk > v.sparkleAt) {
        v.sparkleAt = clk + 1.6 + Math.random() * 1.6;
        this.sparks.emitParticleAt(v.station.x + (Math.random() - 0.5) * 50, v.station.y - 20 - Math.random() * 40, 2);
      }
      const q = upgradeQuote(s, this.bizId, { kind: "floor", index: i });
      v.pill.setText(`${t("Nv")} ${f.level}`).setAlert(s.cash >= q.cost || (!f.managed && s.cash >= managerCost(def, { kind: "floor", index: i })));
    });

    this.restaurant?.update(dt,b);
    this.warehouse?.update(dt,b,tutStat === null);

    // Transporte: recorre la ruta parando en cada puesto
    const tr = b.transport;
    const seg = Math.min(Math.floor(tr.pos), this.layout.stops.length - 2);
    const sub = this.layout.route.slice(this.layout.stops[seg], this.layout.stops[seg + 1] + 1);
    const mv = along(sub, tr.pos - seg);
    const back = tr.phase === "up";
    const moving = tr.phase === "down" || tr.phase === "up";
    const mp = this.place(this.mover, this.look.mover, mv.c, mv.r, back ? -mv.dc : mv.dc, back ? -mv.dr : mv.dr, moving ? walkFrame : 0);
    const carryY = this.mover.y - (isVehicle(this.look.mover) ? 34 : 50);
    this.moverItem.setVisible(tr.carry > 0 && !(this.warehouse && this.mover.frame.name === "wh_forklift_loaded")).setPosition(mp.x, carryY).setDepth(mp.y + 3);
    this.moverCarry.setText(tr.carry > 0 ? fmt(tr.carry) : "").setPosition(mp.x, carryY - 18).setDepth(9e4);
    const ringScale = reducedMotion() ? 1 : 1 + Math.sin(clk * 5) * 0.075;
    this.moverRing.setScale(ringScale);
    this.sellerRing.setScale(ringScale);
    const moverStep = tutStat === "tapTransport";
    // En el tutorial solo señala lo que pide el paso actual; fuera de él, lo que está listo para tocar.
    this.moverHint.setVisible((tutStat ? moverStep : tutorial && b.floors.some((f) => f.stock > 0)) && tr.phase === "idle" && !tr.managed);
    const mvLift = isVehicle(this.look.mover) ? 22 : 0; // los vehículos son más bajos que una persona
    this.moverHint.setPosition(mp.x, mp.y - 64 + mvLift + (reducedMotion() ? 0 : Math.sin(clk * 8) * 4)).setDepth(9.4e4);
    this.moverTag.setVisible(moverStep).setPosition(mp.x, mp.y - 92 + mvLift).setDepth(9.4e4);
    this.moverRing.setVisible(moverStep).setPosition(mp.x, mp.y).setDepth(mp.y - 0.5);
    this.moverAura.setPosition(mp.x, mp.y).setDepth(mp.y - 1.5);
    if (tr.level > this.levels.transport) {
      if (!reducedMotion()) this.sparks.explode(14, mp.x, mp.y - 20);
      this.levels.transport = tr.level;
      const rank = rankOf(tr.level);
      if (rank > this.ranks.transport) {
        this.ranks.transport = rank;
        this.moverAura.setFillStyle(rankInfo(rank)!.color, 0.45).setStrokeStyle(2, rankInfo(rank)!.color, 0.9).setVisible(true);
        this.vehicleRank(this.mover, this.look.mover, rank);
        rankBurst(this, mp.x, mp.y, rank, `${rankInfo(rank)!.name}!`);
      }
    }

    // Venta: sale por el portón hacia la calle y vuelve
    const sl = b.sale;
    // The first tenth of the outgoing trip shows the dock loading animation.
    const outbound = this.warehouse ? Math.max(0,(sl.prog-0.1)/0.9) : sl.prog;
    const st = sl.phase === "out" ? outbound : sl.phase === "back" ? 1 - sl.prog : 0;
    const sv = along(this.layout.saleRoute, st);
    const sBack = sl.phase === "back";
    const sp = this.place(this.seller, this.look.seller, sv.c, sv.r, sBack ? -sv.dc : sv.dc, sBack ? -sv.dr : sv.dr, sl.phase !== "idle" && !(this.warehouse && sl.phase === "out" && sl.prog < 0.1) ? walkFrame : 0);
    const deliveryVisibility = this.warehouse ? 1 - Phaser.Math.Clamp(sv.c - 8.5, 0, 1) : 1;
    this.seller.setAlpha(deliveryVisibility);
    (this.seller.getData("groundShadow") as Phaser.GameObjects.Ellipse).setAlpha(deliveryVisibility);
    const sCarryY = this.seller.y - (isVehicle(this.look.seller) ? 34 : 50);
    this.sellerItem.setVisible(sl.carry > 0 && !this.warehouse).setPosition(sp.x, sCarryY).setDepth(sp.y + 3);
    this.sellerCarry.setAlpha(deliveryVisibility).setText(sl.carry > 0 ? fmt(sl.carry) : "").setPosition(sp.x, sCarryY - 18).setDepth(9e4);
    const sellerStep = tutStat === "sales";
    this.sellerHint.setVisible((tutStat ? sellerStep : tutorial && b.topStock > 0) && sl.phase === "idle" && !sl.managed);
    const slLift = isVehicle(this.look.seller) ? 22 : 0;
    this.sellerHint.setPosition(sp.x, sp.y - 64 + slLift + (reducedMotion() ? 0 : Math.sin(clk * 8) * 4)).setDepth(9.4e4);
    // El cartel va debajo: encima suele estar el otro vehículo aparcado.
    this.sellerTag.setAlpha(deliveryVisibility).setVisible(sellerStep).setPosition(sp.x, sp.y + 26).setDepth(9.4e4);
    this.sellerRing.setAlpha(deliveryVisibility).setVisible(sellerStep).setPosition(sp.x, sp.y).setDepth(sp.y - 0.5);
    if(b.topStock>this.lastTopStock) {
      const door=this.iso(...this.layout.pile);
      transferProduct(this,this.look.item,{x:mp.x,y:carryY}, {x:door.x,y:door.y-12});
    }
    this.lastTopStock=b.topStock;
    this.showPile(this.topPile, this.warehouse ? 0 : b.topStock, unit);
    this.topStock.setText(b.topStock > 0 ? fmt(b.topStock) : "");
    this.sellerAura.setPosition(sp.x, sp.y).setDepth(sp.y - 1.5).setAlpha(deliveryVisibility);
    if (sl.level > this.levels.sale) {
      if (!reducedMotion()) this.sparks.explode(14, sp.x, sp.y - 20);
      this.levels.sale = sl.level;
      const rank = rankOf(sl.level);
      if (rank > this.ranks.sale) {
        this.ranks.sale = rank;
        this.sellerAura.setFillStyle(rankInfo(rank)!.color, 0.45).setStrokeStyle(2, rankInfo(rank)!.color, 0.9).setVisible(true);
        this.vehicleRank(this.seller, this.look.seller, rank);
        rankBurst(this, sp.x, sp.y, rank, `${rankInfo(rank)!.name}!`);
      }
    }

    if (this.unlockPill) {
      const cost = floorUnlockCost(def, b.floors.length);
      this.unlockPill.setText(`${t("Abrir")} · ${money(cost)}`).setAlert(s.cash >= cost).setAlpha(s.cash >= cost ? 1 : 0.65);
    }

    // Tráfico
    for (const car of this.traffic) {
      if (!calmWorld()) car.c += car.speed * dt;
      if (car.c > COLS + 2) car.c = -2;
      const p = this.iso(car.c, ROAD_ROW + 0.35);
      car.obj.setPosition(p.x, p.y).setDepth(p.y + 1);
      const visible=Phaser.Math.Clamp(Math.min(car.c+2,COLS+2-car.c),0,1);
      car.obj.setAlpha(visible);
      gait(car.obj,p.y,clk+car.speed,!calmWorld(),true);
      car.shadow.setPosition(p.x,p.y+1).setDepth(p.y-1).setAlpha(0.18*visible);
    }

    // La parte que limita la cadena, en rojo (cuando ya hay algo automatizado)
    const rates = chainRates(def, b, false);
    const auto = tr.managed || sl.managed || b.floors.some((f) => f.managed);
    this.slots.forEach((v) => v.pill.setWarn(auto && rates.bottleneck === "production"));

    for (const sale of this.bridge.drainSales(this.bizId)) {
      this.restaurant?.onSale();
      const gate = this.iso(4.5, 9.3);
      rewardCoins(this, gate.x, gate.y - 20, sale.lucky);
      if (sale.lucky) {
        // Venta viral: lluvia de monedas y texto dorado grande
        if (!reducedMotion()) this.coins.explode(12, gate.x, gate.y - 20);
        if (!reducedMotion()) this.sparks.explode(10, gate.x, gate.y - 40);
        floatText(this, gate.x, gate.y - 90, `🔥 ${t("¡VIRAL!")} +${fmt(sale.amount)}`, "#f5c542");
        if (!reducedMotion()) this.cameras.main.shake(180, 0.004);
      } else {
        if (!reducedMotion()) this.coins.explode(4, gate.x, gate.y - 20);
        floatText(this, gate.x, gate.y - 60, `+${fmt(sale.amount)}`);
      }
    }
  }
}
