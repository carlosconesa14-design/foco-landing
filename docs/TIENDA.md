# Google Play: ficha de la tienda y versión para publicar

## 1. Textos de la ficha (listos para copiar)

**Nombre de la app** (máx. 30): `De Rider a Millonario`

**Descripción breve** (máx. 80):
> Empieza de rider y construye un imperio de negocios. ¡Liga semanal con premios!

**Descripción completa** (máx. 4.000):

> ¿Te imaginas pasar de repartir en bici a dueño de un imperio? En **De Rider a Millonario** empiezas desde abajo y construyes, negocio a negocio, tu propia ciudad.
>
> 📦 **Monta tu primer negocio**: un almacén de dropshipping con sus estanterías, su carretilla y sus furgonetas. Mejora cada parte de la cadena: producción, transporte y venta. Si una se atasca, ¡todo se para!
>
> 🍝 **Crece sin parar**: abre un restaurante, un estudio de TikTok y una agencia de inteligencia artificial. Cada negocio tiene su propio recinto animado con trabajadores que ves trabajar.
>
> 👔 **Contrata gerentes** y tus negocios funcionarán solos, incluso con el móvil apagado. Al volver, cobra lo que has ganado.
>
> 🌴 **Expándete a Miami**: cuando domines Madrid, abre tu franquicia en Miami, con nuevos negocios y olas de turistas que disparan las ventas.
>
> 🏅 **Liga Millonario semanal**: gana puntos jugando cada día y compite en tu división (Bronce, Plata y Oro). Premios para los primeros de cada división y un sorteo entre todos los que juegan. Ver anuncios o comprar no da puntos: gana quien juega con constancia.
>
> 💼 **Ejecutivos y maletines**: colecciona ejecutivos de distintas rarezas con habilidades que multiplican tus ventas.
>
> 📈 **Sal a bolsa**: vende tu imperio a cambio de acciones que te harán ganar más para siempre, y vuelve a empezar más fuerte.
>
> 🎁 **Misiones diarias, premio diario y logros** para que siempre tengas algo que conseguir.
>
> Gratis para siempre. Los anuncios son siempre opcionales: tú decides si ves uno para duplicar ganancias.
>
> Las bases de la Liga están disponibles en la app y en nuestra web. Apple y Google no patrocinan ni participan en la Liga.

**Categoría**: Juegos → Simulación. **Etiquetas**: idle, tycoon, magnate, simulación de negocios.

**Datos de contacto**: email público obligatorio. Web: la de GitHub Pages (ver el punto 4).

## 2. Material gráfico (lo hace ChatGPT, ver docs/ART.md)

| Pieza | Tamaño | Notas |
| --- | --- | --- |
| Icono | 512×512 PNG | Sin transparencia en las esquinas. Se lee bien en pequeño |
| Gráfico destacado | 1024×500 | Ciudad isométrica + logotipo + "De Rider a Millonario" |
| Capturas de pantalla | De 4 a 8, verticales (mín. 1080×1920) | Con un texto grande arriba: «Monta tu imperio», «Tus negocios trabajan solos», «Expándete a Miami», «Liga semanal con premios» |

## 3. Clave de firma y secretos de GitHub

Google Play usa la **firma de apps de Google Play**: Google guarda la clave definitiva y tú solo necesitas una **clave de subida**. Si se pierde, se puede restablecer desde Play Console.

**Crear la clave de subida.** Hace falta Java: Android Studio lo trae, o instala «Temurin».
```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
# Te pedirá una contraseña y unos datos (nombre, país…). Apunta la contraseña.
base64 -w0 upload.jks > upload.b64        # Linux
base64 -i upload.jks -o upload.b64        # macOS
certutil -encode upload.jks upload.b64    # Windows (borra las líneas BEGIN/END del archivo)
```

**Secretos en GitHub.** Repositorio → Settings → Secrets and variables → Actions → New repository secret:

| Secreto | Valor |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | El contenido de `upload.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | La contraseña de la clave |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | La misma contraseña (salvo que pusieras otra para el alias) |
| `ADMOB_APP_ID` | El App ID de AdMob (`ca-app-pub-…~…`) |
| `ADMOB_REWARDED_ANDROID` | El ID del bloque bonificado (`ca-app-pub-…/…`) |

Guarda `upload.jks` y su contraseña en un sitio seguro. **No los subas nunca al repositorio.**

**Compilar la versión para la tienda:** Actions → «Android release (Google Play)» → Run workflow. Sale un `.aab` en Artifacts, con anuncios reales y firmado. Ese archivo es el que se sube a Play Console.

## 4. Web pública (privacidad y bases)

La política de privacidad y las bases de la Liga se generan solas desde `docs/PRIVACIDAD.md` y `docs/BASES_LIGA.md`. Van dentro de la app (Ajustes) y en la web:
1. Settings → Pages → Source: **GitHub Actions** (una vez).
2. Al unir la PR a `main`, se publica la web: portada + `legal/privacidad.html` + `legal/bases-liga.html`.
3. La URL de la política de privacidad (`…/legal/privacidad.html`) es la que pide Play Console.

Mientras los documentos tengan campos [entre corchetes], las páginas muestran el aviso «Documento en preparación».

## 5. Formularios de Play Console

- **Clasificación de contenido:** sin violencia ni contenido sexual. Hay compras dentro de la app y anuncios. La Liga **no** es juego con dinero real: participar es gratis y no se apuesta nada.
- **Seguridad de los datos** (según `docs/PRIVACIDAD.md`):
  - recopila **identificadores de dispositivo** (anuncios y analítica anónima), **actividad en la app** (analítica) y **email** (solo ganadores de premios en dinero);
  - no se venden datos y todo viaja cifrado;
  - el usuario puede pedir que se borren sus datos.
- **Anuncios:** sí, contiene anuncios.
- **Público objetivo:** mayores de 13 años (recomendado por los premios de la Liga y la publicidad).

## 6. Ficha en inglés (resto del mundo)

El juego se muestra en inglés en los móviles que no están en español (ver `docs/IDIOMAS.md`). En Play Console → Presencia en Google Play → Ficha de Play Store → **Gestionar traducciones → Añadir tus propias traducciones → Inglés (Estados Unidos) – en-US**, y pega esto:

**App name** (máx. 30): `From Rider to Millionaire`

**Short description** (máx. 80):
> Start as a delivery rider and build a business empire. Weekly League with prizes!

**Full description:**

> Ever dreamed of going from delivery rider to owner of a business empire? In **From Rider to Millionaire** you start at the bottom and build your own city, one business at a time.
>
> 📦 **Start your first business**: a dropshipping warehouse with shelves, a forklift and delivery vans. Upgrade every part of the chain: production, transport and sales. If one jams, everything stops!
>
> 🍝 **Keep growing**: open a restaurant, a TikTok studio and an AI agency. Each business has its own animated site with workers you can watch in action.
>
> 👔 **Hire managers** and your businesses run themselves, even with your phone off. Come back and collect what you've earned.
>
> 🌴 **Expand to Miami**: once you've conquered Madrid, open your franchise in Miami, with new businesses and tourist waves that send sales through the roof.
>
> 🏅 **Weekly Millionaire League**: earn points by playing every day and compete in your division (Bronze, Silver and Gold). Prizes for the top players in each division and a draw among everyone who plays. Watching ads or buying doesn't give points: consistent players win.
>
> 💼 **Executives and briefcases**: collect executives of different rarities with abilities that multiply your sales.
>
> 📈 **Go public**: sell your empire for shares that boost your earnings forever, and start again stronger.
>
> 🎁 **Daily missions, daily rewards and achievements** so there's always something to go for.
>
> Free forever. Ads are always optional: you decide whether to watch one to double your earnings.
>
> The League rules are available in the app and on our website. Apple and Google do not sponsor or take part in the League.

**Capturas:** las mismas que en español, pero hechas con el juego en inglés (Ajustes → Idioma → English) y con los textos de arriba en inglés: «Build your empire», «Your businesses run themselves», «Expand to Miami», «Weekly League with prizes».
