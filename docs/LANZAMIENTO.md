# Lanzamiento: lista de pasos

Todo lo técnico está preparado. Esto es lo que queda, en orden.

## 1. Probar la app en tu móvil Android (hoy)
1. En GitHub: repositorio → pestaña **Actions** → **Android APK** → la última ejecución en verde → al final, **Artifacts** → `rider-millonario-apk`. Se descarga un .zip con el .apk dentro.
2. Pásalo al móvil y ábrelo. Android pedirá permitir «instalar apps de origen desconocido» para tu navegador o gestor de archivos.
3. En el juego: **Ajustes → Diagnóstico del móvil**. Comprueba:
   - **Guardado:** OK;
   - **Servidor de la Liga:** conectado;
   - **Anuncio de prueba:** se ve entero;
   - **Aviso de prueba:** llega a los 10 s con la app cerrada;
   - **Vibración:** se nota.
4. Juega un rato y apúntate a la Liga. En Supabase deberían aparecer tu jugador (`league_players`) y tus eventos (`analytics_events`).

Cada vez que se sube un cambio a la rama se compila un APK nuevo, con el número de versión subiendo solo.

## 2. Cuentas que tienes que crear tú
| Cuenta | Para qué | Coste | Notas |
| --- | --- | --- | --- |
| **Google Play Console** | Publicar la app | 25 $ (un solo pago) | La verificación de identidad tarda unos días: hazla ya |
| **AdMob** | Ingresos por anuncios | Gratis | Crea la app y 1 bloque «Bonificado». Me pasas el App ID y el ID del bloque y los configuro (ver README) |
| Apple Developer (opcional, después) | Publicar en iOS | 99 $/año | Necesita un Mac o compilar en la nube |

## 3. Antes de subir a Google Play
- [ ] **Icono, pantalla de carga y capturas** (ChatGPT, ver `docs/ART.md`)
- [ ] **Política de privacidad** publicada en una URL (borrador en `docs/PRIVACIDAD.md`)
- [ ] **AdMob real:** App ID e ID del bloque en `.env` / Gradle, y `VITE_ADMOB_TESTING=false` **solo** en la versión de la tienda
- [ ] **Firma de la app:** generar la clave de subida (*upload key*). Lo preparo cuando tengas Play Console
- [ ] **Productos de compra** creados con los ids de `docs/COMPRAS.md`
- [ ] Formulario de **clasificación de contenido** y de **seguridad de los datos** en Play Console (con lo que dice `docs/PRIVACIDAD.md`)

## 4. Lanzamiento de prueba
1. Publicar en **prueba cerrada o abierta** en un país barato (por ejemplo México o Colombia), o solo en España con TikTok orgánico.
2. Liga con premios **dentro del juego** las primeras 1–2 semanas.
3. Medir con `docs/ANALITICA.md`: retención a 1 día > 35 %, a 7 días > 12 %, tutorial completado > 80 %.
4. Si los números acompañan y el asesor ha revisado las bases (`docs/BASES_LIGA.md`): **premios en dinero** con 50 €/semana (ver `docs/LIGA.md`).

## 5. En paralelo
- **ChatGPT/Codex:** arte de Miami, carretilla y furgoneta, iconos, edificios ★★/★★★ (`docs/ART.md`).
- **Asesor:** bases de la Liga, política de privacidad, alta de autónomo e impuestos de premios e ingresos.
