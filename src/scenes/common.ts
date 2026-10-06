import { t } from "../i18n";
import { flyCoins } from "../ui/rewards";
import Phaser from "phaser";
import type { Station } from "../game/economy";
import type { GameState } from "../game/state";

/**
 * Las escenas trabajan en píxeles CSS. El canvas se crea a resolución física (DPR)
 * y la cámara hace zoom, así el texto y los gráficos se ven nítidos en el móvil.
 */
/**
 * Movimiento. Dos niveles:
 * - `reducedMotion()`: efectos fuertes (sacudidas, explosiones de partículas, rebotes, pulsos). Sigue
 *   la preferencia del sistema, salvo que el jugador elija otra cosa en Ajustes.
 * - `calmWorld()`: la vida del mundo (gente caminando, coches, nubes, agua, trabajadores). Es el juego
 *   en sí, así que solo se para si el jugador lo pide en Ajustes. Muchos Android activan «reducir
 *   movimiento» con el ahorro de batería, y antes eso dejaba la ciudad congelada.
 */
const motionPref = (): "full" | "reduced" | null => {
  try {
    const v = localStorage.getItem("motion");
    return v === "full" || v === "reduced" ? v : null;
  } catch {
    return null;
  }
};
export const reducedMotion = () => {
  const pref = motionPref();
  return pref ? pref === "reduced" : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
export const calmWorld = () => motionPref() === "reduced";
/** Ajustes → «Reducir movimiento». */
export function setReducedMotion(on: boolean): void {
  try {
    localStorage.setItem("motion", on ? "reduced" : "full");
  } catch {
    /* sin almacenamiento: se queda como estaba */
  }
}

/**
 * Resolución del canvas: como mucho x2. En pantallas x3 se pintarían 2,25 veces más píxeles por
 * fotograma (la mitad de fluidez en móviles de gama media) para una diferencia que casi no se ve.
 * La interfaz HTML va aparte y sigue a resolución completa.
 */
export const DPR = Math.min(window.devicePixelRatio || 1, 2);
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
  /** Botón de habilidad del gerente de una parte (x2 de velocidad unos minutos). */
  useSkill(bizId: string, st: Station): void;
  /** Toque sobre una parcela de la ciudad. */
  tapPlot(bizId: string): void;
  /** Ventas pendientes de mostrar, se vacía al leerla. */
  drainSales(bizId: string | null): { biz: string; amount: number; lucky?: boolean }[];
  /** Altura ocupada por la interfaz HTML arriba y abajo. */
  insets(): { top: number; bottom: number };
}

export const bridgeOf = (scene: Phaser.Scene) => scene.registry.get("bridge") as Bridge;

/** Barras que flotan encima de la barra inferior (ola u oro, y la mecánica del negocio): alto ocupado. */
export function overlayHeight(): number {
  let h = 0;
  for (const id of ["wave", "twist"]) {
    const el = document.getElementById(id);
    if (el && !el.hidden) h += el.offsetHeight + 8;
  }
  return h ? h + 12 : 0;
}

export function setupCamera(scene: Phaser.Scene): { w: number; h: number } {
  const cam = scene.cameras.main;
  cam.setZoom(DPR);
  cam.setOrigin(0, 0);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onMotionChange = () => {
    // Existing looping hints must also stop if the preference changes mid-session.
    if (motion.matches) {
      for (const tween of scene.tweens.getTweens()) {
        if (tween.isInfinite) tween.stop();
        else tween.complete();
      }
      cam.fadeEffect.reset();
      cam.shakeEffect.reset();
    }
  };
  motion.addEventListener("change", onMotionChange);
  scene.events.once("shutdown", () => motion.removeEventListener("change", onMotionChange));
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
const rememberedViews = new Map<string, { x: number; y: number; z: number }>();

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
  /** Zona construida (la marca addControls): la cámara no se sale de ella. */
  private limits: { left: number; top: number; right: number; bottom: number } | null = null;

  constructor(
    private scene: Phaser.Scene,
    private worldW: number,
    private worldH: number,
    private opts: { zoom?: number; minZoom?: number; maxZoom?: number; memoryKey?: string } = {},
  ) {
    this.minZ = opts.minZoom ?? 1;
    this.maxZ = opts.maxZoom ?? 1;
    this.z = Phaser.Math.Clamp(opts.zoom ?? 1, this.minZ, this.maxZ);
    const cam = scene.cameras.main;
    cam.setZoom(DPR * this.z);
    if (scene.input.manager.pointers.length < 3) scene.input.addPointer(1);
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
    const coast = (_time: number, delta: number) => {
      if (this.down || Math.hypot(this.vel.x, this.vel.y) < 0.2) return;
      const step = Math.min(delta, 50) / (1000 / 60);
      cam.scrollX = this.clampX(cam.scrollX + this.vel.x * step);
      cam.scrollY = this.clampY(cam.scrollY + this.vel.y * step);
      const decay = Math.pow(reducedMotion() ? 0.65 : 0.92, step);
      this.vel.x *= decay;
      this.vel.y *= decay;
    };
    scene.events.on("update", coast);
    scene.events.once("shutdown", () => {
      scene.events.off("update", coast);
      if (opts.memoryKey) rememberedViews.set(opts.memoryKey, { x: cam.scrollX, y: cam.scrollY, z: this.z });
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
    const safe = this.safeArea();
    cam.scrollX = this.clampX(x - (safe.left + safe.w / 2) * DPR / cam.zoom);
    cam.scrollY = this.clampY(y - (safe.top + safe.h / 2) * DPR / cam.zoom);
  }

  /** Place the subject in the space left by the header, goal, rail and bottom bar. */
  private safeArea(): { left: number; top: number; w: number; h: number } {
    const w = this.scene.scale.width / DPR, h = this.scene.scale.height / DPR;
    const insets = bridgeOf(this.scene).insets();
    const bottom = insets.bottom + overlayHeight() + 18;
    const top = insets.top + 64;
    return { left: 14, top, w: Math.max(150, w - 28), h: Math.max(130, h - top - bottom) };
  }

  restore(): boolean {
    const saved = this.opts.memoryKey ? rememberedViews.get(this.opts.memoryKey) : undefined;
    if (!saved) return false;
    this.z = Phaser.Math.Clamp(saved.z, this.minZ, this.maxZ);
    this.scene.cameras.main.setZoom(DPR * this.z);
    this.scrollTo(saved.x, saved.y);
    return true;
  }

  addControls(home: { x: number; y: number }, bounds: { left: number; top: number; right: number; bottom: number }): void {
    this.limits = bounds;
    // No se puede alejar más de lo que hace falta para ver la zona entera.
    const safe0 = this.safeArea();
    this.minZ = Math.max(this.minZ, Math.min(this.maxZ, 0.92 * Math.min(safe0.w / (bounds.right - bounds.left), safe0.h / (bounds.bottom - bounds.top))));
    if (this.z < this.minZ) {
      this.z = this.minZ;
      this.scene.cameras.main.setZoom(DPR * this.z);
    }
    const cam0 = this.scene.cameras.main;
    this.scrollTo(cam0.scrollX, cam0.scrollY);
    const root = document.createElement("div");
    root.className = "map-tools";
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", t("Cámara del mapa"));
    // En pantallas táctiles el zoom se hace con dos dedos: solo queda el botón de centrar (pantalla limpia).
    const touch = window.matchMedia("(pointer: coarse)").matches;
    root.innerHTML = `<button data-map="home" aria-label="${t("Centrar mapa")}" title="${t("Centrar mapa")}">⌖</button>` +
      (touch ? "" : `<button data-map="overview" aria-label="${t("Ver mapa completo")}" title="${t("Ver mapa completo")}">▦</button><span class="map-zoom"><button data-map="out" aria-label="${t("Alejar mapa")}">−</button><button data-map="in" aria-label="${t("Acercar mapa")}">+</button></span>`);
    let lastBottom = -1;
    const position = () => {
      const bottom = bridgeOf(this.scene).insets().bottom + overlayHeight() + 12;
      if (bottom !== lastBottom) { root.style.bottom = `${bottom}px`; lastBottom = bottom; }
    };
    position();
    const visibility = new MutationObserver(position);
    const size = new ResizeObserver(position);
    for (const id of ["wave", "twist"]) {
      const el = document.getElementById(id)!;
      visibility.observe(el, { attributes: true, attributeFilter: ["hidden"] });
      size.observe(el);
    }
    size.observe(document.getElementById("bar")!);
    root.addEventListener("click", e => {
      const action = (e.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.map;
      if (!action) return;
      this.vel = { x: 0, y: 0 };
      const safe = this.safeArea();
      if (action === "home") {
        this.z = this.opts.zoom ?? 0.75;
        this.scene.cameras.main.setZoom(DPR * this.z);
        this.centerOn(home.x, home.y);
      } else if (action === "overview") {
        this.z = Phaser.Math.Clamp(Math.min(safe.w / (bounds.right - bounds.left), safe.h / (bounds.bottom - bounds.top)), this.minZ, this.maxZ);
        this.scene.cameras.main.setZoom(DPR * this.z);
        this.centerOn((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2);
      } else this.zoomAround((safe.left + safe.w / 2) * DPR, (safe.top + safe.h / 2) * DPR, this.z * (action === "in" ? 1.18 : 1 / 1.18));
    });
    document.getElementById("app")!.appendChild(root);
    this.scene.events.once("shutdown", () => {
      visibility.disconnect();
      size.disconnect();
      root.remove();
    });
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

  /**
   * Con zona construida: la vista no se sale de ella (más un margen pequeño), contando lo que tapan la
   * cabecera y la barra de abajo. Si la zona cabe entera, se centra.
   */
  private clampTo(scroll: number, lo: number, hi: number, padBefore: number, padAfter: number, visible: number): number {
    const min = lo - padBefore, max = hi + padAfter - visible;
    return max <= min ? (min + max) / 2 : Phaser.Math.Clamp(scroll, min, max);
  }

  // Allow enough margin to frame the map inside the space left by the HTML interface.
  private clampX(x: number): number {
    if (this.limits) {
      const safe = this.safeArea(), z = this.z, w = this.scene.scale.width / DPR;
      return this.clampTo(x, this.limits.left, this.limits.right, safe.left / z + 30, (w - safe.left - safe.w) / z + 30, this.view().w);
    }
    const free = this.worldW - this.view().w;
    return Phaser.Math.Clamp(x, -this.view().w * 0.1, Math.max(0, free) + this.view().w * 0.15);
  }

  private clampY(y: number): number {
    if (this.limits) {
      const safe = this.safeArea(), z = this.z, h = this.scene.scale.height / DPR;
      return this.clampTo(y, this.limits.top, this.limits.bottom, safe.top / z + 30, (h - safe.top - safe.h) / z + 30, this.view().h);
    }
    const free = this.worldH - this.view().h;
    return Phaser.Math.Clamp(y, -this.view().h * 0.55, Math.max(0, free) + this.view().h * 0.28);
  }
}

/** Project a world sale into CSS coordinates before sending coins to the HTML wallet. */
export function rewardCoins(scene: Phaser.Scene, x: number, y: number, lucky = false): void {
  const cam = scene.cameras.main;
  flyCoins((x - cam.scrollX) * cam.zoom / DPR, (y - cam.scrollY) * cam.zoom / DPR, lucky);
}

/** Texto que sube y se desvanece (dinero ganado). */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = "#3ddc97"): void {
  const big = color !== "#3ddc97";
  const t = label(scene, x, y, text, big ? 24 : 18, color, { display: true, stroke: "#14202f" }).setDepth(9.9e4);
  scene.tweens.add({ targets: t, y: reducedMotion() ? y : y - (big ? 80 : 50), alpha: 0, duration: big ? 1600 : 1000, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
}
