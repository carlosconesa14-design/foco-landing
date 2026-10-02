/** Sitios del juego donde se ofrece un anuncio bonificado. Útil para medir cuál rinde más. */
export type Placement = "boost_x2" | "offline_x3" | "viral" | "ipo_x2" | "rush" | "free_chest" | "ability_recharge" | "daily_double" | "expand_x2" | "tourist_wave" | "event_x2" | "supply_truck" | "vip_client" | "wheel_spin" | "gold_lock" | "lux_trial" | "lux_deal" | "season_x3";

export interface AdService {
  init(): Promise<void>;
  /** Muestra un anuncio bonificado. Resuelve true solo si el jugador ganó la recompensa. */
  showRewarded(placement: Placement): Promise<boolean>;
}
