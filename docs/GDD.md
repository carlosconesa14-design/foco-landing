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

### Gerentes y ejecutivos
- **Gerentes:** se contratan con dinero y automatizan su parte de la cadena.
- **Ejecutivos (fase 2 ✅):** salen de maletines, con 4 rarezas (común, raro, épico, legendario). Se asigna uno por negocio.
  - Bonus permanente según su especialidad: producción, logística (capacidad de transporte y venta) o ventas (dinero por venta).
  - Habilidad activa: ventas x2 a x5 durante 5–10 min, que se recarga en 2 h o al instante con un anuncio.
- **Maletines:** uno gratis cada 4 h con anuncio, el normal por 50 💎 y el de oro por 150 💎.

### Progresión permanente
- **Estilo de vida:** de "vives con tus padres" a "isla privada", según lo ganado en total. Nunca se pierde.
- **Salida a bolsa (prestigio):** acciones con +2 % permanente cada una.
- **💎 Diamantes (fase 2 ✅):** se ganan con las misiones, el premio diario, los logros, el tutorial y los maletines. Se gastan en maletines y en paquetes de dinero. Nunca se pierden, tampoco al salir a bolsa.

### Retención (fase 2 ✅)
- **Tutorial guiado** de 6 pasos, con premio en diamantes al terminar.
- **3 misiones diarias** elegidas al azar cada día, con un premio extra por completar las tres.
- **Premio diario** con racha de 7 días (diamantes, dinero, maletines). Se puede duplicar viendo un anuncio. Si te saltas un día, la racha vuelve a empezar.
- **13 logros** con diamantes.
- **Más adelante:** eventos de temporada de 7 días con su propia ciudad (fase 3) y avatar u oficina personalizables.

### Liga Millonario (diseñada, pendiente de servidor)
Un concurso mensual gratuito basado en habilidad, pensado para atraer jugadores. Tiene que cumplir las políticas de AdMob y de las tiendas.
- **Ranking mensual** por el crecimiento del imperio ese mes. **Los multiplicadores de anuncios no cuentan para la puntuación**: el premio nunca es a cambio de ver anuncios, porque AdMob prohíbe dar dinero, cripto o tarjetas regalo como recompensa de un anuncio.
- **Premios fijos para pocos ganadores** (por ejemplo 50 €, 25 € y 10 €) y premios dentro del juego para el top 100.
- **Bolsa de premios = un % de los ingresos por anuncios del mes anterior**, con un tope y un mínimo como gasto de marketing en el lanzamiento. Cada premio se queda por debajo de 300 €, para que en España no haga falta retener IRPF.
- **Requisitos:**
  - servidor con cuentas y puntuaciones validadas (plan: Supabase), con comprobaciones antitrampas;
  - ganadores mayores de 18 y verificados;
  - bases legales dentro de la app (Apple 5.3) con número de ganadores, fechas y método (Google Play);
  - revisión de un abogado antes de activar los premios en dinero.
- **Cuándo activarla:** con unos 1.000 jugadores activos al día, y mantenerla si sube la retención y el número de anuncios por jugador lo suficiente para pagar la bolsa.

## Monetización

Anuncios bonificados, siempre opcionales:

| Ubicación | Recompensa | Fase |
| --- | --- | --- |
| `boost_x2` | Todo x2 durante 4 h (acumulable hasta 12 h) | 1 |
| `offline_x3` | Triplicar lo ganado con la app cerrada | 1 |
| `viral` | Evento que aparece cada 2–4 min con dinero extra | 1 |
| `rush` | Hora punta: un negocio x3 durante 30 min | 1 |
| `ipo_x2` | Doble de acciones al salir a bolsa | 1 |
| `free_chest` | Maletín de ejecutivo gratis cada 4 h | 2 ✅ |
| `ability_recharge` | Recargar la habilidad de un ejecutivo | 2 ✅ |
| `daily_double` | Doble premio diario | 2 ✅ |

Más adelante: compras dentro de la app (packs de diamantes y "sin anuncios + x2 permanente").

## Hoja de ruta

| Fase | Contenido |
| --- | --- |
| **1. Núcleo jugable** ✅ | Motor Phaser, ciudad isométrica con 4 negocios, recintos con puestos animados, gerentes básicos, mejoras, offline, anuncios, bolsa, guardado, arte sustituible |
| **2. Retención** | ✅ 💎, ejecutivos con rareza y habilidades, maletines, misiones diarias, premio diario, logros, tutorial guiado · ✅ sonido, música, vibración y ajustes · Pendiente: Liga Millonario (servidor) |
| **3. Contenido** | Más negocios, segunda ciudad, eventos de temporada, avatar |
| **4. Lanzamiento** | Arte profesional (sprites), analítica, tiendas, compras dentro de la app, SSV de AdMob |
