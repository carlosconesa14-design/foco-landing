export type GridPoint = { c: number; r: number };
export type StreetLoop = { points: GridPoint[]; lengths: number[]; total: number };

/** Round corners inside their road tile; distances make speed independent of segment length. */
export function streetLoop(corners: GridPoint[], radius = 0.18): StreetLoop {
  const points: GridPoint[] = [];
  const offset = (from: GridPoint, toward: GridPoint, amount: number): GridPoint => {
    const d = Math.hypot(toward.c - from.c, toward.r - from.r);
    const t = Math.min(amount, d / 3) / (d || 1);
    return { c: from.c + (toward.c - from.c) * t, r: from.r + (toward.r - from.r) * t };
  };
  corners.forEach((p, i) => {
    const before = offset(p, corners[(i + corners.length - 1) % corners.length], radius);
    const after = offset(p, corners[(i + 1) % corners.length], radius);
    for (let step = 0; step <= 6; step++) {
      const t = step / 6, u = 1 - t;
      points.push({ c: u * u * before.c + 2 * u * t * p.c + t * t * after.c, r: u * u * before.r + 2 * u * t * p.r + t * t * after.r });
    }
  });
  const lengths = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return Math.hypot(q.c - p.c, q.r - p.r);
  });
  return { points, lengths, total: lengths.reduce((sum, n) => sum + n, 0) };
}

export function loopPosition(loop: StreetLoop, distance: number): GridPoint & { dc: number; dr: number } {
  let remaining = ((distance % loop.total) + loop.total) % loop.total;
  for (let i = 0; i < loop.points.length; i++) {
    const a = loop.points[i], b = loop.points[(i + 1) % loop.points.length], len = loop.lengths[i];
    if (remaining <= len || i === loop.points.length - 1) {
      const t = len ? remaining / len : 0;
      return { c: a.c + (b.c - a.c) * t, r: a.r + (b.r - a.r) * t, dc: (b.c - a.c) / (len || 1), dr: (b.r - a.r) / (len || 1) };
    }
    remaining -= len;
  }
  return { ...loop.points[0], dc: 0, dr: 0 };
}

