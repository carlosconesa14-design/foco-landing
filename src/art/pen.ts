import Phaser from "phaser";

/** Aclara (f > 0) u oscurece (f < 0) un color 0xRRGGBB. */
export function shade(color: number, f: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const t = f < 0 ? 0 : 255;
  const p = Math.abs(f);
  return Phaser.Display.Color.GetColor(
    Math.round((t - c.red) * p + c.red),
    Math.round((t - c.green) * p + c.green),
    Math.round((t - c.blue) * p + c.blue),
  );
}

export function mix(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    Math.round(ca.red + (cb.red - ca.red) * t),
    Math.round(ca.green + (cb.green - ca.green) * t),
    Math.round(ca.blue + (cb.blue - ca.blue) * t),
  );
}

type Pt = [number, number];

/**
 * Envoltorio de Graphics que multiplica todas las coordenadas por `k`.
 * Permite dibujar en píxeles lógicos y generar texturas a resolución física.
 */
export class Pen {
  constructor(
    public g: Phaser.GameObjects.Graphics,
    public k = 1,
  ) {}

  fill(color: number, alpha = 1): this {
    this.g.fillStyle(color, alpha);
    return this;
  }

  stroke(width: number, color: number, alpha = 1): this {
    this.g.lineStyle(width * this.k, color, alpha);
    return this;
  }

  rect(x: number, y: number, w: number, h: number): this {
    const k = this.k;
    this.g.fillRect(x * k, y * k, w * k, h * k);
    return this;
  }

  rrect(x: number, y: number, w: number, h: number, r: number): this {
    const k = this.k;
    this.g.fillRoundedRect(x * k, y * k, w * k, h * k, Math.min(r, w / 2, h / 2) * k);
    return this;
  }

  srrect(x: number, y: number, w: number, h: number, r: number): this {
    const k = this.k;
    this.g.strokeRoundedRect(x * k, y * k, w * k, h * k, Math.min(r, w / 2, h / 2) * k);
    return this;
  }

  circle(x: number, y: number, r: number): this {
    this.g.fillCircle(x * this.k, y * this.k, r * this.k);
    return this;
  }

  scircle(x: number, y: number, r: number): this {
    this.g.strokeCircle(x * this.k, y * this.k, r * this.k);
    return this;
  }

  ellipse(x: number, y: number, w: number, h: number): this {
    this.g.fillEllipse(x * this.k, y * this.k, w * this.k, h * this.k);
    return this;
  }

  poly(pts: Pt[]): this {
    this.g.fillPoints(
      pts.map(([x, y]) => new Phaser.Math.Vector2(x * this.k, y * this.k)),
      true,
    );
    return this;
  }

  spoly(pts: Pt[]): this {
    this.g.strokePoints(
      pts.map(([x, y]) => new Phaser.Math.Vector2(x * this.k, y * this.k)),
      true,
    );
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number): this {
    const k = this.k;
    this.g.lineBetween(x1 * k, y1 * k, x2 * k, y2 * k);
    return this;
  }

  /** Degradado vertical a bandas (funciona igual en WebGL y Canvas). */
  vgrad(x: number, y: number, w: number, h: number, top: number, bottom: number, steps = 24): this {
    const bh = h / steps;
    for (let i = 0; i < steps; i++) {
      this.fill(mix(top, bottom, i / (steps - 1))).rect(x, y + i * bh, w, bh + 0.6);
    }
    return this;
  }
}

/* ---------- Geometría isométrica ---------- */

/** Rombo de la base de una caja isométrica: centro inferior (cx, by), semiancho a, semialto b. */
export function isoBox(p: Pen, cx: number, by: number, a: number, b: number, h: number, wall: number, roof: number): void {
  const L: Pt = [cx - a, by - b];
  const B: Pt = [cx, by];
  const R: Pt = [cx + a, by - b];
  const T: Pt = [cx, by - 2 * b];
  const up = ([x, y]: Pt, d = h): Pt => [x, y - d];
  p.fill(shade(wall, -0.18)).poly([L, B, up(B), up(L)]);
  p.fill(wall).poly([B, R, up(R), up(B)]);
  p.fill(roof).poly([up(L), up(B), up(R), up(T)]);
  // Arista iluminada
  p.stroke(1, 0xffffff, 0.25).line(up(B)[0], up(B)[1], B[0], B[1]);
}

/** Punto sobre la cara izquierda (u: 0 izquierda → 1 frente, v: altura). */
export const leftFace = (cx: number, by: number, a: number, b: number) => (u: number, v: number): Pt => [cx - a + u * a, by - b + u * b - v];
/** Punto sobre la cara derecha (u: 0 frente → 1 derecha, v: altura). */
export const rightFace = (cx: number, by: number, a: number, b: number) => (u: number, v: number): Pt => [cx + u * a, by - u * b - v];

export function faceQuad(f: (u: number, v: number) => Pt, u0: number, u1: number, v0: number, v1: number): Pt[] {
  return [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)];
}
