import { BIKE_SIZES } from "./bikeSizes";
import { ensureRankArt } from "./rankArt";
import { artRef, hasGeneratedArt } from "./generated";
import Phaser from "phaser";
import { EMOJI_FONT } from "../scenes/common";
import { ALL_BUSINESSES, CITIES } from "../game/data";
import { LUXURY } from "../game/luxury";
import { Pen, faceQuad, isoBox, leftFace, rightFace, shade } from "./pen";

/**
 * Catálogo de arte del juego. Cada clave tiene un tamaño lógico (px CSS).
 * Si existe `public/sprites/<clave>.png` se usa ese PNG; si no, se dibuja por código.
 * Ver docs/ART.md para los prompts de cada pieza.
 */
export const ART: Record<string, { w: number; h: number }> = {};

const def = (key: string, w: number, h: number) => (ART[key] = { w, h });

for (const district of ["madrid","miami","dubai","industrial","terrace","neon"]) def(`district_${district}`, 270, 190);

for (const district of ['technology','foodcourt','beachfront','marina','residential','financial','dealership','hotelfront','desertcamp','market','construction']) def(`district_${district}`,270,190);
for (const key of ['veh_excursion','prop_sold','ch_vip_client','ch_jeweler','ch_foodie','ch_inspector','prop_dj','ch_photographer','prop_mining','prop_blueprints']) def(key,96,82);

/* Restaurant furnishings and distinct cooking / walking animation poses. */
def("rest_table_empty", 100, 84);
def("rest_table_served", 100, 84);
def("rest_counter", 120, 86);
def("rest_host", 42, 55);
for (const role of ["chef", "waiter", "guest"]) for (const pose of ["a", "b"]) def(`rest_${role}_${pose}`, 44, 60);
def("rest_seated_man", 40, 50);
def("rest_seated_woman", 40, 50);

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
  taquero: { skin: 0xc68642, shirt: 0xff9f43, pants: 0x2d3436, hat: "cap", hatColor: 0xee5253, extra: "apron", extraColor: 0x10ac84 },
  skater: { skin: 0xf1c27d, shirt: 0x48dbfb, pants: 0x576574, hat: "cap", hatColor: 0xff6b6b },
  vendor: { skin: 0x8d5524, shirt: 0xfeca57, pants: 0x0abde3, hat: "hair", hatColor: 0x1b1b1b },
  bartender: { skin: 0xe0ac69, shirt: 0x1dd1a1, pants: 0x222f3e, hat: "hair", hatColor: 0x3d2b1f, extra: "bowtie", extraColor: 0xff6b6b },
  promoter: { skin: 0xf5cba7, shirt: 0xff6fb5, pants: 0x222f3e, hat: "bun", hatColor: 0xf0c05a, extra: "glasses", extraColor: 0x111111 },
  captain: { skin: 0xf1c27d, shirt: 0xffffff, pants: 0x1e3799, hat: "cap", hatColor: 0x0c2461, extra: "tie", extraColor: 0xf5c542 },
  sailor: { skin: 0xc68642, shirt: 0x4a69bd, pants: 0xffffff, hat: "cap", hatColor: 0xffffff },
  agent: { skin: 0xe0ac69, shirt: 0xf8c291, pants: 0x3c6382, hat: "hair", hatColor: 0x6e4b2a, extra: "glasses", extraColor: 0x3c6382 },
  broker: { skin: 0xf5cba7, shirt: 0x576574, pants: 0x222f3e, hat: "hair", hatColor: 0xa0522d, extra: "tie", extraColor: 0xfeca57 },
  clerk: { skin: 0x8d5524, shirt: 0xc8d6e5, pants: 0x576574, hat: "bun", hatColor: 0x222222 },
  coder: { skin: 0xf1c27d, shirt: 0x341f97, pants: 0x222f3e, hat: "headset", hatColor: 0x2d3436 },
  trader: { skin: 0xc68642, shirt: 0x10ac84, pants: 0x222f3e, hat: "hair", hatColor: 0x111111, extra: "tie", extraColor: 0x341f97 },
  mechanic: { skin: 0xe0ac69, shirt: 0xe84118, pants: 0x2f3640, hat: "cap", hatColor: 0x222222, extra: "vest", extraColor: 0xe84118 },
  valet: { skin: 0xf1c27d, shirt: 0xffffff, pants: 0x222222, hat: "hair", hatColor: 0x392b24, extra: "bowtie", extraColor: 0xe84118 },
  butler: { skin: 0xc68642, shirt: 0xfff8e7, pants: 0x1b2631, hat: "hair", hatColor: 0x392b24, extra: "tie", extraColor: 0xf5c542 },
  guide: { skin: 0xc68642, shirt: 0xdcc397, pants: 0xb89564, hat: "cap", hatColor: 0xe7d0a7, extra: "glasses", extraColor: 0x222222 },
  goldsmith: { skin: 0xe0ac69, shirt: 0xf7dfb2, pants: 0x62432b, hat: "hair", hatColor: 0x706254, extra: "apron", extraColor: 0x9a6236 },
  builder: { skin: 0xf1c27d, shirt: 0xffa13b, pants: 0x34495e, hat: "cap", hatColor: 0xfff8e7, extra: "vest", extraColor: 0xff9f1c },
  ped0: { skin: 0xf1c27d, shirt: 0xe74c3c, pants: 0x34495e, hat: "hair", hatColor: 0x2c1e12 },
  ped1: { skin: 0x8d5524, shirt: 0xf1c40f, pants: 0x2980b9, hat: "bun", hatColor: 0x111111 },
  ped2: { skin: 0xe0ac69, shirt: 0x27ae60, pants: 0x7f8c8d, hat: "cap", hatColor: 0x8e44ad },
};

/**
 * Qué arte usa cada negocio en su recinto. `mover` recorre los puestos recogiendo
 * y `seller` sale a vender; si empiezan por "car_" son vehículos, si no, personajes.
 */
export const BIZ_ART: Record<string, { worker: string; mover: string; seller: string; item: string; station: string }> = {
  // Bike originals are selected per stop/pose by RouteScene; these remain explicit missing-file fallbacks.
  bike: { worker: "cook", mover: "rider", seller: "ped1", item: "item_dish", station: "st_restaurant" },
  dropship: { worker: "packer", mover: "veh_forklift", seller: "veh_van", item: "item_box", station: "st_dropship" },
  restaurant: { worker: "cook", mover: "waiter", seller: "rider", item: "item_dish", station: "st_restaurant" },
  tiktok: { worker: "creator", mover: "editor", seller: "brand", item: "item_clip", station: "st_tiktok" },
  ai: { worker: "engineer", mover: "tech", seller: "sales", item: "item_chip", station: "st_ai" },
  foodtruck: { worker: "taquero", mover: "skater", seller: "vendor", item: "item_taco", station: "st_foodtruck" },
  // La feria del evento (arte provisional: el de los food trucks; arte propio en docs/VISUAL.md §14.3)
  fest: { worker: "taquero", mover: "skater", seller: "vendor", item: "item_taco", station: "st_foodtruck" },
  beachclub: { worker: "bartender", mover: "waiter", seller: "promoter", item: "item_cocktail", station: "st_beachclub" },
  yachts: { worker: "captain", mover: "sailor", seller: "agent", item: "item_ticket", station: "st_yachts" },
  realestate: { worker: "broker", mover: "clerk", seller: "sales", item: "item_key", station: "st_realestate" },
  crypto: { worker: "coder", mover: "tech", seller: "trader", item: "item_token", station: "st_crypto" },
  supercars: { worker: "mechanic", mover: "veh_flatbed", seller: "valet", item: "item_carkey", station: "st_supercars" },
  hotel: { worker: "butler", mover: "veh_luggage", seller: "valet", item: "item_bell", station: "st_hotel" },
  safari: { worker: "guide", mover: "veh_safari", seller: "guide", item: "item_camel", station: "st_safari" },
  souk: { worker: "goldsmith", mover: "goldsmith", seller: "veh_goldvan", item: "item_ring", station: "st_souk" },
  tower: { worker: "builder", mover: "veh_crane", seller: "builder", item: "item_beam", station: "st_tower" },
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
  // Soft rim outline and warm highlights keep silhouettes readable at small sizes.
  p.fill(0x203647).rrect(11, 25, 22, 19, 7);
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
  p.fill(shade(o.shirt, 0.4), 0.65).rrect(14, 28, 5, 3, 1.5);
  // Cabeza
  p.fill(shade(o.skin, -0.35)).circle(22, 17.5, 11.8);
  p.fill(o.skin).circle(22, 17, 11).circle(11.5, 18, 2.6).circle(32.5, 18, 2.6);
  p.fill(shade(o.skin, 0.4), 0.45).ellipse(18, 14, 8, 5);
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
// Vehículos propios del almacén (solo PNG; sin PNG se usa un coche): carretilla elevadora y furgoneta de reparto.
def("veh_forklift", 68, 64);
for (const key of ["wh_forklift_loaded", "wh_forklift_rear"]) def(key, 68, 64);
def("veh_van", 88, 66);
for (const key of ["wh_van_rear", "wh_van_open"]) def(key, 88, 66);
def("wh_shelf", 128, 126);
def("wh_pallet", 54, 46);
def("wh_dock", 140, 100);

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
const MIAMI_ITEMS = ["item_taco", "item_cocktail", "item_ticket", "item_key", "item_token"];
for (const k of [...MIAMI_ITEMS, "item_carkey", "item_bell", "item_camel", "item_ring", "item_beam"]) def(k, 26, 26);
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
  } else if (key === "item_taco") {
    p.fill(0xf6c453).poly([[2, 20], [13, 6], [24, 20]]);
    p.fill(0x6ab04c).ellipse(13, 13, 16, 6);
    p.fill(0xeb4d4b).circle(9, 12, 2).circle(16, 11, 2);
    p.fill(0xe1a730).ellipse(13, 20, 24, 7);
    p.fill(0xffffff, 0.35).circle(8, 17, 1.5);
  } else if (key === "item_cocktail") {
    p.fill(0xffffff, 0.8).poly([[4, 4], [22, 4], [13, 15]]);
    p.fill(0xff6b81).poly([[6, 6], [20, 6], [13, 13]]);
    p.fill(0xffffff, 0.9).rect(12, 14, 2, 8).ellipse(13, 23, 12, 3);
    p.fill(0xfeca57).circle(20, 5, 3.5);
    p.stroke(1.4, 0x10ac84).line(9, 1, 14, 9);
  } else if (key === "item_ticket") {
    p.fill(0x1e3799).rrect(2, 7, 22, 13, 2);
    p.fill(0xffffff).rrect(4, 9, 13, 9, 1);
    p.fill(0x1e3799).poly([[6, 15], [15, 15], [13, 12], [9, 12]]);
    p.fill(0xf5c542).circle(21, 13.5, 2);
  } else if (key === "item_key") {
    p.fill(0xc49b1a).circle(8, 12, 6.5);
    p.fill(0xf5c542).circle(8, 11, 6.5);
    p.fill(0x2d3436, 0.6).circle(8, 11, 2.5);
    p.fill(0xf5c542).rect(13, 10, 11, 3).rect(19, 13, 2, 4).rect(22, 13, 2, 3);
  } else if (key === "item_token") {
    p.fill(0xb35a00).circle(13, 14, 11);
    p.fill(0xff9f1a).circle(13, 13, 11);
    p.fill(0xffc36b).circle(13, 13, 8);
    p.fill(0xb35a00).rect(10, 8, 2, 10).rect(14, 8, 2, 10).rect(9, 8, 7, 2).rect(9, 12, 8, 2).rect(9, 16, 8, 2);
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

const STATIONS = ["st_dropship", "st_restaurant", "st_tiktok", "st_ai", "st_foodtruck", "st_beachclub", "st_yachts", "st_realestate", "st_crypto", "st_supercars", "st_hotel", "st_safari", "st_souk", "st_tower"];
for (const k of STATIONS) def(k, 100, 86);

function drawStation(p: Pen, key: string): void {
  p.fill(0x000000, 0.18).ellipse(50, 82, 92, 8);
  // Enamel bases and material highlights, common to the nine workstation sets.
  p.fill(0x30485b).rrect(3, 77, 94, 8, 4);
  p.fill(0xaac2d3).rrect(5, 76, 90, 5, 3);
  if (key === "st_dropship") {
    p.fill(0x6d4c41).rect(8, 6, 6, 78).rect(86, 6, 6, 78);
    for (const y of [26, 52, 78]) {
      p.fill(0x8d6e63).rect(6, y, 88, 5);
      p.fill(0xd6aa78).rect(6, y, 88, 1.5);
      p.fill(0xf6e5b4).rrect(8, y + 1, 11, 3, 1);
    }
    p.fill(0xcaae86).rect(9, 8, 1.5, 66).rect(87, 8, 1.5, 66);
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
    p.fill(0xecf7fb).rrect(8, 36, 84, 2, 1);
    for (const x of [16, 34, 52, 70, 86]) {
      p.fill(0x273f51).circle(x, 49, 3);
      p.fill(0xf5cc72).circle(x - 0.5, 48.5, 1.2);
    }
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
    p.fill(0x293749).rrect(7, 27, 11, 17, 3);
    p.fill(0x64e5e4).rrect(9, 29, 7, 12, 2);
    p.stroke(2, 0x293749).line(12, 44, 12, 64).line(12, 64, 5, 75).line(12, 64, 20, 75);
    p.fill(0xffeaa7).rrect(78, 58, 16, 24, 3);
    p.fill(0xfd79a8).rrect(4, 60, 20, 22, 3);
  } else if (key === "st_foodtruck") {
    p.fill(0xff9f43).rrect(6, 20, 80, 50, 8);
    p.fill(0xee5253).rrect(6, 14, 80, 12, 5);
    p.fill(0x222f3e).rrect(18, 30, 44, 22, 3);
    p.fill(0xfeca57).rrect(20, 32, 40, 18, 2);
    p.fill(0xffffff).rrect(14, 50, 56, 5, 2);
    p.fill(0xffffff).rrect(66, 28, 14, 30, 3);
    p.fill(0x48dbfb).rrect(68, 30, 10, 12, 2);
    for (const x of [22, 70]) {
      p.fill(0x2b2b2b).circle(x, 72, 8);
      p.fill(0xb2bec3).circle(x, 72, 3.5);
    }
    p.fill(0x10ac84).poly([[30, 2], [52, 2], [48, 14], [34, 14]]);
  } else if (key === "st_beachclub") {
    p.fill(0x8e6e53).rrect(4, 44, 92, 36, 6);
    p.fill(0xb08968).rrect(4, 40, 92, 10, 4);
    p.fill(0x1dd1a1).rect(4, 56, 92, 4);
    p.fill(0x6d4c41).rect(48, 6, 4, 38);
    for (let i = 0; i < 6; i++) p.fill(i % 2 ? 0xffffff : 0xff6b81).poly([[50, 2], [8 + i * 14, 22], [22 + i * 14, 22]]);
    for (const [x, c] of [[18, 0xff6b81], [34, 0xfeca57], [66, 0x48dbfb], [82, 0x1dd1a1]] as [number, number][]) {
      p.fill(0xffffff, 0.85).rrect(x - 4, 30, 8, 10, 2);
      p.fill(c).rect(x - 3, 32, 6, 5);
    }
  } else if (key === "st_yachts") {
    p.fill(0x0abde3).rrect(0, 50, 100, 34, 8);
    p.fill(0x48dbfb, 0.6).rect(6, 64, 30, 2).rect(56, 74, 34, 2);
    p.fill(0x8e6e53).rect(2, 44, 96, 8);
    p.fill(0x6d4c41).rect(8, 44, 4, 30).rect(88, 44, 4, 30);
    p.fill(0xffffff).poly([[10, 30], [90, 30], [80, 50], [18, 50]]);
    p.fill(0x1e3799).rect(14, 42, 72, 3);
    p.fill(0xf5f6fa).rrect(30, 16, 40, 16, 5);
    p.fill(0x0c2461).rrect(34, 19, 32, 7, 2);
    p.fill(0xdfe6e9).rrect(42, 6, 18, 12, 4);
  } else if (key === "st_realestate") {
    p.fill(0x8395a7).rrect(8, 48, 84, 34, 4);
    p.fill(0xc8d6e5).rrect(8, 44, 84, 8, 3);
    p.fill(0x576574).rrect(28, 16, 44, 30, 4);
    p.fill(0x222f3e).rrect(31, 19, 38, 23, 2);
    p.fill(0xfeca57).poly([[38, 36], [50, 26], [62, 36]]).rect(42, 36, 16, 5);
    p.fill(0xffffff).rrect(74, 30, 14, 16, 2);
    p.fill(0x10ac84).circle(20, 36, 8);
    p.fill(0x6d4c41).rect(18, 42, 4, 6);
  } else if (key === "st_crypto") {
    p.fill(0x1e272e).rrect(10, 2, 80, 82, 5);
    p.fill(0x341f97).rrect(14, 6, 72, 40, 3);
    p.stroke(2.4, 0x1dd1a1).line(18, 38, 30, 28).line(30, 28, 40, 32).line(40, 32, 54, 16).line(54, 16, 64, 22).line(64, 22, 82, 10);
    p.fill(0x2f3640);
    for (let i = 0; i < 3; i++) p.rrect(14, 50 + i * 11, 72, 8, 2);
    for (let i = 0; i < 3; i++) {
      p.fill(0xff9f1a).circle(20, 54 + i * 11, 1.8);
      p.fill(0x1dd1a1).circle(26, 54 + i * 11, 1.8);
    }
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
def("palm", 60, 84);
def("cloud", 150, 64);
def("sign_sale", 112, 92);
def("lamp_post", 16, 56);
def("bench", 44, 36);
def("recycling_bin", 26, 40);
for (let i = 0; i < 8; i++) def(`exec_${i}`, 96, 96);
def("ic_gem", 64, 64);
def("chest_normal", 96, 96);
def("chest_premium", 96, 96);

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

function drawPalm(p: Pen): void {
  p.fill(0x000000, 0.2).ellipse(30, 79, 34, 9);
  // Tronco curvado por segmentos
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = 26 + Math.sin(t * 1.4) * 8;
    const y = 78 - t * 56;
    p.fill(i % 2 ? 0xa47148 : 0x8b5a2b).ellipse(x, y, 9 - t * 2, 8);
  }
  const top: [number, number] = [34, 22];
  const leaf = (dx: number, dy: number, c: number) =>
    p.fill(c).poly([top, [top[0] + dx * 0.5 - dy * 0.18, top[1] + dy * 0.5 + dx * 0.18 - 4], [top[0] + dx, top[1] + dy], [top[0] + dx * 0.5 + dy * 0.12, top[1] + dy * 0.5 - dx * 0.12 + 3]]);
  leaf(-28, 10, 0x1e8449);
  leaf(26, 12, 0x1e8449);
  leaf(-22, -12, 0x27ae60);
  leaf(22, -10, 0x27ae60);
  leaf(-4, -20, 0x2ecc71);
  leaf(-10, 22, 0x229954);
  leaf(12, 20, 0x229954);
  p.fill(0x6d4c41).circle(32, 25, 3).circle(37, 26, 3);
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
def("bench", 44, 36);
def("recycling_bin", 26, 40);
for (let i = 0; i < 8; i++) def(`exec_${i}`, 96, 96);
def("ic_gem", 64, 64);
def("chest_normal", 96, 96);
def("chest_premium", 96, 96);
function drawLampPost(p: Pen): void {
  p.fill(0x000000, 0.2).ellipse(8, 53, 12, 4);
  p.fill(0x34495e).rect(7, 10, 2.5, 44);
  p.fill(0x2c3e50).rrect(3, 5, 10, 7, 3);
  p.fill(0xfff3b0).circle(8, 11, 3);
}

/* Shared visual completion sources: physical visitors, seasonal props and city decorations. */
def("veh_order", 82, 60);
def("ch_critic_0", 66, 66);
def("prop_broadcast", 74, 68);
def("prop_research", 78, 70);
def("desert_palm", 60, 84);
def("veh_supply", 96, 78);
def("ic_hand", 26, 28);
def("ic_manager", 18, 18);
def("ic_construction", 32, 24);
def("ch_vip_0", 48, 68);
def("ghost", 64, 64);
def("pumpkin", 40, 40);
def("dubai_planter", 58, 76);
def("miami_plaza", 66, 80);
def("veh_safari", 62, 48);
def("veh_crane", 68, 60);
for (const key of ["veh_luggage", "veh_flatbed", "veh_goldvan"]) def(key, 68, 54);
for (const key of ["car_miami_0", "car_miami_1"]) def(key, 44, 34);
def("dubai_lamp", 22, 60);
for (const id of ["dropship", "restaurant", "tiktok", "ai", "supercars", "hotel", "safari", "souk", "tower", "foodtruck", "beachclub", "yachts", "realestate", "crypto"])
  for (const tier of [2, 3]) def(`decor_${id}_${tier}`, 66, 80);

/* ---------- Arte por rango (bronce … leyenda, ver src/game/ranks.ts y docs/ART.md, «Rangos») ---------- */

/**
 * Cada pieza del recinto puede tener una versión por rango: `<clave>_r1` (bronce) … `<clave>_r5` (leyenda).
 * Personajes: `ch_<rol>_r<n>_<pose>`. Si no existe la del rango, se usa la del rango anterior y, si
 * no hay ninguna, la normal. Se registran las claves; sin PNG específico se compone una mejora sobre el arte base.
 */
export const RANK_LEVELS = [1, 2, 3, 4, 5];

/** El coche del personaje («Mi vida») circulando por la ciudad: `luxcar_<id>` (atlas o PNG). */
for (const i of LUXURY) if (i.cat === "car") def(`luxcar_${i.id}`, 50, 42);
for (const n of RANK_LEVELS) {
  def(`rank_${n}`, 24, 24);
  for (const k of [...STATIONS, "wh_shelf", "veh_forklift", "veh_van", "wh_forklift_loaded", "wh_forklift_rear", "wh_van_open", "wh_van_rear", "veh_safari", "veh_crane", "veh_luggage", "veh_flatbed", "veh_goldvan", "rest_chef_a", "rest_chef_b", "rest_waiter_a", "rest_waiter_b"]) {
    if (ART[k]) def(`${k}_r${n}`, ART[k].w, ART[k].h);
  }
  for (const role of Object.keys(LOOKS)) for (const f of [0, 1, 2]) def(`ch_${role}_r${n}_${f}`, 44, 60);
}

/** La mejor versión disponible de una pieza para un rango (o la normal). */
export function rankedKey(scene: Phaser.Scene, key: string, rank: number): string {
  const ch = /^(ch_\w+?)_([012])$/.exec(key);
  for (let n = rank; n >= 1; n--) {
    const k = ch ? `${ch[1]}_r${n}_${ch[2]}` : `${key}_r${n}`;
    if (!ART[k]) continue;
    if (scene.textures.exists(k) || hasGeneratedArt(scene, k)) return k;
    if (ART[key] && ensureRankArt(scene, key, k, n, ART[key])) {
      ART[k] = { ...ART[key] };
      return k;
    }
  }
  return key;
}

/* ---------- Edificios isométricos ---------- */

export const BLD_W = 172;
const BLD: Record<string, number> = {
  bike: 140, dropship: 150, restaurant: 164, tiktok: 236, ai: 270, soon: 170,
  foodtruck: 140, beachclub: 170, yachts: 180, realestate: 260, crypto: 300,
  supercars: 164, hotel: 260, safari: 140, souk: 170, tower: 300,
};


for (const [id, h] of Object.entries(BLD)) {
  def(`bld_${id}`, BLD_W, h);
  if (id !== "soon") for (const tier of [1, 2, 3]) def(`bld_${id}_${tier}`, BLD_W, h + (tier - 1) * 24);
}

Object.assign(ART, BIKE_SIZES);
def("band_bike",390,172);
for (const [name,w,h] of [["h",60,30],["v",30,60],["turn_ne",48,48],["turn_nw",48,48],["turn_se",48,48],["turn_sw",48,48],["stop",60,40],["ghost",60,30],["works",60,44]] as const) def(`route_bike_${name}`,w,h);

/** Visual growth only: 1–2, 3–5 and 6–8 open stations. */
export const buildingTier = (floors: number): number => floors >= 6 ? 3 : floors >= 3 ? 2 : 1;
/** Sedes que aún no tienen arte propio: usan otra parecida (docs/ART.md, «Reparto en bici»). */
const PROVISIONAL_HUB: Record<string, string> = { fest: "beachclub" };
export const buildingKey = (id: string, floors: number): string => `bld_${PROVISIONAL_HUB[id] ?? id}_${buildingTier(floors)}`;

/** Small bespoke rooftop signs, independent of system emoji fonts. */
function buildingEmblem(p: Pen, x: number, y: number, id: string): void {
  p.fill(0x132c43).rrect(x - 19, y - 15, 38, 30, 8);
  p.stroke(1.5, 0xffffff, 0.5).srrect(x - 19, y - 15, 38, 30, 8);
  if (id === "dropship") {
    isoBox(p, x, y + 10, 13, 6, 13, 0xffb64c, 0xffde95);
    p.stroke(2, 0xfff4cc).line(x, y - 9, x, y + 9);
  } else if (id === "restaurant" || id === "foodtruck") {
    p.fill(0xffdf81).ellipse(x, y + 2, 26, 15);
    p.fill(0xff775b).circle(x - 4, y, 3).circle(x + 5, y + 2, 3);
    p.fill(0x65d69d).ellipse(x + 2, y - 4, 9, 4);
    p.stroke(2, 0xffffff).line(x - 10, y - 10, x - 10, y - 6).line(x, y - 12, x, y - 8);
  } else if (id === "tiktok") {
    p.fill(0x69f0ed).rrect(x - 7, y - 12, 14, 24, 3);
    p.fill(0x20314c).rrect(x - 5, y - 9, 10, 16, 2);
    p.fill(0xff79bd).poly([[x - 2, y - 5], [x + 4, y], [x - 2, y + 5]]);
  } else if (id === "ai") {
    p.fill(0x56e4bf).rrect(x - 9, y - 9, 18, 18, 4);
    p.stroke(2, 0x56e4bf);
    for (const i of [-6, 0, 6]) p.line(x + i, y - 13, x + i, y + 13).line(x - 13, y + i, x + 13, y + i);
    p.fill(0x132c43).rrect(x - 5, y - 5, 10, 10, 2);
  } else if (id === "beachclub") {
    p.fill(0xff83bb).poly([[x - 12, y - 8], [x + 12, y - 8], [x, y + 4]]);
    p.stroke(2, 0xffffff).line(x, y + 3, x, y + 11).line(x - 7, y + 11, x + 7, y + 11);
    p.fill(0xffd45e).circle(x + 10, y - 8, 4);
  } else if (id === "yachts") {
    p.fill(0xffffff).poly([[x - 14, y + 3], [x + 14, y + 3], [x + 8, y + 10], [x - 8, y + 10]]);
    p.fill(0x8de5f8).poly([[x, y - 12], [x, y + 1], [x + 12, y + 1]]);
    p.stroke(2, 0xffffff).line(x, y - 12, x, y + 3);
  } else if (id === "realestate") {
    p.fill(0xffdb72).poly([[x - 13, y], [x, y - 12], [x + 13, y], [x + 9, y], [x + 9, y + 10], [x - 9, y + 10], [x - 9, y]]);
    p.fill(0x132c43).rect(x - 3, y + 2, 6, 8);
  } else {
    p.fill(0xffd56b).circle(x, y, 12);
    p.stroke(2, 0xc38b25).scircle(x, y, 9).line(x - 3, y - 6, x - 3, y + 6).line(x + 3, y - 6, x + 3, y + 6);
  }
}

function drawBuilding(p: Pen, key: string, tier = 1): void {
  const h = BLD[key] + (tier - 1) * 24;
  const id = key;
  const growth = (tier - 1) * 18;
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

  if (["supercars", "hotel", "safari", "souk", "tower"].includes(id)) {
    const tall = id === "tower" || id === "hotel";
    const H = tall ? h - 100 : 38 + growth;
    const color = id === "supercars" ? 0x303742 : id === "safari" ? 0xdfc390 : id === "souk" ? 0xd8aa42 : 0xcdebf2;
    isoBox(p, cx, by - 12, tall ? 34 : 62, tall ? 17 : 31, H, color, 0xf5c542);
    if (tall) {
      win(leftFace(cx, by - 12, 34, 17), 3, tier * 3 + 4, 12, H - 8, 0x4c9bad, 2);
      p.stroke(3, 0xf5c542).line(cx, by - H - 45, cx, by - H - 20);
    } else if (id === "safari") {
      p.fill(0xffe5b0).poly([[cx - 40, by - 35], [cx, by - H - 50], [cx + 40, by - 35]]);
    } else if (id === "souk") {
      for (const x of [-30, 0, 30]) p.fill(0x76552b).rrect(cx + x - 9, by - 50, 18, 28, 9);
      p.fill(0xf5c542).ellipse(cx, by - H - 28, 46, 24);
    } else p.fill(0x66c8da).rrect(cx - 38, by - 55, 76, 28, 5);
  } else if (id === "dropship") {
    const H = 52 + growth, wall = 0xe8b04b;
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
    // Pallets, bay lamps and roof seams distinguish logistics from a plain cube.
    for (const u of [0.12, 0.45]) {
      p.fill(0xfff3b1).poly(faceQuad(R, u, u + 0.28, 32, 35));
      p.fill(0x334b60).poly(faceQuad(R, u, u + 0.28, 36, 40));
    }
    isoBox(p, cx + 37, by - 5, 10, 5, 10, 0xba8042, 0xf0bd77);
    isoBox(p, cx + 49, by - 11, 8, 4, 9, 0xcc9456, 0xffd28d);
    p.stroke(1, 0xdce7ee, 0.6);
    for (let i = 0; i < 4; i++) p.line(cx - 51 + i * 18, by - H - 38 + i * 9, cx - 20 + i * 18, by - H - 54 + i * 9);
    // Ventilaciones en el tejado
    p.fill(0x7f8c8d).rrect(cx - 30, by - 6 - H - 50, 14, 10, 3).rrect(cx + 10, by - 6 - H - 40, 14, 10, 3);
    buildingEmblem(p, cx, by - H - 79, id);
  } else if (id === "restaurant") {
    const H = 58 + growth, wall = 0xc0392b;
    isoBox(p, cx, by - 6, a - 8, b - 4, H, wall, 0x7b241c);
    const L = leftFace(cx, by - 6, a - 8, b - 4);
    const R = rightFace(cx, by - 6, a - 8, b - 4);
    win(L, 3, 1, 14, 40, 0xffe8a3, 5);
    win(R, 2, 1, 26, 44, 0xffe8a3, 5);
    p.fill(0x6d4c41).poly(faceQuad(R, 0.62, 0.84, 0, 24));
    // Brick courses and outside dining reinforce the restaurant silhouette.
    for (let v = 5; v < H; v += 9) {
      p.stroke(1, 0xf79678, 0.3);
      const q = faceQuad(L, 0, 1, v, v);
      p.line(q[0][0], q[0][1], q[1][0], q[1][1]);
    }
    p.fill(0x473427).rect(cx + 37, by - 19, 3, 13);
    p.fill(0xffdb8d).ellipse(cx + 39, by - 20, 19, 9);
    p.fill(0xfff4cf).ellipse(cx + 39, by - 21, 7, 3);
    // Toldo de rayas
    for (let i = 0; i < 8; i++) {
      const u0 = i / 8, u1 = (i + 1) / 8;
      const top = faceQuad(R, u0, u1, 30, 30);
      p.fill(i % 2 ? 0xffffff : 0xe74c3c).poly([top[0], top[1], [top[1][0] + 8, top[1][1] + 12], [top[0][0] + 8, top[0][1] + 12]]);
    }
    p.fill(0x7f8c8d).rrect(cx + 18, by - H - 70, 12, 22, 2);
    buildingEmblem(p, cx, by - H - 82, id);
  } else if (id === "tiktok") {
    const H = 140 + growth, wall = 0x6c5ce7;
    isoBox(p, cx, by - 6, a - 18, b - 9, H, wall, 0x4834d4);
    const L = leftFace(cx, by - 6, a - 18, b - 9);
    const R = rightFace(cx, by - 6, a - 18, b - 9);
    win(L, 3, 6, 10, H - 8, 0xa29bfe, 1);
    win(R, 3, 6, 10, H - 8, 0x8e84f5, 1);
    p.stroke(6, 0xff6fb5, 0.4).scircle(cx, by - H - 50, 26);
    p.stroke(3, 0xffffff).scircle(cx, by - H - 50, 26);
    p.stroke(3, 0x00cec9).scircle(cx, by - H - 50, 20);
    buildingEmblem(p, cx, by - H - 50, id);
  } else if (id === "ai") {
    const H = 160 + growth, wall = 0x16a085;
    isoBox(p, cx, by - 6, a - 16, b - 8, H, wall, 0x0e6655);
    const L = leftFace(cx, by - 6, a - 16, b - 8);
    const R = rightFace(cx, by - 6, a - 16, b - 8);
    win(L, 4, 8, 8, H - 6, 0x76d7c4, 1);
    win(R, 4, 8, 8, H - 6, 0x48c9b0, 1);
    isoBox(p, cx, by - 6 - H - 2 + 20 - 20, a - 40, b - 20, 26, 0x1abc9c, 0x117a65);
    p.stroke(2, 0x2c3e50).line(cx, by - H - 70, cx, by - H - 100);
    p.fill(0xff4757).circle(cx, by - H - 101, 3.5);
    buildingEmblem(p, cx, by - H - 49, id);
  } else if (id === "foodtruck") {
    // Plaza con dos food trucks y un toldo
    p.fill(0xf8e2a5).poly([[cx - a, by - b], [cx, by], [cx + a, by - b], [cx, by - 2 * b]]);
    const truck = (x: number, y: number, body: number, top: number) => {
      isoBox(p, x, y, 34, 17, 30, body, top);
      const R = rightFace(x, y, 34, 17);
      p.fill(0x222f3e).poly(faceQuad(R, 0.15, 0.8, 12, 26));
      p.fill(0xfeca57).poly(faceQuad(R, 0.18, 0.77, 14, 24));
      p.fill(0x2b2b2b).circle(x - 18, y - 4, 5).circle(x + 20, y - 5, 5);
    };
    truck(cx - 26, by - 30, 0xff9f43, 0xee5253);
    truck(cx + 28, by - 20, 0x48dbfb, 0x0abde3);
    p.fill(0x6d4c41).rect(cx - 2, by - 70, 3, 44);
    for (let i = 0; i < 6; i++) p.fill(i % 2 ? 0xffffff : 0x10ac84).poly([[cx, by - 82], [cx - 30 + i * 10, by - 64], [cx - 20 + i * 10, by - 64]]);
    buildingEmblem(p, cx, by - 119, id);
  } else if (id === "beachclub") {
    const H = 44 + growth, wall = 0xf5f6fa;
    p.fill(0xf8e2a5).poly([[cx - a, by - b], [cx, by], [cx + a, by - b], [cx, by - 2 * b]]);
    // Piscina
    p.fill(0x48dbfb).poly([[cx + 6, by - 12], [cx + 50, by - 34], [cx + 30, by - 44], [cx - 14, by - 22]]);
    p.fill(0xffffff, 0.5).poly([[cx + 10, by - 18], [cx + 30, by - 28], [cx + 26, by - 30], [cx + 6, by - 20]]);
    isoBox(p, cx - 18, by - 24, a - 30, b - 15, H, wall, 0x0abde3);
    const L = leftFace(cx - 18, by - 24, a - 30, b - 15);
    win(L, 3, 1, 10, 34, 0x48dbfb, 2);
    for (const [x, y, c] of [[cx + 40, by - 60, 0xff6b81], [cx - 58, by - 34, 0xfeca57]] as [number, number, number][]) {
      p.fill(0x6d4c41).rect(x - 1, y, 2, 22);
      p.fill(c).poly([[x - 16, y + 4], [x, y - 6], [x + 16, y + 4]]);
    }
    buildingEmblem(p, cx - 18, by - H - 73, id);
  } else if (id === "yachts") {
    // Muelle sobre el agua con un yate
    p.fill(0x2ec4d6).poly([[cx - a, by - b], [cx, by], [cx + a, by - b], [cx, by - 2 * b]]);
    p.fill(0xffffff, 0.35).rect(cx - 40, by - 30, 20, 2).rect(cx + 20, by - 50, 26, 2);
    p.fill(0x8e6e53).poly([[cx - a + 6, by - b], [cx - a + 24, by - b + 9], [cx + 6, by - 2 * b + 18], [cx - 12, by - 2 * b + 9]]);
    const yx = cx + 14, yy = by - 26;
    p.fill(0xdfe6e9).poly([[yx - 56, yy - 14], [yx + 40, yy - 14], [yx + 28, yy + 6], [yx - 44, yy + 6]]);
    p.fill(0x1e3799).rect(yx - 50, yy - 6, 84, 3);
    p.fill(0xffffff).rrect(yx - 36, yy - 36, 56, 24, 6);
    p.fill(0x0c2461).rrect(yx - 30, yy - 30, 44, 8, 3);
    p.fill(0xf5f6fa).rrect(yx - 22, yy - 52, 30, 18, 5);
    p.fill(0x0c2461).rrect(yx - 18, yy - 47, 22, 6, 2);
    p.stroke(2, 0x57606f).line(yx - 6, yy - 52, yx - 6, yy - 80);
    buildingEmblem(p, cx, by - 153, id);
  } else if (id === "realestate") {
    const H = 150 + growth, wall = 0xfeca57;
    isoBox(p, cx, by - 6, a - 18, b - 9, H, wall, 0x8395a7);
    const L = leftFace(cx, by - 6, a - 18, b - 9);
    const R = rightFace(cx, by - 6, a - 18, b - 9);
    win(L, 3, 7, 10, H - 8, 0x74b9ff, 1);
    win(R, 3, 7, 10, H - 8, 0x5fa8f5, 1);
    for (let v = 26; v < H; v += 20) {
      p.fill(0xffffff).poly(faceQuad(R, 0, 1, v, v + 3));
      p.fill(0xffffff).poly(faceQuad(L, 0, 1, v, v + 3));
    }
    buildingEmblem(p, cx, by - H - 47, id);
  } else if (id === "crypto") {
    const H = 190 + growth, wall = 0x341f97;
    isoBox(p, cx, by - 6, a - 22, b - 11, H, wall, 0x5f27cd);
    const L = leftFace(cx, by - 6, a - 22, b - 11);
    const R = rightFace(cx, by - 6, a - 22, b - 11);
    win(L, 3, 9, 8, H - 6, 0x8c7ae6, 1);
    win(R, 3, 9, 8, H - 6, 0x7158e2, 1);
    p.fill(0xff9f1a).poly(faceQuad(L, 0, 1, 40, 46)).poly(faceQuad(R, 0, 1, 40, 46));
    p.fill(0xff9f1a).circle(cx, by - H - 52, 22);
    p.fill(0xffc36b).circle(cx, by - H - 52, 16);
    buildingEmblem(p, cx, by - H - 52, id);
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
  if (id !== "soon") {
    // Landscaping, entry steps and expansion equipment give the plot a finished silhouette.
    for (const side of [-1, 1]) {
      p.fill(0x314d60).rrect(cx + side * 57 - 9, by - 29, 18, 7, 2);
      p.fill(0x42b887).ellipse(cx + side * 57, by - 31, 19, 10);
      p.fill(0x97e4a9).ellipse(cx + side * 57 - 3, by - 33, 9, 4);
    }
    p.stroke(1.5, 0xffffff, 0.6).line(cx - 15, by - 5, cx, by + 2).line(cx, by + 2, cx + 15, by - 5);
    if (tier >= 2) {
      isoBox(p, cx - 45, by - 15, 17, 8.5, 22, 0x345c76, 0xa5dcea);
      p.fill(0xffda75).rrect(cx - 54, by - 38, 12, 5, 1);
      p.fill(0x67ddbf).circle(cx - 47, by - 22, 2);
    }
    if (tier >= 3) {
      p.stroke(2, 0x31556d).line(cx + 52, by - 26, cx + 52, by - 72);
      p.fill(0xffd56b).poly([[cx + 53, by - 72], [cx + 73, by - 64], [cx + 53, by - 57]]);
      p.fill(0xffffff, 0.8).circle(cx + 60, by - 64, 2);
    }
  }
}

/* ---------- Baldosas del suelo (solo PNG; sin PNG el suelo se dibuja por código) ---------- */

/**
 * Claves de baldosa. Cada una admite variantes `_1`, `_2` y `_3` que se reparten al azar.
 * Rombo de 88×44 (más alto si la baldosa tiene grosor: se apoya por el vértice de arriba).
 */
export const TILE_KEYS = [
  ...CITIES.map((c) => `tile_${c.id}_ground`),
  "tile_lot",
  "tile_road_c",
  "tile_road_r",
  "tile_cross",
  "tile_path",
  ...ALL_BUSINESSES.map((b) => `tile_biz_${b.id}`),
];
for (const key of TILE_KEYS) for (const v of ["", "_1", "_2", "_3"]) def(key + v, 88, 44);

/**
 * Pone la baldosa en PNG de esa clave (o una de sus variantes) con el vértice de arriba en (x, yTop).
 * Devuelve false si no hay PNG, para que la escena dibuje el suelo por código.
 */
export function placeTile(scene: Phaser.Scene, x: number, yTop: number, key: string, rand: () => number, width = 88): boolean {
  const options = [key, `${key}_1`, `${key}_2`, `${key}_3`].filter((k) => scene.textures.exists(k) || hasGeneratedArt(scene,k));
  if (!options.length) return false;
  const k = options[Math.floor(rand() * options.length)];
  const ref = artRef(scene,k);
  const src = scene.textures.getFrame(ref.texture,ref.frame);
  const img = scene.add.image(x, yTop, ref.texture,ref.frame).setOrigin(0.5, 0).setDepth(-10);
  img.setDisplaySize(width, (width * src.height) / src.width);
  return true;
}

/* ---------- Generación ---------- */

type EmojiFn = (x: number, y: number, ch: string, size: number) => void;

function make(scene: Phaser.Scene, key: string, k: number, draw: (p: Pen, emoji: EmojiFn) => void): void {
  if (scene.textures.exists(key) || hasGeneratedArt(scene, key)) return; // PNG or a shared generated atlas frame
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
  for (const i of LUXURY) if (i.cat === "car") make(scene, `luxcar_${i.id}`, k, p => drawCar(p, i.id === "goldcar" ? 0xf5c542 : i.id === "hearse" ? 0x513869 : 0x49adc7));
  for (const [role, look] of [["chef", LOOKS.cook], ["waiter", LOOKS.waiter], ["guest", LOOKS.ped0]] as const) {
    for (const [pose, frame] of [["a", 1], ["b", 2]] as const) make(scene, `rest_${role}_${pose}`, k, p => drawChar(p, look, frame));
  }
  for (const key of ["rest_table_empty", "rest_table_served"]) make(scene, key, k, p => {
    p.fill(0x994c47).rrect(5,32,21,38,7).rrect(74,32,21,38,7);
    p.fill(0x946b50).rect(45,43,10,33);
    p.fill(0xffe6c5).ellipse(50,38,72,36);
    if (key.endsWith("served")) p.fill(0xffffff).ellipse(35,37,20,12).ellipse(65,37,20,12).fill(0xd78b38).ellipse(35,36,13,7).ellipse(65,36,13,7);
  });
  make(scene, "rest_counter", k, p => p.fill(0x946b50).rrect(5,28,110,53,8).fill(0xffe6c5).rrect(2,22,116,18,6).fill(0xf2c351).ellipse(40,23,30,22).ellipse(80,23,30,22));
  make(scene, "rest_host", k, p => p.fill(0x946b50).rect(15,17,12,36).fill(0xc89558).rrect(2,7,38,17,3).fill(0xffe6c5).rect(8,9,26,10));
  for (const key of ["rest_seated_man", "rest_seated_woman"]) make(scene, key, k, p => {
    p.fill(key.endsWith("woman") ? 0xe9a449 : 0x36a79a).rrect(8,22,24,24,7);
    p.fill(0xc68642).circle(20,15,11).fill(0x392b29).ellipse(20,7,23,12);
  });
  for (const [role, look] of Object.entries(LOOKS)) for (const f of [0, 1, 2]) make(scene, `ch_${role}_${f}`, k, (p) => drawChar(p, look, f));
  make(scene, "wh_shelf", k, p => drawStation(p,"st_dropship"));
  make(scene, "wh_pallet", k, p => drawItem(p,"item_box"));
  make(scene, "wh_dock", k, p => { p.fill(0x287d86).poly([[8,28],[72,2],[132,32],[68,60]]);p.fill(0xecaa43).rect(12,35,5,60).rect(123,37,5,60); });
  for (const key of ["veh_forklift","wh_forklift_loaded","wh_forklift_rear"]) make(scene,key,k,p=>{
    p.fill(0xeea130).rrect(12,26,36,23,5);p.fill(0x263d4a).rect(17,9,4,24).rect(42,9,4,24).rect(17,7,29,4).circle(20,50,7).circle(43,50,7);p.fill(0xaebdc2).rect(48,46,18,4);
  });
  for (const key of ["veh_van","wh_van_rear","wh_van_open"]) make(scene,key,k,drawVan);
  make(scene, "van", k, drawVan);
  CAR_COLORS.forEach((c, i) => make(scene, `car_${i}`, k, (p) => drawCar(p, c)));
  for (const key of ["item_box", "item_dish", "item_clip", "item_chip", ...MIAMI_ITEMS]) make(scene, key, k, (p) => drawItem(p, key));
  make(scene, "veh_safari", k, p => { drawCar(p, 0xe39b45); p.fill(0xeee1bb).rrect(18, 9, 26, 8, 2); });
  make(scene, "veh_crane", k, p => { drawCar(p, 0xf5c542); p.stroke(4, 0xf5c542).line(32, 28, 32, 5).line(32, 5, 53, 5); p.stroke(1.5, 0x263b50).line(53, 5, 53, 22); });
  for (const key of ["veh_luggage", "veh_flatbed", "veh_goldvan"]) make(scene, key, k, p => drawCar(p, 0xdec083));
  make(scene, "pumpkin", k, p => {
    p.fill(0x624f37).rect(18, 1, 5, 10);
    p.fill(0xd96325).ellipse(20, 24, 36, 28);
    p.fill(0xffa444).ellipse(17, 22, 16, 26).ellipse(26, 22, 12, 24);
    p.fill(0x61382a).poly([[8,22],[14,14],[18,23]]).poly([[23,23],[28,14],[33,22]]);
    p.fill(0xffe188).poly([[12,29],[20,33],[30,27],[27,35],[16,36]]);
  });
  make(scene, "ic_construction", k, p => p.fill(0xffcd61).rect(1, 6, 30, 9).fill(0x334c63).rect(5, 3, 3, 21).rect(25, 3, 3, 21));
  make(scene, "ic_manager", k, p => p.fill(0x67a6cf).rrect(3, 8, 12, 9, 3).fill(0xffd5a2).circle(9, 5, 4));
  make(scene, "ic_hand", k, p => p.fill(0xfff2d0).rrect(10, 1, 5, 18, 3).rrect(7, 11, 17, 15, 6));
  make(scene, "coin", k, drawCoin);
  make(scene, "spark", k, (p) => p.fill(0xffffff).circle(5, 5, 5));
  make(scene, "puff", k, (p) => p.fill(0xffffff, 0.8).circle(12, 12, 11));
  make(scene, "pulley", k, drawPulley);
  for (const key of STATIONS) make(scene, key, k, (p) => drawStation(p, key));
  make(scene, "tree_0", k, (p) => drawTree(p, 0));
  make(scene, "tree_1", k, (p) => drawTree(p, 1));
  make(scene, "bush", k, drawBush);
  make(scene, "palm", k, drawPalm);
  make(scene, "cloud", k, drawCloud);
  make(scene, "sign_sale", k, drawSaleSign);
  make(scene, "lamp_post", k, drawLampPost);
  make(scene, "bench", k, (p) => {
    p.fill(0x243b50).rect(7, 21, 3, 13).rect(34, 21, 3, 13);
    p.fill(0xbe8852).rrect(2, 5, 40, 12, 3).rrect(2, 18, 40, 7, 3);
  });
  make(scene, "recycling_bin", k, (p) => {
    p.fill(0x237bc1).rrect(4, 9, 19, 28, 3);
    p.fill(0x72c5f0).rrect(2, 5, 23, 6, 2);
    p.fill(0xffffff).circle(13, 21, 4);
  });
  for (const id of Object.keys(BLD)) {
    make(scene, `bld_${id}`, k, (p) => drawBuilding(p, id));
    if (id !== "soon") for (const tier of [1, 2, 3]) {
      const key = `bld_${id}_${tier}`;
      // Existing custom PNGs remain authoritative when no tier-specific PNG is supplied.
      if (!hasGeneratedArt(scene, key) && !scene.textures.exists(key) && scene.textures.exists(`bld_${id}`) && scene.cache.json.get("sprite-manifest")?.includes(`bld_${id}`)) {
        scene.textures.addImage(key, scene.textures.get(`bld_${id}`).getSourceImage() as HTMLImageElement);
        ART[key] = ART[`bld_${id}`];
      }
      make(scene, key, k, (p) => drawBuilding(p, id, tier));
    }
  }
}

/** Imagen con el tamaño lógico del catálogo, venga de PNG o de código. */
export function art(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  const spec = ART[key];
  const ref = artRef(scene, key);
  const img = scene.add.image(x, y, ref.texture, ref.frame);
  if (spec) img.setDisplaySize(spec.w, spec.h);
  return img;
}

/** Escala para partículas: tamaño lógico / tamaño real de la textura. */
export function artScale(scene: Phaser.Scene, key: string): number {
  const spec = ART[key];
  const ref = artRef(scene, key);
  const frame = scene.textures.getFrame(ref.texture, ref.frame);
  return spec && frame?.width ? spec.w / frame.width : 1;
}
