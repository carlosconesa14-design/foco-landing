import type Phaser from "phaser";
import { artRef } from "./generated";

/** Upgrade the actual base art, retaining its face, pose, bounds and ground anchor.
 * Textures are created only for visible ranks, at up to 3x and at most 300x258 px.
 * Structural additions are cumulative; this never recolours the original sprite.
 */
export function ensureRankArt(scene: Phaser.Scene, base: string, key: string, rank: number, spec: { w: number; h: number }): boolean {
  if (scene.textures.exists(key)) return true;
  const ref = artRef(scene, base);
  if (!scene.textures.exists(ref.texture)) return false;
  const frame = scene.textures.getFrame(ref.texture, ref.frame);
  if (!frame) return false;
  const canvas = document.createElement("canvas");
  const ratio = Math.min(3, 300 / spec.w, 258 / spec.h);
  canvas.width = Math.ceil(spec.w * ratio);
  canvas.height = Math.ceil(spec.h * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.scale(canvas.width / 100, canvas.height / 100);
  const colors = ["", "#cd8b55", "#cedce8", "#ffcf62", "#79e5ff", "#c48cff"];
  const metal = colors[rank];
  const actor = base.startsWith("ch_") || /^rest_(chef|waiter)/.test(base);
  const vehicle = base.startsWith("veh_") || /^wh_(forklift|van)/.test(base);
  const box = (x: number, y: number, w: number, h: number, fill: string, radius = 2) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#24445c";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); ctx.stroke();
  };
  const line = (x: number, y: number, xx: number, yy: number, color: string, width = 1.8) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke();
  };
  // Behind the original silhouette: upgraded station architecture or a ceremonial cape.
  if (actor && rank === 5) {
    ctx.fillStyle = "#754ca1"; ctx.strokeStyle = "#f5c542"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(31, 39); ctx.lineTo(17, 84); ctx.quadraticCurveTo(50, 96, 81, 84); ctx.lineTo(69, 39); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (!actor && !vehicle && rank >= 2) {
    box(6, 21, 5, 66, rank >= 3 ? "#c89c4b" : "#91a8b8");
    box(89, 21, 5, 66, rank >= 3 ? "#c89c4b" : "#91a8b8");
    box(6, 18, 88, 5, metal);
    if (rank >= 4) {
      box(5, 10, 90, 7, "#22374b");
      line(9, 13, 91, 13, metal, 2.5);
    }
  }
  ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, 100, 100);
  if (actor) {
    // Badge, tailored cuffs, epaulettes and belt. Face and feet stay untouched.
    box(58, 50, 7, 5, metal, 1);
    if (rank >= 2) { line(19, 69, 28, 69, metal, 2.8); line(73, 69, 81, 69, metal, 2.8); }
    if (rank >= 3) { box(29, 45, 12, 3, metal, 1); box(59, 45, 12, 3, metal, 1); line(36, 73, 65, 73, "#ffcf62", 2); }
    if (rank >= 4) { line(34, 48, 37, 67, metal, 1.5); line(67, 48, 64, 67, metal, 1.5); }
  } else if (vehicle) {
    // New roof hardware and side livery, without changing the wheels or driving pose.
    line(25, 57, 76, 72, metal, 2.4);
    if (rank >= 2) { box(36, 26, 20, 4, metal, 1); line(35, 25, 35, 21, "#24445c"); line(58, 25, 58, 21, "#24445c"); }
    if (rank >= 3) { box(45, 51, 9, 5, "#ffcf62", 1); line(22, 66, 32, 69, "#ffcf62", 2); }
    if (rank >= 4) { line(63, 67, 80, 70, metal, 2.8); box(57, 29, 10, 3, metal, 1); }
  } else {
    box(74, 72, 19, 14, "#263d52");
    line(77, 76, 90, 76, metal, 2);
    if (rank >= 2) { box(9, 76, 17, 11, metal, 1); line(12, 80, 23, 80, "#24445c"); }
    if (rank >= 3) { line(12, 90, 88, 90, "#ffcf62", 2); box(45, 79, 10, 6, metal); }
    if (rank >= 4) {
      box(81, 41, 14, 17, "#183546");
      line(84, 45, 91, 45, metal); line(84, 49, 91, 49, metal);
    }
  }
  if (rank === 5) {
    // A heraldic crown accent, kept away from faces, products and touch labels.
    const x = actor ? 64 : 51, y = actor ? 53 : 20;
    ctx.fillStyle = "#ffdc78"; ctx.strokeStyle = "#725328"; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 8, y - 6); ctx.lineTo(x - 2, y - 3); ctx.lineTo(x, y - 8); ctx.lineTo(x + 3, y - 3); ctx.lineTo(x + 8, y - 6); ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  return !!scene.textures.addCanvas(key, canvas);
}
