# Compras dentro de la app

Complementan los anuncios. Ninguna compra da puntos de la Liga (regla de las bases).

| Id del producto | Qué da | Tipo | Precio orientativo |
| --- | --- | --- | --- |
| `vip` | Sin anuncios (las recompensas llegan al momento, sin vídeo) y todo x2 para siempre | Única (no consumible) | 4,99 € |
| `starter_pack` | 300 💎, un ejecutivo Épico y 4 h de modo hustle | Única (no consumible) | 1,99 € |
| `auto_manager` | «Mejorar todo» sin límite (gratis son 3 al día y 2 más con anuncio). El VIP también lo incluye | Única (no consumible) | 0,99 € |
| `gems_200` | 200 💎 | Consumible | 1,99 € |
| `gems_1200` | 1.200 💎 | Consumible | 9,99 € |

- **Lógica:** `src/game/shop.ts`, con tests en `tests/shop.test.ts`.
- **Cobro:** `src/platform/store.ts` (`@capgo/native-purchases`: Google Play Billing y StoreKit).
- **Pantalla:** se abre tocando los diamantes de la cabecera.
- En la web la tienda está **simulada** (no cobra nada).

## Dar de alta los productos en Google Play

1. Sube la app a Play Console. Basta una versión en **prueba interna**: la facturación solo funciona con una versión subida.
2. **Monetizar → Productos → Productos de compra única** → crea los 5 productos con **exactamente** los ids de la tabla. El precio lo decides allí; el juego muestra el que devuelve la tienda, con la moneda del país.
3. **Configuración → Pruebas de licencias:** añade tu cuenta de Google. Así puedes comprar en pruebas sin que se cobre.
4. Al cambiar de móvil o reinstalar, las compras únicas (`vip`, `starter_pack` y `auto_manager`) se recuperan solas al arrancar. También hay un botón «Restaurar compras».

## Cosas a tener en cuenta

- Google y Apple se quedan con un **15 %** (programa para pequeños desarrolladores, hasta 1 M$ al año).
- Las compras se confirman automáticamente; si no se confirmaran en 3 días, Google las reembolsaría.
- Hoy la compra se valida en el móvil. Si se detectan trampas, se puede añadir una validación en el servidor (Edge Function con la API de Google Play).
