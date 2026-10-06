import { LevelButton } from './LevelButton';
import Phaser from "phaser";
import { money, t } from "../i18n";
import { ART, BIZ_ART, art, artScale, buildingKey, rankedKey } from "../art/catalog";
import { artRef, hasGeneratedArt, swapArt } from "../art/generated";
import { mix, shade } from "../art/pen";
import { BUSINESS_DISTRICTS } from "../art/businessWorld";
import { FEST_ID } from "../game/data";
import { now as clockNow } from "../game/clock";
import { fmt } from "../game/format";
import { rankInfo } from "../game/ranks";
import { TWIST_WORLD_ART } from "../game/twists";
import type { OfferKind } from "../game/offers";
import { COLORS, DPR, Pill, bridgeOf, calmWorld, floatText, label, reducedMotion, rewardCoins, setupCamera, type Bridge } from "./common";
import { constructionPop, revealScene, transferProduct, upgradePop } from "./feedback";
import { rankBadge, rankBurst } from "./rankFx";
import { TwistWorld } from "./TwistWorld";
import { WorldVisitor } from "./WorldVisitor";
import { businessView, type BusinessView } from "../view/businessView";
import type { SkillStatus } from "../game/skills";
import { screenOf } from "../view/screens";

/**
 * Pantalla de un negocio «en ruta» (docs/DISENO_RUTA.md): arriba la sede y la venta; debajo, una
 * ruta que baja en zigzag y en cada tramo horizontal hay una parada (un puesto). El transporte
 * recorre la ruta recogiendo y sube a la sede. Solo se desplaza en vertical y cada parada enseña
 * lo mismo en el mismo sitio: encargado, nombre, puesto, producto y el botón «Nivel» a la derecha.
 */

const STOP_H = 172;
const SURFACE_H = 280;
const ROAD_W = 30;

const isVehicle = (key: string) => key.startsWith("car_") || key.startsWith("veh_");
const VEHICLE_FALLBACK: Record<string, string> = { veh_forklift: "car_3", veh_van: "car_2" };

type Pt = { x: number; y: number };

/**
 * Botón de la habilidad del gerente (x2 de velocidad unos minutos). Arte provisional: Codex lo
 * sustituye (docs/VISUAL.md §14.1). Oculto sin gerente; amarillo y latiendo si se puede usar; verde con
 * el tiempo que le queda mientras dura; gris con la recarga.
 */
class SkillChip extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private look = "";
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.text = label(scene, 0, 0, "", 11, "#ffffff", { bold: true, stroke: "#0b2440" }).setOrigin(0.5);
    this.add([this.bg, this.text]);
    this.setSize(58, 26);
    scene.add.existing(this);
    this.setVisible(false);
  }
  set(sk: SkillStatus, clk: number): void {
    this.setVisible(sk.state !== "locked");
    if (sk.state === "locked") return;
    const mmss = (ms: number) => {
      const sec = Math.ceil(ms / 1000);
      return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
    };
    const txt = sk.state === "ready" ? "⚡ x2" : sk.state === "active" ? `⚡ ${mmss(sk.left)}` : `⏳ ${mmss(sk.left)}`;
    if (this.text.text !== txt) this.text.setText(txt);
    if (this.look !== sk.state) {
      this.look = sk.state;
      const fill = sk.state === "ready" ? 0xf5b81c : sk.state === "active" ? 0x2fbf71 : 0x6b7a8f;
      this.bg.clear();
      this.bg.fillStyle(0x0b2440, 0.5).fillRoundedRect(-29, -11, 58, 24, 11);
      this.bg.fillStyle(fill, 1).fillRoundedRect(-29, -13, 58, 24, 11);
      this.bg.lineStyle(2, 0x0b2440, 0.9).strokeRoundedRect(-29, -13, 58, 24, 11);
    }
    this.setScale(sk.state === "ready" && !reducedMotion() ? 1 + Math.abs(Math.sin(clk * 3)) * 0.08 : 1);
  }
}

interface StopView {
  station: Phaser.GameObjects.Image;
  worker: Phaser.GameObjects.Image;
  pile: Phaser.GameObjects.Image[];
  stock: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Rectangle;
  hint: Phaser.GameObjects.Image;
  manager: Phaser.GameObjects.Container;
  skill: SkillChip;
  button: LevelButton;
  badge: Phaser.GameObjects.Container;
  level: number;
  rank: number;
  lastStock: number;
  stationKey: string;
  workerKey: string;
}

export class RouteScene extends Phaser.Scene {
  private bridge!: Bridge;
  private bizId = "";
  private startY = -1;
  private previousFloors = 0;
  private W = 390;
  private ground = 0;
  private stopsTop = 0;
  private floorCount = 0;
  private stops: StopView[] = [];
  /** La ruta: puntos y distancia acumulada a cada parada (0 = la puerta de la sede). */
  private path: Pt[] = [];
  private lens: number[] = [];
  private stopDist: number[] = [];
  private mover!: Phaser.GameObjects.Image;
  private moverItem!: Phaser.GameObjects.Image;
  private moverCarry!: Phaser.GameObjects.Text;
  private moverHint!: Phaser.GameObjects.Image;
  private pedalTip!: Phaser.GameObjects.Text;
  private pedalFx!: Phaser.GameObjects.Graphics;
  private pedaling = false;
  private transportButton!: LevelButton;
  private transportSkill!: SkillChip;
  private saleSkill!: SkillChip;
  /** Dinero o fichas de la feria, para los precios. */
  private currency: BusinessView["wallet"]["currency"] = "cash";
  private transportBadge!: Phaser.GameObjects.Container;
  private seller!: Phaser.GameObjects.Image;
  private sellerItem!: Phaser.GameObjects.Image;
  private sellerCarry!: Phaser.GameObjects.Text;
  private sellerHint!: Phaser.GameObjects.Image;
  private saleButton!: LevelButton;
  private saleBadge!: Phaser.GameObjects.Container;
  private topPile: Phaser.GameObjects.Image[] = [];
  private topStock!: Phaser.GameObjects.Text;
  private unlock: Pill | null = null;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private coins!: Phaser.GameObjects.Particles.ParticleEmitter;
  private visitor: WorldVisitor | null = null;
  private twistWorld: TwistWorld | null = null;
  private levels = { transport: 0, sale: 0 };
  private ranks = { transport: 0, sale: 0 };
  private lastTopStock = 0;
  private sparkClock = 0;
  private scroll = { down: false, dragging: false, onMap: false, y0: 0, s0: 0, last: 0, vel: 0, max: 0 };

  private static remembered = new Map<string, number>();

  constructor() {
    super("route");
  }

  init(data: { id: string; scrollY?: number; previousFloors?: number }): void {
    this.bizId = data.id;
    this.currency = data.id === FEST_ID ? "tickets" : "cash";
    this.startY = data.scrollY ?? -1;
    this.previousFloors = data.previousFloors ?? 0;
    this.stops = [];
    this.ambient = [];
    this.topPile = [];
    this.unlock = null;
    this.visitor = null;
    this.twistWorld = null;
    this.pedaling = false;
  }

  presentVisitor(kind: OfferKind, button: HTMLButtonElement): void {
    if (this.visitor) return;
    const g = this.ground;
    this.visitor = new WorldVisitor(this, kind, button, { x: this.W + 70, y: g + 22 }, { x: this.W * 0.62, y: g + 22 }, () => this.wasDrag());
  }

  dismissVisitor(): void {
    this.visitor?.depart();
    this.visitor = null;
  }

  private get look() {
    const look = BIZ_ART[this.bizId] ?? BIZ_ART.dropship;
    const pick = (k: string) => (VEHICLE_FALLBACK[k] && !this.textures.exists(k) && !hasGeneratedArt(this, k) ? VEHICLE_FALLBACK[k] : k);
    return { ...look, item: this.bike && this.textures.exists("item_bike_bag") ? "item_bike_bag" : look.item, mover: pick(look.mover), seller: this.bike && this.textures.exists("ch_bike_customer_0") ? "bike_customer" : pick(look.seller) };
  }

  private price(n: number): string {
    return this.currency === "tickets" ? `${t("Fichas")} ${fmt(n)}` : money(n);
  }

  private view() {
    return businessView(this.bridge.state(), this.bizId, clockNow());
  }

  private get bike() { return this.bizId === "bike"; }
  private ambient: Phaser.GameObjects.Image[] = [];

  private theme() {
    return screenOf(this.bizId).palette;
  }

  /* ---------- Geometría de la ruta ---------- */

  private get left() { return 34; }
  private get right() { return this.W - 112; }
  private get mid() { return (this.left + this.right) / 2; }
  private bandTop(i: number) { return this.stopsTop + i * STOP_H; }
  private crossY(i: number) { return this.bandTop(i) + STOP_H - 36; }

  /** Ruta en zigzag: baja por un lado, cruza la franja (parada en el centro) y baja por el otro. */
  private buildPath(stops: number): void {
    const pts: Pt[] = [{ x: this.left, y: this.ground + 8 }];
    const stopIdx: number[] = [0];
    for (let i = 0; i < stops; i++) {
      const side = i % 2 ? this.right : this.left, other = i % 2 ? this.left : this.right;
      const y = this.crossY(i);
      pts.push({ x: side, y }, { x: this.mid, y });
      stopIdx.push(pts.length - 1);
      pts.push({ x: other, y });
    }
    this.path = pts;
    this.lens = [0];
    for (let i = 1; i < pts.length; i++) this.lens.push(this.lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    this.stopDist = stopIdx.map((k) => this.lens[k]);
  }

  /** Punto de la ruta a una distancia dada, con la dirección de marcha. */
  private at(d: number): Pt & { dx: number; dy: number } {
    const L = this.lens;
    for (let i = 1; i < L.length; i++) {
      if (d <= L[i] || i === L.length - 1) {
        const a = this.path[i - 1], b = this.path[i], seg = L[i] - L[i - 1] || 1;
        const f = Phaser.Math.Clamp((d - L[i - 1]) / seg, 0, 1);
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: Math.sign(b.x - a.x), dy: Math.sign(b.y - a.y) };
      }
    }
    return { ...this.path[0], dx: 0, dy: 0 };
  }

  /** Posición del transporte de la economía (0 = sede, k = parada k-1) en distancia de ruta. */
  private distOf(pos: number): number {
    const k = Math.floor(pos), f = pos - k;
    const a = this.stopDist[Math.min(k, this.stopDist.length - 1)];
    const b = this.stopDist[Math.min(k + 1, this.stopDist.length - 1)];
    return a + (b - a) * f;
  }

  create(): void {
    this.bridge = bridgeOf(this);
    setupCamera(this);
    const insets = this.bridge.insets();
    const b = this.view();
    this.W = this.scale.width / DPR;
    this.floorCount = b.stops.length;
    this.lastTopStock = b.topStock;
    this.levels = { transport: b.transport.level, sale: b.sale.level };
    this.ranks = { transport: b.transport.rank, sale: b.sale.rank };
    this.ground = insets.top + 70 + SURFACE_H;
    this.stopsTop = this.ground + 30;

    const shown = Math.min(b.maxStops, this.floorCount + 1);
    this.buildPath(shown);
    this.drawSurface();
    this.drawGround(shown);
    for (let i = 0; i < shown; i++) this.drawStop(i);
    this.makeMover();
    this.makeParticles();

    const worldH = this.bandTop(shown) + 150;
    const viewH = this.scale.height / DPR;
    this.scroll.max = Math.max(0, worldH - viewH + insets.bottom + 30);
    const cam = this.cameras.main;
    cam.setBackgroundColor(shade(this.theme().ground, -0.1));
    const remembered = RouteScene.remembered.get(this.bizId);
    cam.scrollY = Phaser.Math.Clamp(this.startY >= 0 ? this.startY : remembered ?? 0, 0, this.scroll.max);
    this.setupScroll();
    this.game.events.on("blur", this.stopPedal, this);
    this.events.once("shutdown", () => {
      this.game.events.off("blur", this.stopPedal, this);
      RouteScene.remembered.set(this.bizId, cam.scrollY);
      this.bridge.pedal(null);
    });

    if (TWIST_WORLD_ART.includes(this.bizId)) this.twistWorld = new TwistWorld(this, this.bizId, { x: this.W * 0.56, y: this.ground + 16 });
    revealScene(this);
  }

  /* ---------- Desplazamiento vertical ---------- */

  private setupScroll(): void {
    const cam = this.cameras.main, input = this.input, sc = this.scroll;
    input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      sc.down = true; sc.onMap = true; sc.dragging = false; sc.vel = 0;
      sc.y0 = p.y; sc.s0 = cam.scrollY; sc.last = p.y;
    });
    input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!sc.down || this.pedaling) return;
      if (Math.abs(p.y - sc.y0) > 8 * DPR) sc.dragging = true;
      if (!sc.dragging) return;
      cam.scrollY = Phaser.Math.Clamp(sc.s0 - (p.y - sc.y0) / cam.zoom, 0, sc.max);
      sc.vel = (sc.last - p.y) / cam.zoom;
      sc.last = p.y;
    });
    input.on("pointerup", () => {
      sc.down = false; sc.onMap = false;
      this.stopPedal();
    });
    input.on("pointerupoutside", () => { sc.down = false; sc.onMap = false; this.stopPedal(); });
    input.on("wheel", (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy * 0.6, 0, sc.max);
    });
  }

  private wasDrag(): boolean {
    return this.scroll.dragging || !this.scroll.onMap;
  }

  private tap(obj: Phaser.GameObjects.GameObject, fn: () => void): void {
    obj.on("pointerup", () => { if (!this.wasDrag()) fn(); });
  }

  private zone(x: number, y: number, w: number, h: number, fn: () => void): Phaser.GameObjects.Zone {
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    this.tap(z, fn);
    return z;
  }

  /* ---------- Superficie: sede, calle y venta ---------- */

  private drawSurface(): void {
    const W = this.W, g0 = this.ground;
    const sky = this.add.graphics().setDepth(0);
    const [top, bottom] = this.theme().sky;
    sky.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, 0, W, g0);
    const district = `district_${BUSINESS_DISTRICTS[this.bizId] ?? (this.bizId === "bike" ? "terrace" : this.bridge.state().city)}`;
    for (const [fx, flip] of [[0.18, false], [0.86, true]] as [number, boolean][]) {
      const d = art(this, W * fx, g0 + 6, district).setOrigin(0.5, 1).setDepth(1).setFlipX(flip).setAlpha(0.55);
      d.setTint(mix(0xffffff, 0x9fc4dc, 0.45));
    }
    if (this.bike && this.textures.exists("street_bike")) {
      art(this, W / 2, g0, "street_bike").setOrigin(0.5, 1).setDisplaySize(W, SURFACE_H).setDepth(2);
      for (let i = 0; i < 2; i++) {
        const portal = art(this, W - 49, g0 + 12, `bike_portal_${i}`).setOrigin(0.5, 1).setDepth(6).setVisible(i === 0);
        this.ambient.push(portal);
      }
      const pigeons = art(this, 112, g0 + 25, "bike_pigeons").setDepth(32);
      this.ambient.push(pigeons);
      const traffic = art(this, -60, g0 + 19, "car_0").setDepth(28).setDisplaySize(42, 24);
      this.ambient.push(traffic);
    }
    const street = this.add.graphics().setDepth(2);
    street.fillStyle(0xc9cdd6, 1).fillRect(0, g0 - 6, W, 10);
    street.fillStyle(0x4a5160, 1).fillRect(0, g0 + 4, W, 26);
    for (let x = 10; x < W; x += 34) street.fillStyle(0xf5f5f5, 0.8).fillRect(x, g0 + 16, 16, 3);
    // Sede: lo más grande de la pantalla
    const v = this.view();
    const key = this.bike ? `bld_bike_${v.tier}` : buildingKey(this.bizId, v.stops.length);
    const spec = ART[key];
    const maxW = this.bike ? W - 90 : W - 220, maxH = this.bike ? 210 : SURFACE_H - 30;
    const s = Math.min(maxW / spec.w, maxH / spec.h, this.bike ? 4 : 1.6);
    const hub = art(this, W / 2 - 6, g0 + 2, key).setOrigin(0.5, hasGeneratedArt(this, key) ? 1 : (spec.h - 6) / spec.h).setDepth(5);
    hub.setDisplaySize(spec.w * s, spec.h * s);
    if (this.previousFloors && buildingKey(this.bizId, this.previousFloors) !== key) constructionPop(this, hub, t("¡Nueva sede!"));
    this.zone(hub.x - hub.displayWidth / 2, hub.y - hub.displayHeight, hub.displayWidth, hub.displayHeight, () => this.bridge.tapStation(this.bizId, { kind: "sale" }));
    // Producto listo, en la puerta (donde llega la ruta)
    const px = this.left + 34;
    this.topPile = this.pile(px, g0 - 2, 6, 0.9);
    this.topStock = label(this, px, g0 - 46, "", 13, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(60);
    // Venta en la calle, con su nivel arriba a la derecha
    const sk = isVehicle(this.look.seller) ? this.look.seller : `ch_${this.look.seller}_0`;
    this.seller = art(this, 0, 0, sk).setOrigin(0.5, 0.9).setDepth(30).setInteractive({ useHandCursor: true });
    if (!isVehicle(this.look.seller)) this.seller.setDisplaySize(ART[sk].w * 1.1, ART[sk].h * 1.1);
    if (this.ranks.sale && isVehicle(this.look.seller)) swapArt(this.seller, rankedKey(this, this.look.seller, this.ranks.sale));
    this.tap(this.seller, () => this.bridge.tapStation(this.bizId, { kind: "sale" }));
    this.sellerItem = art(this, 0, 0, this.look.item).setDepth(31).setVisible(false);
    this.sellerCarry = label(this, 0, 0, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(61);
    this.sellerHint = art(this, 0, 0, "ic_hand").setDepth(90).setVisible(false);
    this.saleButton = new LevelButton(this, W - 46, g0 - 150).setDepth(70).setInteractive({ useHandCursor: true });
    this.tap(this.saleButton, () => this.bridge.openStation(this.bizId, { kind: "sale" }));
    label(this, W - 46, g0 - 112, v.sale.name, 11, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5, 0).setDepth(70);
    this.saleBadge = rankBadge(this, W - 78, g0 - 176, this.ranks.sale).setDepth(71);
    this.zone(W * 0.6, g0 - 20, W * 0.4, 52, () => this.bridge.tapStation(this.bizId, { kind: "sale" }));
    // Transporte: su nivel arriba a la izquierda, sobre la entrada de la ruta
    this.transportButton = new LevelButton(this, 46, g0 - 150).setDepth(70).setInteractive({ useHandCursor: true });
    this.tap(this.transportButton, () => this.bridge.openStation(this.bizId, { kind: "transport" }));
    label(this, 46, g0 - 112, v.transport.name, 11, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5, 0).setDepth(70);
    this.transportBadge = rankBadge(this, 14, g0 - 176, this.ranks.transport).setDepth(71);
    // Habilidades de los gerentes de transporte y venta, encima de su botón de nivel
    this.transportSkill = new SkillChip(this, 46, g0 - 206).setDepth(72);
    this.skillTap(this.transportSkill, { kind: "transport" });
    this.saleSkill = new SkillChip(this, W - 46, g0 - 206).setDepth(72);
    this.skillTap(this.saleSkill, { kind: "sale" });
  }

  private skillTap(chip: SkillChip, st: Parameters<Bridge["useSkill"]>[1]): void {
    chip.setInteractive({ useHandCursor: true });
    this.tap(chip, () => this.bridge.useSkill(this.bizId, st));
  }

  /* ---------- Suelo y ruta ---------- */

  private drawGround(shown: number): void {
    const W = this.W, theme = this.theme();
    const g = this.add.graphics().setDepth(3.1);
    if (!this.bike || !this.textures.exists("band_bike")) g.fillStyle(theme.ground, 1).fillRect(0, this.ground + 30, W, this.bandTop(shown) - this.ground);
    for (let i = 0; i < shown; i++) {
      const y = this.bandTop(i);
      if (!this.bike || !this.textures.exists("band_bike")) g.fillStyle(i % 2 ? shade(theme.ground, -0.03) : theme.ground, 1).fillRect(0, y, W, STOP_H);
      g.fillStyle(shade(theme.ground, -0.12), 1).fillRect(0, y + STOP_H - 3, W, 3);
      if (this.bike) {
        if (this.textures.exists("band_bike")) art(this, W / 2, y, "band_bike").setOrigin(0.5, 0).setDisplaySize(W, STOP_H).setDepth(3);
        for (let xx = 0; xx < W; xx += 26) { g.lineStyle(1, 0xaebcaa, 0.35).lineBetween(xx, y, xx, y + STOP_H); }
        for (let yy = y + 32; yy < y + STOP_H; yy += 32) g.lineStyle(1, 0xaebcaa, 0.35).lineBetween(0, yy, W, yy);
        art(this, 16, y + 78, "tree_0").setDepth(7).setDisplaySize(30, 49);
        g.fillStyle(0x866547).fillRoundedRect(W - 77, y + 120, 47, 8, 3);
        g.fillStyle(0x0b2440).fillRect(W - 70, y + 128, 3, 10).fillRect(W - 40, y + 128, 3, 10);
      }
    }
    // La ruta: banda ancha con esquinas redondeadas y línea discontinua en el centro
    const r = this.add.graphics().setDepth(4);
    const built = this.stopDist[Math.min(this.floorCount, this.stopDist.length - 1)];
    const drawLeg = (a: Pt, b: Pt, done: boolean) => {
      r.lineStyle(ROAD_W + 6, shade(theme.road, -0.3), done ? 1 : 0.35).lineBetween(a.x, a.y, b.x, b.y);
      r.lineStyle(ROAD_W, theme.road, done ? 1 : 0.35).lineBetween(a.x, a.y, b.x, b.y);
    };
    for (let i = 1; i < this.path.length; i++) {
      const a = this.path[i - 1], b = this.path[i];
      drawLeg(a, b, this.lens[i] <= built + 1);
    }
    for (let i = 0; i < this.path.length; i++) {
      const p = this.path[i], done = this.lens[i] <= built + 1;
      r.fillStyle(shade(theme.road, -0.3), done ? 1 : 0.35).fillCircle(p.x, p.y, (ROAD_W + 6) / 2);
      r.fillStyle(theme.road, done ? 1 : 0.35).fillCircle(p.x, p.y, ROAD_W / 2);
    }
    if (this.bike) for (let i = 0; i < this.floorCount; i++) {
      const y = this.crossY(i);
      if (this.textures.exists("route_bike_stop")) art(this, this.mid, y, "route_bike_stop").setDepth(4.1);
      for (let k = 0; k < 4; k++) r.fillStyle(0xfff9e8, 0.9).fillRect(this.left + 25 + k * 7, y - 11, 4, 22);
      r.fillStyle(0x374352).fillCircle(this.right - 25, y, 9);
      r.lineStyle(1, 0xa4acb3).strokeCircle(this.right - 25, y, 7);
      for (let k = -1; k <= 1; k++) r.lineBetween(this.right - 30, y + k * 3, this.right - 20, y + k * 3);
    }
    for (let i = 1; i < this.path.length; i++) {
      if (this.lens[i] > built + 1) continue;
      const a = this.path[i - 1], b = this.path[i], len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 10; d < len - 10; d += 22) {
        const f0 = d / len, f1 = Math.min(1, (d + 10) / len);
        r.lineStyle(3, theme.line, 0.85).lineBetween(a.x + (b.x - a.x) * f0, a.y + (b.y - a.y) * f0, a.x + (b.x - a.x) * f1, a.y + (b.y - a.y) * f1);
      }
    }
  }

  /* ---------- Paradas (puestos) ---------- */

  private drawStop(i: number): void {
    const W = this.W, v = this.view(), y0 = this.bandTop(i), yc = this.crossY(i), mx = this.mid;
    if (i === this.floorCount) {
      // Siguiente parada: en obras, con su precio
      art(this, mx, yc - 46, "ic_construction").setDepth(6).setScale(artScale(this, "ic_construction") * 1.6);
      if (this.bike && this.textures.exists("route_bike_works")) art(this, mx, yc, "route_bike_works").setDepth(6);
      const cost = v.next!.cost;
      this.unlock = new Pill(this, mx, yc - 90, `${t("Abrir")} · ${this.price(cost)}`).setDepth(70);
      this.unlock.setInteractive({ useHandCursor: true });
      this.tap(this.unlock, () => this.bridge.openUnlockFloor(this.bizId));
      label(this, 72, y0 + 22, i === this.floorCount ? v.next!.name : v.stops[i].name, 12, "#2a3442", { bold: true }).setOrigin(0, 0.5).setDepth(12).setAlpha(0.6);
      this.zone(0, y0, W - 90, STOP_H, () => this.bridge.openUnlockFloor(this.bizId));
      return;
    }
    const f = v.stops[i];
    const rank = f.rank;
    const stationKey = screenOf(this.bizId).stationPerStop && this.textures.exists(`st_${this.bizId}_${i}`) ? `st_${this.bizId}_${i}` : this.look.station;
    const station = art(this, mx, yc - ROAD_W / 2 - 2, stationKey).setOrigin(0.5, 1).setDepth(8);
    const ss = Math.min(80 / ART[stationKey].h, 104 / ART[stationKey].w);
    station.setDisplaySize(ART[stationKey].w * ss, ART[stationKey].h * ss);
    if (rank) swapArt(station, rankedKey(this, stationKey, rank));
    if (this.previousFloors && i >= this.previousFloors) constructionPop(this, station, t("¡Puesto nuevo!"));
    const workerKey = this.bike && this.textures.exists(`ch_bike_${i}_0`) ? `ch_bike_${i}_0` : `ch_${this.look.worker}_0`;
    const worker = art(this, mx - 58, yc - ROAD_W / 2 - 2, workerKey).setOrigin(0.5, 1).setDepth(9);
    worker.setDisplaySize(ART[workerKey].w * (this.bike ? 1.04 : 1.15), ART[workerKey].h * (this.bike ? 1.04 : 1.15));
    if (rank) swapArt(worker, rankedKey(this, workerKey, rank));
    // Producto hecho, en el borde de la ruta junto a la parada
    const pile = this.pile(mx + 62, yc - ROAD_W / 2 - 2, 9, 0.85);
    const stock = label(this, mx + 62, yc - 66, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5).setDepth(60);
    this.add.rectangle(mx, yc + ROAD_W / 2 + 10, 80, 6, 0x14202f, 0.5).setDepth(10);
    const bar = this.add.rectangle(mx - 40, yc + ROAD_W / 2 + 10, 0, 6, COLORS.green).setOrigin(0, 0.5).setDepth(11);
    // Encargado y nombre, arriba a la izquierda
    const mg = this.add.graphics();
    mg.fillStyle(0x0b2440, 0.6).fillCircle(0, 1, 15);
    mg.fillStyle(0xffd36b, 1).fillCircle(0, 0, 14);
    const mgIcon = art(this, 0, 0, "ic_manager").setScale(artScale(this, "ic_manager") * 1.3);
    const manager = this.add.container(72, y0 + 22, [mg, mgIcon]).setDepth(12);
    const skill = new SkillChip(this, 72, y0 + 54).setDepth(72);
    this.skillTap(skill, { kind: "floor", index: i });
    label(this, 94, y0 + 22, i === this.floorCount ? v.next!.name : v.stops[i].name, 13, "#2a3442", { bold: true }).setOrigin(0, 0.5).setDepth(12);
    // Botón de nivel, siempre a la derecha
    const button = new LevelButton(this, W - 46, y0 + STOP_H / 2 - 14).setDepth(70).setInteractive({ useHandCursor: true });
    this.tap(button, () => this.bridge.openStation(this.bizId, { kind: "floor", index: i }));
    const badge = rankBadge(this, W - 78, y0 + STOP_H / 2 - 40, rank).setDepth(71);
    const hint = art(this, mx + 30, yc - 70, "ic_hand").setDepth(90).setVisible(false);
    if (!reducedMotion()) this.tweens.add({ targets: hint, y: yc - 62, yoyo: true, repeat: -1, duration: 500 });
    this.zone(mx - 100, y0 + 20, 200, STOP_H - 20, () => this.bridge.tapStation(this.bizId, { kind: "floor", index: i }));
    this.stops[i] = { station, worker, pile, stock, bar, hint, manager, skill, button, badge, level: f.level, rank, lastStock: f.stock, stationKey, workerKey };
  }

  /* ---------- Transporte ---------- */

  private makeMover(): void {
    const mk = this.bike && this.textures.exists("veh_bike_0") ? "veh_bike_0" : isVehicle(this.look.mover) ? this.look.mover : `ch_${this.look.mover}_0`;
    this.mover = art(this, 0, 0, mk).setOrigin(0.5, 0.88).setDepth(40).setInteractive({ useHandCursor: true });
    if (!isVehicle(mk)) this.mover.setDisplaySize(ART[mk].w * 1.1, ART[mk].h * 1.1);
    if (this.ranks.transport && isVehicle(mk)) swapArt(this.mover, rankedKey(this, mk, this.ranks.transport));
    this.moverItem = art(this, 0, 0, this.look.item).setDepth(41).setVisible(false);
    this.moverCarry = label(this, 0, 0, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5).setDepth(61);
    this.moverHint = art(this, 0, 0, "ic_hand").setDepth(90).setVisible(false);
    this.pedalFx = this.add.graphics().setDepth(39);
    this.pedalTip = label(this, 0, 0, t("¡Mantén pulsado para pedalear!"), 12, "#2e2200", { bold: true }).setOrigin(0.5).setBackgroundColor("#ffd36b").setPadding(6, 3, 6, 3).setWordWrapWidth(170).setDepth(91).setVisible(false);
    this.mover.on("pointerdown", () => {
      if (screenOf(this.bizId).mover === "bike" && !this.view().transport.managed) {
        this.pedaling = true;
        this.bridge.pedal(this.bizId);
      }
    });
    this.tap(this.mover, () => this.bridge.tapStation(this.bizId, { kind: "transport" }));
    this.mover.on("pointerdown", () => {
      // Al pedalear, el toque también pone en marcha el reparto (sin esperar a soltar).
      if (this.pedaling && this.view().transport.phase === "idle") this.bridge.tapStation(this.bizId, { kind: "transport" });
    });
  }

  private stopPedal(): void {
    if (!this.pedaling) return;
    this.pedaling = false;
    this.bridge.pedal(null);
  }

  /* ---------- Utilidades ---------- */

  private pile(x: number, y: number, depth: number, scale: number): Phaser.GameObjects.Image[] {
    const spots: [number, number][] = [[0, 0], [16, 4], [-16, 4], [8, -14], [-8, -14], [0, -28]];
    const spec = ART[this.look.item];
    return spots.map(([dx, dy]) => art(this, x + dx * scale, y + dy * scale, this.look.item).setDisplaySize(spec.w * scale, spec.h * scale).setDepth(depth).setVisible(false));
  }

  private makeParticles(): void {
    const cs = artScale(this, "coin");
    const coinRef = artRef(this, "coin");
    this.coins = this.add.particles(0, 0, coinRef.texture, { frame: coinRef.frame, speed: { min: 80, max: 160 }, angle: { min: 225, max: 315 }, gravityY: 400, lifespan: 900, scale: { start: cs, end: cs * 0.7 }, emitting: false }).setDepth(95);
    const ss = artScale(this, "spark");
    this.sparks = this.add.particles(0, 0, "spark", { speed: { min: 40, max: 120 }, lifespan: 600, scale: { start: ss * 0.9, end: 0 }, tint: [0xf5c542, 0xffffff, 0x3ddc97], emitting: false }).setDepth(95);
  }

  /* ---------- Actualización ---------- */

  update(_t: number, dtMs: number): void {
    const s = this.bridge.state();
    if (this.bizId !== FEST_ID && !s.biz[this.bizId]) return;
    const v = businessView(s, this.bizId, clockNow());
    this.currency = v.wallet.currency;
    if (v.stops.length !== this.floorCount) {
      this.scene.restart({ id: this.bizId, scrollY: this.cameras.main.scrollY, previousFloors: this.floorCount });
      return;
    }
    const cam = this.cameras.main, sc = this.scroll;
    const dt = Math.min(dtMs, 100) / 1000;
    if (!sc.down && Math.abs(sc.vel) > 0.2) {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + sc.vel * dt * 60, 0, sc.max);
      sc.vel *= Math.pow(reducedMotion() ? 0.65 : 0.92, dt * 60);
    }
    if (this.bike && this.ambient.length) {
      this.ambient[0].setVisible(v.sale.phase !== "back");
      this.ambient[1].setVisible(v.sale.phase === "back");
      this.ambient[2].setAngle(calmWorld() ? 0 : Math.sin(this.time.now / 700) * 3);
      this.ambient[3].setX(calmWorld() ? -60 : (this.time.now / 36) % (this.W + 120) - 60);
    }
    this.visitor?.update();
    this.twistWorld?.update(s);
    const clk = this.time.now / 1000;
    this.sparkClock += dt;
    const sparkNow = this.sparkClock > 0.45;
    if (sparkNow) this.sparkClock = 0;

    // Paradas
    v.stops.forEach((f, i) => {
      const o = this.stops[i];
      if (!o) return;
      const active = f.working && !calmWorld();
      o.worker.setAngle(active ? Math.sin(clk * 7 + i) * 4 : 0);
      if (!calmWorld()) swapArt(o.worker, rankedKey(this, `${o.workerKey.slice(0, -1)}${active ? (Math.floor(clk * 6 + i) % 2 ? 1 : 2) : 0}`, o.rank));
      if (f.working && sparkNow && !reducedMotion()) this.sparks.emitParticleAt(o.station.x + (Math.random() - 0.5) * 40, o.station.y - 60, 1);
      if (f.stock > o.lastStock) transferProduct(this, this.look.item, { x: o.station.x, y: o.station.y - 50 }, { x: o.pile[0].x, y: o.pile[0].y });
      o.lastStock = f.stock;
      o.pile.forEach((img, k) => img.setVisible(k < f.pile));
      o.stock.setText(f.stock > 0 ? fmt(f.stock) : "");
      o.bar.width = 80 * f.progress;
      o.hint.setVisible(f.hint);
      o.manager.setAlpha(f.managed ? 1 : 0.25);
      o.skill.set(f.skill, clk);
      o.button.set(f.level, f.button === "ready", f.button === "bottleneck").bob(clk);
      if (f.level > o.level) {
        if (!reducedMotion()) this.sparks.explode(14, o.station.x, o.station.y - 50);
        upgradePop(this, o.station);
        o.level = f.level;
        if (f.rank > o.rank) {
          o.rank = f.rank;
          swapArt(o.station, rankedKey(this, o.stationKey, f.rank));
          o.badge.destroy();
          o.badge = rankBadge(this, o.button.x - 32, o.button.y - 26, f.rank).setDepth(71);
          rankBurst(this, o.station.x, o.station.y - 40, f.rank, `${rankInfo(f.rank)!.name}!`);
        }
      }
    });

    // Transporte por la ruta
    const tr = v.transport;
    const p = this.at(this.distOf(tr.pos));
    const moving = tr.phase === "down" || tr.phase === "up";
    const back = tr.phase === "up";
    const dx = back ? -p.dx : p.dx;
    this.mover.setPosition(p.x, p.y + 4);
    if (dx) this.mover.setFlipX(dx < 0);
    if (this.bike && this.textures.exists("veh_bike_0")) {
      const rear = (back ? -p.dy : p.dy) < 0;
      const pose = moving && !calmWorld() ? this.pedaling ? "fast" : Math.floor(clk * 7) % 2 ? "1" : "2" : "0";
      swapArt(this.mover, `veh_bike_${rear ? "rear_" : ""}${pose}`);
      this.mover.setDisplaySize(74, 82);
      if (!dx) this.mover.setFlipX(rear);
    } else if (!isVehicle(this.look.mover)) swapArt(this.mover, rankedKey(this, `ch_${this.look.mover}_${moving && !calmWorld() ? (Math.floor(clk * (this.pedaling ? 16 : 8)) % 2 ? 1 : 2) : 0}`, this.ranks.transport));
    this.moverItem.setVisible(tr.carry > 0).setPosition(p.x + (dx < 0 ? 14 : -14), this.mover.y - this.mover.displayHeight * 0.7);
    this.moverCarry.setText(tr.carry > 0 ? fmt(tr.carry) : "").setPosition(p.x, this.mover.y - this.mover.displayHeight - 10);
    this.moverHint.setVisible(tr.hint);
    this.moverHint.setPosition(p.x + 24, this.mover.y - this.mover.displayHeight - 4 + (reducedMotion() ? 0 : Math.sin(clk * 8) * 4));
    // Pedalear: rastro de velocidad y aviso mientras se aprende
    this.pedalTip.setVisible(screenOf(this.bizId).mover === "bike" && !tr.managed && v.tutorial === "tapTransport").setPosition(Phaser.Math.Clamp(p.x + 40, 95, this.W - 105), this.mover.y - this.mover.displayHeight - 30);
    this.pedalFx.clear();
    if (this.pedaling && moving && !reducedMotion()) {
      const back2 = dx < 0 ? 1 : -1;
      for (let k = 0; k < 2; k++) this.pedalFx.fillStyle(0x6fe3ff, 0.8).fillEllipse(p.x + 24 + k * 5, this.mover.y - 65 - ((clk * 18 + k * 5) % 12), 3, 5);
      for (let k = 0; k < 3; k++) {
        const ly = this.mover.y - 14 - k * 9, lx = p.x + back2 * (18 + ((clk * 120 + k * 13) % 18));
        this.pedalFx.lineStyle(2.5, 0xffffff, 0.8).lineBetween(lx, ly, lx + back2 * 14, ly);
      }
    }
    this.transportButton.set(tr.level, tr.button === "ready", tr.button === "bottleneck").bob(clk);
    this.transportSkill.set(tr.skill, clk);
    if (tr.level > this.levels.transport) {
      this.levels.transport = tr.level;
      if (!reducedMotion()) this.sparks.explode(14, p.x, p.y);
      if (tr.rank > this.ranks.transport) {
        this.ranks.transport = tr.rank;
        if (isVehicle(this.look.mover)) swapArt(this.mover, rankedKey(this, this.look.mover, tr.rank));
        this.transportBadge.destroy();
        this.transportBadge = rankBadge(this, 14, this.ground - 176, tr.rank).setDepth(71);
        rankBurst(this, p.x, p.y, tr.rank, `${rankInfo(tr.rank)!.name}!`);
      }
    }
    if (v.topStock > this.lastTopStock) transferProduct(this, this.look.item, { x: p.x, y: p.y - 20 }, { x: this.topPile[0].x, y: this.topPile[0].y });
    this.lastTopStock = v.topStock;
    this.topPile.forEach((img, k) => img.setVisible(k < v.topPile));
    this.topStock.setText(v.topStock > 0 ? fmt(v.topStock) : "");

    // Venta: de la puerta a la calle (fuera por la derecha) y vuelta
    const sl = v.sale, W = this.W, g0 = this.ground;
    const home = W * 0.74, away = W + 70;
    const prog = sl.phase === "out" ? sl.progress : sl.phase === "back" ? 1 - sl.progress : 0;
    const sx = home + (away - home) * prog;
    const vehicle = isVehicle(this.look.seller);
    this.seller.setPosition(sx, g0 + (vehicle ? 26 : 14)).setFlipX(sl.phase === "back");
    if (!vehicle) swapArt(this.seller, `ch_${this.look.seller}_${sl.phase !== "idle" && !calmWorld() ? (Math.floor(clk * 8) % 2 ? 1 : 2) : 0}`);
    this.sellerItem.setVisible(sl.carry > 0).setPosition(sx, this.seller.y - this.seller.displayHeight * 0.9);
    this.sellerCarry.setText(sl.carry > 0 ? fmt(sl.carry) : "").setPosition(sx, this.seller.y - this.seller.displayHeight - 16).setOrigin(0.5);
    this.sellerHint.setVisible(sl.hint);
    this.sellerHint.setPosition(sx, this.seller.y - this.seller.displayHeight - 20 + (reducedMotion() ? 0 : Math.sin(clk * 8) * 4));
    this.saleButton.set(sl.level, sl.button === "ready", sl.button === "bottleneck").bob(clk);
    this.saleSkill.set(sl.skill, clk);
    if (sl.level > this.levels.sale) {
      this.levels.sale = sl.level;
      if (!reducedMotion()) this.sparks.explode(14, sx, this.seller.y - 20);
      if (sl.rank > this.ranks.sale) {
        this.ranks.sale = sl.rank;
        if (vehicle) swapArt(this.seller, rankedKey(this, this.look.seller, sl.rank));
        this.saleBadge.destroy();
        this.saleBadge = rankBadge(this, W - 78, g0 - 176, sl.rank).setDepth(71);
        rankBurst(this, sx, this.seller.y - 20, sl.rank, `${rankInfo(sl.rank)!.name}!`);
      }
    }

    if (this.unlock && v.next) this.unlock.setText(`${t("Abrir")} · ${this.price(v.next.cost)}`).setAlert(v.next.affordable).setAlpha(v.next.affordable ? 1 : 0.7);

    for (const sale of this.bridge.drainSales(this.bizId)) {
      const x = home, y = g0 - 10;
      rewardCoins(this, x, y, sale.lucky);
      if (sale.lucky) {
        if (!reducedMotion()) { this.coins.explode(12, x, y); this.cameras.main.shake(180, 0.004); }
        floatText(this, x, y - 70, `${t("¡VIRAL!")} +${fmt(sale.amount)}`, "#f5c542");
      } else {
        if (!reducedMotion()) this.coins.explode(4, x, y);
        floatText(this, x, y - 50, `+${fmt(sale.amount)}`);
      }
    }
  }
}

