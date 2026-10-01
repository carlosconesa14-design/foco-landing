# Instrucciones para agentes (Codex, ChatGPT, Claude…)

"De Rider a Millonario" es un idle tycoon para móvil (Phaser 3 + TypeScript + Vite + Capacitor) monetizado con anuncios bonificados. Lee primero `README.md`, `docs/GDD.md` (diseño) y `docs/ART.md` (arte).

## Tu misión: todo lo visual

Tienes vía libre para mejorar **todo lo que se ve**: arte, animaciones, efectos, interfaz, tipografía, colores y sensación de juego ("juice"). No esperes una lista cerrada. Juega, detecta tú qué se ve pobre, genérico o poco claro, y mejóralo. El listón son los tycoons de éxito del móvil (Idle Miner Tycoon, Idle Theme Park Tycoon, Eatventure): mundo vivo, recompensas visuales en cada acción y una interfaz con personalidad propia.

Punto de partida: el apartado **"Plan de mejora gráfica"** de `docs/ART.md`. Es una revisión ya hecha, ordenada por impacto. Úsala como guía, no como límite.

Ideas que encajan (elige, amplía o descarta con criterio):
- **Sprites propios** para edificios, personajes, puestos, objetos, suelo e iconos, que sustituyan el arte dibujado por código y los emojis.
- **Edificios que evolucionan** a la vista según los puestos del negocio (3 versiones por edificio).
- **Ambiente:** ciclo de día y noche con la hora real, farolas y ventanas encendidas, mar animado, barcos, gaviotas.
- **Recompensas:** monedas que vuelan al contador, destellos, rebotes al comprar y transiciones entre escenas.
- **Interfaz:** kit propio de marcos, botones, barras, iconos y cabecera, en lugar de paneles genéricos.
- **Marca:** icono de la app, pantalla de carga, logotipo y capturas para la tienda.

## Cómo está montado lo visual

| Qué | Dónde |
| --- | --- |
| Arte dibujado por código (edificios iso, personajes, puestos, objetos, árboles, coches) | `src/art/catalog.ts` y el lápiz `src/art/pen.ts` |
| Sustituir una pieza por un PNG | Se guarda en `public/sprites/<clave>.png` y la clave se añade a `public/sprites/manifest.json`. `BootScene` lo carga y `buildArt` ya no la dibuja. Las claves y los tamaños lógicos están en `ART` (catalog.ts) y en `docs/ART.md` |
| Ciudad isométrica (suelo, parcelas, tráfico, nubes) | `src/scenes/CityScene.ts` |
| Recinto de cada negocio (puestos, trabajadores, transporte, venta) | `src/scenes/BusinessScene.ts` |
| Utilidades de escena (cámara con DPR, arrastre y zoom, textos flotantes) | `src/scenes/common.ts` |
| Interfaz HTML (cabecera, barra, paneles, modales) | `index.html`, `src/ui/*.ts`, `src/styles.css` |
| Celebraciones, bandas doradas, confeti y maletines | `src/ui/celebrate.ts` |
| Sonido (se puede sustituir por archivos) | `src/audio/sound.ts`, `public/audio/manifest.json` |

Cosas que hay que saber:
- **Isometría 2:1:** `TW = 88`, `TH = 44`. La profundidad de dibujo es la `y` en pantalla.
- **Píxeles CSS con DPR:** el canvas va a resolución física y la cámara hace zoom. `art()` escala cualquier textura a su tamaño lógico, así que un PNG más grande se ve nítido sin tocar nada.
- **Iconos, baldosas del suelo y retratos de ejecutivos ya se sustituyen por PNG** con las claves de `docs/ART.md` («Enganches ya preparados»). Los iconos están en `src/ui/icons.ts` y las baldosas en `placeTile` (catalog.ts). Los edificios en PNG se recortan y se ajustan a la parcela solos (`BootScene`).
- **Falta el enganche** para las 3 versiones de cada edificio según sus puestos. Si las haces, añádelo antes en el código.

## Reglas

- **No toques la economía** (`src/game/*`: números, fórmulas, guardado) salvo que un cambio visual lo necesite de verdad. Si cambias algo ahí, `npm test` tiene que seguir pasando, incluidos los tests de ritmo.
- **Antes de dar algo por terminado:** `npm test` y `npm run build` sin errores. Prueba en el navegador a 390×844 (móvil) sin errores en la consola.
- **Rendimiento:** tiene que ir fluido en móviles de gama media. Nada de miles de partículas ni de texturas de 4K.
- **Accesibilidad:** respeta `prefers-reduced-motion` y mantén un contraste legible.
- **Textos del juego en español.**
- **Arte propio o con licencia libre**, sin marcas ni logotipos reales.
- **Si añades piezas de arte nuevas, documéntalas en `docs/ART.md`** (clave, tamaño y prompt).

## Comandos

```bash
npm install
npm run dev      # juego en el navegador (anuncios simulados)
npm test         # tests (economía, meta, ritmo, ciudades)
npm run build    # typecheck + build
```

Para depurar en la consola del navegador:
- `__game.state` es la partida. Por ejemplo, `__game.state.cash = 1e12` da dinero y `__game.state.meta.tutorial = 99` salta el tutorial.
- `__game.setLuck(() => 0)` fuerza ventas virales.
