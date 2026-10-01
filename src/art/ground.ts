import Phaser from "phaser";

/** Static details batched into each scene's existing Graphics: no per-tile objects. */
export function groundDetail(g: Phaser.GameObjects.Graphics, x: number, y: number, surface: "grass" | "sand" | "paving" | "road", seed: number): void {
  if (surface === "grass" || surface === "sand") {
    for (let i = 0; i < 3; i++) {
      const dx = ((seed * 13 + i * 17) % 43) - 21;
      const dy = ((seed * 7 + i * 5) % 15) - 7;
      if (surface === "grass") {
        g.lineStyle(1, 0x2d794e, 0.3).lineBetween(x + dx - 2, y + dy, x + dx - 3, y + dy - 3).lineBetween(x + dx, y + dy, x + dx + 2, y + dy - 4);
        g.lineStyle(1, 0xdbf8b5, 0.4).lineBetween(x + dx, y + dy, x + dx, y + dy - 3);
      } else {
        g.fillStyle(0xe7a65c, 0.4).fillEllipse(x + dx, y + dy, 4, 1.5);
        g.fillStyle(0xfff5d3, 0.8).fillCircle(x + dx + 4, y + dy - 2, 1);
      }
    }
  } else if (surface === "paving") {
    g.lineStyle(1, 0x6a8394, 0.22).lineBetween(x - 21, y - 10.5, x + 21, y + 10.5).lineBetween(x + 21, y - 10.5, x - 21, y + 10.5);
    g.lineStyle(1, 0xffffff, 0.45).lineBetween(x - 42, y, x, y + 21).lineBetween(x, y + 21, x + 42, y);
    if (seed % 7 === 0) {
      g.lineStyle(1.5, 0x496070, 0.6);
      for (let i = 0; i < 4; i++) g.lineBetween(x + 24 + i * 2, y + 3 - i, x + 29 + i * 2, y + 5.5 - i);
    }
  } else {
    // Curbstone seams, subtle tyre wear and painted lane edges.
    g.lineStyle(1, 0x263b50, 0.2).lineBetween(x - 24, y - 6, x + 6, y + 9);
    g.lineStyle(1, 0xffffff, 0.35).lineBetween(x - 42, y, x - 12, y + 15);
    g.lineStyle(1, 0x6b8093, 0.7).lineBetween(x - 24, y + 7, x - 27, y + 9);
  }
}
