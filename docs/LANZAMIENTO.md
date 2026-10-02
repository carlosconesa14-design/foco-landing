# Lanzamiento: lista de pasos

Todo el código está listo: juego en español e inglés, Liga, evento del fin de semana, analítica, compras, anuncios, avisos, APK automático y la versión firmada para Google Play. Lo que queda son **cuentas, datos y material** que solo puedes poner tú, en este orden.

## 1. Probar la app en tu móvil Android
1. En GitHub: repositorio → **Actions** → **Android APK** → la última ejecución en verde → **Artifacts** → `rider-millionaire-apk`. Se descarga un .zip con el .apk dentro.
2. Pásalo al móvil y ábrelo. Android pedirá permitir «instalar apps de origen desconocido».
3. En el juego: **Ajustes → Diagnóstico del móvil**. Comprueba:
   - **Guardado:** OK;
   - **Servidor de la Liga:** conectado;
   - **Anuncio de prueba:** se ve entero;
   - **Aviso de prueba:** llega a los 10 s con la app cerrada;
   - **Vibración:** se nota.
4. Juega un rato y apúntate a la Liga. En Supabase deberían aparecer tu jugador (`league_players`) y tus eventos (`analytics_events`).

## 2. Cuentas
| Cuenta | Para qué | Coste | Notas |
| --- | --- | --- | --- |
| **Google Play Console** | Publicar la app | 25 $ (un solo pago) | La verificación de identidad tarda unos días: es lo primero |
| **AdMob** | Ingresos por anuncios | Gratis | Crea la app (Android) y 1 bloque **Bonificado**. Necesitas el **App ID** (`ca-app-pub-…~…`) y el **ID del bloque** (`ca-app-pub-…/…`) |

## 3. Datos legales (mínimo para Google Play)
Rellena los [corchetes] de `docs/PRIVACIDAD.md`:
- nombre o razón social;
- NIF;
- domicilio;
- email;
- fecha.

Con eso, la política de privacidad sirve para la tienda.

Las bases de la Liga (`docs/BASES_LIGA.md`) solo hacen falta completas **antes de dar premios en dinero**, y conviene que las revise un asesor. Mientras los premios sean diamantes, basta con el borrador.

## 4. Unir la PR a `main` y publicar la beta web
1. Repositorio → **Settings → Pages → Source: «GitHub Actions»** (una vez).
2. Une la PR a `main`.

Se publica la web en `https://carlosconesa14-design.github.io/foco-landing/`:
- portada con el botón **«Jugar gratis (beta)»**;
- el juego, en `…/jugar/`;
- la política de privacidad y las bases de la Liga.

Cada vez que se sube algo a `main`, la web se actualiza sola.

**Qué cambia en la beta web** (`src/platform/web.ts`):
- **Tienda:** las compras no están; los botones dicen «En la app».
- **Anuncios:** son simulados (5 s) y la recompensa se da igualmente.
- **Liga:** funciona, pero sin premios en dinero (el servidor marca al jugador como web).
- **Analítica:** activa, con plataforma `web`. Así se ven los números de la beta en Supabase.
- **Partida:** se guarda en el navegador. Al entrar la primera vez, un aviso lo explica.
- **Depuración:** la consola del navegador (`__game`) no está disponible.

Pon el enlace en la bio de TikTok: así consigues jugadores y los 12 probadores de Google Play. La URL de privacidad (`…/legal/privacidad.html`) es la que pide Play Console.

**Importante:** GitHub solo deja lanzar a mano los workflows que están en `main`. Hasta que unas la PR, no aparecerá «Android release (Google Play)» en Actions.

## 5. Clave de firma y secretos de GitHub
Sigue `docs/TIENDA.md`, punto 3:
1. Crea la clave de subida (`upload.jks`).
2. Añade los 6 secretos en GitHub: la clave en base64, sus contraseñas, el alias y los dos IDs de AdMob.

Si prefieres, la clave la genero yo y tú solo guardas el archivo y la contraseña.

Después: **Actions → Android release (Google Play) → Run workflow**. Sale el `.aab` firmado, con anuncios reales, en Artifacts.

## 6. Play Console
1. **Crear la app:** juego, gratis. Usa como nombre el de `docs/TIENDA.md`.
2. **Ficha:** textos en español y en inglés (`docs/TIENDA.md`, puntos 1 y 6).
3. **Material gráfico:** icono de 512 px, gráfico destacado de 1024×500 y de 4 a 8 capturas. Lo hace ChatGPT; los tamaños están en `docs/TIENDA.md`, punto 2.
4. **Formularios:**
   - clasificación de contenido;
   - seguridad de los datos;
   - anuncios: sí;
   - público: mayores de 13.

   Las respuestas están en `docs/TIENDA.md`, punto 5.
5. **Productos de compra:** `vip`, `starter_pack`, `gems_200` y `gems_1200` (`docs/COMPRAS.md`). Hay que haber subido antes un `.aab`.
6. **Política de privacidad:** la URL del paso 4.

## 7. Prueba cerrada (obligatoria para cuentas personales nuevas)
Google exige que las cuentas personales nuevas hagan una **prueba cerrada con al menos 12 probadores durante 14 días seguidos** antes de publicar en producción:
1. Sube el `.aab` a **Prueba cerrada**.
2. Añade los emails de los probadores: amigos, familia o seguidores de TikTok.
3. Pídeles que la abran varios días. Sus partidas ya cuentan para la analítica y la Liga.

Mientras tanto:
- revisa los números en Supabase (`docs/ANALITICA.md`): retención al día 1 por encima del 35 % y tutorial completado por encima del 80 %;
- corrige lo que salga.

## 8. Producción
Solicita el acceso a producción en Play Console (Google revisa la prueba) y publica.

Recomendado:
- empezar en España y Latinoamérica;
- la Liga, con premios dentro del juego las primeras semanas;
- **premios en dinero** solo cuando el asesor haya revisado las bases (ver `docs/LIGA.md`).

## En paralelo
- **TikTok** (`docs/TIKTOK.md`): empieza ya, para llegar al lanzamiento con seguidores. Los vídeos de `marketing/evolucion/` sirven para el primero.
- **ChatGPT/Codex** (`docs/ART.md`):
  - icono, gráfico destacado y capturas;
  - arte de Miami;
  - una moneda sin símbolo € para el juego en inglés.
- **Asesor:**
  - bases de la Liga y política de privacidad;
  - alta como autónomo o empresa;
  - impuestos de los ingresos y de los premios.
- **iOS (más adelante):** cuenta de Apple Developer (99 $/año) y compilar en un Mac o en la nube.
