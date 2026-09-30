import Phaser from "phaser";
import { EMOJI_FONT } from "../scenes/common";
import { Pen, faceQuad, isoBox, leftFace, rightFace, shade } from "./pen";

/**
 * Catálogo de arte del juego. Cada clave tiene un tamaño lógico (px CSS).
 * Si existe `public/sprites/<clave>.png` se usa ese PNG; si no, se dibuja por código.
 * Ver docs/ART.md para los prompts de cada pieza.
 */
export const ART: Record<string, { w: number; h: number }> = {};

const def = (key: string, w: number, h: number) => (ART[key] = { w, h });

/* ---------- Personajes ---------- */

interface Look {
  skin: number;
  shirt: number;
  pants: number;
  hat: "cap" | "chef" | "hair" | "headset" | "bun";
  hatColor: number;
  extra?: "vest" | "bowtie" | "tie" | "glasses" | "apron";
  extraColor?: number;
}

export const LOOKS: Record<string, Look> = {
  packer: { skin: 0xf1c27d, shirt: 0x5d6d7e, pants: 0x34495e, hat: "cap", hatColor: 0x2e86de, extra: "vest", extraColor: 0xff9f1c },
  cook: { skin: 0xe0ac69, shirt: 0xf4f6f7, pants: 0x2c3e50, hat: "chef", hatColor: 0xffffff, extra: "apron", extraColor: 0xe74c3c },
  waiter: { skin: 0xf5cba7, shirt: 0xf4f6f7, pants: 0x1b2631, hat: "hair", hatColor: 0x6e4b2a, extra: "bowtie", extraColor: 0xc0392b },
  creator: { skin: 0xc68642, shirt: 0xff6fb5, pants: 0x2d3561, hat: "headset", hatColor: 0x2b2b2b },
  brand: { skin: 0xf1c27d, shirt: 0x6c5ce7, pants: 0x2d3436, hat: "bun", hatColor: 0xf0c05a, extra: "tie", extraColor: 0xfdcb6e },
  engineer: { skin: 0x8d5524, shirt: 0x1abc9c, pants: 0x2c3e50, hat: "hair", hatColor: 0x1b1b1b, extra: "glasses", extraColor: 0x1b1b1b },
  sales: { skin: 0xf5cba7, shirt: 0x1f3a93, pants: 0x1b2631, hat: "hair", hatColor: 0x8e5a2b, extra: "tie", extraColor: 0xf5c542 },
  rider: { skin: 0xe0ac69, shirt: 0x2ecc71, pants: 0x2c3e50, hat: "cap", hatColor: 0x27ae60 },
  editor: { skin: 0xf1c27d, shirt: 0xfdcb6e, pants: 0x2d3436, hat: "hair", hatColor: 0x5b3a29, extra: "glasses", extraColor: 0x2d3436 },
  tech: { skin: 0xc68642, shirt: 0x34495e, pants: 0x2c3e50, hat: "cap", hatColor: 0x1abc9c },
  ped0: { skin: 0xf1c27d, shirt: 0xe74c3c, pants: 0x34495e, hat: "hair", hatColor: 0x2c1e12 },
  ped1: { skin: 0x8d5524, shirt: 0xf1c40f, pants: 0x2980b9, hat: "bun", hatColor: 0x111111 },
  ped2: { skin: 0xe0ac69, shirt: 0x27ae60, pants: 0x7f8c8d, hat: "cap", hatColor: 0x8e44ad },
};

/**
 * Qué arte usa cada negocio en su recinto. `mover` recorre los puestos recogiendo
 * y `seller` sale a vender; si empiezan por "car_" son vehículos, si no, personajes.
 */
export const BIZ_ART: Record<string, { worker: string; mover: string; seller: string; item: string; station: string }> = {
  dropship: { worker: "packer", mover: "car_3", seller: "car_2", item: "item_box", station: "st_dropship" },
  restaurant: { worker: "cook", mover: "waiter", seller: "rider", item: "item_dish", station: "st_restaurant" },
  tiktok: { worker: "creator", mover: "editor", seller: "brand", item: "item_clip", station: "st_tiktok" },
  ai: { worker: "engineer", mover: "tech", seller: "sales", item: "item_chip", station: "st_ai" },
};

for (const role of Object.keys(LOOKS)) for (const f of [0, 1, 2]) def(`ch_${role}_${f}`, 44, 60);

function drawChar(p: Pen, o: Look, frame: number): void {
  const swing = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  const dark = shade(o.shirt, -0.22);
  p.fill(0x000000, 0.2).ellipse(22, 57, 26, 6);
  // Piernas y zapatos
  p.fill(o.pants).rrect(15 + swing * 2, 40, 6, 14 - Math.max(0, swing), 3).rrect(23 - swing * 2, 40, 6, 14 - Math.max(0, -swing), 3);
  p.fill(0x2b2b2b).rrect(13 + swing * 3, 52 - Math.max(0, swing), 9, 4, 2).rrect(22 - swing * 3, 52 - Math.max(0, -swing), 9, 4, 2);
  // Brazos detrás del cuerpo
  p.fill(dark).rrect(8, 28 + swing, 6, 13, 3).rrect(30, 28 - swing, 6, 13, 3);
  p.fill(o.skin).circle(11, 42 + swing, 3).circle(33, 42 - swing, 3);
  // Cuerpo
  p.fill(o.shirt).rrect(12, 26, 20, 17, 6);
  p.fill(dark, 0.6).rrect(26, 27, 6, 15, 3);
  if (o.extra === "vest") {
    p.fill(o.extraColor!).rrect(12, 27, 7, 15, 3).rrect(25, 27, 7, 15, 3);
    p.fill(0xffffff, 0.85).rect(12, 34, 7, 2).rect(25, 34, 7, 2);
  } else if (o.extra === "apron") {
    p.fill(0xffffff).rrect(15, 31, 14, 13, 3);
    p.fill(o.extraColor!).rect(15, 31, 14, 2);
  } else if (o.extra === "bowtie") {
    p.fill(0x1b2631).rrect(12, 27, 5, 15, 2).rrect(27, 27, 5, 15, 2);
    p.fill(o.extraColor!).poly([[18, 26], [22, 28], [18, 30]]).poly([[26, 26], [22, 28], [26, 30]]);
  } else if (o.extra === "tie") {
    p.fill(0xffffff).poly([[18, 26], [26, 26], [22, 33]]);
    p.fill(o.extraColor!).poly([[21, 27], [23, 27], [24, 37], [22, 39], [20, 37]]);
  }
  // Cabeza
  p.fill(o.skin).circle(22, 17, 11).circle(11.5, 18, 2.6).circle(32.5, 18, 2.6);
  p.fill(0x2b1d14).circle(18, 18.5, 1.7).circle(26, 18.5, 1.7);
  p.fill(0xffffff).circle(18.6, 17.9, 0.6).circle(26.6, 17.9, 0.6);
  p.fill(0xe57373, 0.45).circle(15.5, 22, 2).circle(28.5, 22, 2);
  p.fill(0x8e3b2f).rrect(20, 22.5, 4, 1.6, 0.8);
  if (o.extra === "glasses") {
    p.stroke(1.2, o.extraColor!).scircle(18, 18.5, 3).scircle(26, 18.5, 3).line(21, 18.5, 23, 18.5);
  }
  // Pelo / gorro
  const hc = o.hatColor;
  if (o.hat === "cap") {
    p.fill(hc).ellipse(22, 9.5, 24, 12).rect(10, 9, 24, 4);
    p.fill(shade(hc, -0.2)).rrect(22, 10.5, 15, 4, 2);
    p.fill(0xffffff, 0.8).circle(22, 6.5, 1.8);
  } else if (o.hat === "chef") {
    p.fill(0xe8e8e8).rect(12, 6, 20, 6);
    p.fill(0xffffff).circle(15, 4, 6).circle(22, 1.5, 7).circle(29, 4, 6).rect(12, 5, 20, 5);
  } else if (o.hat === "hair" || o.hat === "headset" || o.hat === "bun") {
    p.fill(hc).ellipse(22, 9.5, 25, 13).rect(11, 9, 3, 8).rect(30, 9, 3, 6);
    p.fill(hc).poly([[12, 11], [26, 8], [20, 14]]);
    if (o.hat === "bun") p.fill(hc).circle(22, 1.5, 5);
    if (o.hat === "headset") {
      p.stroke(2.4, 0x222222).line(11, 12, 16, 3).line(16, 3, 28, 3).line(28, 3, 33, 12);
      p.fill(0x222222).rrect(8, 14, 6, 9, 3).rrect(30, 14, 6, 9, 3);
      p.fill(0xff6fb5).circle(11, 18.5, 1.5).circle(33, 18.5, 1.5);
    }
  }
}

/* ---------- Vehículos ---------- */

def("van", 76, 46);
function drawVan(p: Pen): void {
  p.fill(0x000000, 0.2).ellipse(38, 42, 70, 7);
  p.fill(0xf4f6f7).rrect(3, 6, 54, 30, 6);
  p.fill(0xdfe6e9).rrect(3, 26, 54, 10, 4);
  p.fill(0xf4f6f7).rrect(48, 12, 24, 24, 6);
  p.fill(0x7fc8f8).rrect(55, 15, 14, 10, 3);
  p.fill(0xff9f1c).rect(3, 20, 54, 4);
  p.fill(0xff9f1c).circle(28, 14, 5);
  p.fill(0xffffff).rect(26, 12, 4, 4);
  p.fill(0xffd166).rrect(69, 26, 4, 4, 1);
  for (const x of [18, 58]) {
    p.fill(0x2b2b2b).circle(x, 36, 7);
    p.fill(0xb2bec3).circle(x, 36, 3);
  }
}

const CAR_COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71];
CAR_COLORS.forEach((_, i) => def(`car_${i}`, 44, 34));

/** Coche isométrico orientado hacia abajo-derecha (eje de columnas). */
function drawCar(p: Pen, color: number): void {
  const ux = 0.894, uy = 0.447; // eje de avance
  const vx = -0.894, vy = 0.447; // eje lateral
  const cx = 22, cy = 22;
  const pt = (a: number, b: number, h = 0): [number, number] => [cx + ux * a + vx * b, cy + uy * a + vy * b - h];
  const L = 13, W = 7, H = 7;
  p.fill(0x000000, 0.22).poly([pt(-L, -W), pt(L, -W), pt(L, W), pt(-L, W)].map(([x, y]) => [x, y + 3] as [number, number]));
  // Laterales visibles: frente (+u) y lado (+v)
  p.fill(shade(color, -0.3)).poly([pt(L, -W), pt(L, W), pt(L, W, H), pt(L, -W, H)]);
  p.fill(shade(color, -0.15)).poly([pt(-L, W), pt(L, W), pt(L, W, H), pt(-L, W, H)]);
  p.fill(color).poly([pt(-L, -W, H), pt(L, -W, H), pt(L, W, H), pt(-L, W, H)]);
  // Cabina
  const c = 6;
  p.fill(0x9ad7ff).poly([pt(-6, W - 1, H), pt(c, W - 1, H), pt(c - 2, W - 2, H + 5), pt(-5, W - 2, H + 5)]);
  p.fill(shade(color, 0.25)).poly([pt(-5, -W + 2, H + 5), pt(c - 2, -W + 2, H + 5), pt(c - 2, W - 2, H + 5), pt(-5, W - 2, H + 5)]);
  p.fill(0xfff3b0).circle(...pt(L, W - 2, 3), 1.4).circle(...pt(L, -W + 2, 3), 1.4);
}

/* ---------- Objetos ---------- */

def("item_box", 26, 26);
def("item_dish", 26, 26);
def("item_clip", 26, 26);
def("item_chip", 26, 26);
def("coin", 20, 20);
def("spark", 10, 10);
def("puff", 24, 24);
def("pulley", 34, 34);

function drawItem(p: Pen, key: string): void {
  if (key === "item_box") {
    p.fill(0xc68b4f).rrect(3, 7, 20, 16, 2);
    p.fill(0xa8703b).rect(3, 7, 20, 4);
    p.fill(0xf1d7a8).rect(11, 7, 4, 16);
    p.fill(0xffffff, 0.2).rect(4, 12, 6, 2);
  } else if (key === "item_dish") {
    p.fill(0xffffff).ellipse(13, 18, 24, 9);
    p.fill(0xf39c12).ellipse(13, 14, 16, 9);
    p.fill(0xe74c3c).circle(9, 13, 2.5).circle(15, 12, 2.2).circle(17, 15, 2);
    p.fill(0x27ae60).circle(12, 11, 1.6);
  } else if (key === "item_clip") {
    p.fill(0x2d3436).rrect(3, 10, 20, 13, 2);
    p.fill(0xffffff).poly([[3, 5], [23, 2], [23, 7], [3, 10]]);
    p.fill(0x2d3436).poly([[7, 4.4], [11, 3.8], [9, 8.8], [5, 9.3]]).poly([[15, 3.2], [19, 2.6], [17, 7.6], [13, 8.2]]);
    p.fill(0xff6fb5).circle(13, 16.5, 3);
  } else {
    p.fill(0x2d3436).rrect(4, 4, 18, 18, 3);
    p.fill(0x1abc9c).rrect(8, 8, 10, 10, 2);
    p.fill(0xb2bec3);
    for (let i = 0; i < 4; i++) p.rect(6 + i * 4.3, 1, 2, 3).rect(6 + i * 4.3, 22, 2, 3).rect(1, 6 + i * 4.3, 3, 2).rect(22, 6 + i * 4.3, 3, 2);
    p.fill(0xffffff, 0.6).circle(11, 11, 1.4);
  }
}

function drawCoin(p: Pen): void {
  p.fill(0xb7860b).circle(10, 10.8, 9);
  p.fill(0xf5c542).circle(10, 10, 9);
  p.fill(0xffe082).circle(10, 10, 6.5);
  p.fill(0xd4a017).rect(9, 5.5, 2, 9);
  p.fill(0xffffff, 0.7).circle(7, 6.5, 1.8);
}

function drawPulley(p: Pen): void {
  p.fill(0x5d6d7e).circle(17, 17, 16);
  p.fill(0x85929e).circle(17, 17, 12);
  p.stroke(3, 0x5d6d7e).line(17, 6, 17, 28).line(6, 17, 28, 17).line(9, 9, 25, 25).line(25, 9, 9, 25);
  p.fill(0x2c3e50).circle(17, 17, 4);
}

/* ---------- Estaciones de trabajo (interior) ---------- */

for (const k of ["st_dropship", "st_restaurant", "st_tiktok", "st_ai"]) def(k, 100, 86);

function drawStation(p: Pen, key: string): void {
  p.fill(0x000000, 0.18).ellipse(50, 82, 92, 8);
  if (key === "st_dropship") {
    p.fill(0x6d4c41).rect(8, 6, 6, 78).rect(86, 6, 6, 78);
    for (const y of [26, 52, 78]) p.fill(0x8d6e63).rect(6, y, 88, 5);
    const box = (x: number, y: number, w: number, h: number, c: number) => {
      p.fill(c).rrect(x, y, w, h, 2);
      p.fill(shade(c, -0.15)).rect(x, y, w, 3);
      p.fill(0xf1d7a8).rect(x + w / 2 - 2, y, 4, h);
    };
    box(18, 10, 20, 16, 0xc68b4f); box(42, 14, 16, 12, 0xd7a86e); box(62, 8, 22, 18, 0xc68b4f);
    box(16, 36, 24, 16, 0xd7a86e); box(46, 32, 18, 20, 0xc68b4f); box(68, 40, 16, 12, 0xb07a44);
    box(20, 62, 18, 16, 0xc68b4f); box(42, 60, 24, 18, 0xd7a86e); box(70, 64, 14, 14, 0xc68b4f);
  } else if (key === "st_restaurant") {
    p.fill(0x95a5a6).rrect(6, 40, 88, 44, 6);
    p.fill(0xbdc3c7).rrect(6, 36, 88, 10, 4);
    p.fill(0x2c3e50).rrect(22, 56, 56, 22, 4);
    p.fill(0xe67e22, 0.8).rrect(26, 60, 48, 14, 3);
    for (const x of [30, 70]) {
      p.fill(0x3498db).ellipse(x, 36, 20, 6);
      p.fill(0x7f8c8d).rrect(x - 13, 14, 26, 22, 5);
      p.fill(0x95a5a6).rrect(x - 13, 14, 26, 6, 3);
      p.fill(0x2c3e50).rrect(x - 3, 9, 6, 5, 2);
    }
  } else if (key === "st_tiktok") {
    p.stroke(2.5, 0x2d3436).line(50, 44, 30, 84).line(50, 44, 70, 84).line(50, 44, 50, 84);
    p.stroke(9, 0xffffff, 0.35).scircle(50, 30, 24);
    p.stroke(6, 0xfdfdfd).scircle(50, 30, 24);
    p.fill(0x2d3436).rrect(42, 16, 16, 28, 4);
    p.fill(0x00cec9).rrect(44, 19, 12, 22, 2);
    p.fill(0xff6fb5).circle(50, 30, 3);
    p.fill(0xffeaa7).rrect(78, 58, 16, 24, 3);
    p.fill(0xfd79a8).rrect(4, 60, 20, 22, 3);
  } else {
    p.fill(0x1e272e).rrect(18, 2, 64, 82, 5);
    p.fill(0x2f3640);
    for (let i = 0; i < 6; i++) p.rrect(22, 6 + i * 13, 56, 10, 2);
    for (let i = 0; i < 6; i++) {
      p.fill(0x00d2d3).circle(28, 11 + i * 13, 1.8);
      p.fill(i % 2 ? 0x2ecc71 : 0xf5c542).circle(34, 11 + i * 13, 1.8);
      p.fill(0x485460).rect(44, 9 + i * 13, 30, 4);
    }
  }
}

/* ---------- Ciudad ---------- */

def("tree_0", 56, 72);
def("tree_1", 48, 76);
def("bush", 36, 24);
def("cloud", 150, 64);
def("sign_sale", 112, 92);
def("lamp_post", 16, 56);

function drawTree(p: Pen, variant: number): void {
  if (variant === 0) {
    p.fill(0x000000, 0.2).ellipse(28, 66, 40, 11);
    p.fill(0x7b4f2c).rrect(25, 44, 7, 24, 3);
    p.fill(0x2e8b57).circle(28, 32, 20);
    p.fill(0x3cb371).circle(20, 28, 13).circle(35, 26, 12).circle(28, 18, 13);
    p.fill(0x7ddc8f, 0.6).circle(22, 20, 5).circle(33, 17, 4);
  } else {
    p.fill(0x000000, 0.2).ellipse(24, 70, 34, 9);
    p.fill(0x6d4c41).rrect(21, 56, 6, 16, 2);
    p.fill(0x1e7a4c).poly([[24, 4], [44, 60], [4, 60]]);
    p.fill(0x27ae60).poly([[24, 4], [38, 42], [10, 42]]);
    p.fill(0x58d68d, 0.6).poly([[24, 6], [30, 24], [20, 24]]);
  }
}

function drawBush(p: Pen): void {
  p.fill(0x000000, 0.18).ellipse(18, 20, 32, 7);
  p.fill(0x2e8b57).circle(11, 14, 8).circle(24, 13, 9);
  p.fill(0x3cb371).circle(17, 10, 8);
  p.fill(0xff7eb6).circle(12, 9, 1.8).circle(25, 9, 1.8).circle(19, 5, 1.6);
}

function drawCloud(p: Pen): void {
  p.fill(0xffffff, 0.95).circle(40, 38, 20).circle(70, 28, 26).circle(102, 36, 20).circle(122, 44, 12).ellipse(76, 48, 130, 22);
  p.fill(0xdfefff, 0.9).ellipse(76, 54, 118, 10);
}

function drawSaleSign(p: Pen): void {
  p.fill(0x6d4c41).rect(52, 50, 8, 40);
  p.fill(0x000000, 0.2).ellipse(56, 88, 30, 6);
  p.fill(0xb2361d).rrect(4, 4, 104, 54, 12);
  p.fill(0xffffff).rrect(4, 2, 104, 52, 12);
  p.stroke(3, 0xff6b5b).srrect(8, 6, 96, 44, 9);
  p.fill(0xff6b5b).rrect(30, -2, 52, 12, 6);
}

def("lamp_post", 16, 56);
function drawLampPost(p: Pen): void {
  p.fill(0x000000, 0.2).ellipse(8, 53, 12, 4);
  p.fill(0x34495e).rect(7, 10, 2.5, 44);
  p.fill(0x2c3e50).rrect(3, 5, 10, 7, 3);
  p.fill(0xfff3b0).circle(8, 11, 3);
}

/* ---------- Edificios isométricos ---------- */

const BLD_W = 172;
const BLD: Record<string, number> = { dropship: 150, restaurant: 164, tiktok: 236, ai: 270, soon: 170 };
for (const [id, h] of Object.entries(BLD)) def(`bld_${id}`, BLD_W, h);

function drawBuilding(p: Pen, id: string, emoji: (x: number, y: number, ch: string, s: number) => void): void {
  const h = BLD[id];
  const cx = BLD_W / 2;
  const by = h - 6;
  const a = 74;
  const b = 37;
  // Sombra y acera del solar
  p.fill(0x000000, 0.18).poly([[cx - a - 6, by - b + 4], [cx + 6, by + 5], [cx + a + 10, by - b + 2], [cx, by - 2 * b - 2]]);
  p.fill(0xd5d8dc).poly([[cx - a, by - b], [cx, by], [cx + a, by - b], [cx, by - 2 * b]]);

  const win = (f: (u: number, v: number) => [number, number], cols: number, rows: number, v0: number, v1: number, color: number, lit = 0) => {
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const u0 = 0.1 + (c / cols) * 0.82;
        const u1 = u0 + 0.82 / cols - 0.06;
        const vv0 = v0 + (r / rows) * (v1 - v0);
        const vv1 = vv0 + (v1 - v0) / rows - 5;
        p.fill((c + r * 3) % 5 < lit ? 0xffe8a3 : color).poly(faceQuad(f, u0, u1, vv0, vv1));
      }
  };

  if (id === "dropship") {
    const H = 52, wall = 0xe8b04b;
    isoBox(p, cx, by - 6, a - 8, b - 4, H, wall, 0xb0b6bf);
    const L = leftFace(cx, by - 6, a - 8, b - 4);
    const R = rightFace(cx, by - 6, a - 8, b - 4);
    // Persianas de carga
    for (const u of [0.12, 0.45]) {
      p.fill(0x7f8c8d).poly(faceQuad(R, u, u + 0.28, 0, 30));
      p.stroke(1, 0x5d6d7e);
      for (let v = 4; v < 30; v += 5) { const q = faceQuad(R, u, u + 0.28, v, v); p.line(q[0][0], q[0][1], q[1][0], q[1][1]); }
    }
    win(L, 3, 1, 26, 44, 0x9fd6f5);
    p.fill(0xff9f1c).poly(faceQuad(L, 0, 1, 12, 16));
    // Ventilaciones en el tejado
    p.fill(0x7f8c8d).rrect(cx - 30, by - 6 - H - 50, 14, 10, 3).rrect(cx + 10, by - 6 - H - 40, 14, 10, 3);
    p.fill(0xffffff).rrect(cx - 26, by - H - 96, 52, 34, 9);
    emoji(cx, by - H - 79, "📦", 22);
  } else if (id === "restaurant") {
    const H = 58, wall = 0xc0392b;
    isoBox(p, cx, by - 6, a - 8, b - 4, H, wall, 0x7b241c);
    const L = leftFace(cx, by - 6, a - 8, b - 4);
    const R = rightFace(cx, by - 6, a - 8, b - 4);
    win(L, 3, 1, 14, 40, 0xffe8a3, 5);
    win(R, 2, 1, 26, 44, 0xffe8a3, 5);
    p.fill(0x6d4c41).poly(faceQuad(R, 0.62, 0.84, 0, 24));
    // Toldo de rayas
    for (let i = 0; i < 8; i++) {
      const u0 = i / 8, u1 = (i + 1) / 8;
      const top = faceQuad(R, u0, u1, 30, 30);
      p.fill(i % 2 ? 0xffffff : 0xe74c3c).poly([top[0], top[1], [top[1][0] + 8, top[1][1] + 12], [top[0][0] + 8, top[0][1] + 12]]);
    }
    p.fill(0x7f8c8d).rrect(cx + 18, by - H - 70, 12, 22, 2);
    p.fill(0xffffff).rrect(cx - 30, by - H - 100, 60, 36, 10);
    emoji(cx, by - H - 82, "🍝", 22);
  } else if (id === "tiktok") {
    const H = 140, wall = 0x6c5ce7;
    isoBox(p, cx, by - 6, a - 18, b - 9, H, wall, 0x4834d4);
    const L = leftFace(cx, by - 6, a - 18, b - 9);
    const R = rightFace(cx, by - 6, a - 18, b - 9);
    win(L, 3, 6, 10, H - 8, 0xa29bfe, 1);
    win(R, 3, 6, 10, H - 8, 0x8e84f5, 1);
    p.stroke(6, 0xff6fb5, 0.4).scircle(cx, by - H - 50, 26);
    p.stroke(3, 0xffffff).scircle(cx, by - H - 50, 26);
    p.stroke(3, 0x00cec9).scircle(cx, by - H - 50, 20);
    emoji(cx, by - H - 50, "📱", 20);
  } else if (id === "ai") {
    const H = 160, wall = 0x16a085;
    isoBox(p, cx, by - 6, a - 16, b - 8, H, wall, 0x0e6655);
    const L = leftFace(cx, by - 6, a - 16, b - 8);
    const R = rightFace(cx, by - 6, a - 16, b - 8);
    win(L, 4, 8, 8, H - 6, 0x76d7c4, 1);
    win(R, 4, 8, 8, H - 6, 0x48c9b0, 1);
    isoBox(p, cx, by - 6 - H - 2 + 20 - 20, a - 40, b - 20, 26, 0x1abc9c, 0x117a65);
    p.stroke(2, 0x2c3e50).line(cx, by - H - 70, cx, by - H - 100);
    p.fill(0xff4757).circle(cx, by - H - 101, 3.5);
    p.fill(0xffffff).rrect(cx - 24, by - H - 64, 48, 30, 9);
    emoji(cx, by - H - 49, "🤖", 20);
  } else {
    // En obras
    p.fill(0xb58b5a).poly([[cx - a, by - b], [cx, by], [cx + a, by - b], [cx, by - 2 * b]]);
    p.stroke(2, 0x95a5a6);
    for (let i = 0; i < 4; i++) {
      p.line(cx - 50 + i * 14, by - 30 + i * 7, cx - 50 + i * 14, by - 110 + i * 7);
      p.line(cx + 10 + i * 12, by - 20 - i * 6, cx + 10 + i * 12, by - 100 - i * 6);
    }
    for (let y = 0; y < 4; y++) p.line(cx - 52, by - 40 - y * 22, cx + 50, by - 30 - y * 22 - 20);
    p.stroke(4, 0xf5c542).line(cx + 40, by - 20, cx + 40, by - 150).line(cx - 40, by - 150, cx + 70, by - 150);
    p.stroke(1.5, 0x2d3436).line(cx - 30, by - 150, cx - 30, by - 110);
    p.fill(0xc68b4f).rrect(cx - 38, by - 112, 16, 12, 2);
  }
}

/* ---------- Generación ---------- */

type EmojiFn = (x: number, y: number, ch: string, size: number) => void;

function make(scene: Phaser.Scene, key: string, k: number, draw: (p: Pen, emoji: EmojiFn) => void): void {
  if (scene.textures.exists(key)) return; // hay un PNG que lo sustituye
  const spec = ART[key];
  const g = scene.make.graphics({}, false);
  const p = new Pen(g, k);
  const emojis: { x: number; y: number; ch: string; size: number }[] = [];
  draw(p, (x, y, ch, size) => emojis.push({ x, y, ch, size }));
  const dt = scene.textures.addDynamicTexture(key, Math.ceil(spec.w * k), Math.ceil(spec.h * k));
  if (!dt) return;
  dt.draw(g, 0, 0);
  for (const e of emojis) {
    const t = scene.make.text({ text: e.ch, style: { fontFamily: EMOJI_FONT, fontSize: `${e.size * k}px`, padding: { top: 4 * k, bottom: 4 * k } } }, false);
    t.setOrigin(0.5);
    dt.draw(t, e.x * k, e.y * k);
    t.destroy();
  }
  g.destroy();
}

/** Crea todas las texturas que no se hayan cargado como PNG. */
export function buildArt(scene: Phaser.Scene, k: number): void {
  for (const [role, look] of Object.entries(LOOKS)) for (const f of [0, 1, 2]) make(scene, `ch_${role}_${f}`, k, (p) => drawChar(p, look, f));
  make(scene, "van", k, drawVan);
  CAR_COLORS.forEach((c, i) => make(scene, `car_${i}`, k, (p) => drawCar(p, c)));
  for (const key of ["item_box", "item_dish", "item_clip", "item_chip"]) make(scene, key, k, (p) => drawItem(p, key));
  make(scene, "coin", k, drawCoin);
  make(scene, "spark", k, (p) => p.fill(0xffffff).circle(5, 5, 5));
  make(scene, "puff", k, (p) => p.fill(0xffffff, 0.8).circle(12, 12, 11));
  make(scene, "pulley", k, drawPulley);
  for (const key of ["st_dropship", "st_restaurant", "st_tiktok", "st_ai"]) make(scene, key, k, (p) => drawStation(p, key));
  make(scene, "tree_0", k, (p) => drawTree(p, 0));
  make(scene, "tree_1", k, (p) => drawTree(p, 1));
  make(scene, "bush", k, drawBush);
  make(scene, "cloud", k, drawCloud);
  make(scene, "sign_sale", k, drawSaleSign);
  make(scene, "lamp_post", k, drawLampPost);
  for (const id of Object.keys(BLD)) make(scene, `bld_${id}`, k, (p, e) => drawBuilding(p, id, e));
}

/** Imagen con el tamaño lógico del catálogo, venga de PNG o de código. */
export function art(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  const spec = ART[key];
  const img = scene.add.image(x, y, key);
  if (spec) img.setDisplaySize(spec.w, spec.h);
  return img;
}

/** Escala para partículas: tamaño lógico / tamaño real de la textura. */
export function artScale(scene: Phaser.Scene, key: string): number {
  const spec = ART[key];
  const src = scene.textures.get(key).getSourceImage() as { width: number };
  return spec && src?.width ? spec.w / src.width : 1;
}
