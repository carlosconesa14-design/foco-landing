# Plan hacia el lanzamiento (5 de octubre de 2026)

El juego está prácticamente terminado. Falta convertirlo en un negocio: que lo juegue gente de verdad, que vuelva y que cada jugador deje más de lo que cuesta conseguirlo. Este documento ordena todo lo pendiente y quién lo hace.

**Ahora mismo estamos esperando el arte de ChatGPT/Codex** (encargos al final de este documento y en `ART.md`). Mientras tanto, nada de lo de abajo se empieza.

## Dónde estamos

- **Beta web publicada:** https://carlosconesa14-design.github.io/foco-landing/jugar/ (desde `main`).
- **PR abierta sin unir:** [#5](https://github.com/carlosconesa14-design/foco-landing/pull/5), con el barrio completo alrededor de cada negocio. Se une cuando Carlos la pruebe.
- **Jugadores reales:** casi ninguno. El 5 de octubre la analítica tenía 3 instalaciones, todas del 2 de octubre y probablemente de pruebas. Ninguna había vuelto al día siguiente y no había opiniones. Todavía no sabemos si el juego engancha.

## Objetivos que deciden si funciona

Son referencias orientativas para un juego idle. Se miden en el panel de la beta (`ANALITICA.md`).

| Medida | Objetivo | Si sale por debajo |
| --- | --- | --- |
| Vuelven al día siguiente (D1) | 35–40 % | Pulir los primeros 10 minutos antes de buscar más jugadores |
| Siguen a la semana (D7) | 12–15 % | Revisar el ritmo, las metas diarias y las notificaciones |
| Ingreso diario por jugador activo | 0,05–0,15 € | Revisar dónde salen los anuncios bonificados y las ofertas |
| Coste por instalación (cuando haya publicidad de pago) | Menor que lo que deja un jugador | No pagar publicidad; seguir con TikTok y la tienda |

Orden de magnitud: 1.000 jugadores al día dan unos 50–150 € al día. La palanca es tener más jugadores que vuelvan, no subir precios.

## Lo que hace Carlos

En orden de urgencia (detalles en `LANZAMIENTO.md` y `TIENDA.md`):

1. [ ] Crear la cuenta de **Google Play Console** (25 $, pago único) y la de **AdMob**. Pasar los IDs de AdMob y dar de alta los productos de compra, incluido `auto_manager` (`COMPRAS.md`).
2. [ ] **Prueba cerrada:** Google exige 12 testers durante 14 días seguidos a las cuentas personales nuevas. Invitar a 15–20 personas para ir sobrado. Comprobar la cifra en Play Console por si ha cambiado.
3. [ ] Subir los secretos de GitHub y configurar Play Integrity (`TIENDA.md`, `SEGURIDAD.md`).
4. [ ] Datos para la política de privacidad (`PRIVACIDAD.md`) y ficha de privacidad de la tienda.
5. [ ] Abrir la cuenta de **TikTok** del juego y publicar 1 vídeo al día, a la misma hora (19:00–22:00).
6. [ ] Comprobar el nombre en Google Play y en la EUIPO; elegir dominio para la landing (opcional, ver abajo).
7. [ ] Alta de autónomo o empresa cuando entren ingresos; datos fiscales en AdMob y Google Play. Asesor para bases de la Liga, privacidad e impuestos.
8. [ ] Más adelante, iPhone: cuenta de Apple (99 $/año), cuando Android funcione.

## Lo que hace Claude (cuando llegue el arte)

Por orden:

### 1. Landing page ✅ (5 de octubre)
Publicada en la raíz de la web. Explicación de la analítica y del formulario de la beta en `ANALITICA.md`, sección «Landing page».

Sustituye la portada actual (`site/index.html`, que se publica en la raíz de GitHub Pages; la beta sigue en `/jugar/`).

- **Objetivo:** que quien llega desde TikTok o un enlace entienda el juego en 5 segundos y lo instale o lo pruebe.
- **Secciones:**
  1. Cabecera con logo, una frase («De rider a millonario») y dos botones: «Descargar en Google Play» y «Jugar ahora en el navegador».
  2. Vídeo o GIF del juego en un marco de móvil.
  3. Tres ciudades (Madrid, Miami, Dubái) con su arte.
  4. Cómo se juega en 3 pasos: abre negocios, contrata gerentes y expande tu imperio.
  5. La Liga semanal con premios, enlazando siempre a las bases.
  6. Capturas, preguntas frecuentes y pie con privacidad, bases y contacto.
- **Idiomas:** español e inglés, según el idioma del navegador.
- **Técnica:**
  - HTML y CSS propios, sin frameworks; muy ligera (que cargue en menos de 2 s en 4G).
  - Vista previa al compartir: Open Graph y tarjeta de Twitter, con imagen de 1200×630.
  - Favicon y analítica de visitas y clics en «Descargar» con la función `track` existente.
  - Accesible y con `prefers-reduced-motion`.
- **Mientras no haya ficha en Google Play:** el botón principal es «Jugar ahora» y hay un formulario para apuntarse a la beta cerrada (email o grupo de testers).
- **Dominio propio (opcional):** si Carlos compra uno, se configura en GitHub Pages.

### 2. Vídeos de TikTok orgánico
Los 20 guiones están en `TIKTOK.md`. Claude los produce y los deja listos para subir en `marketing/tiktok/`.

- **Formato:** 1080×1920, 15–30 s, texto grande, gancho en los 2 primeros segundos y cierre con llamada a la acción.
- **Cómo se hacen:**
  - Grabación automática del juego con Playwright: partidas preparadas, cámara guiada y escenas concretas, como el timelapse de rider a Miami, el atasco, el gerente o la salida a bolsa.
  - Montaje con textos, transiciones y la pantalla final con el logo y «Búscalo en Google Play».
  - Herramienta de montaje: `ffmpeg-static` desde npm, porque el contenedor no tiene ffmpeg.
- **Qué entrega Claude por vídeo:**
  - el MP4;
  - una portada;
  - el texto de la publicación con hashtags;
  - el guion por si Carlos quiere grabar su versión a cámara.
- **Qué graba Carlos:** los vídeos en los que sale él (#2, #9, #17, #18). Claude prepara el texto y los planos de juego que acompañan.
- **Música:** la del juego o la de la biblioteca de TikTok al subir; nada con derechos de autor dentro del MP4.
- **Primera tanda:** 7 vídeos (una semana de publicación), luego el resto.
- **Reglas:** las de `TIKTOK.md`; nunca «gana dinero jugando».

### 3. Primeros 10 minutos
Es lo que más decide si alguien vuelve.

- **Revisar con el bot y en el navegador:**
  - tiempo hasta la primera compra, el primer gerente y el segundo negocio;
  - momentos vacíos o confusos;
  - el primer anuncio bonificado y la primera notificación.
- **Ajustar** tutorial, metas y celebraciones sin romper los tests de ritmo.

### 4. Instalable desde el navegador (PWA) y vista previa del enlace de la beta
Que los testers puedan «añadir a la pantalla de inicio» y que el enlace de `/jugar/` se vea bien en WhatsApp e Instagram.

### 5. Ficha de la tienda (ASO)
- Repasar título, descripción corta y larga en español e inglés con las palabras que se buscan, como «idle tycoon», «magnate» o «negocios».
- Elegir el orden de las capturas y el gráfico destacado.

### 6. Revisar los datos de la prueba cerrada
Cuando haya testers: retención, dónde abandonan, anuncios vistos y opiniones. Decidir los cambios con Carlos.

### Otras tareas ya apuntadas
- Mecánicas de Miami y Dubái con su pieza en el mundo, cuando Codex entregue el arte (`ART.md`, punto 6). En código solo hay que añadirlas a `TWIST_WORLD_ART`.
- Juego a largo plazo después de Dubái (Tokio u otra ciudad, temporadas).

## Encargos de arte que estamos esperando (ChatGPT/Codex)

Los prompts y tamaños exactos están en `ART.md`, sección «Encargo: landing page y vídeos de TikTok».

1. **Landing:**
   - imagen principal;
   - personaje recortado;
   - las tres ciudades;
   - imagen para compartir de 1200×630;
   - iconos de los pasos;
   - favicon.
2. **TikTok:**
   - pantalla final;
   - plantillas de portada;
   - avatar de la cuenta;
   - pegatinas de texto con el estilo del juego.
3. **Juego** (ya encargado):
   - piezas de las mecánicas de Miami y Dubái;
   - solares para rellenar las manzanas grandes (aparcamiento, contenedores, zona verde).
