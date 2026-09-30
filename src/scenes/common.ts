import Phaser from "phaser";
import type { Station } from "../game/economy";
import type { GameState } from "../game/state";

/**
 * Las escenas trabajan en píxeles CSS. El canvas se crea a resolución física (DPR)
 * y la cámara hace zoom, así el texto y los gráficos se ven nítidos en el móvil.
 */
export const DPR = Math.min(window.devicePixelRatio || 1, 3);
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export const UI_FONT = '"Rubik",system-ui,-apple-system,"Segoe UI",sans-serif';
export const DISPLAY_FONT = '"Lilita One","Arial Rounded MT Bold","Trebuchet MS",sans-serif';

export const COLORS = {
  sky: 0x8fd3ff,
  grass: 0x7cc96b,
  grassDark: 0x5fae52,
  road: 0x4a5160,
  roadLine: 0xf5f5f5,
  sidewalk: 0xc9cdd6,
  earth: 0x5b3b2a,
  earthDark: 0x3f2819,
  room: 0xf3e6cf,
  roomLine: 0xd9c5a3,
  shaft: 0x2d333f,
  cable: 0x9aa3b5,
  cabin: 0xf5c542,
  ink: 0x14202f,
  gold: 0xf5c542,
  green: 0x3ddc97,
  red: 0xff6b5b,
  white: 0xffffff,
} as const;

/** Lo que las escenas necesitan del resto del juego. */
export interface Bridge {
  state(): GameState;
  /** Toque sobre una parte de la cadena: la pone en marcha. */
  tapStation(bizId: string, st: Station): void;
  /** Botón de nivel de una parte: abre el panel de mejora. */
  openStation(bizId: string, st: Station): void;
  openUnlockFloor(bizId: string): void;
  /** Toque sobre una parcela de la ciudad. */
  tapPlot(bizId: string): void;
  /** Ventas pendientes de mostrar, se vacía al leerla. */
  drainSales(bizId: string | null): { biz: string; amount: number; lucky?: boolean }[];
  /** Altura ocupada por la interfaz HTML arriba y abajo. */
  insets(): { top: number; bottom: number };
}

export const bridgeOf = (scene: Phaser.Scene) => scene.registry.get("bridge") as Bridge;

export function setupCamera(scene: Phaser.Scene): { w: number; h: number } {
  const cam = scene.cameras.main;
  cam.setZoom(DPR);
  cam.setOrigin(0, 0);
  return { w: scene.scale.width / DPR, h: scene.scale.height / DPR };
}

export function emoji(scene: Phaser.Scene, x: number, y: number, ch: string, size: number): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, ch, { fontFamily: EMOJI_FONT, fontSize: `${size}px`, resolution: DPR, padding: { top: 4, bottom: 4 } })
    .setOrigin(0.5);
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color = "#14202f",
  opts: { bold?: boolean; display?: boolean; stroke?: string } = {},
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: opts.display ? DISPLAY_FONT : UI_FONT,
      fontSize: `${size}px`,
      fontStyle: opts.bold ? "bold" : "normal",
      color,
      resolution: DPR,
    })
    .setOrigin(0.5);
  if (opts.stroke) t.setStroke(opts.stroke, Math.max(3, size / 5));
  return t;
}

/** Botón redondeado dibujado en Phaser (nivel de una parte, desbloquear planta…). */
export class Pill extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private dot: Phaser.GameObjects.Arc;
  private wBox = 0;

  private baseFill: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, private fill: number = COLORS.gold) {
    super(scene, x, y);
    this.baseFill = fill;
    this.bg = scene.add.graphics();
    this.txt = label(scene, 0, 0, text, 13, "#2e2200", { bold: true });
    this.dot = scene.add.circle(0, 0, 5, COLORS.red).setVisible(false);
    this.add([this.bg, this.txt, this.dot]);
    this.setText(text);
    scene.add.existing(this);
  }

  setText(text: string): this {
    if (this.txt.text !== text) this.txt.setText(text);
    const w = Math.max(56, this.txt.width + 22);
    if (w !== this.wBox) {
      this.wBox = w;
      this.bg.clear();
      this.bg.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2, -13, w, 30, 13);
      this.bg.fillStyle(this.fill, 1).fillRoundedRect(-w / 2, -15, w, 28, 13);
      this.dot.setPosition(w / 2 - 3, -13);
      this.setSize(w + 12, 40);
    }
    return this;
  }

  /** En rojo cuando esta parte es el cuello de botella. */
  setWarn(on: boolean): this {
    const fill = on ? COLORS.red : this.baseFill;
    if (fill !== this.fill) {
      this.fill = fill;
      this.wBox = 0;
      this.txt.setColor(on ? "#ffffff" : "#2e2200");
      this.setText(this.txt.text);
    }
    return this;
  }

  setAlert(on: boolean): this {
    this.dot.setVisible(on);
    return this;
  }
}

/**
 * Cámara del mapa: arrastrar para moverse, pellizcar (o rueda del ratón) para hacer zoom,
 * distinguiendo un arrastre de un toque. Los objetos deben comprobar `wasDrag()` en su `pointerup`.
 */
export class DragScroll {
  private start = { x: 0, y: 0, sx: 0, sy: 0 };
  private last = { x: 0, y: 0 };
  private vel = { x: 0, y: 0 };
  private dragging = false;
  private down = false;
  private downOnMap = false;
  private pinch: { dist: number; z: number } | null = null;
  private z: number;
  private minZ: number;
  private maxZ: number;

  constructor(
    private scene: Phaser.Scene,
    private worldW: number,
    private worldH: number,
    opts: { zoom?: number; minZoom?: number; maxZoom?: number } = {},
  ) {
    this.minZ = opts.minZoom ?? 1;
    this.maxZ = opts.maxZoom ?? 1;
    this.z = Phaser.Math.Clamp(opts.zoom ?? 1, this.minZ, this.maxZ);
    const cam = scene.cameras.main;
    cam.setZoom(DPR * this.z);
    scene.input.addPointer(1);
    const input = scene.input;

    input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.down = true;
      this.downOnMap = true;
      this.dragging = false;
      this.vel = { x: 0, y: 0 };
      if (input.pointer1.isDown && input.pointer2.isDown) {
        this.pinch = { dist: Phaser.Math.Distance.BetweenPoints(input.pointer1, input.pointer2), z: this.z };
        this.dragging = true;
        return;
      }
      this.start = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
      this.last = { x: p.x, y: p.y };
    });
    input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.pinch && input.pointer1.isDown && input.pointer2.isDown) {
        const d = Phaser.Math.Distance.BetweenPoints(input.pointer1, input.pointer2);
        const mx = (input.pointer1.x + input.pointer2.x) / 2;
        const my = (input.pointer1.y + input.pointer2.y) / 2;
        this.zoomAround(mx, my, (this.pinch.z * d) / Math.max(1, this.pinch.dist));
        return;
      }
      if (!this.down || this.pinch) return;
      if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > 8 * DPR) this.dragging = true;
      if (!this.dragging) return;
      cam.scrollX = this.clampX(this.start.sx - (p.x - this.start.x) / cam.zoom);
      cam.scrollY = this.clampY(this.start.sy - (p.y - this.start.y) / cam.zoom);
      this.vel = { x: (this.last.x - p.x) / cam.zoom, y: (this.last.y - p.y) / cam.zoom };
      this.last = { x: p.x, y: p.y };
    });
    // Se deja `dragging` hasta el siguiente pointerdown para que los objetos lo lean.
    input.on("pointerup", () => {
      if (!input.pointer1.isDown && !input.pointer2.isDown) this.pinch = null;
      this.down = input.activePointer.isDown;
      // Los objetos ya han recibido su pointerup (Phaser los avisa antes que a la escena).
      this.downOnMap = false;
    });
    input.on("wheel", (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.zoomAround(p.x, p.y, this.z * (dy > 0 ? 0.9 : 1.1));
    });
    scene.events.on("update", () => {
      if (this.down || Math.hypot(this.vel.x, this.vel.y) < 0.2) return;
      cam.scrollX = this.clampX(cam.scrollX + this.vel.x);
      cam.scrollY = this.clampY(cam.scrollY + this.vel.y);
      this.vel.x *= 0.92;
      this.vel.y *= 0.92;
    });
  }

  /**
   * true si el gesto no debe contar como toque: fue un arrastre, o empezó fuera del mapa
   * (por ejemplo, en la ✕ de un panel HTML que se cerró encima de un botón del mapa).
   */
  wasDrag(): boolean {
    return this.dragging || !this.downOnMap;
  }

  /** Ancho y alto visibles en coordenadas del mundo. */
  view(): { w: number; h: number } {
    const cam = this.scene.cameras.main;
    return { w: cam.width / cam.zoom, h: cam.height / cam.zoom };
  }

  /** Centra la vista en un punto del mundo. */
  centerOn(x: number, y: number): void {
    const cam = this.scene.cameras.main;
    const v = this.view();
    cam.scrollX = this.clampX(x - v.w / 2);
    cam.scrollY = this.clampY(y - v.h / 2);
  }

  scrollTo(x: number, y: number): void {
    const cam = this.scene.cameras.main;
    cam.scrollX = this.clampX(x);
    cam.scrollY = this.clampY(y);
  }

  private zoomAround(px: number, py: number, z: number): void {
    const cam = this.scene.cameras.main;
    const nz = Phaser.Math.Clamp(z, this.minZ, this.maxZ);
    const wx = cam.scrollX + px / cam.zoom;
    const wy = cam.scrollY + py / cam.zoom;
    this.z = nz;
    cam.setZoom(DPR * nz);
    cam.scrollX = this.clampX(wx - px / cam.zoom);
    cam.scrollY = this.clampY(wy - py / cam.zoom);
  }

  // Si el mapa cabe entero en pantalla, se centra en lugar de pegarse arriba a la izquierda.
  private clampX(x: number): number {
    const free = this.worldW - this.view().w;
    return free < 0 ? free / 2 : Phaser.Math.Clamp(x, 0, free);
  }

  private clampY(y: number): number {
    const free = this.worldH - this.view().h;
    return free < 0 ? free / 2 : Phaser.Math.Clamp(y, 0, free);
  }
}

/** Texto que sube y se desvanece (dinero ganado). */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = "#3ddc97"): void {
  const big = color !== "#3ddc97";
  const t = label(scene, x, y, text, big ? 24 : 18, color, { display: true, stroke: "#14202f" }).setDepth(9.9e4);
  scene.tweens.add({ targets: t, y: y - (big ? 80 : 50), alpha: 0, duration: big ? 1600 : 1000, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
}
