import { freshBusiness, freshState, type GameState } from "../src/game/state";

/**
 * Partida nueva con el almacén ya comprado. Desde que el juego empieza con el reparto en bici,
 * muchas pruebas de la cadena siguen usando el almacén como negocio de referencia.
 */
export function withDropship(now: number): GameState {
  const s = freshState(now);
  s.biz.dropship = freshBusiness(true);
  return s;
}
