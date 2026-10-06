> **El encargo visual vigente está en [`VISUAL.md`](VISUAL.md)** (biblia visual completa, 5 de octubre de 2026). Este documento queda como histórico y catálogo de claves ya entregadas.

# Guía de arte

El catálogo `src/art/catalog.ts` define las claves y tamaños lógicos. El juego carga primero los PNG individuales del manifest, después los atlas generados con ChatGPT y, como respaldo, los dibujos por código. Así puedes cambiar el arte pieza a pieza sin tocar la simulación.

## Cómo añadir una imagen

1. Genera el PNG con **fondo transparente**.
2. Guárdalo como `public/sprites/<clave>.png`, por ejemplo `public/sprites/bld_restaurant.png`.
3. Añade la clave a `public/sprites/manifest.json`, por ejemplo `["bld_restaurant", "ch_cook_0"]`.
4. Ejecuta `npm run art:webp`: crea la copia `.webp`, que es la que carga el juego (5 veces más ligera). El PNG sigue siendo la fuente; `npm test` avisa si falta alguna copia.
5. Recarga el juego.

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

### Mecánicas de cada negocio (Madrid)

Las tarjetas usan el kit de iconos local. `TwistWorld` refleja las mecánicas existentes dentro del recinto con `veh_order`, `ch_critic_0`, `prop_broadcast` y `prop_research`: llegada/salida, rótulo y progreso. Es una proyección de solo lectura; las acciones siguen en las tarjetas. Tamaños e integración en «Ampliación final».

### «Mi vida»: personaje y objetos de lujo

El personaje y todos los objetos tienen arte propio de atlas. `src/ui/avatar.ts` conserva el SVG únicamente como respaldo y superpone la joya seleccionada sobre el avatar. Los PNG individuales del manifest siguen teniendo prioridad:

| Clave | Tamaño | Qué es |
| --- | --- | --- |
| `avatar_<ropa>` | 340×504 (se ve a 120×172) | El personaje de cuerpo entero con cada ropa: `tracksuit` (chándal verde de rider con gorra), `hoodie`, `suit`, `designer` (traje granate con gafas de sol), `goldtux` (esmoquin negro con solapas doradas), `neonsuit` (exclusivo, rosa y cian con brillo). Mismo personaje y pose en todos, de frente, fondo transparente. Las joyas se superponen sobre el avatar integrado |
| `lux_<id>` | 96×96 | Icono de cada objeto (ids en `src/game/luxury.ts`): ropa, joyas, coches, casas, mascotas, yate, jet y cohete. Los de casa también se ven grandes de fondo (hasta 150×150): mejor como edificio con algo de suelo |
| `luxcar_<id>` | 50×42 | El coche del personaje visto en isométrico para circular por la ciudad (como `car_0`). Arte del vehículo seleccionado, con sombra y halo dorado |
| `ic_life` | 48×48 | Icono vectorial local del botón «Mi vida» |

**Halloween integrado:** `lux_vampire`, `lux_skullring`, `lux_hearse`, `lux_haunted`, `lux_pumpkin`, `avatar_vampire`, `luxcar_hearse`, `pumpkin` y `ghost`. Véase el catálogo de familias entregadas.

Ideas: que el fondo del escenario cambie con la casa (piso compartido, ático con vistas, villa con piscina, mansión, isla) y que los exclusivos tengan un brillo propio.

### Rangos de los puestos (bronce … leyenda)

Cada parte de la cadena sube de rango en los niveles 10, 25, 50, 100 y 200 (`src/game/ranks.ts`). Tiene medalla, pedestal y efectos existentes, más cambios estructurales compuestos sobre la pieza original. Los puestos Diamante/Leyenda de los 14 negocios tienen dibujos propios en `stations-premium.png`; los personajes y vehículos conservan sus poses y reciben detalles por composición. Un PNG individual puede sustituir cualquiera de estas variantes.

| Clave | Qué es | Idea para el prompt |
| --- | --- | --- |
| `rank_1` … `rank_5` | Medalla de cada rango, 24×24 | Bronze / silver / gold medal with a star, a cut diamond, a purple crown; glossy, readable at small size |
| `st_<negocio>_r1` … `_r5` | Puesto con mejoras (también `wh_shelf_r<n>` en el almacén) | Same station, progressively upgraded: bronze = tidier and new paint; silver = better tools and lights; gold = premium materials with gold trim; diamond = futuristic, glowing cyan details; legend = over-the-top luxury with purple neon and gold |
| `ch_<rol>_r<n>_0` (y `_1`, `_2` al andar) | Trabajador con uniforme mejorado | Same character: bronze badge → silver vest → gold uniform → diamond suit with cyan glow → legendary outfit with cape/crown accent |
| `rest_chef_a_r<n>`, `rest_chef_b_r<n>`, `rest_waiter_a_r<n>`, `rest_waiter_b_r<n>` | Restaurante | Chef hat and waiter uniform upgrades, same poses |
| `veh_forklift_r<n>`, `veh_van_r<n>` | Vehículos (fuera del almacén, que usa poses propias) | Same vehicle: new paint → chrome → gold livery → glowing diamond edition → legendary limousine-like |
| `decor_<negocio>_2`, `decor_<negocio>_3` | Decoración extra del recinto con ★★ y ★★★ (se pone junto al edificio principal) | Small isometric props cluster on a transparent background: fountain, statue, neon sign… matching the business |

Medallas, puestos, personajes y vehículos están integrados; las claves de la tabla permiten sustituir cualquier variante sin cambiar la simulación.

### Dubái (tercera ciudad)

Dubái está integrado con arte propio, luz cálida de desierto, arena, cristal y detalles dorados. `BLD_SHAPE` se eliminó; `BIZ_ART` y `LOOKS` registran los puestos y personajes propios. Los seis trabajadores tienen tres frames reales de 132×180 y apoyo común.

| Clave | Tamaño lógico | Prompt |
| --- | --- | --- |
| `bld_supercars` (`_1`, `_2`, `_3`) | 172×164 (+24 por nivel) | Isometric 2:1 view of a sleek glass supercar showroom with a red sports car on display and a black-and-red facade, on a light stone diamond-shaped base |
| `bld_hotel` (`_1`, `_2`, `_3`) | 172×260 | Isometric 2:1 view of a sail-shaped white luxury hotel tower with gold details and a fountain at the entrance, on a light stone diamond-shaped base |
| `bld_safari` (`_1`, `_2`, `_3`) | 172×140 | Isometric 2:1 view of a desert safari camp with beige tents, a camel and an orange 4x4 on sand dunes, on a sandy diamond-shaped base |
| `bld_souk` (`_1`, `_2`, `_3`) | 172×170 | Isometric 2:1 view of an arabic gold market building with arches, wooden lattice windows and shining gold jewellery on display, on a sandy diamond-shaped base |
| `bld_tower` (`_1`, `_2`, `_3`) | 172×300 | Isometric 2:1 view of a super tall needle-like glass skyscraper with blue-green windows and a spire, on a light grey diamond-shaped base |
| `st_supercars` | 100×86 | Side view car lift in a garage with a red sports car and a tool cart |
| `st_hotel` | 100×86 | Side view luxury hotel suite bed with gold headboard and a room service trolley |
| `st_safari` | 100×86 | Side view bedouin tent with carpets, lanterns and a sitting camel |
| `st_souk` | 100×86 | Side view goldsmith workbench with rings, necklaces and a small scale |
| `st_tower` | 100×86 | Side view construction floor with steel beams, a small crane hook and stacked glass panels |
| `item_carkey` | 26×26 | Black car key with red logo-less fob |
| `item_bell` | 26×26 | Golden hotel service bell |
| `item_camel` | 26×26 | Cute cartoon camel |
| `item_ring` | 26×26 | Gold ring with a diamond |
| `item_beam` | 26×26 | Orange steel construction beam |
| `ch_mechanic_0` | 44×60 | Chibi supercar mechanic, red overalls, black cap |
| `ch_valet_0` | 44×60 | Chibi valet, black waistcoat, white shirt, red bow tie |
| `ch_butler_0` | 44×60 | Chibi hotel butler, white jacket with gold buttons |
| `ch_guide_0` | 44×60 | Chibi desert guide, beige clothes, sunglasses |
| `ch_goldsmith_0` | 44×60 | Chibi goldsmith, brown apron, magnifier glasses |
| `ch_builder_0` | 44×60 | Chibi construction worker, orange vest, white helmet |
| `exec_founder` | 64×64 | Portrait of a confident founder executive in a white suit with a gold pin, golden glowing frame, Dubai skyline behind (exclusive, must look special) |

Los puestos, productos, personajes y vehículos se resuelven mediante `BIZ_ART`; `execFace` utiliza `exec_founder`. El entorno incluye dunas, skyline, palmeras datileras, farolas doradas, pavimento propio y decoración específica de cada negocio. La barra del oro mantiene su estilo dorado.

## Estado del plan de mejora gráfica

El plan original está integrado: edificios y evoluciones de las tres ciudades, puestos y productos propios, personajes y movimiento, iconos de UI, moneda neutral, visitantes físicos, Halloween, Mi vida, rangos y marca. La ampliación final añade ciclos de Dubái, decoración específica de los 14 negocios, mecánicas físicas, puestos de alto rango personalizados y vegetación/mobiliario/pavimentos.

Los efectos de dinero, hitos, noche, mar y celebraciones conservan la implementación existente. La carretera, geometría de parcelas, bordes y skyline siguen dibujándose por código: son geometría funcional, no assets provisionales que haya que duplicar en texturas.

La lista pendiente es de **validación de lanzamiento**, no de creación de estos assets: comprobar APK/recursos Android, rendimiento y lectura en un móvil físico de gama media y revisión de la ficha en Play Console.

### Enganches ya preparados en el código

Estas piezas ya se pueden sustituir por PNG igual que el resto: se dejan en `public/sprites/` y se añaden a `manifest.json`. Si falta una pieza, el juego utiliza el atlas o respaldo vectorial/procedural correspondiente.

**Edificios (`bld_*`):** al cargar se recorta solo el margen transparente y se escalan para que la base ocupe la parcela. No hace falta encuadrarlos con precisión, solo que la base (el rombo de suelo) sea lo más ancho del dibujo.

**Iconos de la interfaz** (64×64, o 3 veces más grandes, con fondo transparente, sin texto):

| Clave | Sustituye a | Dónde sale |
| --- | --- | --- |
| `ic_gem` | 💎 | Cabecera, precios y premios |
| `ic_star` | ⭐ | Estrellas de franquicia |
| `ic_city`, `ic_ipo`, `ic_world` | 🏙️ 📈 🌍 | Barra inferior |
| `ic_missions`, `ic_daily`, `ic_execs`, `ic_trophy`, `ic_league`, `ic_settings` | 📋 🎁 💼 🏆 🏅 ⚙️ | Menú lateral |
| `ic_wheel` | 🎡 | Menú: ruleta diaria |
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

## Cierre visual — 2 de octubre de 2026

Esta sección describe el arte integrado y sustituye las descripciones históricas de piezas provisionales anteriores. Las fuentes originales son PNG RGBA generados con ImageGen; no hay marcas reales. Los recortes y alias exactos están en `src/art/visualFrames.ts` y en los seis JSON de `public/sprites/generated/`: 119 claves comparten seis texturas, sin duplicar sus píxeles. La prioridad sigue siendo PNG individual → atlas → respaldo procedural.

### Familias entregadas

| Claves | Tamaño lógico / presentación | Archivo, uso y dirección |
| --- | --- | --- |
| `bld_{supercars,hotel,safari,souk,tower}_{1,2,3}` | Ancho 172; alturas base 164/260/140/170/300, +24 por evolución; ajustadas a parcela 2:1 | `dubai-buildings.png`, 1536×1024. Quince edificios propios: concesionario, hotel, safari, zoco y torre. Piedra clara, arena, cristal cian, acentos dorados; luz superior izquierda |
| `st_{supercars,hotel,safari,souk,tower}` | 100×86 | `dubai-details.png`, 1448×1086. Taller, suite, tienda beduina, banco de joyero y estructura de obra |
| `item_{carkey,bell,camel,ring,beam}` | 26×26 | Mismo atlas: objetos de producción propios |
| `ch_{mechanic,valet,butler,guide,goldsmith,builder}_0` | 44×60 | Mismo atlas: roles propios. Las tres poses reales tienen PNG individuales que prevalecen sobre este frame de referencia; véase la ampliación final |
| `avatar_{tracksuit,hoodie,suit,designer,goldtux,neonsuit,vampire,founder}` | Recorte uniforme 340×504; mostrado a 120×172 | `avatars.png`, 1536×1024. Misma cara, pose y proporciones; siete vestuarios y fundador. Las joyas seleccionadas se superponen en HTML |
| `exec_founder` | 64×64 | Retrato recortado del fundador en `avatars.png`; marco por rareza existente |
| `lux_{digital,luxwatch,goldchain,diamondring,crown,deliverybike,scooter,motorbike,sportscar,supercar,limo,goldcar,parents,flat,penthouse,villa,mansion,island,hearse,haunted}` | Iconos de tarjeta 76×76; viviendas también en el escenario de Mi vida | `luxury.png`, 1536×1024. Relojes, joyas, vehículos y casas originales, estilo juguete 3D |
| `lux_{tracksuit,hoodie,suit,designer,goldtux,neonsuit}` | 76×76 | Alias de los avatares; no hay copia de textura |
| `lux_{cat,dog,parrot,tiger,penguin,pumpkin,yacht,jet,rocket,vampire,skullring}` | 76×76 | `lifestyle-extras.png`, 1254×1254. Mascotas, lujo extremo y exclusivos estacionales |
| `luxcar_{deliverybike,scooter,motorbike,sportscar,supercar,limo,goldcar,hearse}` | 50×42 | Alias del vehículo correspondiente de `luxury.png`; circula en la ciudad con sombra y halo existentes |
| `ghost`, `pumpkin` | 64×64 / 40×40 | `lifestyle-extras.png`. Fantasma interactivo y decoración de Halloween; se corrigió la colisión de la clase `.ghost` con botones de cancelar |
| `veh_supply`, `ch_vip_0` | 96×78 / 48×68 | Mismo atlas. Visitantes físicos con entrada, halo, sombra, interacción y salida; objetivo HTML accesible de 44 px sigue su posición. No cambia ninguna oferta ni recompensa |
| `veh_safari`, `veh_crane`, `veh_luggage`, `veh_flatbed`, `veh_goldvan` | 62×48, 68×60 y 68×54 | `vehicles.png`, 1774×887. Vehículos exclusivos de Dubái |
| `car_miami_0`, `car_miami_1`, `dubai_lamp` | 44×34 / 22×60 | Mismo atlas. Tráfico pastel de Miami y farolas de Dubái |
| `dubai_planter`, `miami_plaza`, `decor_<negocio>_{2,3}` | 58×76, 66×80 | Atlas extras: jardineras doradas y decoración costera; los alias iniciales de recintos se sustituyeron por 28 decoraciones propias en `business-decor.png`. Dunas y skyline de Dubái son geometría agrupada, no otra textura grande |
| `rank_1`…`rank_5` | 24×24; PNG 96×96 + SVG | `public/sprites/`. Bronce, plata, oro, diamante y leyenda, pictogramas propios sin letras |
| `<pieza>_r1`…`_r5`, `ch_<rol>_r<n>_<pose>` | Igual a base; textura ≤300×258 | `src/art/rankArt.ts`. Composición diferida sobre el arte real: herramientas, soportes, marquesinas, terminales, herrajes, insignias y uniformes. No es un recoloreado global ni cientos de PNG independientes. Incluye las poses propias del almacén y restaurante. Los puestos r4/r5 se sustituyen con el atlas premium; un PNG específico conserva prioridad |
| `coin`, `ic_wheel`, `ic_hand`, `ic_manager`, `ic_construction` | 20×20, 48×48, 26×28, 18×18, 32×24 | SVG original y PNG 96×96 en `public/sprites/`; moneda con estrella neutral. Los importes siguen usando €/$ mediante `money()` |
| UI: categorías, ciudades, banderas, oficina, misiones, eventos, rival, invitaciones, nube y controles | Canvas vectorial 48×48; inline 1 em | `src/ui/visualIcons.ts` y `icons.ts`; conserva gemas, cofres y ejecutivos PNG existentes. Iconos de negocio usan sus edificios. Sustituye glifos decorativos en etiquetas traducidas sin cambiar cifras ni nombres escritos por jugadores |

### Prompts de las familias generadas

Dirección común utilizada: **original premium mobile idle tycoon, polished toy-like 3D cartoon, clean navy outlines, warm top-left lighting, transparent background, isolated objects in a strict grid, consistent scale, no text, no letters, no watermark, no real brands**. Los prompts solicitaban estas composiciones y orden de celdas (registro reproducible de dirección y contenido; las imágenes generadas no son deterministas):

- **Dubái, 5×3:** five distinct Dubai businesses, supercar showroom, sail hotel, desert safari camp, gold souk, construction skyscraper; three progressively larger evolutions in rows; 2:1 isometric diamond foundations; cream stone, turquoise glass and gold details.
- **Avatares, 4×2:** the same friendly tan male with brown hair, identical frontal relaxed pose, face and proportions; green rider tracksuit, blue hoodie, business suit, burgundy designer outfit, black gold tuxedo, cyan pink neon suit, vampire costume, white gold founder suit.
- **Detalles de Dubái, 4×4:** five production stations, car key, hotel bell, camel, gold ring, steel beam; mechanic, valet, butler, guide, goldsmith and construction worker; each in its own transparent cell.
- **Lujo, 5×4:** digital watch, luxury watch, gold necklace, diamond ring, crown; delivery bike, scooter, motorcycle, sports car, supercar; limousine, gold car, family home, apartment, penthouse; pool villa, mansion, private island, hearse, haunted mansion.
- **Extras, 4×4:** cat, dog, parrot, tiger; penguin, jack-o-lantern, yacht, private jet; rocket, vampire costume, skull ring, friendly ghost; supply truck, premium suited VIP, gold Dubai planter, tropical Miami plaza.
- **Vehículos, 4×2:** desert safari off-road car, small mobile construction crane, hotel luggage cart, vehicle transporter; gold delivery van, two pastel Miami convertibles, gold luxury street lamp; readable isolated isometric silhouettes.
- **Icono de app:** original premium mobile tycoon app icon, navy background, green delivery scooter, gold coin with a star and small growing city buildings; bold central silhouette, no small text, no currency sign, no real brand.

### Marca y tienda

`public/brand/` contiene el original del icono, exportaciones 512/1024, `logo-dark.svg`, `logo-light.svg` y `splash.svg` (1080×1920). El logotipo convierte la fuente Lilita ya incluida en curvas SVG, sin dependencia de fuentes externas. La carga web utiliza icono y logo. Android incluye las cinco densidades, icono redondo/adaptativo y splash marino compartido, con ajustes para Android 12. **No se ha compilado ni probado un APK en este entorno.**

`public/brand/store/` entrega cinco capturas reales 1080×1920 y un feature graphic 1024×500 compuesto a partir del logo y de esas capturas. La partida local avanzada está preparada para mostrar funciones existentes; Supabase está simulado, sin registros, guardados o analítica remotos. No es una captura de una cuenta real ni gameplay inventado.

### Reproducción y comprobaciones

```sh
npm ci
npm run capture:visuals                        # 320/390/560, español/inglés
VISUAL_OUTPUT=artifacts/store npm run capture:visuals -- --store
npm run brand:store                            # exporta capturas y gráfico
npm run art:export                             # Vite en 5173, SVG → PNG y Android
python scripts/register-visual-atlases.py       # Pillow, NumPy y SciPy
python scripts/build-brand.py                  # fontTools con soporte Brotli
```

Para renovar solo las capturas comerciales sin repetir la suite: `VISUAL_OUTPUT=artifacts/store npm run capture:visuals -- --store-only`, seguido de `npm run brand:store`.

Los exportadores de navegador requieren Chromium instalado (`CHROMIUM_PATH`). Los scripts Python son herramientas opcionales de edición; el juego consume los archivos entregados y no los necesita. `artifacts/` está ignorado. Comparación reproducible en `docs/visual-review/`: antes de esta rama, commit `8b0f8a2`, y después, misma partida preparada, idioma y resolución.

Verificaciones: 217 tests y build de producción correctos; cobertura de todas las claves de lujo y Dubái, límites reales de los atlas, 110 comprobaciones de navegador, compra/equipamiento, visitantes, rangos, ausencia de desbordamientos y errores JS, y movimiento reducido. Se conserva Madrid y sus tres frames de caminar originales 132×180 con el mismo apoyo. Se mantienen los efectos de monedas, rangos, colecciones y celebraciones existentes. La prueba en móvil físico de gama media y la revisión nativa siguen siendo necesarias antes de publicar: Chromium con renderizado software no permite certificar esos resultados.

## Encargo: mundo integrado y pantalla limpia (lo pide Carlos tras probar la beta 2 en el móvil)

Opinión de Carlos jugando en el móvil (2 de octubre):
1. *«No se ven animaciones ni nada moviéndose.»* — **Arreglado por Claude.** Muchos Android activan «reducir movimiento» con el ahorro de batería, y el juego paraba la vida del mundo. Ahora hay dos niveles en `src/scenes/common.ts`:
   - `calmWorld()`: la vida del mundo (gente, coches, nubes, agua, trabajadores). Solo se para si el jugador lo pide en Ajustes → «Reducir movimiento».
   - `reducedMotion()`: efectos fuertes (sacudidas, ráfagas de partículas, rebotes). Sigue respetando el sistema.
   - **Regla para el arte nuevo:** el movimiento ambiental va con `calmWorld()`; los efectos fuertes, con `reducedMotion()`.
2. *«Demasiadas cosas en la pantalla todo el rato.»* — **Primera pasada hecha por Claude:**
   - la tarjeta de la mecánica solo sale cuando hay algo que hacer;
   - en pantallas táctiles solo queda el botón ⌖ (el zoom es con dos dedos);
   - «Mejorar todo» es un botón redondo con un número;
   - los nombres de los puestos solo se ven con 1 o 2 puestos.
   - **Regla:** nada fijo nuevo en pantalla. Lo que se añada aparece solo cuando hay una acción y se va después.
   - **Entregado por Codex el 5 de octubre (detalles al final):**
     - cabecera en una sola fila (el estilo de vida podría ir dentro del menú);
     - la barra de abajo, menos cargada;
     - menos etiquetas flotantes en el recinto (por ejemplo, el dinero de cada puesto solo al tocar o al estar lleno).
3. *«Los negocios individuales hay que mejorarlos mucho visualmente, y la ciudad también: que no sean unos cuadrados y ya está. Que estén integrados como parte de un mundo y que puedas ver qué hay alrededor.»* — **Entregado por Codex el 5 de octubre (detalles al final):**
   - **Ciudad (`CityScene`):** que no sea una isla cuadrada flotando en el agua. Alrededor de las parcelas jugables, un barrio que continúa:
     - manzanas de fondo no jugables, edificios y tejados;
     - avenidas que salen del mapa;
     - un puerto o paseo marítimo con barcos;
     - montañas o el skyline a lo lejos;
     - el borde se funde con niebla o con perspectiva, sin cortes rectos.
     - Cada ciudad, con su paisaje: en Madrid, tejados rojos y la sierra; en Miami, la playa y el océano; en Dubái, el desierto y las torres.
   - **Negocios (`BusinessScene`, `WarehouseRoom`, `RestaurantRoom`):** el recinto no es un rombo suelto.
     - El suelo del negocio continúa en la acera, la calle y los edificios vecinos, con valla, aparcamiento, árboles y peatones fuera.
     - Que se vea que el almacén está en un polígono, el restaurante en una calle con terrazas y TikTok en un barrio con neones.
     - Las tres versiones del edificio (★, ★★, ★★★) siguen valiendo para crecer.
   - **Vida:** más cosas moviéndose alrededor (peatones, tráfico, pájaros, barcos, luces de noche), siempre con `calmWorld()` y con pocas partículas: tiene que ir fluido en gama media.
4. *«Que se limite el movimiento de cámara hasta donde se ha creado.»* — **Hecho por Claude:**
   - La cámara no sale de la zona que cada escena pasa a `drag.addControls(home, bounds)`, contando lo que tapan la cabecera y la barra.
   - Tampoco se puede alejar más de lo que hace falta para ver la zona entera.
   - **Si Codex dibuja el mundo de alrededor, tiene que ampliar `bounds`** en `CityScene` y `BusinessScene` hasta donde llegue el arte. Así se puede mirar alrededor sin ver nunca el vacío.

5. **Entregado el 5 de octubre (entornos por negocio; véase el cierre).** *«¿No hay que encargar que en la pantalla de un negocio no se vea solo el negocio, sino el negocio integrado en una ciudad parecida?»* — Sí, es la parte más importante del punto 3. **Cada pantalla de negocio tiene que parecer un trozo de su ciudad**, no una parcela flotando sobre verde:
   - alrededor del recinto, la misma ciudad que se ve en el mapa: calles con tráfico, aceras con peatones, fachadas y tejados vecinos (sin entrar), farolas y árboles;
   - el negocio, en su sitio lógico. Madrid: almacén en un polígono con naves vecinas, restaurante en una calle del centro con terrazas, TikTok en un barrio con neones, IA en un parque tecnológico. Miami: paseo marítimo, playa, puerto deportivo, frente costero, distrito financiero. Dubái: avenida de concesionarios, frente de hoteles, dunas, zoco con callejuelas, zona de rascacielos en obras;
   - el fondo continúa hasta el borde de la cámara (que ya está limitada: ampliar `bounds` en `BusinessScene` hasta donde llegue el arte) y se funde con niebla o perspectiva;
   - rendimiento: el entorno puede ser **una o dos imágenes grandes de fondo por negocio** (capas fijas, 1–2 texturas de ≤2048 px) más unos pocos sprites animados (coches, peatones). Mejor eso que cientos de piezas sueltas.
6. **Entregado el 5 de octubre (diez piezas regionales; véase el cierre).** **Piezas del mundo para las mecánicas de Miami y Dubái** (`TwistWorld`, igual que la furgoneta, el crítico, el directo y el monitor de Madrid). Ya están integradas en `TWIST_WORLD_ART` de `src/game/twists.ts` y en `twistPresentation`; antes allí solo había tarjeta:
   - pedidos: lancha de excursión (yates), cartel «Vendido» con comprador (inmobiliaria), jeque con llaves (superdeportivos), joyero con estuche (zoco);
   - visitas: foodie con móvil y aro de luz (food trucks), inspector con libreta y lupa (hotel);
   - hype: cabina de DJ con luces (club de playa), fotógrafo con trípode al atardecer (safari);
   - investigación: rack de minería con luces (cripto), mesa de planos con casco (rascacielos).

Recordatorios técnicos:
- el canvas va a x2 como mucho (`DPR`);
- las imágenes se cargan en WebP: después de añadir PNG, ejecutar `npm run art:webp`;
- comprobar en 390×844 con «reducir movimiento» activado en el sistema: el mundo se tiene que mover igual.

Verificaciones: 221 tests y build de producción correctos; cobertura de todas las claves de lujo y Dubái, límites reales de los atlas, 122 comprobaciones de navegador, compra/equipamiento, visitantes, rangos, ausencia de desbordamientos y errores JS, y movimiento reducido. Se conserva Madrid y sus tres frames de caminar originales 132×180 con el mismo apoyo. Se mantienen los efectos de monedas, rangos, colecciones y celebraciones existentes. La prueba en móvil físico de gama media y la revisión nativa siguen siendo necesarias antes de publicar: Chromium con renderizado software no permite certificar esos resultados.

## Ampliación final — animación, entorno y mecánicas

La revisión posterior completa las cinco mejoras acordadas. Se añaden **18 PNG de animación** y **74 frames registrados en tres atlas** (algunos sustituyen claves existentes), manteniendo el resto del arte. Sin modificaciones en `src/game/*`.

| Familia y claves | Tamaño lógico / fuente | Uso e integración |
| --- | --- | --- |
| `ch_{mechanic,valet,butler,guide,goldsmith,builder}_{0,1,2}` | 44×60; cada PNG 132×180 | Tres poses reales: quieto, paso izquierdo y paso derecho. Lienzo y apoyo comunes; cuerpo dentro de y=8…177. `public/sprites/ch_*.png` y manifest; prevalecen sobre los alias del atlas anterior. Se conservan uniformes y herramientas en la misma mano |
| `decor_<negocio>_{2,3}` para los 14 negocios | 66×80, ajustado a proporción; `business-decor.png`, 1659×948 | 28 clusters propios: logística, terraza, grabación, hologramas, picnic, surf, marina, piscina, terminales cripto, exposición de coches, fuente, safari, joyería y obra. La categoría 3 añade arquitectura y equipamiento, no solo color. Se integran en el enganche `drawTierDecor` existente |
| `st_<negocio>_r{4,5}` y `wh_shelf_r{4,5}` | Misma caja lógica del puesto base; `stations-premium.png`, 1482×1061 | 28 puestos Diamante/Leyenda más dos referencias del almacén: maquinaria y estructura específicas, cian/cromo y oro/violeta. `rankedKey` encuentra primero el atlas; los demás rangos, trabajadores y vehículos siguen la composición que conserva sus poses |
| `veh_order`, `ch_critic_0`, `prop_broadcast`, `prop_research` | 82×60, 66×66, 74×68, 78×70 | `world-details.png`, 1536×1024. Pedido en furgoneta, crítico sentado, equipo con lámpara roja de directo y monitor holográfico. `TwistWorld` muestra/retira la pieza, rótulo traducido y progreso sobre el sprite, evitando la fila de controles. Lectura del estado con `twistPresentation`, sin acciones económicas |
| `tree_0`, `tree_1`, `palm`, `bush`, `bench`, `lamp_post`, `recycling_bin`, `desert_palm` | 56×72, 48×76, 60×84, 36×24, 44×36, 16×56, 26×40, 60×84 | Mismo atlas. Vegetación y mobiliario original que reemplazan los respaldos procedurales; palmera datilera propia de Dubái |
| `tile_{madrid,miami,dubai}_ground`, `tile_path` | Ancho 88; altura según proporción del rombo 2:1 y grosor | Mismo atlas. Piedra urbana, mosaico tropical y piedra clara con incrustaciones doradas. `placeTile` ahora admite frames compartidos de atlas además de PNG individuales. Carreteras y geometría funcional siguen en código |

Registro exacto: `src/art/completionFrames.ts` y los tres JSON del directorio generado. Las fuentes de animación y sus recortes están en `public/sprites/source/dubai-walk.{png,json}` y no se cargan en el juego. Los PNG normalizados tienen resolución fija y ancla común; no se modifica la imagen fuente. Los atlas permanecen por debajo de 2048 px; las celdas premium no superan 384 px. Las variantes compuestas siguen limitadas a 300×258 y se crean al usarse. No se añaden emisores de partículas permanentes.

### Prompts y reproducción

Dirección común: **production-ready original premium mobile idle tycoon, polished toy-like 3D, clean navy outlines, warm top-left light, transparent RGBA, isolated equal grid cells with generous gutters, no text, no real logos**.

- **Animación, 6×3:** reference the six existing workers, keep recognizable faces/uniforms/equipment; column order mechanic, valet, butler, desert guide, goldsmith, builder; rows idle, left-leg step, right-leg step. Same facing, scale and ground anchor. Edición de continuidad: correct bottom-row mechanic wrench and builder blueprint to the same anatomical hand/arm as the first two rows; do not mirror the characters.
- **Decoración, 7×4:** rows 1–2 tier2 of warehouse, restaurant, video studio, AI lab, food truck, beach club, marina, real estate, crypto, supercar showroom, hotel, safari, gold souk, construction tower; rows 3–4 matching tier3 richer architecture/equipment. Madrid brick/teal, Miami coral/turquoise, Dubai cream/gold.
- **Puestos premium, 7×4:** preserve reference station equipment and isometric angle; first 14 cells diamond chrome/cyan, next 14 legendary gold/violet; warehouse robotic picker, kitchen extraction hood, video multi-camera editing, AI holo servers, extendable food-truck kitchen, glass-canopy tiki bar, yacht gangway, property model, trading terminal, diagnostics gantry, hotel canopy, safari shade rig, precision goldsmith, automated construction lifting. Structural upgrades, not global recolor.
- **Entorno, 4×4:** express parcel van with clock, seated burgundy critic with monocle/notebook/table, red broadcast lamp and play symbol, holographic server monitor; two urban trees, tropical palm, flowering shrub; bench, street lamp, recycling bin, date palm; four understated diamond pavement tiles.

```sh
python scripts/register-completion-atlases.py
python scripts/register-worker-poses.py
node scripts/export-worker-poses.mjs
npm test
npm run build
npm run capture:visuals
node scripts/capture-ranks.mjs                  # Vite en 5173
```

Python necesita Pillow/NumPy/SciPy; las exportaciones usan Chromium (`CHROMIUM_PATH`). Solo son necesarias para editar/reproducir, no para ejecutar el juego. La captura automatizada valida los 18 apoyos, las cuatro piezas físicas, las variantes de rango y la UI en español/inglés a 320/390/560 px, con Supabase simulado. Las pruebas comprueban que la presentación no cambia plazos, aceptación o recompensas. Pendiente únicamente la validación nativa/física indicada arriba.

Limpieza final del atlas de decoración: se sustituyeron los símbolos de criptomonedas reconocibles por una moneda con estrella y nodos de red originales, y se pidieron frontales de joyería sin letras. Las fuentes PNG y recortes entregados son los utilizados en la validación final.

### Miami: ciclos de personajes (5 de octubre de 2026)

Los 12 roles propios de Miami tienen ahora tres PNG individuales de 132×180:
`taquero`, `skater`, `vendor`, `bartender`, `promoter`, `captain`, `sailor`,
`agent`, `broker`, `clerk`, `coder` y `trader`. Incluyen reposo y dos pasos;
conservan su vestuario, patines, herramientas y la mano que lleva cada objeto.
La base común está en y=178. Los PNG individuales prevalecen sobre los alias
quietos del atlas; también se exportan a WebP para el cargador actual.

Los originales y recortes están en `public/sprites/source/miami-walk-{a,b}.{png,json}`.
Receta reproducible: `python scripts/register-miami-poses.py`,
`node scripts/export-miami-poses.mjs` y `npm run art:webp`.
Los contactos de revisión están en `docs/visual-review/miami-walk-{a,b}.png`.

### Mundo integrado y pantalla limpia — entregado el 5 de octubre de 2026

El encargo de la beta 2 está integrado en `Neighborhood.ts`, compartido por las
ciudades y los 14 negocios. La rejilla jugable continúa tres casillas hacia fuera
con aceras y avenidas, sin la antigua pared vertical de la isla. Una transición
atmosférica suaviza el perímetro. Se añaden seis conjuntos de edificios vecinos,
árboles y farolas; Miami tiene playa, paseo, embarcadero y yate. Los límites de
cámara incluyen los edificios de fondo y el suelo exterior.

| Claves | Tamaño lógico / PNG | Uso |
| --- | --- | --- |
| `district_madrid` | 270×190 / 540×380 | Tejados rojos, casas cálidas y sierra |
| `district_miami` | 270×190 / 540×380 | Fachadas pastel, palmeras, playa y muelle |
| `district_dubai` | 270×190 / 540×380 | Arquitectura crema/dorada, dunas y torres |
| `district_industrial` | 270×190 / 540×380 | Almacén: naves, carga, aparcamiento |
| `district_terrace` | 270×190 / 540×380 | Restaurante: calle de casas y terrazas |
| `district_neon` | 270×190 / 540×380 | TikTok/IA: estudios, antenas y luces cian/violeta |

Original: `public/sprites/source/neighborhoods.png`; recortes:
`neighborhoods.json`. Exportación: `node scripts/export-neighborhoods.mjs`,
seguida de `npm run art:webp`. Los PNG/WebP tienen transparencia y se cargan
mediante el manifest existente; no se añade una textura gigante al juego.

Prompt: original 3×2 atlas, six isolated transparent isometric 2:1 neighborhood
dioramas, polished chibi toy3D warm top-left light navy contours. Madrid ochre
houses red tile roofs and distant mountains; Miami coral/turquoise art-deco
beachfront palms pier sand; Dubai cream/gold low buildings towers dunes;
industrial loading bays crates parking van chimney; Spanish restaurant street
colorful houses cafe umbrellas trees; neon creator district purple/teal studios
filming equipment rooftop antennas. Connected wide shallow footprints, generous
transparent gutters, no labels, logos or text.

Vida ambiental: seis peatones y tres pájaros por escena; un yate adicional en
Miami. Farolas con halo nocturno. Movimiento con `calmWorld()`: la preferencia
del sistema reduce efectos fuertes, y el ajuste explícito del juego pausa la
vida ambiental. No hay emisiones continuas de partículas ni actores ilimitados.

La cabecera tiene una sola fila; el estilo de vida pasa al menú existente.
La cadena inferior conserva los tres controles con etiquetas más discretas y
sin pulsación continua. Mi vida sigue accesible en el menú. Las cantidades de
los puestos aparecen al tocarlos durante 3,5 segundos o al acumular diez ciclos
de producción; productos y barras siguen visibles. No cambia `src/game/*`.

Validación de esta entrega: 225 tests, build de producción, 158 comprobaciones
completas de navegador y 43 en la pasada final, sin errores. Se renuevan las
capturas y gráfico de tienda. Galería e informes en `docs/visual-review/README.md`.
La validación de rendimiento en Android físico sigue pendiente.

### Manzanas alrededor de cada negocio (Claude, 5 de octubre de 2026)

Carlos pedía que, dentro de un negocio, se viera la ciudad alrededor y no solo el recinto. En las 14 pantallas de negocio, `Neighborhood.ts` dibuja ahora un trozo de ciudad completo. Solo reutiliza arte que ya existía; no hay PNG nuevos.
- **Calles:**
  - una avenida que rodea la parcela, con aceras;
  - una calle de circunvalación más lejos y cuatro calles perpendiculares con líneas pintadas;
  - unos 12 coches, con `calmWorld()`.
- **Manzanas vecinas del mismo oficio:**
  - Naves junto al almacén (`district_industrial` y `bld_dropship_*`).
  - Casas con terraza junto al restaurante.
  - Estudios de neón junto a TikTok y la IA.
  - En Miami y Dubái, el barrio de la ciudad y sus negocios.
  - Los edificios van a escala 1,3.
- **Anillo exterior:** más tenue, con el resto de la ciudad, y se funde con el color de fondo (`backdrop`).
- **Paisaje propio:**
  - En Miami, el lado derecho es playa y mar, con un yate.
  - En Dubái, el anillo exterior es desierto, con palmeras datileras.
- **Aceras:** árboles, farolas que se encienden de noche y peatones.
- **Rendimiento:** unas 30 imágenes fijas, 12 coches, 6 peatones y 3 pájaros. El suelo es un único `Graphics` estático.
- **Cámara:** los límites llegan hasta la circunvalación, así que al alejarse se ve el barrio entero.

**Mejora posible para Codex:** algún solar con aparcamiento, contenedores o zona verde, para que las manzanas grandes tengan menos suelo liso.

### Entornos por negocio y mecánicas regionales — 5 de octubre de 2026

Se completan los puntos 5 y 6 añadidos en `main`: cada negocio tiene su entorno
propio y las diez mecánicas de Miami/Dubái tienen una pieza física. La tabla de
selección está en `src/art/businessWorld.ts`; los dibujos no cambian los números
de la simulación.

| Negocio | Entorno específico `district_*` | Mecánica física |
| --- | --- | --- |
| IA | `technology`: parque tecnológico solar y oficinas teal | `prop_research` existente |
| Food trucks | `foodcourt`: paseo con puestos, picnic y palmeras | `ch_foodie`: móvil, taco y aro de luz |
| Club de playa | `beachfront`: piscinas, terrazas y club costero | `prop_dj`: cabina iluminada |
| Yates | `marina`: puerto deportivo con muelles y barcos | `veh_excursion`: lancha, capitán y tickets |
| Inmobiliaria | `residential`: apartamentos y piscinas frente al agua | `prop_sold`: compradora con llaves y cartel sin letras |
| Cripto | `financial`: torres y oficinas financieras | `prop_mining`: rack de minería con moneda de estrella original |
| Superdeportivos | `dealership`: avenida de concesionarios | `ch_vip_client`: cliente con llaves y coche |
| Hotel | `hotelfront`: frente de hoteles, fuentes y playa | `ch_inspector`: libreta y lupa |
| Safari | `desertcamp`: dunas, campamento, camellos y 4×4 | `ch_photographer`: cámara, trípode y atardecer |
| Zoco | `market`: callejuelas, arcos y joyerías | `ch_jeweler`: joyero con estuche abierto |
| Rascacielos | `construction`: grúas y torres en obras | `prop_blueprints`: planos, casco y maqueta |

Almacén, restaurante y TikTok mantienen los entornos particulares entregados
antes (`industrial`, `terrace`, `neon`). Cada recinto reutiliza una sola textura
de entorno de 540×380 (270×190 lógicos), sin cientos de decoraciones nuevas.
Se añaden dos coches a las calles exteriores; junto a los seis peatones y tres
pájaros existentes forman un presupuesto fijo de once actores ambientales,
más el yate de Miami cuando corresponde.
La pausa explícita del juego los detiene; los límites de cámara cubren el fondo.

Las diez piezas de mecánicas tienen PNG de 288×246, caja lógica 96×82, base
común y WebP. `twistPresentation` sigue siendo de solo lectura. Ofertas y visitas
caducadas desaparecen; la pieza, título traducido y barra reflejan el estado
real. Las acciones siguen en los controles existentes. En `src/game/twists.ts`
solo se amplía `TWIST_WORLD_ART`; no cambian tiempos, precios, premios ni guardado.

Originales y recortes: `public/sprites/source/business-districts.{png,json}` y
`regional-mechanics.{png,json}`. El distrito financiero tiene una corrección
original separada (`district-financial-clean.png`) para eliminar un fragmento
vecino. La plaza de la última celda es referencia y no se carga en el juego.

Receta: `python scripts/register-regional-world.py`,
`node scripts/export-regional-world.mjs`, `npm run art:webp`.

Prompt de entornos: original 4×3 atlas, twelve isolated transparent 2:1 miniature
streetscape dioramas, toy3D navy outlines warm top-left light; technology park,
beach food court, beach club, marina; waterfront housing, financial district,
luxury car avenue, hotel beachfront; desert safari, gold souk alleys, construction
district, coastal plaza. Connected buildings, sidewalks and short roads, no text,
people or brands. Corrección financiera: remove only the stray disconnected road
above the tower, preserve all architecture and antennas, transparent background.

Prompt de mecánicas: original 5×2 transparent atlas; excursion boat/captain,
house buyer with keys and blank sign, Emirati VIP with sportscar keys, jeweler
presenting ring case, foodie with phone/taco/ringlight; hotel inspector with
notebook/magnifier, DJ booth with lights, safari photographer with tripod and
sunset, mining rack with fictional star coin, drafting table with hardhat/model.
Friendly chibi toy3D warm light, navy contours, complete isolated objects, no
logos or text. Edición de encuadre: separate every sprite with broad transparent
gutters while retaining its characters and equipment.

El cartel de inmobiliaria muestra «Vendido»/«Sold» solo cuando `order.done` es
verdadero. Antes permanece en blanco, evitando anunciar una venta pendiente.
El texto se dibuja sobre la pieza mediante `t()`, no está incrustado en el PNG.
Receta de la comprobación específica: `node scripts/capture-sold-sign.mjs`.

Verificación: 227 tests y build correctos; 178 comprobaciones completas de
Chromium en dos idiomas y tres anchos, más cuatro comprobaciones específicas
para el cartel de venta en ambos idiomas. Informes y galería en
`docs/visual-review/README.md`. Sigue pendiente la validación física/nativa.

## Encargo: landing page y vídeos de TikTok (5 de octubre de 2026)

Carlos quiere una landing page y vídeos de TikTok orgánico. Claude los monta (ver `PLAN.md`); el arte lo hace ChatGPT/Codex.

**Reglas:**
- Mismo estilo que el juego: juguete 3D pulido, contorno azul marino, luz cálida desde arriba a la izquierda.
- Arte original, sin marcas ni logotipos reales.
- PNG con transparencia donde se indique, y su `.webp` (`npm run art:webp` solo cubre `public/sprites`; para `site/` hay que exportar el WebP a mano o ampliar el script).

### Landing (carpeta `site/img/`)

| Clave / archivo | Tamaño | Qué es |
| --- | --- | --- |
| `hero.png` | 1600×1000 | Escena principal: el rider en bici delante de la ciudad isométrica de Madrid que se transforma hacia Miami y Dubái al fondo, con monedas y ambiente de éxito. Que deje aire a la izquierda para el titular |
| `hero-mobile.png` | 900×1200 | La misma escena reencuadrada en vertical, con aire arriba para el titular |
| `rider.png` | 600×800, transparente | El personaje protagonista recortado, pose dinámica (saludando o sobre la bici) |
| `city-madrid.png`, `city-miami.png`, `city-dubai.png` | 800×560, transparentes | Un diorama isométrico de cada ciudad con 2–3 negocios reconocibles (se puede partir de `district_*` y los edificios ★★★) |
| `step-open.png`, `step-manager.png`, `step-expand.png` | 256×256, transparentes | Iconos de los 3 pasos: abrir un negocio, contratar un gerente y viajar/expandirse |
| `league.png` | 800×560, transparente | Trofeo o podio de la Liga semanal con confeti, sin cifras de dinero |
| `phone-frame.png` | 520×1040, transparente | Marco de móvil genérico (sin marca) para poner encima el vídeo del juego |
| `og-image.png` | 1200×630 | Imagen para compartir el enlace: logo + rider + ciudad + frase «De rider a millonario». Texto grande y legible en miniatura. También la versión inglesa `og-image-en.png` («From rider to millionaire») |
| `favicon-32.png`, `favicon-180.png` | 32×32 y 180×180 | A partir del icono de la app |

### TikTok (carpeta `marketing/tiktok/arte/`)

| Archivo | Tamaño | Qué es |
| --- | --- | --- |
| `endcard.png` | 1080×1920 | Pantalla final: logo, el rider y una franja vacía abajo para «Búscalo en Google Play» (el texto lo pone Claude en el montaje). Versión `endcard-en.png` |
| `cover-template-*.png` (3) | 1080×1920 | Fondos de portada con espacio grande arriba para el título: ciudad de día, Miami al atardecer y Dubái de noche |
| `avatar.png` | 400×400 | Avatar de la cuenta: cara del rider sobre fondo de color plano, que se lea en pequeño |
| `sticker-*.png` (6), transparentes | ~600 px de ancho | Rótulos con el estilo del juego para el montaje: «¡Atasco!», «Gerente contratado», «x3», «Nivel máximo», «Salida a bolsa», «Nuevo récord». Sin texto si se prefiere: solo el marco o la cinta, y Claude escribe encima con la fuente del juego |
| `coin-burst.png` | Tira de 8 frames de 256×256, transparente | Explosión de monedas para transiciones |

Al entregar, documentar en esta sección los prompts usados y avisar a Claude para montar la landing y los vídeos.


### Entrega del encargo de landing y TikTok — Codex, 5 de octubre de 2026

Se entregan las **28 piezas** de las tablas anteriores, con sus 28 WebP: 15 en `site/img/`, 13 en `marketing/tiktok/arte/`. Tamaños exactos, iconos/dioramas/rider/marco/cintas/secuencia con transparencia. Las seis cintas son marcos sin rótulo, como permite el encargo; las dos endcards comparten el arte sin llamada a la acción para que el montaje lo localice. Guías de uso y zonas de texto en los README de ambas carpetas. Fuentes originales preservadas en `site/img/source/hero.png` y `assets.png`, con recortes `assets.json`. No se añaden texturas al runtime ni cambios económicos.

Prompts usados:
- **Hero:** premium original Rider Millionaire landing key art; referenced green-cap green-shirt brown-haired rider on a green pedal bicycle waving; polished toy 3D, navy contours, warm top-left light; isometric Madrid restaurant/warehouse transitioning to coral Miami marina and cream-gold Dubai skyline; star coins; left 40% atmospheric navy empty for headline; no text/logos. Reencuadre vertical compuesto con el mismo rider y dioramas, con espacio arriba.
- **Atlas:** transparent original marketing atlas, isolated rider on bicycle; Madrid warehouse/red-roof restaurant/purple studio; Miami foodtruck/beachclub/yacht marina; Dubai hotel/souk/tower; weekly gold-star trophy podium without numbers; open-shop, suited manager and globe/plane icons. Polished toy 3D, navy contours, warm upper-left light, no text/logos. Extracciones documentadas; fuentes intactas.
- **Limpieza gerente:** preservar retrato con traje azul, corbata verde y brazos cruzados, quitar fragmento cian vecino, completar contorno, transparencia y márgenes.

`node scripts/export-marketing-art.mjs` reproduce recortes, composiciones, logo y lemas legibles en ES/EN, favicons y WebP. Las composiciones reutilizan exclusivamente arte original y el logo existente. `coin-burst` tiene ocho frames horizontales de 256×256; último vacío. Las portadas dejan espacio para título; Miami usa paleta de atardecer y Dubái fondo nocturno con arquitectura iluminada.

**Para Claude:** entrega de arte preparada para montar la landing y los vídeos descritos en `docs/PLAN.md`; instrucciones de uso en `site/img/README.md` y `marketing/tiktok/arte/README.md`. Publicar esta rama entrega los archivos; el montaje de vídeos y el despliegue de la landing corresponden a la siguiente fase.

Validación: 227 tests y build correctos; 53 comprobaciones del juego a 390×844 sin errores; 28 pares PNG/WebP comprobados. Contacto visual: `docs/visual-review/marketing-contact-sheet.png`. El retrato del gerente limpio se conserva además en `site/img/source/manager-clean.png`.

## Encargo: coches vistos de espaldas (tráfico en los dos sentidos)

Los coches (`car_0`…`car_3`, `van`, `car_miami_*`, `luxcar_*`) solo tienen la vista de frente, hacia abajo y a la derecha. Si un coche subía por la pantalla, parecía que iba de lado. Por eso, desde el 5 de octubre, el tráfico de la ciudad y de los barrios solo baja por la pantalla (en `streetLane` de `streets.ts` y en las calles de `Neighborhood.ts`).

Para tener tráfico en los dos sentidos:
- **Qué hace falta:** una vista trasera de cada vehículo, `<clave>_rear`. Es el mismo coche visto desde atrás, alejándose hacia arriba y a la izquierda. Mismo tamaño lógico, mismo punto de apoyo y fondo transparente. Con `flipX` vale también para subir hacia arriba y a la derecha.
- **Prompt:** «same vehicle, rear three-quarter view driving away toward the upper-left, identical scale, colours and ground anchor, transparent background, no text».

## Encargo: pantallas de negocio de primera (5 de octubre de 2026)

Carlos quiere que las pantallas de cada negocio mejoren mucho. Esta es la revisión de Claude tras jugarlas a 390×844.

### Qué falla hoy
1. **Solo 2 de los 14 negocios tienen un recinto propio:** el almacén (`WarehouseRoom.ts`) y el restaurante (`RestaurantRoom.ts`). Los otros 12 usan el recinto genérico de `BusinessScene` (`drawGround`, `drawFence`, `drawDecor`, `drawTierDecor`). Son una explanada de baldosas con farolas y mucho hueco vacío, sobre todo al principio, con 1 o 2 puestos. Cripto, yates y rascacielos se ven casi vacíos.
2. **El edificio del negocio es pequeño** comparado con los vecinos y no parece «la sede».
3. **Los puestos flotan sobre el suelo,** sin zona de trabajo propia (alfombra, mostrador, cinta, muelle…), y los caminos entre puestos son genéricos.
4. **El relleno del barrio se parece demasiado al negocio:** usa los mismos `district_*` y `bld_*`. Claude lo ha atenuado con un tinte, pero falta arte pensado como fondo.
5. **Los coches solo se ven de frente** (ver «Encargo: coches vistos de espaldas»).

### Qué pedimos
1. **Un recinto propio para cada uno de los 12 negocios restantes**, como el almacén y el restaurante:
   - suelo con su textura y su forma: muelle de madera y agua en yates, sala de servidores con suelo técnico en cripto, obra con zanjas y grúas en el rascacielos, arena con hamacas en el club de playa, explanada de exposición en superdeportivos, etc.;
   - muros, vallas o límites con personalidad;
   - mobiliario fijo que llene el espacio desde el primer minuto, aunque solo haya un puesto;
   - el camino de la venta: puerta, mostrador, salida de clientes.

   **Técnica:** una clase `XxxRoom` por negocio, con la misma interfaz que `WarehouseRoom` y `RestaurantRoom`: `create()` y una `layout` con `slots`, `door`, `route`, `stops` y `saleRoute`. Se engancha en `BusinessScene.create()`.
2. **Sede del negocio más grande y reconocible,** en tres versiones (★, ★★, ★★★) como ahora. Que sea lo que más destaca de la pantalla.
3. **Base para cada puesto:** una plataforma o zona marcada debajo de cada `st_<negocio>` (alfombra, foso, muelle, mesa). Así no flotan y se ve dónde irá el siguiente puesto: una huella tenue en los huecos aún no comprados.
4. **Arte de fondo para el barrio,** pensado para no competir con el negocio: 6–8 manzanas de relleno por ciudad, más bajas, menos saturadas y sin rótulos (`filler_<ciudad>_<n>`, unos 270×190). Además:
   - un aparcamiento (`lot_parking`);
   - un parque (`lot_park`);
   - un solar en obras (`lot_empty`).

   `Neighborhood.ts` los usaría en vez de `district_*` y `bld_*`.
5. **Suelo urbano en baldosas:**
   - acera, bordillo, paso de cebra y asfalto con línea, en 88×44 y en sus giros;
   - Claude sustituye las baldosas dibujadas por código (`tile_road_*`, `tile_walk_*`).
6. **Vistas traseras de los vehículos:** ver «Encargo: coches vistos de espaldas».

### Reglas
- Las de siempre: `AGENTS.md`, `calmWorld()` para el movimiento ambiental, `npm run art:webp` y documentar claves y prompts aquí.
- No tocar `src/game/*`.
- Rendimiento: 1–2 texturas grandes por recinto (≤2048 px) mejor que cientos de piezas.
- Comprobar cada negocio con 1 puesto y con 8 puestos, y alejando el zoom al máximo, a 390×844.
- Orden de dibujo: la profundidad de un objeto es su `y` en pantalla. El fondo del barrio está a profundidad -1e6, y nada del recinto puede quedar por debajo de su suelo.

### Orden sugerido
Por impacto, primero los que se ven más vacíos:
1. cripto, yates, rascacielos y superdeportivos;
2. TikTok e IA;
3. el resto de Miami y Dubái;
4. después, el arte de fondo del barrio, las baldosas y los coches de espaldas.

## (Descartado) Vista por plantas, al estilo Idle Miner (5 de octubre de 2026)

> Descartado: se parecía demasiado a Idle Miner. Ver «Encargo: «De rider a millonario», vista en ruta y reparto en bici».

Carlos ha elegido rehacer la pantalla de cada negocio como en Idle Miner. **El encargo «Pantallas de negocio de primera» (recintos isométricos) queda en pausa.** La ciudad sigue siendo isométrica.

**Prototipo en el almacén:** `src/scenes/FloorsScene.ts`, activo para los negocios de `FLOOR_VIEW`.
- **Arriba:** la sede, grande, con el barrio apagado detrás. Debajo, la calle con la venta (furgoneta, repartidor…).
- **A la izquierda:** el montacargas, que hace de transporte. Sube por su hueco el producto de cada planta hasta la puerta.
- **Debajo:** una planta por puesto, de 150 px de alto. Cada planta enseña lo mismo y en el mismo sitio:
  - el encargado arriba a la izquierda;
  - el producto junto al montacargas;
  - el puesto y el trabajador en el centro, grandes;
  - el botón «Nivel» a la derecha.
- **Movimiento:** solo vertical, sin zoom.

**Arte que hará falta cuando se apruebe** (se encargará entonces):
- un fondo de planta por negocio, de 390×150, que se repite hacia abajo: pared, suelo y detalles (almacén con estanterías al fondo, cocina, plató…);
- una cabina de montacargas por negocio, de unos 64×56 (hoy está dibujada por código);
- un fondo de calle con fachada por ciudad, para la parte de arriba;
- el botón «Nivel» como imagen, si se quiere más acabado.

## Encargo: «De rider a millonario», vista en ruta y reparto en bici (5 de octubre de 2026)

Sustituye a «Cambio de rumbo: vista por plantas», que queda descartado por parecerse demasiado a Idle Miner. El diseño completo está en [`DISENO_RUTA.md`](DISENO_RUTA.md).

**Qué ya está programado** (`src/scenes/RouteScene.ts`), hoy con arte provisional y activo en el reparto en bici y en el almacén (`ROUTE_VIEW`):
- **Arriba:** la sede y la calle.
- **Debajo:** una ruta en zigzag. En cada tramo horizontal hay una parada (un puesto) y el transporte la recorre.
- **Botón «Nivel»:** siempre a la derecha.
- **Reparto en bici** (`bike`): es el nuevo primer negocio. Si mantienes pulsado al rider, pedalea más rápido.

**Reglas:**
- El estilo de siempre: juguete 3D, contorno azul marino y luz arriba a la izquierda.
- PNG transparentes y después `npm run art:webp`.
- Documentar las claves y los prompts al final de esta sección.
- No tocar `src/game/*`.
- Escala: una franja de parada mide **390×172 px lógicos** y la ruta tiene **30 px** de ancho.

### 1. El rider (protagonista) — prioridad máxima
| Clave | Tamaño | Qué es |
| --- | --- | --- |
| `ch_rider_bike_0`, `_1`, `_2` | 64×60 | El rider de la gorra verde (el mismo de la web y del icono) **montado en bici con la caja de reparto**: quieto y dos fotogramas pedaleando. Mirando a la derecha; el código lo voltea |
| `ch_rider_bike_fast` | 64×60 | Pedaleando a tope: inclinado, con líneas de velocidad y gotas de sudor |
| `ch_customer_0`…`_2` | 44×60 | Cliente que recibe el pedido (venta del reparto): andando y recogiendo la bolsa |
| `item_order` | 26×26 | Bolsa de reparto con el ticket grapado (el «producto» del reparto) |

### 2. Reparto en bici: paradas y sede
| Clave | Tamaño | Qué es |
| --- | --- | --- |
| `st_bike_0`…`st_bike_7` | 104×80 | Las 8 paradas, cada una un local distinto, en mostrador de calle con su cocinero: hamburguesería, pizzería, sushi, kebab, tacos, poke, panadería y heladería. Rangos: versiones `_r1`…`_r5` (bronce a leyenda) del mismo local, con más detalle |
| `ch_cook_bike_*` | 44×60 | (Opcional) cocinero propio de cada local; si no, se usa `ch_cook` |
| `bld_bike_1`, `_2`, `_3` | 172×140/164/188 | La sede del reparto, el «punto de recogida»: **1** bici aparcada en un portal; **2** pequeño local con bicis y mochilas; **3** central de riders con motos y logo propio, sin marcas reales. Hoy se usa provisionalmente la del food truck (`PROVISIONAL_HUB` en `catalog.ts`) |

### 3. Tramos de ruta (la pieza clave de la vista)
Para **cada negocio**, un juego de piezas de 30 px de ancho que se repiten en vertical y en horizontal: tramo recto horizontal, tramo recto vertical, curva (los 4 giros), punto de parada (ensanchamiento delante del puesto) y fin de ruta en obras.

| Negocio | La ruta es… |
| --- | --- |
| `bike` | asfalto con pasos de cebra y alcantarillas |
| `dropship` | cinta transportadora con rodillos |
| `restaurant` | pasillo de baldosa entre mesas |
| `tiktok` | cables y focos sobre suelo de plató |
| `ai` | canaleta de cableado con luces |
| `foodtruck` | paseo marítimo de madera |
| `beachclub` | pasarela de tablas sobre arena |
| `yachts` | muelle de madera sobre agua |
| `realestate` | calle residencial |
| `crypto` | fibra óptica luminosa |
| `supercars` | circuito con bordillos rojos y blancos |
| `hotel` | moqueta roja con remates dorados |
| `safari` | pista de arena con huellas |
| `souk` | callejuela empedrada |
| `tower` | andamio y tablones |

Claves: `route_<negocio>_h`, `_v`, `_turn_ne`, `_turn_nw`, `_turn_se`, `_turn_sw`, `_stop` y `_end`. **Empezar por `bike` y `dropship`**, que ya usan la vista.

### 4. Fondo de cada franja y sede
| Clave | Tamaño | Qué es |
| --- | --- | --- |
| `band_<negocio>` | 390×172 | Suelo de fondo que se repite detrás de la ruta: acera con árboles en el reparto, suelo de nave en el almacén, etc. Discreto, que no compita con la ruta ni los puestos |
| `street_<ciudad>` | 390×280 | La parte de arriba: cielo, fachadas de fondo y calle, para Madrid, Miami y Dubái. Sustituye a los `district_*` difuminados de hoy |

### 5. Botón «Nivel» e iconos
| Clave | Tamaño | Qué es |
| --- | --- | --- |
| `btn_level`, `btn_level_ready`, `btn_level_warn` | 70×56 | Botón de nivel: normal (azul apagado), «puedes mejorar» (azul vivo) y «atasco» (naranja). El texto lo pone el código |
| `ic_manager_slot` | 30×30 | Marco redondo del encargado: vacío y ocupado |
| `ic_pedal` | 48×48 | Icono «mantén pulsado» para el aviso de pedalear |

### 6. Coches vistos de espaldas
Sigue pendiente; ver «Encargo: coches vistos de espaldas».

### Orden de entrega
1. Rider en bici y cliente (1).
2. Los 8 locales del reparto y su sede (2).
3. Tramos y fondo de `bike` y `dropship` (3 y 4).
4. Botones (5).
5. Tramos y fondos del resto de negocios, primero los de Madrid.

Cuando se entregue cada bloque, avisar a Claude para engancharlo y extender la vista en ruta a más negocios.

## Catálogo: fase 1 del kit de interfaz — 6 de octubre de 2026

Piezas reutilizables en `src/ui/interface-kit.css`: `.ui-button` verde, `.blue`, `.gold`, `.danger` (normal/pulsado/desactivado), `.ui-panel` con cabecera, `.ui-progress`, `.ui-chip`, `.ui-portrait` con marcos por rareza. Los selectores de los paneles existentes consumen el mismo kit. CSS original: esmalte con contorno marino grueso, brillo superior, sombra inferior y tipografía Lilita One/Rubik. No requiere atlas ni red.

`btn_level`: componente `src/scenes/LevelButton.ts`, caja lógica 70×56, reposo azul gris, listo azul vivo con flecha verde, atasco naranja. Pulsación con relieve y animación del número solo al aumentar; respeta reducir movimiento. El valor y el estado proceden del modelo `businessView`; el toque abre el panel mediante Bridge.

Iconos vectoriales propios añadidos: menú, calendario, reloj, cierre, producción, transporte, venta y bici. HUD en una fila, impulso con temporizador, objetivo y accesos compactos; navegación incluye Mundo dentro del negocio. Flotantes de mejora/viral a la izquierda para reservar los 80px derechos de Nivel. Sin cambios de economía.

Galería y validación: `docs/visual-review/phase-1/`, 229 tests y build correctos; 60 comprobaciones a 390×844 en ES/EN, movimiento completo/reducido, una y ocho paradas, mejora, menú y siete paneles. Partidas de demostración locales; Supabase simulado sin escrituras. Rendimiento físico Android pendiente de validación, sin afirmar 60fps medidos.

### Fase 2 — mundo del reparto en bici (6 de octubre de 2026)

Arte original generado para este juego, sin marcas. Los originales y las cajas de extracción están en `public/sprites/source/bike/`; el juego carga únicamente las piezas PNG/WebP del manifiesto. Exportación reproducible: `node scripts/export-bike-art.mjs`, `node scripts/export-bike-road.mjs`, `npm run art:webp`. Los scripts utilizan los originales versionados cuando no existe el directorio temporal de generación.

| Claves | Tamaño lógico | Contenido |
| --- | --- | --- |
| `street_bike` | 390×280 | Barrio madrileño de mañana, balcones, árboles, bancos y calle |
| `bld_bike_1..3` | Hasta 340×300, ajustado por Boot | Portal con bicis, local de riders, central con terraza solar y motos |
| `band_bike` | 390×172 | Acera original de losetas, con alcorques/árboles y bancos en la escena |
| `route_bike_h`, `_v` | 60×30 / 30×60 | Asfalto y marcas de carril |
| `route_bike_turn_ne/nw/se/sw` | 48×48 | Cuatro esquinas de ruta |
| `route_bike_stop`, `_ghost`, `_works` | 60×40 / 60×30 / 60×44 | Ensanche, tramo fantasma y barrera de obra |
| `st_bike_0..7` | 104×80 | Hamburguesas, pizza, sushi, kebab, tacos, poke, panadería y heladería |
| `ch_bike_<0..7>_<0..2>` | 64×84 | Ocho cocineros, cada uno con reposo y dos poses de trabajo, pies completos |
| `veh_bike_0/1/2/fast`, `veh_bike_rear_0/1/2/fast` | 74×82 | Rider de gorra verde en bicicleta, pedaleo normal/rápido, frente y espalda |
| `ch_bike_customer_0/1/2` | 64×84 | Clienta propia con bolsa, reposo y dos poses de paseo |
| `bike_portal_0/1` | 86×104 | Entrega de bolsas a clientes en sus portales |
| `bike_pigeons` | 45×32 | Pareja de palomas |
| `item_bike_bag` | 22×29 | Bolsa propia con emblema verde |

61 piezas, todas exportadas a 2×. Las sedes conservan el ajuste de parcela para la ciudad y se amplían en la escena de negocio. Los rangos de puestos/cocineros usan las adiciones estructurales acumulativas de `rankArt` (marcos, mostrador, terminal, equipamiento), conservando cada fachada y pose. Las texturas se crean solo para las variantes mostradas. La geometría continua de la ruta sigue dibujándose por código para mantener el ancho de 30 px, el zigzag exacto y las marcas sin deformarlas; incorpora las piezas de ensanche y obras. El kit de tramos queda disponible para reutilizarlo.

Prompts de dirección: «Original polished toy 3D mobile tycoon, navy outlines, warm upper-left light, Madrid morning, no text or real logos, transparent background for sprites». Fachadas: «eight distinct complete shop vignettes, burger/pizza/sushi/kebab/tacos/poke/bakery/ice cream, food emblems, awnings and plants». Cocineros: «eight distinct cooks, matching uniforms and food tools, complete legs and shoes, idle and two active cooking poses, transparent gutters». Rider: «same green cap/backpack protagonist on a pedal bicycle, front and rear idle/alternating pedals/fast lean, complete wheels». Sedes: «three architectural evolutions: small rider portal, rider warehouse, large delivery headquarters». Clientes: «same friendly female Madrid customer, cream top, blue trousers, green-star takeaway bag, full-body idle and walking poses». Calle: «Madrid balconies, roof tiles, trees, benches, open foreground street». Ruta y acera: vectores propios definidos en `scripts/export-bike-road.mjs`.

La escena lee `businessView()` también durante la construcción. El gesto de mantener pulsado llama al Bridge `pedal`, conectado a la acción existente `setPedal`; soltar fuera, perder foco o salir de la escena lo detiene. No se cambian fórmulas, guardado ni modelos de lógica. Ambiente limitado a dos palomas y un coche; efectos intensos desactivados al reducir movimiento. Galería: `docs/visual-review/phase-2/`.

### Fases 3–9 agrupadas — mundos, paneles y vehículos (6 de octubre de 2026)

Encargo agrupado por petición del usuario: rama de trabajo `codex/visual-phases-3-9`, incorporada a la PR #17 existente para entregar el conjunto sin crear otra PR. Se conserva la referencia de bici y el kit previos. La rama integra también el `main` que aporta habilidades, Escuela y feria; sus reglas pertenecen a la implementación de lógica existente.

**Catálogo reproducible:** `src/art/worldSizes.ts`, `routeSizes.ts` y `public/sprites/source/worlds/metadata.json` contienen dimensiones lógicas y recortes de cada pieza. Los originales completos están en `source/worlds`, junto con `inputs.json`. Exportar con `node scripts/export-world-art.mjs`, `node scripts/export-world-routes.mjs`, `node scripts/export-world-icons.mjs` y `npm run art:webp`.

| Claves | Tamaño lógico | Contenido y receta |
| --- | --- | --- |
| `street_<id>` | 390×280 | Calle propia por negocio; cuatro hojas de entornos en cuadrícula 2×2. Oficina: `ui_office_room`. |
| `bld_<id>_1..3` | hasta 340×300 | Tres evoluciones originales existentes, exportadas al tamaño de sede. La feria tiene tres arcos nuevos. En la escena se cargan como `hub_<id>_<tier>` y se ajustan al contorno transparente. |
| `st_<id>_0..7` | 104×80 | Ocho puestos propios para cada uno de los 14 negocios restantes y la feria. Hoja por negocio en cuadrícula 4×2, orden por fila. |
| `ch_<rol>_0..2` | 66×90 | Quince trabajadores originales con reposo y dos poses de trabajo: cinco hojas 3×3, una persona por fila. |
| `band_<id>` | 390×172 | Suelo original vectorial: nave, baldosa, plató, suelo técnico, paseo, muelle, calle residencial, circuito, moqueta, arena, zoco, andamio y feria. |
| `route_<id>_{h,v,turn_ne,turn_nw,turn_se,turn_sw,stop,ghost,works}` | 30–60 px | Piezas vectoriales al doble: materiales propios, esquinas, parada, fantasma y obras. Rodillos, pulsos, huellas y luces se animan en `RouteWorld`, con movimiento reducido. |
| `veh_{flatbed,luggage,safari,goldvan,crane,order,supply,excursion}_rear` | caja del frente | Ocho vistas traseras originales en una hoja 4×2. |
| `veh_fest_cart`, `_rear`, `prop_fest_ticketbooth` | 74×64 / 86×90 | Carrito delantero/trasero y taquilla. |
| `mgr_cheer_0..1`, `item_fest_ticket` | 64×84 / 24×22 | Gerente en dos poses y tickets de feria. |
| `ic_{skill,idea,school,ticket,fest_trophy}`, `ic_school_{prod,log,sale,mgr,start}` | 48×48 | Diez pictogramas de esmalte vectoriales propios; fuente en `visualIcons.ts` y exportador de iconos. |
| `car_*_rear`, `van_rear`, `luxcar_*_rear` | igual al frente | Quince vehículos traseros originales recuperados del catálogo anterior. Fuente/recortes en `source/traffic-rear.*`; exportador `export-traffic-rear.mjs`. |

**Prompts de las imágenes originales:** estilo común «original polished toy 3D game assets, thick navy outlines, warm upper-left light, readable at phone scale, no real brands, no text, no logos». Puestos: «transparent strict 4×2 grid, eight separate storefront/product stations, each cell complete and distinct», seguido de las ocho paradas de cada negocio de VISUAL §4 y de la feria §14.3. Trabajadores: «transparent strict 3×3 grid; each row same worker, full body, idle / working tool to left / working tool to right», con packer/cook/creator, engineer/taquero/bartender, sailor/broker/tech, mechanic/butler/guide y goldsmith/builder/vendor. Entornos: «strict 2×2 grid, orthographic front street panorama, empty foreground, buildings framing the sides, no UI», con las cuatro ciudades/temas indicados en `inputs.json`. Feria: «transparent strict 3×3 grid; three increasingly elaborate carnival entrance arches; cart front, cart rear, ticket booth; cheering manager two poses and ticket». Traseros: «transparent strict 4×2 grid, same original vehicle design, three-quarter rear view, complete vehicle with consistent wheels and scale».

**Rangos:** `rankedKey` crea las versiones de cada puesto específico y pose a partir del PNG original. Añade pilares, marquesinas, terminales y remates; los trabajadores reciben insignia, puños, hombreras y capa de leyenda. No se limita a cambiar el tinte. Las texturas por negocio y sus rangos se liberan al superar dos mundos en caché.

**Presentación:** cabeceras ilustradas diferenciadas, panel de mejora con navegación anterior/siguiente y progreso de rango, árbol de Escuela con requisitos y animación de idea, mapa ilustrado, despacho con placas de mejoras reales, avión al viajar y campana al salir a bolsa. Tráfico en ambos sentidos, transporte/venta con traseros, luces nocturnas según la ciudad, decoración de temporada y feria. Los efectos leen datos y llaman a las acciones existentes; no cambian fórmulas económicas.
