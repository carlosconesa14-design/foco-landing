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
  drainSales(bizId: string | null): { biz: string; amount: number }[];
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
 * Arrastrar para desplazar la cámara (en vertical, o en los dos ejes si hay límites en X),
 * distinguiendo un arrastre de un toque. Los objetos deben comprobar `wasDrag()` en su `pointerup`.
 */
export class DragScroll {
  private start = { x: 0, y: 0, sx: 0, sy: 0 };
  private last = { x: 0, y: 0 };
  private vel = { x: 0, y: 0 };
  private dragging = false;
  private down = false;

  constructor(
    private scene: Phaser.Scene,
    private minY: number,
    private maxY: number,
    private minX = 0,
    private maxX = 0,
  ) {
    const cam = scene.cameras.main;
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.down = true;
      this.dragging = false;
      this.start = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
      this.last = { x: p.x, y: p.y };
      this.vel = { x: 0, y: 0 };
    });
    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.down) return;
      if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > 8 * DPR) this.dragging = true;
      if (!this.dragging) return;
      cam.scrollX = this.clampX(this.start.sx - (p.x - this.start.x) / DPR);
      cam.scrollY = this.clampY(this.start.sy - (p.y - this.start.y) / DPR);
      this.vel = { x: (this.last.x - p.x) / DPR, y: (this.last.y - p.y) / DPR };
      this.last = { x: p.x, y: p.y };
    });
    // Se deja `dragging` hasta el siguiente pointerdown para que los objetos lo lean.
    scene.input.on("pointerup", () => (this.down = false));
    scene.events.on("update", () => {
      if (this.down || Math.hypot(this.vel.x, this.vel.y) < 0.2) return;
      cam.scrollX = this.clampX(cam.scrollX + this.vel.x);
      cam.scrollY = this.clampY(cam.scrollY + this.vel.y);
      this.vel.x *= 0.92;
      this.vel.y *= 0.92;
    });
  }

  wasDrag(): boolean {
    return this.dragging;
  }

  setBounds(minY: number, maxY: number, minX = this.minX, maxX = this.maxX): void {
    this.minY = minY;
    this.maxY = Math.max(minY, maxY);
    this.minX = minX;
    this.maxX = Math.max(minX, maxX);
    const cam = this.scene.cameras.main;
    cam.scrollX = this.clampX(cam.scrollX);
    cam.scrollY = this.clampY(cam.scrollY);
  }

  private clampX(x: number): number {
    return Phaser.Math.Clamp(x, this.minX, Math.max(this.minX, this.maxX));
  }

  private clampY(y: number): number {
    return Phaser.Math.Clamp(y, this.minY, Math.max(this.minY, this.maxY));
  }
}

/** Texto que sube y se desvanece (dinero ganado). */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = "#3ddc97"): void {
  const t = label(scene, x, y, text, 18, color, { display: true, stroke: "#14202f" }).setDepth(50);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1000, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
}
