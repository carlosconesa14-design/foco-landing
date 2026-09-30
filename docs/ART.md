# Guía de arte

Todo el arte del juego está en `src/art/catalog.ts` y se dibuja por código. Cada pieza tiene un **nombre (clave)** y un **tamaño lógico**. Si le das al juego un PNG con esa clave, lo usa en lugar del dibujo por código. Así puedes cambiar el arte pieza a pieza sin tocar nada más.

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
| `ch_ped0_0` … `ch_ped2_0` | 44×60 | Chibi casual pedestrian, varied outfits, full body, standing |

Para las poses de caminar (`_1` y `_2`), el prompt es el mismo con "walking, left leg forward" o "walking, right leg forward".

### Interior de los negocios

| Clave | Tamaño lógico | Prompt |
| --- | --- | --- |
| `st_dropship` | 100×86 | Side view wooden warehouse shelves full of cardboard boxes |
| `st_restaurant` | 100×86 | Side view professional kitchen stove with two steaming pots |
| `st_tiktok` | 100×86 | Side view ring light on a tripod holding a smartphone, colorful props |
| `st_ai` | 100×86 | Side view black server rack with glowing cyan and green LEDs |
| `van` | 76×46 | Side view white delivery van with orange stripe, facing right |
| `item_box` | 26×26 | Small cardboard box with tape |
| `item_dish` | 26×26 | Plate of spaghetti with tomato sauce |
| `item_clip` | 26×26 | Film clapperboard |
| `item_chip` | 26×26 | Glowing teal computer chip |
| `coin` | 20×20 | Shiny gold coin, front view |
| `pulley` | 34×34 | Grey metal pulley wheel with spokes, front view |

## Consejos para generar con ChatGPT

- Pide **una pieza por imagen** y di explícitamente "transparent background". Si el fondo sale blanco, quítalo con cualquier herramienta de recorte.
- Genera primero un edificio y un personaje. Cuando te guste el resultado, pide el resto "in exactly the same style as the previous image" para que todo sea coherente.
- Mantén siempre la misma **vista**: isométrica 2:1 para la ciudad y lateral para los interiores.
