/**
 * Ficha visual de la pantalla de cada negocio: lo que hace que cada pantalla sea única.
 *
 * **Este fichero es de ChatGPT/Codex** (docs/VISUAL.md). Aquí no hay lógica ni números del juego:
 * solo colores, claves de arte y estilo. La escena (`RouteScene`) lo lee; si una clave de arte aún
 * no existe, dibuja el respaldo por código con la paleta.
 */

export interface ScreenSpec {
  /** Paleta de respaldo mientras no haya arte: suelo, ruta, línea de la ruta y cielo. */
  palette: { ground: number; road: number; line: number; sky: [number, number] };
  /** Prefijo de los tramos de ruta: `route_<prefijo>_h`, `_v`, `_turn_ne`… (docs/VISUAL.md §4). */
  route: string;
  /** Fondo de cada franja de parada (390×172) y de la calle de arriba (390×280). */
  band: string;
  street: string;
  /** Cómo se mueve el transporte: a pie, en vehículo o en bici (pedalea). */
  mover: "walker" | "vehicle" | "bike";
  /** Arte del puesto de cada parada: uno para todas o uno distinto por parada (`<clave>_<i>`). */
  stationPerStop: boolean;
  /** Elementos ambientales que la escena puede animar (pájaros, olas, vapor…). Libre para Codex. */
  ambient: string[];
}

const S = (palette: ScreenSpec["palette"], route: string, mover: ScreenSpec["mover"], ambient: string[], stationPerStop = false): ScreenSpec => ({
  palette, route, band: `band_${route}`, street: `street_${route}`, mover, stationPerStop, ambient,
});

export const SCREENS: Record<string, ScreenSpec> = {
  bike: S({ ground: 0xd9e4c9, road: 0x56606e, line: 0xf5f1dc, sky: [0x7cc6f0, 0xcfeefc] }, "bike", "bike", ["pigeons", "traffic", "awnings"], true),
  dropship: S({ ground: 0xd9dde2, road: 0x6b7480, line: 0xf1c40f, sky: [0x8fb8d6, 0xdbe7f0] }, "dropship", "vehicle", ["conveyor", "trucks"]),
  restaurant: S({ ground: 0xf3dcc0, road: 0xb5654f, line: 0xfff4d7, sky: [0xf6b38a, 0xfbe3c8] }, "restaurant", "walker", ["steam", "diners"]),
  tiktok: S({ ground: 0xe2d9f5, road: 0x3b2f73, line: 0xff6fb5, sky: [0x2b1e5c, 0x6b4fd0] }, "tiktok", "walker", ["spotlights", "likes"]),
  ai: S({ ground: 0xd6ebe8, road: 0x2c3e50, line: 0x1abc9c, sky: [0x0f2a3a, 0x2c6e7a] }, "ai", "walker", ["datastreams", "leds"]),
  foodtruck: S({ ground: 0xf8e8bf, road: 0xc9a46a, line: 0xffffff, sky: [0x5fc8f0, 0xffe2a8] }, "foodtruck", "walker", ["seagulls", "waves"]),
  beachclub: S({ ground: 0xfaeccb, road: 0xb98a5a, line: 0xf8e7c0, sky: [0xff9a7a, 0xffd9a0] }, "beachclub", "walker", ["palms", "music"]),
  yachts: S({ ground: 0xbfe3ef, road: 0x9c6b3f, line: 0xf3d9b0, sky: [0x5fc8f0, 0xbfeaf7] }, "yachts", "walker", ["waves", "boats", "seagulls"]),
  realestate: S({ ground: 0xdfead2, road: 0x5d6a77, line: 0xfeca57, sky: [0x7cc6f0, 0xe6f4fb] }, "realestate", "walker", ["sprinklers", "cars"]),
  crypto: S({ ground: 0xdcd6f0, road: 0x241a5e, line: 0xff9f1a, sky: [0x120c33, 0x3a2a8a] }, "crypto", "walker", ["charts", "coins"]),
  supercars: S({ ground: 0xe4e6ea, road: 0x2f3640, line: 0xe84118, sky: [0xf7c784, 0xfde8c4] }, "supercars", "vehicle", ["flags", "exhaust"]),
  hotel: S({ ground: 0xf5eddb, road: 0x8c2f39, line: 0xc8a24a, sky: [0xe8b56a, 0xfbe6c2] }, "hotel", "vehicle", ["fountains", "guests"]),
  safari: S({ ground: 0xefd6a8, road: 0xb7793d, line: 0xf6e1b8, sky: [0xf29e4c, 0xfde2b5] }, "safari", "vehicle", ["camels", "dust"]),
  souk: S({ ground: 0xf4e5c3, road: 0x9a7b4f, line: 0xf6c344, sky: [0xe3a25c, 0xfbe2b8] }, "souk", "walker", ["lanterns", "crowd"]),
  fest: S({ ground: 0xfde6f1, road: 0x8e2a6b, line: 0xffd36b, sky: [0x3a1d6e, 0xff8fc7] }, "fest", "walker", ["garlands", "fireworks", "balloons"], true),
  tower: S({ ground: 0xdfe8ee, road: 0x7f8c8d, line: 0xf1c40f, sky: [0x8fc9ef, 0xe3f2fb] }, "tower", "vehicle", ["cranes", "welding"]),
};

export const screenOf = (id: string): ScreenSpec => SCREENS[id] ?? SCREENS.dropship;
