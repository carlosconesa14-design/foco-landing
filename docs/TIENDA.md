# Google Play: ficha de la tienda y versión para publicar

## 1. Textos de la ficha (listos para copiar)

**Nombre de la app** (máx. 30): `Rider Millionaire: Idle Tycoon` (30 caracteres justos)

**Descripción breve** (máx. 80):
> Idle tycoon: de rider a millonario. Negocios en 3 ciudades y Liga semanal.

**Descripción completa** (máx. 4.000):

> ¿Te imaginas pasar de repartir en bici a dueño de un imperio? En **Rider Millionaire** empiezas con una bici y una hamburguesería, y construyes negocio a negocio un imperio que cruza Madrid, Miami y Dubái. Es un **idle tycoon** (juego de magnate y negocios) para jugar un minuto o una hora: tus negocios siguen ganando dinero mientras no estás.
>
> 🚲 **Empieza desde abajo**: reparte pedidos en bici, contrata a tu primer gerente y ve cómo el reparto empieza a funcionar solo. En unos minutos abres tu primer negocio de verdad.
>
> 📦 **Monta cadenas de negocio**: cada negocio es una ruta con puestos, transporte y venta. Mejora cada parte: si una se atasca, ¡todo se frena! Los puestos suben de rango (bronce, plata, oro, diamante y leyenda) y los edificios crecen a la vista.
>
> 🌍 **Tres ciudades, 15 negocios**: del reparto en bici, el almacén, el restaurante, el estudio de TikTok y la agencia de IA de Madrid, a los food trucks, los yates y el exchange de cripto de Miami, y a los superdeportivos, el safari y el rascacielos de Dubái.
>
> 🎯 **Cada negocio, una regla propia**: atiende pedidos urgentes, sorprende a críticos gastronómicos, lanza directos virales o investiga mejoras. Nunca te castigan: si no juegas, el negocio sigue funcionando.
>
> 👔 **Gerentes con habilidades**: contrátalos para automatizarlo todo y activa su habilidad para acelerar tu negocio.
>
> 🎓 **Escuela de negocios**: gasta ideas en un árbol de mejoras permanentes que no pierdes nunca.
>
> 🏅 **Liga Millonario semanal**: cada lunes todos empiezan de cero y gana quien más juega esa semana, lleve el tiempo que lleve en el juego. Premios en diamantes para los 10 primeros y Muro de la fama. Ver anuncios o comprar no da puntos.
>
> 🛍️ **Mi vida**: viste a tu personaje, compra coches y objetos de lujo en 6 colecciones y míralos circular por tu ciudad.
>
> 🎉 **Eventos cada semana y temporadas** como Halloween, con una feria propia, premios exclusivos y retos del día y de la semana.
>
> 💼 **Ejecutivos y maletines**: colecciona ejecutivos de distintas rarezas, fusiónalos y multiplica tus ventas.
>
> 📈 **Sal a bolsa**: vende tu imperio a cambio de acciones que te harán ganar más para siempre, y vuelve a empezar más fuerte.
>
> Descarga gratis. Los anuncios son siempre opcionales: tú decides si ves uno para conseguir un premio. Hay compras opcionales dentro de la app. Español e inglés.
>
> El dinero del juego es ficticio: no tiene valor real y no se puede canjear.
>
> Las bases de la Liga están disponibles en la app y en nuestra web. Apple y Google no patrocinan ni participan en la Liga.

**Categoría**: Juegos → Simulación. **Etiquetas**: idle, tycoon, magnate, simulación de negocios.

**Palabras clave (ASO).** Google Play posiciona por el título, la descripción breve y la completa (no hay campo de palabras clave). Están repartidas a propósito: «idle tycoon» y «Idle Tycoon» en el título y en la breve; «magnate», «negocios», «imperio» y «ganar dinero» en la completa; «Madrid, Miami y Dubái» como diferencial. No repetir ninguna más de 3–4 veces: Google lo penaliza. Texto revisado el 6 de octubre de 2026: habla de bici, 3 ciudades, mecánicas, gerentes con habilidad, Escuela, «Mi vida» y eventos. Dice «premios en diamantes» (no en dinero) mientras la Liga no pague (decisión 4 de `ESTADO.md`), «gratis» en vez de «gratis para siempre» (hay compras) y no promete ganar con el móvil apagado: lo offline tiene tope. **Cambiar estas frases si cambian esas decisiones.** Sin datos de búsqueda reales todavía: cuando haya ficha, mirar en Play Console → Estadísticas → Adquisición qué términos traen instalaciones y ajustar.

**Datos de contacto**: email público obligatorio. Web: la de GitHub Pages (ver el punto 4).

## 2. Material gráfico (lo hace ChatGPT, ver docs/ART.md)

| Pieza | Tamaño | Notas |
| --- | --- | --- |
| Icono | 512×512 PNG | Sin transparencia en las esquinas. Se lee bien en pequeño |
| Gráfico destacado | 1024×500 | Ciudad isométrica + logotipo + "Rider Millionaire" |
| Capturas de pantalla | De 4 a 8, verticales (mín. 1080×1920) | Con un texto grande arriba. **Orden** (las dos primeras decidirán la mayoría de instalaciones): 1) «De rider a millonario» (la bici y la ruta), 2) «Tus negocios trabajan solos», 3) «Tres ciudades: Madrid, Miami y Dubái», 4) «Cada negocio, su propia regla», 5) «Liga semanal con premios en diamantes», 6) «Mi vida: coches y lujo» |

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

**App name** (máx. 30): `Rider Millionaire: Idle Tycoon`

**Short description** (máx. 80):
> Idle tycoon: from delivery rider to millionaire. 3 cities and a weekly League.

**Full description:**

> Ever dreamed of going from delivery rider to owner of a business empire? In **Rider Millionaire** you start with a bike and a burger joint, and build an empire across Madrid, Miami and Dubai, one business at a time. It's an **idle tycoon** game you can play for a minute or an hour: your businesses keep earning money while you're away.
>
> 🚲 **Start at the bottom**: deliver orders by bike, hire your first manager and watch the deliveries start running by themselves. Within minutes you open your first real business.
>
> 📦 **Build business chains**: every business is a route with stalls, transport and sales. Upgrade each part: if one jams, everything slows down! Stalls rank up (bronze, silver, gold, diamond and legend) and buildings visibly grow.
>
> 🌍 **Three cities, 15 businesses**: from bike delivery, the warehouse, restaurant, TikTok studio and AI agency in Madrid, to the food trucks, yachts and crypto exchange in Miami, to the supercars, safari and skyscraper in Dubai.
>
> 🎯 **Every business has its own rule**: fill urgent orders, impress food critics, go viral live or research upgrades. They never punish you: if you don't play, the business keeps running.
>
> 👔 **Managers with abilities**: hire them to automate everything and trigger their ability to speed up your business.
>
> 🎓 **Business school**: spend ideas on a tree of permanent upgrades you never lose.
>
> 🏅 **Weekly Millionaire League**: every Monday everyone starts from zero and whoever plays the most that week wins, no matter how long they've been playing. Diamond prizes for the top 10 and a Hall of Fame. Watching ads or buying doesn't give points.
>
> 🛍️ **My life**: dress your character, buy cars and luxury items across 6 collections and watch them drive around your city.
>
> 🎉 **Weekly events and seasons** like Halloween, with their own fair, exclusive prizes and daily and weekly challenges.
>
> 💼 **Executives and briefcases**: collect executives of different rarities, merge them and multiply your sales.
>
> 📈 **Go public**: sell your empire for shares that boost your earnings forever, and start again stronger.
>
> Free to download. Ads are always optional: you decide whether to watch one for a reward. Optional in-app purchases are available. English and Spanish.
>
> In-game money is fictional: it has no real value and cannot be redeemed.
>
> The League rules are available in the app and on our website. Apple and Google do not sponsor or take part in the League.

**Capturas:** las mismas que en español, pero hechas con el juego en inglés (Ajustes → Idioma → English) y con los textos de arriba en inglés: «Build your empire», «Your businesses run themselves», «Expand to Miami», «Weekly League with prizes».
