/** Sitios del juego donde se ofrece un anuncio bonificado. Útil para medir cuál rinde más. */
export type Placement = "boost_x2" | "offline_x3" | "viral" | "ipo_x2" | "rush";

export interface AdService {
  init(): Promise<void>;
  /** Muestra un anuncio bonificado. Resuelve true solo si el jugador ganó la recompensa. */
  showRewarded(placement: Placement): Promise<boolean>;
}
