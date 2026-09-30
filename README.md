# De Rider a Millonario

Idle tycoon para móvil: construyes un imperio de negocios modernos (dropshipping, restaurante, TikTok, IA) en una ciudad que ves crecer. Cada negocio es una cadena de producción animada al estilo Idle Miner Tycoon. Se monetiza con anuncios bonificados (rewarded ads) de AdMob, siempre opcionales.

Hecho con **TypeScript + Phaser 3 + Vite**, empaquetado para Android e iOS con **Capacitor**. El diseño completo y la hoja de ruta están en [`docs/GDD.md`](docs/GDD.md).

**Arte:** ciudad isométrica 2.5D e interiores en corte lateral. Todo se dibuja por código (`src/art/`), y cada pieza se puede sustituir por un PNG propio sin tocar código. Los tamaños y los prompts para generarlas con IA están en [`docs/ART.md`](docs/ART.md).

## Cómo se juega

- **Interior de un negocio:** plantas de producción → transporte → venta.
  - Tocas a cada trabajador para que haga un viaje.
  - Los botones `Nv ⬆` abren el panel de mejora y de contratación de gerente.
  - La parte que frena la cadena se marca en rojo.
- **Gerentes:** automatizan su parte, que sigue ganando dinero con la app cerrada.
- **Plantas nuevas:** cada una produce 6 veces más que la anterior (hasta 8 por negocio).
- **Ciudad:** un mapa que puedes arrastrar, con parcelas "Se vende". Cada negocio produce cientos de veces más que el anterior.
- **Bolsa:** el prestigio. Vuelves a empezar con acciones que dan +2 % permanente cada una.
- **Estilo de vida:** avanza según lo ganado en total, de "vives con tus padres" a "isla privada", y no se pierde nunca.

## Dónde salen los anuncios

Todos son opcionales. `Placement` en `src/ads/types.ts`:

| Placement | Recompensa |
| --- | --- |
| `boost_x2` | Modo hustle: todo x2 durante 4 h (acumulable hasta 12 h) |
| `offline_x3` | Triplicar lo ganado mientras la app estaba cerrada |
| `viral` | Evento viral que aparece cada 2–4 min: dinero extra |
| `rush` | Hora punta: un local de la ciudad x3 durante 30 min |
| `ipo_x2` | Doble de acciones al salir a bolsa |

El panel de la Bolsa incluye un panel de desarrollo con los anuncios vistos por ubicación y un ingreso estimado. Hay que quitarlo antes de publicar.

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
  game/data.ts        contenido y equilibrio (negocios, cadena, estilo de vida)
  game/state.ts       estado, partida nueva, migración de guardados
  game/economy.ts     fórmulas y simulación pura de la cadena (testeada)
  game/actions.ts     acciones del jugador (mejorar, gerentes, plantas, bolsa…)
  scenes/             escenas de Phaser: ciudad e interior animado
  ui/                 cabecera, barra inferior, paneles y modales en HTML
  ads/                AdMob en móvil, anuncio simulado en web
  platform/           guardado con @capacitor/preferences
  main.ts             arranque, bucle y puente entre Phaser y la interfaz
tests/                tests con Vitest
docs/GDD.md           documento de diseño y hoja de ruta
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

Ver la hoja de ruta en [`docs/GDD.md`](docs/GDD.md). La fase 2 incluye 💎, gerentes con rareza y habilidades, cofres, misiones diarias y el tutorial guiado.
