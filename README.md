# De Rider a Millonario

Juego idle para móvil: empiezas repartiendo en bici y acabas con una startup unicornio, una cadena de locales y una isla privada. Se monetiza con anuncios bonificados (rewarded ads) de AdMob, siempre opcionales.

Hecho con **TypeScript + Vite**, empaquetado para Android e iOS con **Capacitor**.

## Cómo se juega

| Pestaña | Qué haces |
| --- | --- |
| **Carrera** | Trabajos de peor a mejor pagados: rider, Wallapop, dropshipping, TikTok, agencia de marketing, agencia de IA, SaaS de IA, startup unicornio. Tocas para trabajar y subes niveles. Cada 25/50/100… niveles, velocidad x2. |
| **Automatizar** | Convierte cada trabajo en ingreso pasivo (moto de reparto, bot de respuestas, agente IA 24/7…). Solo lo automatizado gana con la app cerrada. |
| **Ciudad** | Compras locales (cafetería, restaurante, gimnasio, almacén, hotel, discoteca). Cada uno es un **idle dentro del idle**: una cadena de 3 estaciones que vende al ritmo de la más lenta, así que siempre hay que mejorar el cuello de botella. |
| **Bolsa** | Prestigio: sales a bolsa, vuelves a empezar de rider y te quedas acciones que suman +2 % a todo para siempre. |

El **estilo de vida** (de "vives con tus padres" a "isla privada") avanza con todo lo que has ganado y no se pierde nunca.

## Dónde salen los anuncios

Todos son opcionales. `Placement` en `src/ads/types.ts`:

| Placement | Recompensa |
| --- | --- |
| `boost_x2` | Modo hustle: todo x2 durante 4 h (acumulable hasta 12 h) |
| `offline_x3` | Triplicar lo ganado mientras la app estaba cerrada |
| `viral` | Evento viral que aparece cada 2–4 min: dinero extra |
| `rush` | Hora punta: un local de la ciudad x3 durante 30 min |
| `ipo_x2` | Doble de acciones al salir a bolsa |

La pestaña Bolsa incluye un panel de desarrollo con los anuncios vistos por ubicación y un ingreso estimado. Hay que quitarlo antes de publicar.

## Desarrollo

```bash
npm install
npm run dev        # juego en el navegador con anuncios simulados
npm test           # tests de la economía
npm run build      # typecheck + build a dist/
```

En el navegador los anuncios son una pantalla simulada de 5 s (`src/ads/mock.ts`). En el móvil se usa AdMob (`src/ads/admob.ts`) de forma automática.

## Estructura

```
src/
  game/data.ts      contenido y equilibrio (trabajos, locales, precios)
  game/state.ts     estado, partida nueva, migración de guardados
  game/economy.ts   fórmulas puras y simulación (tick, offline)
  game/actions.ts   acciones del jugador (comprar, mejorar, salir a bolsa…)
  ads/              AdMob en móvil, anuncio simulado en web
  platform/         guardado con @capacitor/preferences
  ui/               render de pestañas, modales y toasts
  main.ts           bucle de juego y eventos
tests/              tests con Vitest
```

## Publicar en Android e iOS

1. Añade las plataformas (solo la primera vez):
   ```bash
   npm run build
   npx cap add android   # necesita Android Studio
   npx cap add ios       # necesita macOS + Xcode
   ```
2. Configura el **App ID de AdMob** (no es el mismo que el ID del bloque de anuncios):
   - Android, `android/app/src/main/AndroidManifest.xml`, dentro de `<application>`:
     ```xml
     <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
                android:value="ca-app-pub-3940256099942544~3347511713"/>
     ```
   - iOS, `ios/App/App/Info.plist`: `GADApplicationIdentifier` con el App ID y `NSUserTrackingUsageDescription` con un texto que explique para qué se usa el seguimiento.
   - Los valores de arriba son los de prueba de Google. Cámbialos por los tuyos al publicar.
3. Copia `.env.example` a `.env` y pon tus IDs de bloque de anuncios bonificados. Deja `VITE_ADMOB_TESTING=true` hasta el build final: hacer clic en tus propios anuncios reales puede suspenderte la cuenta de AdMob.
4. `npm run cap:sync` y abre el proyecto con `npx cap open android` o `npx cap open ios`.

El consentimiento GDPR (formulario UMP de Google) y el permiso ATT de iOS ya se piden en `AdMobAds.init()`. Solo tienes que crear el mensaje de consentimiento en la consola de AdMob, en **Privacidad y mensajes**.

## Próximos pasos

- Mejoras permanentes que se compren con acciones.
- Recompensa diaria y logros.
- Más locales en la ciudad y eventos por local.
- Verificación de recompensas en servidor (SSV) cuando haya tráfico.
- Analítica (Firebase) para medir retención y anuncios por jugador.
