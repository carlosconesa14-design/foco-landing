# De Rider a Millonario: documento de diseño

## La idea en una frase

Un idle tycoon donde construyes un imperio de negocios en una ciudad isométrica que ves crecer: almacén de dropshipping, restaurante, estudio de TikTok, agencia de IA… Cada negocio es un recinto en el mapa, al estilo de Idle Theme Park: construyes puestos, y ves a tus trabajadores producir, recoger y vender.

## Qué tomamos de los referentes

| Referente | Qué funciona | Cómo lo adaptamos |
| --- | --- | --- |
| **Idle Miner Tycoon** (4,7★, n.º 16 en Estrategia) | Una cadena de producción donde siempre hay un cuello de botella que mejorar. Gerentes con habilidades. Varias minas y continentes. Eventos de temporada. | La economía de cada negocio es **producción → transporte → venta**, con la parte que atasca marcada en rojo. Visualmente no copiamos el corte vertical de la mina. |
| **Idle Theme Park Tycoon** (4,4★) | Un mundo visual en mapa que se va llenando. Mucha información de un vistazo (dinero, gemas, checklist, expediciones). | Tanto la **ciudad** como **cada negocio** son mapas isométricos que arrastras y ves crecer, con parcelas, tráfico y gente. |
| **AdVenture Capitalist** | Números enormes, hitos que duplican, prestigio con inversores. | Hitos x2 por nivel, **salida a bolsa** con acciones permanentes. |

Lo que nos diferencia es el **tema**: ganar dinero con negocios modernos (dropshipping, creadores, IA). Es aspiracional y atrae a un público joven que no juega a minas ni parques temáticos.

## Bucle principal

1. Tocas a tus trabajadores para producir, transportar y vender.
2. Con el dinero mejoras la parte que frena la cadena.
3. Contratas gerentes para que cada parte funcione sola.
4. Con los gerentes el negocio produce sin ti y ganas incluso con la app cerrada.
5. Compras el siguiente negocio de la ciudad, que produce 100–1000 veces más.
6. Cuando el progreso se frena, sales a bolsa: empiezas de cero con un bonus permanente.

## Sistemas

### Ciudad (mapa)
- Mapa vertical que se arrastra con el dedo. Tiene parcelas, calles, coches y peatones.
- Cada parcela es un negocio: primero sale el cartel de "Se vende" y, cuando lo compras, el edificio con un bocadillo que indica lo que gana por segundo.
- Más adelante habrá varias ciudades (Madrid → Miami → Dubái → Tokio), como los continentes de Idle Miner.

### Recinto de un negocio (vista de mapa)
Cada negocio es un recinto isométrico vallado, con el edificio principal, caminos, hasta 8 puestos y un portón que da a la calle.

| Parte | Almacén de dropshipping | Restaurante | Estudio de TikTok | Agencia de IA |
| --- | --- | --- | --- | --- |
| Puestos (hasta 8) | Estanterías con mozos | Cocinas con cocineros | Sets con creadores | Racks de GPUs |
| Transporte | Carretilla | Camareros | Editores | Técnicos |
| Venta | Furgonetas | Repartidores | Marcas | Comerciales |

- **Puestos:** el trabajador produce y deja el producto junto al puesto. Cada puesto nuevo se construye en una parcela del recinto y produce 6 veces más que el anterior.
- **Transporte:** recorre los caminos parando en cada puesto hasta llenar su capacidad y lo lleva al edificio principal.
- **Venta:** sale por el portón hacia la calle y vuelve con el dinero.
- Sin gerente, cada parte hace un solo ciclo por toque. Con gerente, repite sola.
- Cada 10/25/50/100… niveles, esa parte rinde el doble.
- El mapa se arrastra y se acerca o aleja pellizcando la pantalla.

### Gerentes
- **Fase 1:** se contratan con dinero y automatizan su parte.
- **Fase 2:** gerentes con rareza (común, raro, épico, legendario) que salen de cofres, con una habilidad activa que se recarga (por ejemplo, x2 de velocidad durante 5 min o -50 % en mejoras).

### Progresión permanente
- **Estilo de vida:** de "vives con tus padres" a "isla privada", según lo ganado en total. Nunca se pierde.
- **Salida a bolsa (prestigio):** acciones con +2 % permanente cada una.
- **Fase 2:** 💎 diamantes como moneda premium: se ganan con anuncios, misiones y logros, y se gastan en cofres de gerentes, acelerar y cosméticos.

### Retención
- **Fase 2:** 3 misiones diarias, recompensa por entrar cada día y logros.
- **Fase 3:** eventos de temporada de 7 días con su propia ciudad y un ranking (Black Friday, Navidad, verano).
- **Fase 3:** avatar y oficina personalizables.

## Monetización

Anuncios bonificados, siempre opcionales:

| Ubicación | Recompensa | Fase |
| --- | --- | --- |
| `boost_x2` | Todo x2 durante 4 h (acumulable hasta 12 h) | 1 |
| `offline_x3` | Triplicar lo ganado con la app cerrada | 1 |
| `viral` | Evento que aparece cada 2–4 min con dinero extra | 1 |
| `rush` | Hora punta: un negocio x3 durante 30 min | 1 |
| `ipo_x2` | Doble de acciones al salir a bolsa | 1 |
| `free_chest` | Cofre de gerente gratis cada 4 h | 2 |
| `ability_recharge` | Recargar la habilidad de un gerente | 2 |
| `daily_double` | Doble recompensa diaria | 2 |

Más adelante: compras dentro de la app (packs de diamantes y "sin anuncios + x2 permanente").

## Hoja de ruta

| Fase | Contenido |
| --- | --- |
| **1. Núcleo jugable** ✅ | Motor Phaser, ciudad isométrica con 4 negocios, recintos con puestos animados, gerentes básicos, mejoras, offline, anuncios, bolsa, guardado, arte sustituible |
| **2. Retención** | 💎, gerentes con rareza y habilidades, cofres, misiones diarias, logros, tutorial guiado, sonido |
| **3. Contenido** | Más negocios, segunda ciudad, eventos de temporada, avatar |
| **4. Lanzamiento** | Arte profesional (sprites), analítica, tiendas, compras dentro de la app, SSV de AdMob |
