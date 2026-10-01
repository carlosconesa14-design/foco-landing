# De Rider a Millonario

Idle tycoon para móvil: construyes un imperio de negocios modernos (dropshipping, restaurante, TikTok, IA) en una ciudad isométrica que ves crecer. Cada negocio es un recinto en el mapa donde construyes puestos y ves a tus trabajadores producir, recoger y vender. Se monetiza con anuncios bonificados (rewarded ads) de AdMob, siempre opcionales.

Hecho con **TypeScript + Phaser 3 + Vite**, empaquetado para Android e iOS con **Capacitor**. El diseño completo y la hoja de ruta están en [`docs/GDD.md`](docs/GDD.md).

**Arte:** ciudad y recintos en isométrico 2.5D, con arrastre y zoom pellizcando. Combina atlas propios generados con ChatGPT, poses de personajes en PNG y geometrías de suelo (`src/art/`). Las piezas admiten sustituciones mediante el manifiesto de sprites. Los tamaños y los prompts para generarlas con IA están en [`docs/ART.md`](docs/ART.md).

## Cómo se juega

- **Recinto de un negocio:** puestos de producción → transporte → venta.
  - Tocas un puesto, la carretilla o la furgoneta para que hagan un viaje.
  - Los botones `Nv` de los puestos y la barra fija de producción, transporte y venta abren mejoras y contratación de gerentes.
  - La parte que frena la cadena se marca en rojo.
- **Gerentes:** automatizan su parte, que sigue ganando dinero con la app cerrada.
- **Puestos nuevos:** se construyen en las parcelas del recinto y cada uno produce 6 veces más que el anterior (hasta 8 por negocio).
- **Ciudad:** un mapa que puedes arrastrar, con parcelas "Se vende". Cada negocio produce cientos de veces más que el anterior.
- **Diamantes, ejecutivos y maletines:** los ejecutivos se asignan uno por negocio, dan un bonus y tienen una habilidad activa.
- **Misiones** en el lateral; **premio diario, ejecutivos, logros, Liga y ajustes** en Menú. Las gemas abren la tienda.
- **Bolsa:** el prestigio. Vuelves a empezar con acciones que dan +2 % permanente cada una.
- **Estilo de vida:** avanza según lo ganado en total, de "vives con tus padres" a "isla privada", y no se pierde nunca.

## Sonido

- **Efectos y música generados por código** con Web Audio (`src/audio/sound.ts`): no hay archivos ni licencias que gestionar.
  - Efectos: toque, monedas, mejora, hito x2, gerente, desbloqueo, maletín, diamantes, habilidad y error.
  - Música: un bucle lo-fi suave a 88 pulsaciones por minuto.
- **Sustituibles por archivos:** deja `public/audio/<clave>.mp3` y añade la clave a `public/audio/manifest.json`. Las claves son las de los efectos (`coin`, `chest`…) y `music`. Hay sonidos gratuitos en Kenney.nl, y música en Pixabay u OpenGameArt (revisa la licencia de cada uno).
- **La música se silencia durante los anuncios** y cuando la app pasa a segundo plano.
- **Vibración** con `@capacitor/haptics`.
- **Ajustes** para la música, los sonidos y la vibración (botón ⚙️).

## Dónde salen los anuncios

Todos son opcionales. `Placement` en `src/ads/types.ts`:

| Placement | Recompensa |
| --- | --- |
| `boost_x2` | Modo hustle: todo x2 durante 4 h (acumulable hasta 12 h) |
| `offline_x3` | Triplicar lo ganado mientras la app estaba cerrada |
| `viral` | Evento viral que aparece cada 2–4 min: dinero extra |
| `rush` | Hora punta: un local de la ciudad x3 durante 30 min |
| `ipo_x2` | Doble de acciones al salir a bolsa |
| `free_chest` | Maletín de ejecutivo gratis cada 4 h |
| `ability_recharge` | Recargar al instante la habilidad de un ejecutivo |
| `daily_double` | Duplicar el premio diario |
| `expand_x2` | Doble de estrellas de franquicia al expandirse a otra ciudad |
| `tourist_wave` | Miami: atraer una ola de turistas al momento (ventas x3 durante 3 min) |

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
  game/actions.ts     acciones del jugador (mejorar, gerentes, puestos, bolsa…)
  game/meta.ts        diamantes, ejecutivos, maletines, misiones, diario, logros, tutorial
  game/execs.ts       bonus de los ejecutivos en la economía
  scenes/             escenas de Phaser: ciudad y recinto de cada negocio
  ui/                 cabecera, barra inferior, paneles y modales en HTML
  ads/                AdMob en móvil, anuncio simulado en web
  audio/              efectos y música (Web Audio)
  platform/           guardado con @capacitor/preferences y vibración
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

**Avisos en el móvil** (`@capacitor/local-notifications`): al salir de la app se programan tres avisos: caja llena, maletín gratis y premio diario. Nunca suenan entre las 22:00 y las 9:00, y se cancelan al volver. El permiso se pide una vez, al acabar el tutorial, y el jugador puede desactivarlos en Ajustes. La lógica está en `src/game/notify.ts` (con tests) y la entrega en `src/platform/notifications.ts`. Al añadir Android, revisa en la documentación del plugin los permisos de Android 13+ y de alarmas exactas; sin alarma exacta, el aviso puede llegar unos minutos tarde.

**Liga Millonario** (Supabase): la URL y la clave pública por defecto son las del proyecto del juego. Se pueden cambiar con `VITE_LEAGUE_URL` y `VITE_LEAGUE_KEY` (ver `.env.example`). Cómo funciona y cómo se gestiona: [`docs/LIGA.md`](docs/LIGA.md).

El consentimiento GDPR (formulario UMP de Google) y el permiso ATT de iOS ya se piden en `AdMobAds.init()`. Solo tienes que crear el mensaje de consentimiento en la consola de AdMob, en **Privacidad y mensajes**.

## Próximos pasos

Ver la hoja de ruta en [`docs/GDD.md`](docs/GDD.md). La fase 2 incluye 💎, gerentes con rareza y habilidades, cofres, misiones diarias y el tutorial guiado.
