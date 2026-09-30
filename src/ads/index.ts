import { Capacitor } from "@capacitor/core";
import { AdMobAds } from "./admob";
import { MockAds } from "./mock";
import type { AdService } from "./types";

export type { AdService, Placement } from "./types";

/** En el móvil usa AdMob; en el navegador, el anuncio simulado. */
export function createAds(root: HTMLElement): AdService {
  return Capacitor.isNativePlatform() ? new AdMobAds() : new MockAds(root);
}
