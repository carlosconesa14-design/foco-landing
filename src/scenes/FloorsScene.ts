import Phaser from "phaser";
import { money, t } from "../i18n";
import { ART, BIZ_ART, art, artScale, buildingKey, rankedKey } from "../art/catalog";
import { artRef, hasGeneratedArt, swapArt } from "../art/generated";
import { mix, shade } from "../art/pen";
import { BUSINESS_DISTRICTS } from "../art/businessWorld";
import { CHAIN, TUTORIAL } from "../game/data";
import { bizDef, bizList, chainRates, floorUnlockCost, managerCost, upgradeQuote, type Station } from "../game/economy";
import { fmt } from "../game/format";
import { rankInfo, rankOf } from "../game/ranks";
import type { BusinessState } from "../game/state";
import { TWIST_WORLD_ART } from "../game/twists";
import type { OfferKind } from "../game/offers";
import { COLORS, DPR, Pill, bridgeOf, calmWorld, floatText, label, reducedMotion, rewardCoins, setupCamera, type Bridge } from "./common";
import { constructionPop, revealScene, transferProduct, upgradePop } from "./feedback";
import { rankBadge, rankBurst } from "./rankFx";
import { TwistWorld } from "./TwistWorld";
import { WorldVisitor } from "./WorldVisitor";

/**
 * Pantalla de un negocio «por plantas», al estilo de Idle Miner: arriba la sede y la calle (venta),
 * a la izquierda el montacargas (transporte) y debajo una planta por puesto. Solo se desplaza en
 * vertical y cada planta enseña lo mismo y en el mismo sitio: encargado, producto, puesto y nivel.
 */

const SHAFT_W = 66;
const FLOOR_H = 150;
const SURFACE_H = 250;

/** Colores de pared y suelo de las plantas de cada negocio. */
const THEME: Record<string, { wall: number; floor: number; accent: number }> = {
  dropship: { wall: 0xd9dde2, floor: 0x8e9aa6, accent: 0xf1c40f },
  restaurant: { wall: 0xf3dcc0, floor: 0xb5654f, accent: 0xc0392b },
  tiktok: { wall: 0xe2d9f5, floor: 0x6c5ce7, accent: 0xff6fb5 },
  ai: { wall: 0xd6ebe8, floor: 0x2c3e50, accent: 0x1abc9c },
  foodtruck: { wall: 0xf8e8bf, floor: 0xd17a3a, accent: 0xff9f43 },
  beachclub: { wall: 0xfaeccb, floor: 0x0abde3, accent: 0x48dbfb },
  yachts: { wall: 0xdcecf5, floor: 0x1e3799, accent: 0x48dbfb },
  realestate: { wall: 0xeee9dc, floor: 0x8395a7, accent: 0xfeca57 },
  crypto: { wall: 0xdcd6f0, floor: 0x341f97, accent: 0xff9f1a },
  supercars: { wall: 0xe4e6ea, floor: 0x2f3640, accent: 0xe84118 },
  hotel: { wall: 0xf5eddb, floor: 0x8c6d2e, accent: 0xc8a24a },
  safari: { wall: 0xefd6a8, floor: 0xb7793d, accent: 0x8c5a2b },
  souk: { wall: 0xf4e5c3, floor: 0x7d5a14, accent: 0xf6c344 },
  tower: { wall: 0xdfe8ee, floor: 0x34495e, accent: 0x9fd3e6 },
};

const isVehicle = (key: string) => key.startsWith("car_") || key.startsWith("veh_");
const VEHICLE_FALLBACK: Record<string, string> = { veh_forklift: "car_3", veh_van: "car_2" };

/** Botón grande de nivel (como el «Nivel 210» de Idle Miner): se ilumina si hay dinero para mejorar. */
class LevelButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private value: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private look = "";
  private bw: number;
  private bh: number;
  constructor(scene: Phaser.Scene, x: number, y: number, w = 70, h = 56) {
    super(scene, x, y);
    this.bw = w;
    this.bh = h;
    this.bg = scene.add.graphics();
    this.title = label(scene, 0, -12, t("Nivel"), 13, "#ffffff", { bold: true }).setOrigin(0.5);
    this.value = label(scene, 0, 8, "1", 20, "#ffffff", { display: true, stroke: "#0b2440" }).setOrigin(0.5);
    this.arrow = label(scene, 0, -h / 2 - 10, "▲", 18, "#3ddc97", { bold: true, stroke: "#0b2440" }).setOrigin(0.5);
    this.add([this.bg, this.title, this.value, this.arrow]);
    this.setSize(w + 16, h + 20);
    scene.add.existing(this);
    this.paint(false, false);
  }
  set(level: number, ready: boolean, warn: boolean): this {
    if (this.value.text !== String(level)) this.value.setText(String(level));
    this.paint(ready, warn);
    return this;
  }
  bob(clk: number): void {
    this.arrow.setY(-this.bh / 2 - 10 - (this.arrow.visible && !reducedMotion() ? Math.abs(Math.sin(clk * 4)) * 4 : 0));
  }
  private paint(ready: boolean, warn: boolean): void {
    const key = `${ready}${warn}`;
    if (key === this.look) return;
    this.look = key;
    const w = this.bw, h = this.bh;
    const fill = warn ? 0xe08a2e : ready ? 0x2f80d1 : 0x55708c;
    this.bg.clear();
    this.bg.fillStyle(0x0b2440, 0.55).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 12);
    this.bg.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.bg.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.38, 9);
    this.bg.lineStyle(2, 0x0b2440, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.arrow.setVisible(ready);
  }
}

interface FloorView {
  y: number;
  station: Phaser.GameObjects.Image;
  worker: Phaser.GameObjects.Image;
  pile: Phaser.GameObjects.Image[];
  stock: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Rectangle;
  hint: Phaser.GameObjects.Image;
  manager: Phaser.GameObjects.Container;
  button: LevelButton;
  badge: Phaser.GameObjects.Container;
  level: number;
  rank: number;
  lastStock: number;
  stationKey: string;
  workerKey: string;
}

export class FloorsScene extends Phaser.Scene {
  private bridge!: Bridge;
  private bizId = "";
  private startY = -1;
  private previousFloors = 0;
  private W = 390;
  private ground = 0;
  private floorsTop = 0;
  private floorCount = 0;
  private floors: FloorView[] = [];
  private cabin!: Phaser.GameObjects.Container;
  private cabinItem!: Phaser.GameObjects.Image;
  private cabinCarry!: Phaser.GameObjects.Text;
  private cabinHint!: Phaser.GameObjects.Image;
  private shaftButton!: LevelButton;
  private shaftBadge!: Phaser.GameObjects.Container;
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
  /** Desplazamiento vertical con el dedo (con inercia) y si el gesto fue un arrastre. */
  private scroll = { down: false, dragging: false, onMap: false, y0: 0, s0: 0, last: 0, vel: 0, max: 0 };

  private static remembered = new Map<string, number>();

  constructor() {
    super("floors");
  }

  init(data: { id: string; scrollY?: number; previousFloors?: number }): void {
    this.bizId = data.id;
    this.startY = data.scrollY ?? -1;
    this.previousFloors = data.previousFloors ?? 0;
    this.floors = [];
    this.topPile = [];
    this.unlock = null;
    this.visitor = null;
    this.twistWorld = null;
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
    return { ...look, mover: pick(look.mover), seller: pick(look.seller) };
  }

  private biz(): BusinessState {
    return this.bridge.state().biz[this.bizId];
  }

  private theme() {
    return THEME[this.bizId] ?? THEME.dropship;
  }

  private floorY(i: number): number {
    return this.floorsTop + i * FLOOR_H;
  }

  /** Altura del montacargas para una posición del transporte (0 = arriba, k = planta k-1). */
  private cabinY(pos: number): number {
    const stop = (k: number) => (k <= 0 ? this.ground - 30 : this.floorY(k - 1) + FLOOR_H * 0.62);
    const k = Math.floor(pos), f = pos - k;
    return stop(k) + (stop(k + 1) - stop(k)) * f;
  }

  create(): void {
    this.bridge = bridgeOf(this);
    setupCamera(this);
    const insets = this.bridge.insets();
    const b = this.biz();
    this.W = this.scale.width / DPR;
    this.floorCount = b.floors.length;
    this.lastTopStock = b.topStock;
    this.levels = { transport: b.transport.level, sale: b.sale.level };
    this.ranks = { transport: rankOf(b.transport.level), sale: rankOf(b.sale.level) };
    this.ground = insets.top + 70 + SURFACE_H;
    this.floorsTop = this.ground + 34;

    this.drawSurface();
    this.drawShaft();
    for (let i = 0; i < CHAIN.maxFloors; i++) this.drawFloor(i);
    this.makeParticles();

    // Hasta dónde se puede bajar: la planta en obras (o la última) y un poco de aire para la barra.
    const shown = Math.min(CHAIN.maxFloors, this.floorCount + 1);
    const worldH = this.floorY(shown) + 150;
    const viewH = this.scale.height / DPR;
    this.scroll.max = Math.max(0, worldH - viewH + insets.bottom + 30);
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x2a2f3a);
    const remembered = FloorsScene.remembered.get(this.bizId);
    cam.scrollY = Phaser.Math.Clamp(this.startY >= 0 ? this.startY : remembered ?? 0, 0, this.scroll.max);
    this.setupScroll();
    this.events.once("shutdown", () => FloorsScene.remembered.set(this.bizId, cam.scrollY));

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
      if (!sc.down) return;
      if (Math.abs(p.y - sc.y0) > 8 * DPR) sc.dragging = true;
      if (!sc.dragging) return;
      cam.scrollY = Phaser.Math.Clamp(sc.s0 - (p.y - sc.y0) / cam.zoom, 0, sc.max);
      sc.vel = (sc.last - p.y) / cam.zoom;
      sc.last = p.y;
    });
    input.on("pointerup", () => { sc.down = false; sc.onMap = false; });
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
    const W = this.W, g0 = this.ground, theme = this.theme();
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x7cc6f0, 0x7cc6f0, 0xcfeefc, 0xcfeefc, 1).fillRect(0, 0, W, g0);
    // El barrio detrás de la sede, apagado: decorado, no negocio.
    const district = `district_${BUSINESS_DISTRICTS[this.bizId] ?? this.bridge.state().city}`;
    for (const [fx, flip] of [[0.18, false], [0.86, true]] as [number, boolean][]) {
      const d = art(this, W * fx, g0 + 6, district).setOrigin(0.5, 1).setDepth(1).setFlipX(flip).setAlpha(0.55);
      d.setTint(mix(0xffffff, 0x9fc4dc, 0.45));
    }
    // Acera y calle
    const street = this.add.graphics().setDepth(2);
    street.fillStyle(0xc9cdd6, 1).fillRect(0, g0 - 6, W, 10);
    street.fillStyle(0x4a5160, 1).fillRect(0, g0 + 4, W, 30);
    for (let x = 10; x < W; x += 34) street.fillStyle(0xf5f5f5, 0.8).fillRect(x, g0 + 18, 16, 3);
    // Sede: el elemento más grande de la pantalla
    const key = buildingKey(this.bizId, this.biz().floors.length);
    const spec = ART[key];
    const maxW = W - SHAFT_W - 120, maxH = SURFACE_H - 30;
    const s = Math.min(maxW / spec.w, maxH / spec.h, 1.6);
    const hub = art(this, SHAFT_W + 18 + (W - SHAFT_W - 120) / 2 + 10, g0 + 2, key).setOrigin(0.5, hasGeneratedArt(this, key) ? 1 : (spec.h - 6) / spec.h).setDepth(5);
    hub.setDisplaySize(spec.w * s, spec.h * s);
    if (this.previousFloors && buildingKey(this.bizId, this.previousFloors) !== key) constructionPop(this, hub, t("¡Nueva sede!"));
    this.zone(hub.x - hub.displayWidth / 2, hub.y - hub.displayHeight, hub.displayWidth, hub.displayHeight, () => this.bridge.tapStation(this.bizId, { kind: "sale" }));
    // Producto listo para vender, en la puerta (al salir del montacargas)
    const px = SHAFT_W + 34;
    this.topPile = this.pile(px, g0 - 2, 6, 0.9);
    this.topStock = label(this, px, g0 - 46, "", 13, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(60);
    // Venta: vehículo o repartidor en la calle; nivel arriba a la derecha
    this.seller = art(this, 0, 0, isVehicle(this.look.seller) ? this.look.seller : `ch_${this.look.seller}_0`).setOrigin(0.5, 0.9).setDepth(30).setInteractive({ useHandCursor: true });
    if (!isVehicle(this.look.seller)) this.seller.setDisplaySize(ART[`ch_${this.look.seller}_0`].w * 1.1, ART[`ch_${this.look.seller}_0`].h * 1.1);
    if (this.ranks.sale && isVehicle(this.look.seller)) swapArt(this.seller, rankedKey(this, this.look.seller, this.ranks.sale));
    this.tap(this.seller, () => this.bridge.tapStation(this.bizId, { kind: "sale" }));
    this.sellerItem = art(this, 0, 0, this.look.item).setDepth(31).setVisible(false);
    this.sellerCarry = label(this, 0, 0, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setDepth(61);
    this.sellerHint = art(this, 0, 0, "ic_hand").setDepth(90).setVisible(false);
    this.saleButton = new LevelButton(this, W - 46, g0 - 150).setDepth(70).setInteractive({ useHandCursor: true });
    this.tap(this.saleButton, () => this.bridge.openStation(this.bizId, { kind: "sale" }));
    label(this, W - 46, g0 - 112, bizDef(this.bizId).saleName, 11, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5, 0).setDepth(70);
    this.saleBadge = rankBadge(this, W - 78, g0 - 176, this.ranks.sale).setDepth(71);
    this.zone(W * 0.55, g0 - 20, W * 0.45, 56, () => this.bridge.tapStation(this.bizId, { kind: "sale" }));
    // Tejado del edificio de plantas: separa la calle del interior
    const roof = this.add.graphics().setDepth(3);
    roof.fillStyle(shade(theme.floor, -0.35), 1).fillRect(0, g0 + 34 - 8, W, 8);
  }

  /* ---------- Montacargas (transporte) ---------- */

  private drawShaft(): void {
    const g0 = this.ground, theme = this.theme();
    const shown = Math.min(CHAIN.maxFloors, this.floorCount + 1);
    const bottom = this.floorY(shown);
    const shaft = this.add.graphics().setDepth(10);
    shaft.fillStyle(COLORS.shaft, 1).fillRect(6, g0 - 70, SHAFT_W, bottom - g0 + 70);
    shaft.fillStyle(0x1f242e, 1).fillRect(6 + SHAFT_W / 2 - 14, g0 - 70, 28, bottom - g0 + 70);
    shaft.lineStyle(2, COLORS.cable, 0.8).lineBetween(6 + SHAFT_W / 2, g0 - 70, 6 + SHAFT_W / 2, bottom);
    // Cabecera del montacargas, con su nivel
    shaft.fillStyle(shade(theme.accent, -0.2), 1).fillRoundedRect(2, g0 - 92, SHAFT_W + 8, 26, 6);
    this.shaftButton = new LevelButton(this, 6 + SHAFT_W / 2, g0 - 140, 62, 52).setDepth(70).setInteractive({ useHandCursor: true });
    this.tap(this.shaftButton, () => this.bridge.openStation(this.bizId, { kind: "transport" }));
    this.shaftBadge = rankBadge(this, SHAFT_W - 2, g0 - 166, this.ranks.transport).setDepth(71);
    label(this, 6 + SHAFT_W / 2, g0 - 79, bizDef(this.bizId).transportName, 10, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5).setDepth(12);
    // Cabina
    const cg = this.add.graphics();
    cg.fillStyle(0x0b2440, 0.5).fillRoundedRect(-SHAFT_W / 2 + 2, -26, SHAFT_W - 4, 52, 8);
    cg.fillStyle(theme.accent, 1).fillRoundedRect(-SHAFT_W / 2 + 2, -28, SHAFT_W - 4, 50, 8);
    cg.fillStyle(0xfdf6e3, 1).fillRoundedRect(-SHAFT_W / 2 + 8, -22, SHAFT_W - 16, 34, 5);
    cg.lineStyle(2, 0x0b2440, 0.9).strokeRoundedRect(-SHAFT_W / 2 + 2, -28, SHAFT_W - 4, 50, 8);
    const mk = isVehicle(this.look.mover) ? this.look.mover : `ch_${this.look.mover}_0`;
    const moverArt = art(this, 0, 10, mk).setOrigin(0.5, 1);
    const ms = Math.min((SHAFT_W - 18) / ART[mk].w, 32 / ART[mk].h);
    moverArt.setDisplaySize(ART[mk].w * ms, ART[mk].h * ms);
    if (this.ranks.transport && isVehicle(mk)) swapArt(moverArt, rankedKey(this, mk, this.ranks.transport));
    this.cabinItem = art(this, 14, -14, this.look.item).setVisible(false).setScale(artScale(this, this.look.item) * 0.7);
    this.cabinCarry = label(this, 0, 30, "", 11, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5, 0);
    this.cabin = this.add.container(6 + SHAFT_W / 2, this.cabinY(0), [cg, moverArt, this.cabinItem, this.cabinCarry]).setDepth(20);
    this.cabin.setSize(SHAFT_W, 60).setInteractive({ useHandCursor: true });
    this.tap(this.cabin, () => this.bridge.tapStation(this.bizId, { kind: "transport" }));
    this.cabinHint = art(this, 0, 0, "ic_hand").setDepth(90).setVisible(false);
    this.zone(6, g0 - 66, SHAFT_W, bottom - g0 + 66, () => this.bridge.tapStation(this.bizId, { kind: "transport" })).setDepth(9);
  }

  /* ---------- Plantas (puestos) ---------- */

  private drawFloor(i: number): void {
    const W = this.W, y = this.floorY(i), theme = this.theme(), def = bizDef(this.bizId);
    const left = SHAFT_W + 12, right = W - 6, h = FLOOR_H;
    const g = this.add.graphics().setDepth(4);
    if (i > this.floorCount) return;
    if (i === this.floorCount) {
      // Siguiente planta: en obras, con su precio
      g.fillStyle(0x3a3f4b, 1).fillRect(left, y, right - left, h - 10);
      g.lineStyle(3, COLORS.gold, 0.9);
      for (let x = left + 10; x < right - 10; x += 26) g.lineBetween(x, y + 8, x + 14, y + 8);
      art(this, (left + right) / 2, y + h / 2 - 22, "ic_construction").setDepth(6).setScale(artScale(this, "ic_construction") * 1.6);
      const cost = floorUnlockCost(def, i);
      this.unlock = new Pill(this, (left + right) / 2, y + h / 2 + 22, `${t("Abrir")} · ${money(cost)}`).setDepth(70);
      this.unlock.setInteractive({ useHandCursor: true });
      this.tap(this.unlock, () => this.bridge.openUnlockFloor(this.bizId));
      this.zone(left, y, right - left, h - 10, () => this.bridge.openUnlockFloor(this.bizId));
      return;
    }
    // Pared, suelo y forjado
    g.fillStyle((i % 2 ? shade(theme.wall, -0.04) : theme.wall), 1).fillRect(left, y, right - left, h - 10);
    g.fillStyle(mix(theme.wall, 0xffffff, 0.35), 1).fillRect(left, y, right - left, 6);
    g.fillStyle(theme.floor, 1).fillRect(left, y + h - 34, right - left, 24);
    g.fillStyle(shade(theme.floor, -0.25), 1).fillRect(left, y + h - 10, right - left, 10);
    g.fillStyle(shade(theme.floor, -0.45), 1).fillRect(left, y + h - 10, right - left, 3);
    // Ventana del montacargas hacia la planta
    g.fillStyle(0x1f242e, 1).fillRect(SHAFT_W + 6, y + h * 0.62 - 26, 6, 52);

    const f = this.biz().floors[i];
    const rank = rankOf(f.level);
    const sx = left + (right - left) * 0.5;
    const stationKey = this.look.station;
    const station = art(this, sx, y + h - 22, stationKey).setOrigin(0.5, 1).setDepth(8);
    const ss = Math.min(110 / ART[stationKey].h, 120 / ART[stationKey].w);
    station.setDisplaySize(ART[stationKey].w * ss, ART[stationKey].h * ss);
    if (rank) swapArt(station, rankedKey(this, stationKey, rank));
    if (this.previousFloors && i >= this.previousFloors) constructionPop(this, station, t("¡Puesto nuevo!"));
    const workerKey = `ch_${this.look.worker}_0`;
    const worker = art(this, sx - 62, y + h - 18, workerKey).setOrigin(0.5, 1).setDepth(9);
    worker.setDisplaySize(ART[workerKey].w * 1.25, ART[workerKey].h * 1.25);
    if (rank) swapArt(worker, rankedKey(this, workerKey, rank));
    // Producto hecho, junto al montacargas
    const pile = this.pile(left + 26, y + h - 26, 8, 0.95);
    const stock = label(this, left + 26, y + h - 84, "", 12, "#ffffff", { bold: true, stroke: "#14202f" }).setOrigin(0.5).setDepth(60);
    // Barra de producción bajo el puesto
    this.add.rectangle(sx, y + h - 14, 80, 6, 0x14202f, 0.55).setDepth(10);
    const bar = this.add.rectangle(sx - 40, y + h - 14, 0, 6, COLORS.green).setOrigin(0, 0.5).setDepth(11);
    // Encargado (gerente), arriba a la izquierda
    const mg = this.add.graphics();
    mg.fillStyle(0x0b2440, 0.6).fillCircle(0, 1, 15);
    mg.fillStyle(0xffd36b, 1).fillCircle(0, 0, 14);
    const mgIcon = art(this, 0, 0, "ic_manager").setScale(artScale(this, "ic_manager") * 1.3);
    const manager = this.add.container(left + 22, y + 24, [mg, mgIcon]).setDepth(12);
    // Nombre de la planta, discreto
    label(this, left + 44, y + 16, `${def.floorName} ${i + 1}`, 11, "#2a3442", { bold: true }).setOrigin(0, 0.5).setDepth(12).setAlpha(0.75);
    // Botón de nivel a la derecha
    const button = new LevelButton(this, right - 44, y + h / 2 - 12).setDepth(70).setInteractive({ useHandCursor: true });
    this.tap(button, () => this.bridge.openStation(this.bizId, { kind: "floor", index: i }));
    const badge = rankBadge(this, right - 76, y + h / 2 - 38, rank).setDepth(71);
    const hint = art(this, sx, y + 26, "ic_hand").setDepth(90).setVisible(false);
    if (!reducedMotion()) this.tweens.add({ targets: hint, y: y + 34, yoyo: true, repeat: -1, duration: 500 });
    // Toda la planta es zona de toque (menos el botón): pone el puesto en marcha
    this.zone(left, y, right - left - 90, h - 10, () => this.bridge.tapStation(this.bizId, { kind: "floor", index: i }));
    this.floors[i] = { y, station, worker, pile, stock, bar, hint, manager, button, badge, level: f.level, rank, lastStock: f.stock, stationKey, workerKey };
  }

  /* ---------- Utilidades ---------- */

  private pile(x: number, y: number, depth: number, scale: number): Phaser.GameObjects.Image[] {
    const spots: [number, number][] = [[0, 0], [16, 4], [-16, 4], [8, -14], [-8, -14], [0, -28]];
    const spec = ART[this.look.item];
    return spots.map(([dx, dy]) => art(this, x + dx * scale, y + dy * scale, this.look.item).setDisplaySize(spec.w * scale, spec.h * scale).setDepth(depth).setVisible(false));
  }

  private showPile(pile: Phaser.GameObjects.Image[], amount: number, unit: number): void {
    const n = amount <= 0 ? 0 : Math.min(pile.length, 1 + Math.floor(Math.log2(1 + amount / Math.max(unit, 1e-9))));
    pile.forEach((img, i) => img.setVisible(i < n));
  }

  private makeParticles(): void {
    const cs = artScale(this, "coin");
    const coinRef = artRef(this, "coin");
    this.coins = this.add.particles(0, 0, coinRef.texture, { frame: coinRef.frame, speed: { min: 80, max: 160 }, angle: { min: 225, max: 315 }, gravityY: 400, lifespan: 900, scale: { start: cs, end: cs * 0.7 }, emitting: false }).setDepth(95);
    const ss = artScale(this, "spark");
    this.sparks = this.add.particles(0, 0, "spark", { speed: { min: 40, max: 120 }, lifespan: 600, scale: { start: ss * 0.9, end: 0 }, tint: [0xf5c542, 0xffffff, 0x3ddc97], emitting: false }).setDepth(95);
  }

  private readyFor(st: Station, managed: boolean): boolean {
    const s = this.bridge.state();
    const def = bizDef(this.bizId);
    return s.cash >= upgradeQuote(s, this.bizId, st).cost || (!managed && s.cash >= managerCost(def, st));
  }

  /* ---------- Actualización ---------- */

  update(_t: number, dtMs: number): void {
    const s = this.bridge.state();
    const b = this.biz();
    if (!b) return;
    if (b.floors.length !== this.floorCount) {
      this.scene.restart({ id: this.bizId, scrollY: this.cameras.main.scrollY, previousFloors: this.floorCount });
      return;
    }
    const cam = this.cameras.main, sc = this.scroll;
    const dt = Math.min(dtMs, 100) / 1000;
    if (!sc.down && Math.abs(sc.vel) > 0.2) {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + sc.vel * dt * 60, 0, sc.max);
      sc.vel *= Math.pow(reducedMotion() ? 0.65 : 0.92, dt * 60);
    }
    this.visitor?.update();
    this.twistWorld?.update(s);
    const def = bizDef(this.bizId);
    const clk = this.time.now / 1000;
    const unit = CHAIN.floorCycle * def.mult;
    const tutorial = s.totalEarned < 30;
    const tutStat = s.meta.tutorial < TUTORIAL.length && this.bizId === bizList(s)[0].id ? TUTORIAL[s.meta.tutorial].stat : null;
    const rates = chainRates(def, b, false);
    const auto = b.transport.managed || b.sale.managed || b.floors.some((f) => f.managed);
    this.sparkClock += dt;
    const sparkNow = this.sparkClock > 0.45;
    if (sparkNow) this.sparkClock = 0;

    // Plantas
    b.floors.forEach((f, i) => {
      const v = this.floors[i];
      if (!v) return;
      const active = f.running && !calmWorld();
      v.worker.setAngle(active ? Math.sin(clk * 7 + i) * 4 : 0);
      if (!calmWorld()) swapArt(v.worker, rankedKey(this, `ch_${this.look.worker}_${active ? (Math.floor(clk * 6 + i) % 2 ? 1 : 2) : 0}`, v.rank));
      if (f.running && sparkNow && !reducedMotion()) this.sparks.emitParticleAt(v.station.x + (Math.random() - 0.5) * 40, v.station.y - 60, 1);
      if (f.stock > v.lastStock) transferProduct(this, this.look.item, { x: v.station.x, y: v.station.y - 50 }, { x: v.pile[0].x, y: v.pile[0].y });
      v.lastStock = f.stock;
      this.showPile(v.pile, f.stock, unit);
      v.stock.setText(f.stock > 0 ? fmt(f.stock) : "");
      v.bar.width = 80 * (f.running ? f.prog / CHAIN.floorCycle : 0);
      v.hint.setVisible(tutStat ? tutStat === "tapFloor" && !f.running : tutorial && !f.managed && !f.running);
      v.manager.setAlpha(f.managed ? 1 : 0.25);
      v.button.set(f.level, this.readyFor({ kind: "floor", index: i }, f.managed), auto && rates.bottleneck === "production").bob(clk);
      if (f.level > v.level) {
        if (!reducedMotion()) this.sparks.explode(14, v.station.x, v.station.y - 50);
        upgradePop(this, v.station);
        v.level = f.level;
        const rank = rankOf(f.level);
        if (rank > v.rank) {
          v.rank = rank;
          swapArt(v.station, rankedKey(this, v.stationKey, rank));
          v.badge.destroy();
          v.badge = rankBadge(this, v.button.x - 32, v.button.y - 26, rank).setDepth(71);
          rankBurst(this, v.station.x, v.station.y - 40, rank, `${rankInfo(rank)!.name}!`);
        }
      }
    });

    // Montacargas
    const tr = b.transport;
    const cy = this.cabinY(tr.pos);
    this.cabin.setY(cy);
    this.cabinItem.setVisible(tr.carry > 0);
    this.cabinCarry.setText(tr.carry > 0 ? fmt(tr.carry) : "");
    const moverStep = tutStat === "tapTransport";
    this.cabinHint.setVisible((tutStat ? moverStep : tutorial && b.floors.some((f) => f.stock > 0)) && tr.phase === "idle" && !tr.managed);
    this.cabinHint.setPosition(6 + SHAFT_W / 2 + 26, cy - 34 + (reducedMotion() ? 0 : Math.sin(clk * 8) * 4));
    this.shaftButton.set(tr.level, this.readyFor({ kind: "transport" }, tr.managed), auto && rates.bottleneck === "transport").bob(clk);
    if (tr.level > this.levels.transport) {
      this.levels.transport = tr.level;
      if (!reducedMotion()) this.sparks.explode(14, this.cabin.x, cy);
      const rank = rankOf(tr.level);
      if (rank > this.ranks.transport) {
        this.ranks.transport = rank;
        this.shaftBadge.destroy();
        this.shaftBadge = rankBadge(this, SHAFT_W - 2, this.ground - 166, rank).setDepth(71);
        rankBurst(this, this.cabin.x, cy, rank, `${rankInfo(rank)!.name}!`);
      }
    }
    if (b.topStock > this.lastTopStock) transferProduct(this, this.look.item, { x: this.cabin.x, y: cy }, { x: this.topPile[0].x, y: this.topPile[0].y });
    this.lastTopStock = b.topStock;
    this.showPile(this.topPile, b.topStock, unit);
    this.topStock.setText(b.topStock > 0 ? fmt(b.topStock) : "");

    // Venta: de la puerta a la calle (fuera por la derecha) y vuelta
    const sl = b.sale, W = this.W, g0 = this.ground;
    const home = W * 0.74, away = W + 70;
    const prog = sl.phase === "out" ? sl.prog : sl.phase === "back" ? 1 - sl.prog : 0;
    const sx = home + (away - home) * prog;
    const vehicle = isVehicle(this.look.seller);
    this.seller.setPosition(sx, g0 + (vehicle ? 26 : 14)).setFlipX(sl.phase === "back");
    if (!vehicle) swapArt(this.seller, `ch_${this.look.seller}_${sl.phase !== "idle" && !calmWorld() ? (Math.floor(clk * 8) % 2 ? 1 : 2) : 0}`);
    this.sellerItem.setVisible(sl.carry > 0).setPosition(sx, this.seller.y - this.seller.displayHeight * 0.9);
    this.sellerCarry.setText(sl.carry > 0 ? fmt(sl.carry) : "").setPosition(sx, this.seller.y - this.seller.displayHeight - 16).setOrigin(0.5);
    const sellerStep = tutStat === "sales";
    this.sellerHint.setVisible((tutStat ? sellerStep : tutorial && b.topStock > 0) && sl.phase === "idle" && !sl.managed);
    this.sellerHint.setPosition(sx, this.seller.y - this.seller.displayHeight - 20 + (reducedMotion() ? 0 : Math.sin(clk * 8) * 4));
    this.saleButton.set(sl.level, this.readyFor({ kind: "sale" }, sl.managed), auto && rates.bottleneck === "sale").bob(clk);
    if (sl.level > this.levels.sale) {
      this.levels.sale = sl.level;
      if (!reducedMotion()) this.sparks.explode(14, sx, this.seller.y - 20);
      const rank = rankOf(sl.level);
      if (rank > this.ranks.sale) {
        this.ranks.sale = rank;
        if (vehicle) swapArt(this.seller, rankedKey(this, this.look.seller, rank));
        this.saleBadge.destroy();
        this.saleBadge = rankBadge(this, W - 78, g0 - 176, rank).setDepth(71);
        rankBurst(this, sx, this.seller.y - 20, rank, `${rankInfo(rank)!.name}!`);
      }
    }

    if (this.unlock) {
      const cost = floorUnlockCost(def, b.floors.length);
      this.unlock.setText(`${t("Abrir")} · ${money(cost)}`).setAlert(s.cash >= cost).setAlpha(s.cash >= cost ? 1 : 0.7);
    }

    for (const sale of this.bridge.drainSales(this.bizId)) {
      const x = home, y = g0 - 10;
      rewardCoins(this, x, y, sale.lucky);
      if (sale.lucky) {
        if (!reducedMotion()) { this.coins.explode(12, x, y); this.cameras.main.shake(180, 0.004); }
        floatText(this, x, y - 70, `🔥 ${t("¡VIRAL!")} +${fmt(sale.amount)}`, "#f5c542");
      } else {
        if (!reducedMotion()) this.coins.explode(4, x, y);
        floatText(this, x, y - 50, `+${fmt(sale.amount)}`);
      }
    }
  }
}

/** Negocios que ya usan la vista por plantas (prototipo: el almacén). */
export const FLOOR_VIEW = new Set(["dropship"]);
