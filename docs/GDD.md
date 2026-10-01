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
- **Barra de la cadena:** abajo, fija, hay 3 tarjetas (producción · transporte · venta) con el nivel y los €/s de cada parte. La que frena el negocio sale en rojo ("Atasco"), y la que ya se puede mejorar o tiene gerente por contratar se ilumina en dorado. Tocarla abre su panel de mejora. Los puestos mantienen además su botón "Nv" sobre el mapa.
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

### Expansión mundial: varias ciudades (fase 3 ✅ Madrid + Miami)
Al terminar una ciudad empiezas casi de cero en la siguiente, pero más fuerte. Así el juego dura semanas en vez de días.

- **Completar una ciudad:** tener todos sus negocios y haber ganado su objetivo (Madrid 1 Qn = 10^30 €, Miami 10^36 €). Aparece el objetivo "¡Expándete a…!" y un punto rojo en el botón 🌍 Mundo.
- **Expandirse:** la ciudad queda como franquicia y da **+50 % de ingresos en todas las ciudades** para siempre. Además ganas **⭐ estrellas de franquicia**: 10 × (ganado / objetivo)^¼, o el doble con un anuncio (`expand_x2`).
- **Qué se conserva:** diamantes, ejecutivos, logros, misiones, estilo de vida máximo, ajustes y estrellas. **Qué se reinicia:** dinero, negocios y acciones de la nueva ciudad (cada ciudad tiene su propia bolsa).
- **Viajar:** puedes volver a cualquier ciudad abierta desde el mapa. Al llegar cobras lo que ganaron tus gerentes mientras no estabas (con el tope offline).
- **Oficina central (se paga con ⭐):** Marca global (+25 % por nivel), Equipo inicial (gerentes del primer negocio desde el inicio), Local reformado (+1 puesto inicial por nivel), Proveedores (−8 % en mejoras), Turno de noche (+2 h de offline), Coach de productividad (+1 h de modo hustle por anuncio) y Marketing viral (+1 % de ventas virales).
- **Cada ciudad tiene una regla propia.** Miami tiene **olas turísticas**: cada 15 min llegan turistas durante 3 min y las ventas se multiplican por 3 (solo jugando, no offline). Un anuncio (`tourist_wave`) atrae una ola al momento. Premia abrir la app a menudo.
- **Miami:** 5 negocios (Food trucks → Club de playa → Alquiler de yates → Inmobiliaria → Exchange de cripto), arena y palmeras. Es más lenta que Madrid: un jugador activo sin anuncios la completa en unos 6–7 días (con anuncios, unos 3).
- **Siguientes ciudades:** Dubái (mecánica: petróleo que sube y baja de precio), Tokio (tecnología, turnos de noche)… Solo hay que añadir un `CityDef` en `src/game/data.ts` y su arte.

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

## Economía y ritmo

Ajustada con un simulador (`npx vite-node scripts/balance.ts`): un bot juega con la lógica real y mide cuándo llega a cada hito. `tests/pacing.test.ts` falla si un cambio rompe estos márgenes.

| Hito | Jugador activo sin anuncios | Con x2 de anuncios |
| --- | --- | --- |
| Gerentes del almacén | ~1 min | ~1 min |
| Restaurante | ~45 min | ~23 min |
| Estudio de TikTok | ~4 h 45 min | ~2 h 20 min |
| Agencia de IA | ~24 h | ~12 h |
| Primera acción en bolsa | ~9 h | ~4 h 30 min |
| Los 4 negocios completos | ~3 días | ~1,5 días |

**Miami** (`--city=miami --stars=10`, con Marca global 1, Equipo inicial y Local reformado 1):

| Hito | Sin anuncios | Con x2 de anuncios |
| --- | --- | --- |
| Club de playa | ~53 min | — |
| Alquiler de yates | ~10 h | ~4 h |
| Inmobiliaria | ~40 h | ~18 h 30 min |
| Exchange de cripto | ~3 días | ~1,5 días |
| Ciudad completada (10^36 €) | ~6,5 días | ~3 días |

Claves del equilibrio:
- **Puestos:** cada uno produce x5 y cuesta x11. Cada puesto nuevo tarda más en llegar, pero siempre compensa.
- **Transporte y venta:** su capacidad crece de forma exponencial con el nivel, para que puedan seguir a los puestos.
- **Ritmo por negocio** (`pace`): multiplica todos los costes de ese negocio. Así los últimos negocios duran más.
- **Precio de cada negocio:** unos 20 minutos de los ingresos que tienes al llegar a él.
- **Bolsa:** acciones = raíz cúbica de lo ganado entre `shareDivisor`, con +5 % por acción.

## Dopamina estratégica

Recompensas de distinto tamaño en el momento justo, no ruido constante:

| Nivel | Frecuencia | Qué pasa |
| --- | --- | --- |
| Micro | Segundos | Monedas y sonido al vender, y el dinero que sube contando con un pequeño salto |
| Pequeño | 1–2 min | "+X €/s" flotante al mejorar; **próximo objetivo** siempre visible con barra, que late cuando ya puedes pagarlo |
| Medio | 5–20 min | **Banda dorada** al alcanzar un hito x2, abrir un puesto o completar las misiones |
| Grande | Horas | **Celebración a pantalla completa** con rayos y confeti: negocio nuevo, estilo de vida, bolsa, tutorial |
| Sorpresa | Al azar | **Venta viral** (4 % de las ventas, x5; solo jugando, no offline) y **maletines con suspense** (tiembla y estalla con el color de la rareza) |

Reglas:
- Lo grande es raro, para que no pierda valor.
- Lo aleatorio solo ocurre jugando, para premiar abrir la app.
- Siempre hay un objetivo cercano a la vista.

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
| `expand_x2` | Doble de estrellas al expandirse a otra ciudad | 3 ✅ |
| `tourist_wave` | Atraer una ola turística al momento en Miami (ventas x3 durante 3 min) | 3 ✅ |

Más adelante: compras dentro de la app (packs de diamantes y "sin anuncios + x2 permanente").

## Hoja de ruta

| Fase | Contenido |
| --- | --- |
| **1. Núcleo jugable** ✅ | Motor Phaser, ciudad isométrica con 4 negocios, recintos con puestos animados, gerentes básicos, mejoras, offline, anuncios, bolsa, guardado, arte sustituible |
| **2. Retención** | ✅ 💎, ejecutivos con rareza y habilidades, maletines, misiones diarias, premio diario, logros, tutorial guiado · ✅ sonido, música, vibración y ajustes · Pendiente: Liga Millonario (servidor) |
| **3. Contenido** | ✅ Expansión mundial: Miami, estrellas y Oficina central · Pendiente: más ciudades, eventos de temporada, avatar |
| **4. Lanzamiento** | Arte profesional (sprites), analítica, tiendas, compras dentro de la app, SSV de AdMob |
