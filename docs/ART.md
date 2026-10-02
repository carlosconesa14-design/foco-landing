# Guía de arte

El catálogo `src/art/catalog.ts` define las claves y tamaños lógicos. El juego carga primero los PNG individuales del manifest, después los atlas generados con ChatGPT y, como respaldo, los dibujos por código. Así puedes cambiar el arte pieza a pieza sin tocar la simulación.

## Cómo añadir una imagen

1. Genera el PNG con **fondo transparente**.
2. Guárdalo como `public/sprites/<clave>.png`, por ejemplo `public/sprites/bld_restaurant.png`.
3. Añade la clave a `public/sprites/manifest.json`, por ejemplo `["bld_restaurant", "ch_cook_0"]`.
4. Recarga el juego.

Recomendaciones:
- Exporta a **3 veces el tamaño lógico** (por ejemplo, un personaje de 44×60 se exporta a 132×180) para que se vea nítido en pantallas retina.
- Respeta la **proporción** de la tabla: el juego escala la imagen al tamaño lógico.
- Personajes y edificios se apoyan en el **centro de la parte inferior** de la imagen. Deja muy poco margen abajo.
- De cada personaje basta con la pose quieta (`_0`). Si no hay `_1` y `_2`, el juego usa la misma imagen al caminar.

## Estilo común

Pega este bloque al principio de cada prompt para que todo quede coherente:

> Mobile idle tycoon game asset, clean cartoon vector style, soft cel shading, bright saturated colors, subtle dark outline, friendly chibi proportions, warm daylight lighting from the top-left, no text, no letters, no watermark, single object centered, fully transparent background, PNG.

Paleta de la interfaz: azul marino `#0E1A2B`, dorado `#F5C542`, verde beneficio `#3DDC97` y rojo `#FF6B5B`.

## Piezas

### Edificios de la ciudad (vista isométrica)

Todos tienen una base de rombo 2:1 de unos 150×75 px lógicos, que ocupa una parcela de 2×2 casillas.

| Clave | Tamaño lógico | Prompt (añadir tras el estilo común) |
| --- | --- | --- |
| `bld_dropship` | 172×150 | Isometric 2:1 view of a small modern e-commerce warehouse, orange-tan walls, grey flat roof with vents, two grey rolling loading doors, cardboard boxes by the door, sitting on a light grey diamond-shaped pavement base |
| `bld_restaurant` | 172×164 | Isometric 2:1 view of a cozy Italian restaurant, red brick walls, warm lit windows, red and white striped awning, small chimney, pasta sign on the roof, on a light grey diamond-shaped pavement base |
| `bld_tiktok` | 172×236 | Isometric 2:1 view of a tall purple glass content-creator studio tower, neon pink and cyan ring light on the roof, some lit windows, on a light grey diamond-shaped pavement base |
| `bld_ai` | 172×270 | Isometric 2:1 view of a sleek futuristic AI company skyscraper, teal glass, glowing lines, antenna with red light on top, on a light grey diamond-shaped pavement base |
| `bld_soon` | 172×170 | Isometric 2:1 view of a construction site with scaffolding and a small yellow crane, on a dirt diamond-shaped base |

### Decoración de la ciudad

| Clave | Tamaño lógico | Prompt |
| --- | --- | --- |
| `tree_0` | 56×72 | Isometric round leafy tree with soft shadow |
| `tree_1` | 48×76 | Isometric pine tree with soft shadow |
| `bush` | 36×24 | Small round bush with pink flowers |
| `lamp_post` | 16×56 | Dark blue street lamp post, light on |
| `car_0` … `car_3` | 44×34 | Isometric small cartoon car driving toward the bottom-right, red / blue / yellow / green |
| `cloud` | 150×64 | Fluffy white cartoon cloud |
| `sign_sale` | 112×92 | White "for sale" sign board on a wooden post with a red border, blank board (no text) |

### Personajes (de frente, mirando ligeramente a la derecha)

| Clave | Tamaño lógico | Prompt |
| --- | --- | --- |
| `ch_packer_0` | 44×60 | Chibi warehouse worker, blue cap, grey shirt with orange hi-vis vest, dark trousers, full body, standing |
| `ch_cook_0` | 44×60 | Chibi chef with tall white chef hat, white jacket and red apron, full body, standing |
| `ch_waiter_0` | 44×60 | Chibi waiter with white shirt, black vest and red bow tie, full body, standing |
| `ch_creator_0` | 44×60 | Chibi young content creator, pink hoodie, headphones, full body, standing |
| `ch_brand_0` | 44×60 | Chibi brand manager, purple suit, blonde bun, full body, standing |
| `ch_engineer_0` | 44×60 | Chibi AI engineer, teal hoodie, glasses, full body, standing |
| `ch_sales_0` | 44×60 | Chibi salesperson, navy suit and gold tie, full body, standing |
| `ch_rider_0` | 44×60 | Chibi food delivery rider, green shirt and green cap, full body, standing |
| `ch_editor_0` | 44×60 | Chibi video editor, yellow shirt, glasses, full body, standing |
| `ch_tech_0` | 44×60 | Chibi IT technician, dark blue shirt, teal cap, full body, standing |
| `ch_ped0_0` … `ch_ped2_0` | 44×60 | Chibi casual pedestrian, varied outfits, full body, standing |

Para las poses de caminar (`_1` y `_2`), el prompt es el mismo con "walking, left leg forward" o "walking, right leg forward".

### Recinto de los negocios

| Clave | Tamaño lógico | Prompt |
| --- | --- | --- |
| `st_dropship` | 100×86 | Wooden warehouse shelves full of cardboard boxes, slight 3/4 view |
| `st_restaurant` | 100×86 | Side view professional kitchen stove with two steaming pots |
| `st_tiktok` | 100×86 | Side view ring light on a tripod holding a smartphone, colorful props |
| `st_ai` | 100×86 | Side view black server rack with glowing cyan and green LEDs |
| `veh_forklift` | 44×40 | Isometric 2:1 small yellow warehouse forklift carrying nothing, driving toward the bottom-right (es la «Carretilla» del almacén; sin PNG se usa un coche) |
| `veh_van` | 52×40 | Isometric 2:1 white delivery van with an orange stripe, driving toward the bottom-right (son las «Furgonetas» del almacén) |
| `van` | 76×46 | Side view white delivery van with orange stripe, facing right (se usa en pantallas laterales) |
| `item_box` | 26×26 | Small cardboard box with tape |
| `item_dish` | 26×26 | Plate of spaghetti with tomato sauce |
| `item_clip` | 26×26 | Film clapperboard |
| `item_chip` | 26×26 | Glowing teal computer chip |
| `coin` | 20×20 | Shiny gold coin, front view |
| `pulley` | 34×34 | Grey metal pulley wheel with spokes, front view |

### Miami (segunda ciudad)

Mismo estilo común, con luz de playa soleada. Para la arena y las palmeras, añade "tropical beach, Miami vibes, pastel colors" al prompt.

| Clave | Tamaño lógico | Prompt |
| --- | --- | --- |
| `bld_foodtruck` | 172×140 | Isometric 2:1 view of a small beach plaza with two colorful food trucks (orange and turquoise) and a striped parasol, on a sandy diamond-shaped base |
| `bld_beachclub` | 172×170 | Isometric 2:1 view of a white modern beach club with turquoise roof, small pool and sun umbrellas, on a sandy diamond-shaped base |
| `bld_yachts` | 172×180 | Isometric 2:1 view of a wooden pier on turquoise water with a white luxury yacht moored, on a diamond-shaped water base |
| `bld_realestate` | 172×260 | Isometric 2:1 view of a tall yellow Miami art-deco residential tower with white balconies and blue windows, on a light grey diamond-shaped base |
| `bld_crypto` | 172×300 | Isometric 2:1 view of a futuristic dark purple skyscraper with an orange glowing crypto coin on top, on a light grey diamond-shaped base |
| `palm` | 60×84 | Isometric tropical palm tree with curved trunk and coconuts, soft shadow |
| `st_foodtruck` | 100×86 | Side view orange taco food truck with open serving window |
| `st_beachclub` | 100×86 | Side view wooden tiki beach bar with straw umbrella and colorful cocktails |
| `st_yachts` | 100×86 | Side view small white yacht moored at a wooden dock on turquoise water |
| `st_realestate` | 100×86 | Side view real estate agent desk with computer showing a house, small plant |
| `st_crypto` | 100×86 | Side view black trading server with a screen showing a rising green chart |
| `item_taco` | 26×26 | Cartoon taco |
| `item_cocktail` | 26×26 | Pink cocktail glass with orange slice |
| `item_ticket` | 26×26 | Blue boat trip ticket |
| `item_key` | 26×26 | Golden house key |
| `item_token` | 26×26 | Orange gold crypto coin |
| `ch_taquero_0` | 44×60 | Chibi taco cook, orange shirt, red cap, green apron |
| `ch_skater_0` | 44×60 | Chibi roller skater waiter, light blue shirt, red cap |
| `ch_vendor_0` | 44×60 | Chibi beach vendor, yellow shirt, blue shorts |
| `ch_bartender_0` | 44×60 | Chibi bartender, mint shirt, red bow tie |
| `ch_promoter_0` | 44×60 | Chibi party promoter, pink shirt, sunglasses, blonde bun |
| `ch_captain_0` | 44×60 | Chibi yacht captain, white uniform, navy captain hat, gold tie |
| `ch_sailor_0` | 44×60 | Chibi sailor, blue striped shirt, white cap |
| `ch_agent_0` | 44×60 | Chibi travel agent, peach shirt, glasses |
| `ch_broker_0` | 44×60 | Chibi real estate broker, grey suit, yellow tie |
| `ch_clerk_0` | 44×60 | Chibi office clerk, light blue shirt, hair bun |
| `ch_coder_0` | 44×60 | Chibi crypto developer, purple hoodie, headphones |
| `ch_trader_0` | 44×60 | Chibi trader, green shirt, purple tie |

## Plan de mejora gráfica (para ChatGPT)

Revisión del juego actual, ordenada por impacto: lo que más se nota en pantalla va primero.

### 1. Edificios de la ciudad (máximo impacto)
Es lo primero que ve el jugador y lo que más "vende" en las capturas de la tienda. Hoy son cajas isométricas dibujadas por código, con un emoji encima en un recuadro blanco.
- Genera los 9 `bld_*` y `bld_soon` con las tablas de arriba.
- **Sin emoji encima:** el edificio tiene que reconocerse solo por su forma (un cartel de pasta, un aro de luz…). Ya hay PNG de Madrid; el recuadro del emoji solo sale con el arte por código.
- ✅ **Enganche listo:** 3 versiones por edificio según sus puestos (`bld_x`, `bld_x_2`, `bld_x_3`; ver más abajo). Por ejemplo, un almacén pequeño que se vuelve nave logística y luego centro de distribución con camiones. Es la recompensa visual más fuerte de un tycoon: ver crecer lo que compras.

### 2. Suelo de la ciudad y del recinto
El suelo son rombos de color plano: carreteras, césped, aceras y arena. Se ve vacío.
- ✅ **Enganche listo** (ver más abajo): baldosas isométricas 88×44 (`tile_madrid_ground`, `tile_miami_ground`, carreteras, solares y suelo de cada recinto), con hasta 4 variantes por clave para que no se note la repetición.
- El borde de tierra de la isla (`island_edge`) y el agua animada del mar.

### 3. Personajes
Son chibis sencillos y solo tienen 2 poses al caminar.
- Haz primero `ch_*_0` de los 25 personajes, con el mismo prompt base para que tengan la misma cara y proporciones.
- Después, las poses de caminar `_1` y `_2`.
- Para Miami, los coches (`car_*`) también podrían ser descapotables o tener colores pastel.

### 4. Puestos y objetos del recinto
Son los 9 `st_*` y los 9 `item_*`. Se ven de cerca y mucho rato, así que merecen más detalle que los edificios.

### 5. Iconos de la interfaz (hoy son emojis)
Los emojis cambian según el móvil (Apple, Samsung, Google), se ven poco profesionales y no siguen el estilo del juego.
- ✅ **Enganche listo** (ver más abajo): iconos PNG de 64×64. Por prioridad:
  - dinero `ic_cash`, diamante `ic_gem`, estrella de franquicia `ic_star`;
  - botones laterales: misiones, diario, ejecutivos, logros y ajustes (`ic_missions`, `ic_daily`, `ic_execs`, `ic_trophy`, `ic_settings`);
  - barra inferior: ciudad, bolsa y mundo (`ic_city`, `ic_ipo`, `ic_world`);
  - un icono por negocio (`ic_biz_<id>`), uno por estilo de vida (`ic_life_0` a `ic_life_9`) y uno por mejora de la Oficina central (`ic_office_<id>`);
  - maletines: normal, oro y gratis (`chest_normal`, `chest_premium`, `chest_free`);
  - banderas de ciudad (`flag_madrid`, `flag_miami`).
- ✅ **Retratos de ejecutivos** (hoy son emojis): 8 caras de 96×96 (`exec_0` a `exec_7`). Sin marco: el juego ya pone el borde del color de la rareza.

### 6. Interfaz (marcos y botones)
Los paneles son rectángulos azul marino, limpios pero genéricos.
- Pide a ChatGPT un **kit de interfaz** en el mismo estilo: marco de panel, botón dorado, botón verde de anuncio (con el icono ▶ de vídeo), barra de progreso y cabecera del dinero.
- Se pueden aplicar como imágenes de fondo con CSS (`border-image`) sin tocar la lógica.

### 7. Efectos y ambiente
Todo esto es código más que sprites. ChatGPT solo tendría que dibujar la pieza:
- monedas que vuelan hasta el contador al cobrar;
- ciclo de día y noche con farolas y ventanas encendidas;
- olas animadas, barcos y gaviotas en el mar;
- banderines y destellos dorados cuando un negocio crece;
- confeti y rayos de las celebraciones con sprites propios.

### 8. Tienda y marca (antes de publicar)
- Icono de la app (1024×1024), pantalla de carga (splash) y logotipo "Idle Millionaire".
- 5 capturas para la tienda con textos grandes; se pueden montar sobre capturas reales del juego.

### Enganches ya preparados en el código

Estas piezas ya se pueden sustituir por PNG igual que el resto: se dejan en `public/sprites/` y se añaden a `manifest.json`. Mientras no exista el PNG, el juego sigue con el emoji o el dibujo por código.

**Edificios (`bld_*`):** al cargar se recorta solo el margen transparente y se escalan para que la base ocupe la parcela. No hace falta encuadrarlos con precisión, solo que la base (el rombo de suelo) sea lo más ancho del dibujo.

**Iconos de la interfaz** (64×64, o 3 veces más grandes, con fondo transparente, sin texto):

| Clave | Sustituye a | Dónde sale |
| --- | --- | --- |
| `ic_gem` | 💎 | Cabecera, precios y premios |
| `ic_star` | ⭐ | Estrellas de franquicia |
| `ic_city`, `ic_ipo`, `ic_world` | 🏙️ 📈 🌍 | Barra inferior |
| `ic_missions`, `ic_daily`, `ic_execs`, `ic_trophy`, `ic_league`, `ic_settings` | 📋 🎁 💼 🏆 🏅 ⚙️ | Menú lateral |
| `ic_biz_<id>` (`ic_biz_dropship`, `ic_biz_restaurant`, `ic_biz_tiktok`, `ic_biz_ai`, `ic_biz_foodtruck`, `ic_biz_beachclub`, `ic_biz_yachts`, `ic_biz_realestate`, `ic_biz_crypto`) | 📦 🍝 📱 🤖 🌮 🏖️ 🛥️ 🏘️ 🪙 | Barra, paneles y ejecutivos |
| `ic_life_0` … `ic_life_9` | 🛏️ 🏚️ 🏠 🏢 🌆 🏡 🏰 🛥️ 🏝️ 🚀 | Estilo de vida en la cabecera |
| `ic_office_<id>` (`brand`, `team`, `floors`, `suppliers`, `offline`, `hustle`, `luck`) | 🌍 👔 🏗️ 🤝 🌙 ⚡ 🔥 | Oficina central |
| `chest_free`, `chest_normal`, `chest_premium` | 💼 👜 | Maletines |
| `flag_madrid`, `flag_miami` | 🇪🇸 🇺🇸 | Barra y mapa del mundo |
| `exec_0` … `exec_7` (96×96) | Caras de los ejecutivos | Panel de ejecutivos |

Prompt base para iconos: "Game UI icon of <objeto>, glossy cartoon style matching the buildings, bold shapes, subtle dark outline, centered, transparent background, no text."

**Baldosas del suelo** (rombo isométrico de 88×44, o 264×132 a 3x; si tiene grosor puede ser más alto: se apoya por el vértice de arriba). Cada clave admite variantes `_1`, `_2` y `_3`, que el juego reparte al azar para que no se note la repetición:

| Clave | Qué es |
| --- | --- |
| `tile_madrid_ground`, `tile_miami_ground` | Césped de Madrid y arena de Miami |
| `tile_lot` | Solar pavimentado bajo los edificios |
| `tile_road_c`, `tile_road_r`, `tile_cross` | Carretera en cada dirección y cruce con paso de cebra |
| `tile_path` | Camino peatonal dentro de los recintos |
| `tile_biz_<id>` | Suelo del recinto de cada negocio (por ejemplo, `tile_biz_restaurant` con terraza de baldosas) |

Prompt base para baldosas: "Seamless isometric 2:1 ground tile, top face only, <material>, flat even lighting, edges must tile perfectly with copies of itself, transparent outside the diamond."

**Edificios que crecen** (mismo tamaño y encuadre que `bld_<id>`; el juego los recorta y ajusta a la parcela). Con 3 puestos el negocio pasa a ★★ y con 6 a ★★★. Se celebra con una pantalla de "¡sube de categoría!" y el edificio cambia en el mapa y en el recinto. Si falta una versión, se usa la anterior.

| Clave | Prompt (tras el estilo común; mantener la misma base de rombo, colores y vista) |
| --- | --- |
| `bld_dropship_2` | The same warehouse, now bigger: two connected warehouse halls, a loading dock with a delivery truck, stacked pallets |
| `bld_dropship_3` | The same brand as a large modern logistics center: tall building, solar panels on the roof, several trucks, a small conveyor belt, company flag |
| `bld_restaurant_2` | The same Italian restaurant, now with a terrace full of tables and string lights, and a second floor |
| `bld_restaurant_3` | The same restaurant as an upscale three-floor venue: rooftop terrace, golden sign, valet stand, lush plants |
| `bld_tiktok_2` | The same purple studio tower, taller, with a big LED screen on the facade |
| `bld_tiktok_3` | The same content-creator HQ as a landmark skyscraper: giant ring light crown, neon billboards, rooftop helipad |
| `bld_ai_2` | The same AI tower, taller, with a glowing data center wing beside it |
| `bld_ai_3` | The same AI company as a futuristic campus: twin teal skyscrapers joined by a sky bridge, holographic logo, antenna |
| `bld_<id>_2` / `bld_<id>_3` de Miami (`foodtruck`, `beachclub`, `yachts`, `realestate`, `crypto`) | La misma regla: la versión 2 es el mismo negocio más grande y con más detalle; la 3, la versión de lujo y emblemática |

### Qué ya funciona sin tocar código
Cualquier clave de las tablas de arriba: se deja el PNG en `public/sprites/` y se añade al `manifest.json`. Ya no hace falta código para ninguna pieza de esta guía.

## Consejos para generar con ChatGPT

- Pide **una pieza por imagen** y di explícitamente "transparent background". Si el fondo sale blanco, quítalo con cualquier herramienta de recorte.
- Genera primero un edificio y un personaje. Cuando te guste el resultado, pide el resto "in exactly the same style as the previous image" para que todo sea coherente.
- Mantén siempre la misma **vista**: isométrica 2:1 para edificios, coches y árboles. Los personajes y los puestos van de frente, en vista 3/4.

## Primera pasada visual: edificios evolutivos

Arte original vectorial generado por código (sin dependencias ni licencias externas).
`bld_<id>_1`, `bld_<id>_2` y `bld_<id>_3` están disponibles para los nueve negocios.
La etapa depende exclusivamente de los puestos abiertos: 1–2 / 3–5 / 6–8;
no modifica economía ni guardados. Tamaños: 172×H, 172×(H+24), 172×(H+48),
donde H es la altura de la tabla original. La base permanece anclada al suelo.
Se pueden sustituir en el manifiesto por PNG, igual que las claves originales.
Un PNG original sin variantes sigue siendo prioritario como arte de las tres etapas.

Dirección de arte / prompt de las variantes: «Mobile idle tycoon, original cartoon
isometric 2:1 business building, warm top-left light, navy outline, bespoke rooftop
business pictogram, planted entrance; stage 1 small local business, stage 2 expanded
building with utility annex, stage 3 taller flagship with gold pennant; transparent
background, no emoji, no brand logo». Los emblemas (caja, plato, móvil, chip,
cóctel, vela, casa y moneda) se dibujan con geometría propia dentro de la textura.

## Kit de interfaz y ambiente (primera pasada)

- `src/ui/icons.ts`: 15 iconos SVG originales (48×48 lógicos): cash, gem,
  missions, daily, execs, premium, trophy, settings, city, ipo, world, star,
  lock, manager, check. Se usan como decoración con `aria-hidden`, conservando
  los nombres accesibles de los botones. Dirección / prompt: «Original mobile
  tycoon UI icon, warm gold / ice blue / mint enamel, rounded navy outlines,
  compact readable silhouette, subtle lower shadow, transparent background».
- El kit CSS comparte marcos azul esmalte, botones con relieve, cabeceras
  doradas y tarjetas de recompensa; día 7 y maletín de oro tienen marco propio.
- `src/art/ground.ts`: detalle original de césped, arena, juntas de pavimento,
  desagües y bordillos. Se dibuja en el Graphics existente, sin objetos por
  baldosa ni nuevas texturas. Tamaño de referencia: baldosa 88×44.
  Dirección / prompt: «Isometric 2:1 miniature city paving, subtle seams and
  curbstones, sparse grass tufts, warm sand flecks, low visual noise».
- Costa con plataforma turquesa y sombra; ondulación suave del agua.
- `src/ui/rewards.ts`: monedas vectoriales del punto de venta al contador.
  Máximo 12 monedas simultáneas, con intervalo mínimo de 250 ms entre ventas.
  No modifica ni retrasa ingresos. Con movimiento reducido se omite el vuelo,
  el confeti, las partículas, la sacudida y los rebotes decorativos; se mantienen
  barras y desplazamientos que explican el estado de producción y transporte.

## Acabado, retratos y marca

- Personajes (`ch_*`, mismos 44×60): contorno de silueta, luz cálida en cara y
  ropa, manteniendo las tres poses y el lenguaje de vestuario de las tablas.
- Puestos (`st_*`, mismos 100×86): base esmaltada; estanterías con etiquetas,
  cocina con mandos y metal iluminado, set de grabación con luz secundaria.
- `src/ui/portraits.ts`: ocho apariencias originales de ejecutivo,
  96×96, elegidas de forma estable por nombre; no cambia sus estadísticas ni
  guardados. La tarjeta muestra marco y brillo según la rareza real.
  Prompt / dirección: «Friendly chibi mobile tycoon executive portrait, navy
  outlined face, diverse skin tones, warm light, tailored teal / blue / purple
  / ochre suit, gold tie, some with glasses or bun, rounded 96px square».
- `public/icon.svg`: marca propia, cuadrado lógico 128×128 escalable, moneda
  dorada sobre tres edificios crecientes. La pantalla de carga comparte esa
  composición y el título. Dirección: «Original idle tycoon app mark, rising
  ice blue city skyline, oversized warm gold euro coin, navy rounded square».
- Fuentes locales: Lilita One y Rubik 400/500/700 (subconjunto latino, incluye
  acentos españoles), obtenidas de los paquetes Fontsource 5.3.0. Licencias
  SIL OFL completas en `public/fonts/*-LICENSE.txt`. No hay descarga de Google
  Fonts durante el juego. Boot espera las fuentes antes de generar texto canvas.

Validación de esta pasada: `npm test` (62 tests), `npm run build`, navegador
390×844 con los nueve recintos y las 27 variantes, paneles de retención, bolsa
y mundo, compras y gerentes reales, salto de etapa al abrir el tercer puesto,
ventas y movimiento reducido. Revisados también paneles a 320 y 560 px.

## Arte generado con ChatGPT (atlas integrados)

97 piezas originales con transparencia, repartidas en nueve láminas PNG en
`public/sprites/generated/`. `sources.json` registra el archivo original,
resolución, peso y número de piezas. Se conservan los píxeles de las imágenes
entregadas por ChatGPT; los JSON delimitan cada objeto sin retocar el arte.
`src/art/generatedFrames.ts` comparte esos límites con la interfaz SVG.
Phaser carga una textura por lámina, evitando duplicar cada PNG por personaje.
Los nueve PNG suman 16,8 MiB; el lado máximo es 1774 px, sin texturas 4K.

| Lámina / claves | Piezas | Tamaño lógico / uso |
| --- | --- | --- |
| `buildings-1/2/3`: `bld_<negocio>_1/2/3` | 27 | Ancho 156 / 172 / 172, altura proporcional; puestos 1–2 / 3–5 / 6–8 |
| `stations`: `st_<negocio>` | 9 | Dentro de 100×86, sin estirar |
| `workers-1/2`: `ch_<rol>_0` | 25 | Dentro de 44×60; caminar reutiliza la pose con movimiento procedural |
| `decor`: `tree_0/1`, `bush`, `palm`, `cloud`, `lamp_post`, `sign_sale`, `bld_soon`, `car_0/1/2/3`, `van`, `coin`, `bench`, `recycling_bin` | 16 | Cajas lógicas del catálogo; banco 44×36, papelera 26×40 |
| `items`: `item_box/dish/clip/chip/taco/cocktail/ticket/key/token`, `ic_gem`, `chest_normal/premium` | 12 | Productos según catálogo; gema 64×64, cofres 96×96 |
| `portraits`: `exec_0`…`exec_7` | 8 | Dentro de 96×96, asignación estable por nombre |

Negocios: dropship, restaurant, tiktok, ai, foodtruck, beachclub, yachts,
realestate y crypto. Roles: packer, cook, waiter, creator, brand, engineer,
sales, rider, editor, tech, taquero, skater, vendor, bartender, promoter,
captain, sailor, agent, broker, clerk, coder, trader y ped0/1/2.
Las claves base de edificio resuelven la segunda etapa; `_1/_2` de personajes
reutilizan `_0`. Los PNG individuales mantienen prioridad. Si falla un atlas,
el catálogo conserva su respaldo procedural.

Dirección común de generación: «Original premium mobile idle tycoon game
asset, polished toy-like 3D cartoon, warm soft lighting, rounded navy contours,
rich colorful materials, readable silhouette at small size, transparent
background, no text, no watermark, no real brand or cryptocurrency logos».

Prompts por familia (añadir la dirección común):

- Edificios: «Isometric 2:1 standalone buildings, separate grid cells with
  generous transparent gutters, complete diamond pavement base; nine businesses
  in order: delivery warehouse, Italian restaurant, content studio, AI office,
  taco food truck, tropical beach club, yacht marina, real estate office, crypto
  trading office. Stage 1 modest starter shop; stage 2 prosperous business;
  stage 3 impressive flagship with distinctive roof landmark».
- Puestos: «Nine separate isometric workstations: packing conveyor, restaurant
  kitchen, recording set, AI desk, taco grill, cocktail bar, marina ticket desk,
  property desk, trading terminals with a fictional gold star coin».
- Personajes: «Full body friendly chibi workers, diverse skin tones, distinct
  role clothing and props, facing isometric front, separate transparent cells;
  plain unbranded clothing, feet fully visible».
- Ambiente: «Separate miniature city props: leafy tree, pine, bush, palm,
  cloud, street lamp, blank sale sign, construction site, four cars, delivery
  van, gold euro coin, wooden bench, blue recycling bin».
- Productos: «Readable toy-like reward icons: parcel, pasta dish, video clip,
  microchip, taco, tropical drink, marina ticket, house key, fictional star
  token, blue gem, modest executive case, luxurious gold executive case».
- Retratos: «Eight distinct friendly executive busts in tailored colorful
  suits, diverse skin tones and hairstyles, some with glasses; transparent
  background, no rectangular backdrop, warm expressive faces».

Los iconos de dinero, gema y cofres y los retratos usan el mismo arte en HTML.
Los demás controles conservan SVG legibles y nombres accesibles. No cambia
precios, ingresos, tiempos, estadísticas, guardados ni desbloqueos.

## Ciudad, movimiento y respuesta de juego

- Red urbana continua: calles exteriores y avenida central, dos carriles,
  aceras claras y pasos de peatones. Se dibuja en Graphics, sin una textura ni
  un objeto por baldosa. Los recintos también tienen calle y caminos continuos.
- Boulevard peatonal con tres plazas: fuentes de piedra en Madrid, sombrillas
  y tumbonas en Miami. Borde costero rematado con piedra / arena, espuma y
  chorros de fuente. Dirección: «Miniature isometric 2:1 mobile tycoon city,
  continuous navy asphalt, warm cream pavements, pocket plazas, stone fountain
  with turquoise water in Madrid, striped beach parasols in Miami, clean curb
  outlines and bright pedestrian crossings». Son geometrías originales, no PNG.
- `src/scenes/streets.ts`: rutas cerradas, medidas por longitud y con esquinas
  redondeadas dentro de los carriles. Ocho coches en ambos sentidos y ocho
  peatones sobre las aceras. Los coches mantienen distancia con el vehículo
  anterior y esperan brevemente en cruces; ninguno
  sale al agua ni se teletransporta al cerrar una vuelta.
- `src/scenes/motion.ts`: sombras de contacto y pasos con balanceo y elevación
  sutil, orientación según el movimiento; el transporte conserva las posiciones
  de la simulación. Trabajadores se inclinan al producir; productos y carga
  siguen a sus portadores. No se han generado nuevas poses de piernas.
- Cámara: conserva posición y zoom por ciudad / negocio durante la sesión,
  centra el contenido entre cabecera, objetivo, barra y botones laterales,
  y tiene controles accesibles de centrar, vista general y acercar / alejar.
  La inercia considera el tiempo entre frames; listeners y controles se limpian
  al cerrar la escena. Los controles se desplazan cuando aparece la ola turística.
- `src/scenes/feedback.ts`: transiciones de 180 ms con el color de fondo,
  construcción anclada a la parcela, halo y ocho destellos por construcción;
  rebote breve al mejorar y un producto por entrega observada. Estos efectos
  nunca cambian dinero, stock, tiempos ni datos guardados.
- Costa y fuentes se actualizan en un único Graphics a 10 Hz. Nubes discretas
  fuera del barrio, detrás de edificios y rótulos. Sin nuevas texturas grandes.
- Movimiento reducido: se detienen tráfico, peatones y ambiente; se omiten
  construcción, vuelos de productos, balanceo y transiciones. Transporte, venta
  y barras siguen mostrando la producción real. Cambiar la preferencia durante
  la sesión termina los efectos decorativos pendientes.

Validación: `npm test` y `npm run build` por cada bloque; 64 tests al final,
incluidos límites, continuidad y velocidad de rutas. Navegador 390×844,
Madrid y Miami, cuatro minutos simulados de tráfico, cámara al navegar y
redimensionar, controles a 320/560 px, compras/gerentes/apertura reales,
movimiento reducido y consola. No se ha cambiado `src/game/*`.

## Restaurante abierto y cabecera compacta

La cabecera ocupa 89 px a 390 px de ancho. Misiones permanece visible y Menú
agrupa premios, ejecutivos, logros, ajustes y el anuncio opcional de Hustle.
El diálogo tiene foco nativo, cierre con Escape y nombres accesibles.

`RestaurantRoom.ts` sustituye el edificio cerrado del restaurante por una
cocina abierta y terraza: azulejos, toldo, luces cálidas, pasillo de servicio,
recepción y dos/cuatro/seis mesas según los puestos construidos. El suelo y
las paredes se dibujan con geometrías originales de isometría 2:1.

Nuevo atlas propio generado con ChatGPT Image Generation:
`public/sprites/generated/restaurant.png` (1448×1086, RGBA), con recortes en
`restaurant.json` y `src/art/restaurantFrames.ts`. Los pares animados comparten
encuadre y anclaje de pies; el PNG original se conserva sin repintar.

| Claves | Caja lógica máxima |
| --- | --- |
| `rest_table_empty`, `rest_table_served` | 100×84 |
| `rest_counter` | 120×86 |
| `rest_host` | 42×55 |
| `rest_chef_a`, `rest_chef_b` | 44×60 |
| `rest_waiter_a`, `rest_waiter_b` | 44×60 |
| `rest_guest_a`, `rest_guest_b` | 44×60 |
| `rest_seated_man`, `rest_seated_woman` | 40×50 |

Prompt de dirección: «Original polished mobile tycoon restaurant sprite atlas,
transparent background, warm toy-like 3D isometric style, twelve separate cells:
empty bistro table with two red chairs, same table with pasta dishes, cream and
wood serving counter with gold cloches, host lectern with reservation book;
chef tossing a pan and stirring; waiter carrying a tray in two distinct walking
poses; teal-shirt customer walking in two poses; seated man and woman eating.
Consistent lighting and scale, no brands, no text, fully visible feet.»
Corrección de poses: «Keep every other asset unchanged; waiter and customer
pose B must be a distinct passing step with one knee lifted, unlike stride A;
keep identical character design, tray, lighting and transparent background.»

`dining.ts` limita clientes y pedidos pendientes. Cada venta observada permite
un servicio; los clientes llegan, esperan mesa, se sientan, comen y salen.
Las mesas muestran comida solo al servir. Cocineros y caminantes alternan
poses reales. Movimiento reducido omite pasos y balanceos y muestra las
posiciones finales. Son estados de presentación, sin alterar el guardado ni
la economía. Hay texturas procedurales de respaldo si el atlas no carga.

Validación de este bloque: 67 tests, compilación y navegador móvil 390×844;
apertura, contratación real, servicio tras ventas y ampliaciones de una a ocho
cocinas. Cabecera y menú comprobados también a 320 y 560 px.

## Integración con los avances de Claude

La versión integrada conserva el restaurante abierto, las calles continuas,
las sombras y las cámaras de esta revisión junto a la barra de cadena, Imperio,
el tutorial, Liga, tienda y diagnóstico de Claude.

- Los 39 PNG individuales de personajes de Madrid conservan sus tres poses
  (`_0`, `_1`, `_2`). El manifiesto activa estas animaciones; los elementos
  estáticos compartidos usan los atlas generados para mantener el estilo visual.
  Los PNG estáticos anteriores siguen disponibles en el repositorio.
- Las categorías de edificios usan las 27 imágenes de los atlas. Una imagen
  base no sustituye las versiones de categoría si ya existen en un atlas.
- Los enganches de PNG individuales, baldosas e iconos siguen disponibles.
  Los iconos admiten PNG, atlas y el kit SVG como alternativa.
- La barra fija reúne producción, transporte y venta; sustituye los botones
  flotantes de nivel de transporte/venta. Los actores siguen siendo tocables.
- Misiones permanece en el lateral; el menú compacto reúne diario, ejecutivos,
  logros, Liga y ajustes. Las gemas abren la tienda y la barra permite abrir
  Imperio. Las cámaras descuentan la altura real de la nueva barra.
- Las pistas de tutorial del transporte y reparto respetan movimiento reducido.
  Los paneles incluyen los campos de Liga en la navegación con teclado.

Validación de la integración: 88 tests y `npm run build` correctos. En navegador:
menú/paneles a 320, 390 y 560 px, contratación desde la cadena, tienda y maletines,
Imperio y servicio del restaurante. Sobre el build de producción a 390×844:
tutorial con clics reales, ampliaciones de una a ocho cocinas, edificios de
categorías 1/3 en la ciudad, controles de cámara y movimiento reducido, sin
errores de consola. Esta comprobación no sustituye una prueba en Android físico.

## Almacén: logística y vehículos propios

`WarehouseRoom.ts` dibuja un almacén abierto con estanterías en dos filas,
pasillos de carretilla conectados, señalización teal/amarilla y un muelle
frontal de carga. La carretilla y la furgoneta aparcan por separado. Los palés
visibles responden al stock; un paquete por estación avanza al ritmo del ciclo
real de producción. Las ampliaciones añaden puestos y señalización de zonas.

Atlas `public/sprites/generated/warehouse.png`, 1254×1254 RGBA, generado con
ChatGPT Image Generation; recortes en `warehouse.json` y
`src/art/warehouseFrames.ts`. El PNG original conserva sus píxeles. Los grupos
vacío/cargado y abierto/cerrado comparten encuadre para evitar saltos de tamaño.

| Clave | Caja lógica máxima |
| --- | --- |
| `veh_forklift`, `wh_forklift_loaded`, `wh_forklift_rear` | 68×64 |
| `veh_van`, `wh_van_rear`, `wh_van_open` | 88×66 |
| `wh_shelf` | 128×126 |
| `wh_pallet` | 54×46 |
| `wh_dock` | 140×100 |

Prompt: «Original mobile isometric logistics tycoon transparent sprite atlas,
3×3 cells, warm polished toy-like 3D, chunky readable silhouettes, orthographic
2:1, orange/teal/cream palette. Orange forklift with driver: empty forks facing
down-right, same carrying a shipping crate, rear view facing up-right. Cream
and teal delivery van: front down-right, rear up-right closed doors, same rear
view with doors open and parcels inside. Blue/orange warehouse shelving with
short packing conveyor, wooden pallet with three cardboard boxes, freestanding
teal loading canopy with orange supports and parcel scanner. No brands, words
or background, separate fully visible objects with transparent gutters.»

Los vehículos alternan vistas frontales/traseras al girar. La carretilla muestra
la caja según su carga real; la furgoneta permanece brevemente en el muelle con
las puertas abiertas al empezar el viaje. Es una interpolación visual de la
fase de venta, sin cambiar su duración económica. Movimiento reducido omite
balanceo y recorrido decorativo de cajas. Hay arte procedural de respaldo.

Revisión de primera partida: la furgoneta espera cerrada sin pedidos y abre
puertas al disponer de carga; el texto del muelle se oculta mientras el tutorial
señala a los actores. La barra usa los mismos sprites de estantería, carretilla
y furgoneta, y el título compacto «Almacén» evita el truncado del nombre.

Validación: 88 tests y build correctos en ambos bloques; tutorial manual con
clics en trabajador, carretilla y furgoneta; contratación de gerentes y ocho
puestos. El paquete final se revisa a 320/390/560 px, con carga/puertas ligadas
al estado y movimiento reducido. Las capturas/grabación están en
`/workspace/visual-review/almacen/`. La ejecución local no dispone de un Android
físico conectado; esa prueba sigue pendiente.

El patio del almacén queda reservado a su logística: los coches decorativos
se mantienen en los demás recintos. La furgoneta se desvanece al salir de la
calzada del almacén, junto con su sombra y rótulos, para no circular por el vacío.
