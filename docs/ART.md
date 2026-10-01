# Guía de arte

Todo el arte del juego (ciudad y recintos isométricos) está en `src/art/catalog.ts` y se dibuja por código. Cada pieza tiene un **nombre (clave)** y un **tamaño lógico**. Si le das al juego un PNG con esa clave, lo usa en lugar del dibujo por código. Así puedes cambiar el arte pieza a pieza sin tocar nada más.

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
- Icono de la app (1024×1024), pantalla de carga (splash) y logotipo "De Rider a Millonario".
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
| `ic_missions`, `ic_daily`, `ic_execs`, `ic_trophy`, `ic_settings` | 📋 🎁 💼 🏆 ⚙️ | Menú lateral |
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
