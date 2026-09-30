import { AdMob, AdmobConsentStatus, RewardAdPluginEvents } from "@capacitor-community/admob";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import type { AdService, Placement } from "./types";

/** IDs de prueba oficiales de Google: nunca generan ingresos ni ponen en riesgo la cuenta. */
const TEST_IDS = {
  android: "ca-app-pub-3940256099942544/5224354917",
  ios: "ca-app-pub-3940256099942544/1712485313",
};

const env = import.meta.env;
const isTesting = env.VITE_ADMOB_TESTING !== "false";

function rewardedId(): string {
  const platform = Capacitor.getPlatform();
  if (isTesting) return platform === "ios" ? TEST_IDS.ios : TEST_IDS.android;
  const id = platform === "ios" ? env.VITE_ADMOB_REWARDED_IOS : env.VITE_ADMOB_REWARDED_ANDROID;
  if (!id) throw new Error("Falta el ID de AdMob para esta plataforma en .env");
  return id;
}

/** Anuncios bonificados reales con AdMob, incluido el consentimiento GDPR (UMP) y ATT en iOS. */
export class AdMobAds implements AdService {
  private ready = false;
  private loading: Promise<void> | null = null;

  async init(): Promise<void> {
    await AdMob.initialize({ initializeForTesting: isTesting });
    try {
      const consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
    } catch {
      /* sin formulario de consentimiento: se sirven anuncios no personalizados */
    }
    if (Capacitor.getPlatform() === "ios") {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === "notDetermined") await AdMob.requestTrackingAuthorization();
    }
    void this.preload();
  }

  /** Carga el siguiente anuncio por adelantado para que se abra al instante. */
  private preload(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (!this.loading) {
      this.loading = AdMob.prepareRewardVideoAd({ adId: rewardedId(), isTesting })
        .then(() => {
          this.ready = true;
        })
        .catch(() => {
          this.ready = false;
        })
        .finally(() => {
          this.loading = null;
        });
    }
    return this.loading;
  }

  async showRewarded(_placement: Placement): Promise<boolean> {
    await this.preload();
    if (!this.ready) return false;
    this.ready = false;

    let rewarded = false;
    let onClose: () => void = () => {};
    const closed = new Promise<void>((resolve) => (onClose = resolve));
    // Los listeners se registran antes de mostrar el anuncio para no perder ningún evento.
    const handles: PluginListenerHandle[] = await Promise.all([
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (rewarded = true)),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => onClose()),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => onClose()),
    ]);
    try {
      await AdMob.showRewardVideoAd();
      await closed;
    } catch {
      rewarded = false;
    } finally {
      handles.forEach((h) => void h.remove());
      void this.preload();
    }
    return rewarded;
  }
}
