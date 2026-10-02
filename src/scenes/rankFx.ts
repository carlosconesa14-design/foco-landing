import Phaser from "phaser";
import { art } from "../art/catalog";
import { hasGeneratedArt } from "../art/generated";
import { mix } from "../art/pen";
import { rankInfo } from "../game/ranks";
import { floatText, reducedMotion } from "./common";

/**
 * Efectos de los rangos de los puestos (bronce … leyenda) hechos por código: medalla, pedestal,
 * brillo y explosión al ascender. Si existe el PNG `rank_<n>`, la medalla usa la imagen.
 */

const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

/** Medalla del rango: disco del color con borde, estrella y, en diamante y leyenda, un aro extra. */
export function rankBadge(scene: Phaser.Scene, x: number, y: number, rank: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const r = rankInfo(rank);
  if (!r) return c.setVisible(false);
  if (scene.textures.exists(`rank_${rank}`) || hasGeneratedArt(scene, `rank_${rank}`)) {
    c.add(art(scene, 0, 0, `rank_${rank}`));
    return c;
  }
  const g = scene.add.graphics();
  if (rank >= 4) g.fillStyle(r.color, 0.35).fillCircle(0, 0, 14);
  g.fillStyle(r.edge, 1).fillCircle(0, 1.5, 11);
  g.fillStyle(r.color, 1).fillCircle(0, 0, 10);
  g.fillStyle(mix(r.color, 0xffffff, 0.45), 1).fillCircle(-3, -3, 4);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? 2.6 : 6;
    pts.push(new Phaser.Math.Vector2(Math.cos(a) * rad, Math.sin(a) * rad + 0.5));
  }
  g.fillStyle(0xffffff, 0.95).fillPoints(pts, true);
  g.lineStyle(1.5, r.edge, 1).strokeCircle(0, 0, 10);
  c.add(g);
  return c;
}

/** Pedestal del puesto: borde del color del rango y, desde plata, el centro teñido. */
export function rankPedestal(g: Phaser.GameObjects.Graphics, rim: Phaser.Math.Vector2[], inner: Phaser.Math.Vector2[], rank: number): void {
  g.clear();
  const r = rankInfo(rank);
  if (!r) return;
  if (rank >= 2) g.fillStyle(r.color, 0.3).fillPoints(inner, true);
  g.lineStyle(rank >= 3 ? 4 : 3, r.color, 1).strokePoints(rim, true);
  g.lineStyle(1, 0xffffff, 0.55).strokePoints(inner, true);
}

/** Brillo bajo el puesto desde oro: late despacio (quieto con movimiento reducido). */
export function rankGlow(scene: Phaser.Scene, x: number, y: number, w: number, depth: number, rank: number): Phaser.GameObjects.Ellipse | null {
  const r = rankInfo(rank);
  if (!r || rank < 3) return null;
  const e = scene.add.ellipse(x, y, w, w * 0.42, r.color, 0.4).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
  if (!reducedMotion()) scene.tweens.add({ targets: e, alpha: 0.15, scaleX: 1.12, scaleY: 1.12, duration: 1100 + rank * 100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return e;
}

/** Ascenso: aro que se abre, destellos del color del rango y el nombre del rango flotando. */
export function rankBurst(scene: Phaser.Scene, x: number, y: number, rank: number, title: string): void {
  const r = rankInfo(rank);
  if (!r) return;
  floatText(scene, x, y - 70, title, hex(r.color));
  if (reducedMotion()) return;
  for (const delay of [0, 180]) {
    const ring = scene.add.ellipse(x, y, 60, 26).setStrokeStyle(4, r.color, 1).setDepth(9.7e4);
    scene.tweens.add({ targets: ring, scaleX: 2.6, scaleY: 2.6, alpha: 0, delay, duration: 800, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
  }
  const n = 10 + rank * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dot = scene.add.circle(x, y - 20, 3, i % 3 ? r.color : 0xffffff).setDepth(9.7e4);
    scene.tweens.add({ targets: dot, x: x + Math.cos(a) * (50 + rank * 6), y: y - 30 + Math.sin(a) * 26, alpha: 0, duration: 750, ease: "Cubic.easeOut", onComplete: () => dot.destroy() });
  }
}
