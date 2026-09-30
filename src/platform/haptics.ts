import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/** Vibración corta al tocar y más marcada al comprar. En web se intenta con navigator.vibrate. */
export const haptics = {
  enabled: true,
  light(): void {
    this.impact(ImpactStyle.Light, 8);
  },
  medium(): void {
    this.impact(ImpactStyle.Medium, 18);
  },
  impact(style: ImpactStyle, webMs: number): void {
    if (!this.enabled) return;
    if (Capacitor.isNativePlatform()) {
      void Haptics.impact({ style }).catch(() => {});
    } else {
      try {
        navigator.vibrate?.(webMs);
      } catch {
        /* sin vibración disponible */
      }
    }
  },
};
