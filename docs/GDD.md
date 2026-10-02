# Rider Millionaire: documento de diseño

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

### Expansión mundial: varias ciudades (fase 3 ✅ Madrid, Miami y Dubái)
Al terminar una ciudad empiezas casi de cero en la siguiente, pero más fuerte. Así el juego dura semanas en vez de días.

- **Completar una ciudad:** tener todos sus negocios y haber ganado su objetivo (Madrid 1 Qn = 10^30 €, Miami 10^36 €, Dubái 10^41 €). Aparece el objetivo "¡Expándete a…!" y un punto rojo en el botón 🌍 Mundo.
- **Expandirse:** la ciudad queda como franquicia y da **+50 % de ingresos en todas las ciudades** para siempre. Además ganas **⭐ estrellas de franquicia**: 10 × (ganado / objetivo)^¼, o el doble con un anuncio (`expand_x2`).
- **Qué se conserva:** diamantes, ejecutivos, logros, misiones, estilo de vida máximo, ajustes y estrellas. **Qué se reinicia:** dinero, negocios y acciones de la nueva ciudad (cada ciudad tiene su propia bolsa).
- **Viajar:** puedes volver a cualquier ciudad abierta desde el mapa. Al llegar cobras lo que ganaron tus gerentes mientras no estabas (con el tope offline).
- **Oficina central (se paga con ⭐):** Marca global (+25 % por nivel), Equipo inicial (gerentes del primer negocio desde el inicio), Local reformado (+1 puesto inicial por nivel), Proveedores (−8 % en mejoras), Turno de noche (+2 h de offline), Coach de productividad (+1 h de modo hustle por anuncio) y Marketing viral (+1 % de ventas virales).
- **Cada ciudad tiene una regla propia.** Miami tiene **olas turísticas**: cada 15 min llegan turistas durante 3 min y las ventas se multiplican por 3 (solo jugando, no offline). Un anuncio (`tourist_wave`) atrae una ola al momento. Premia abrir la app a menudo.
- **Miami:** 5 negocios (Food trucks → Club de playa → Alquiler de yates → Inmobiliaria → Exchange de cripto), arena y palmeras. Es más lenta que Madrid: un jugador activo sin anuncios la completa en unos 6–7 días (con anuncios, unos 3).
- **Dubái (tercera ciudad):** 5 negocios (Alquiler de superdeportivos → Hotel de lujo → Safari en el desierto → Zoco del oro → Rascacielos). Regla propia: **precio del oro**. Sube y baja en ciclos de 20 min entre x1 y x3 (multiplica las ventas, solo jugando). Con un anuncio (`gold_lock`) se firma un contrato que fija x3 durante 4 min; no se ofrece cuando el precio ya está casi en el máximo. Es la ciudad más larga: con unas 20 ⭐ repartidas, el hotel llega en ~40 min, el safari en ~6 h, el zoco en ~2 días y el rascacielos en ~4,5 días de juego activo sin anuncios (`tests/pacing.test.ts`).
- **Carrera de fundadores:** los **100 primeros** jugadores en llegar a Dubái reciben un **ejecutivo fundador** exclusivo: legendario, con +100 % extra sobre su bonus y su número («Fundador #12»). Solo premios del juego, nunca dinero real. Los demás ven en qué puesto llegaron. El mapa del mundo enseña las plazas que quedan. El puesto lo da el servidor (`founder_claim`, migración 0013) una sola vez por jugador. Hace falta estar en la Liga, que es la cuenta con la que el servidor reconoce al jugador: al llegar a Dubái sin estar en la Liga, se le propone unirse una vez. Contra trampas: no hay puesto para partidas editadas sin revisar ni para quien llega en menos de 3 días desde que empezó a jugar (`league_config.founders_min_days`).
- **Siguientes ciudades:** Tokio (tecnología, turnos de noche), Nueva York… Solo hay que añadir un `CityDef` en `src/game/data.ts` y su arte.

### Mecánicas de cada negocio (fase 1: Madrid ✅)
Cada negocio de Madrid tiene una regla propia, para que no se sientan todos iguales. Son módulos reutilizables (`src/game/twists.ts`) que luego se pueden poner en Miami y Dubái con su temática. Reglas: **nunca castigan** (si no haces nada, el negocio va igual), se entienden en 5 segundos y tienen un anuncio opcional natural. Se muestran en una tarjeta encima de la barra de la cadena y se explican la primera vez que entras.
- **📦 Almacén: pedidos urgentes.** Cada 4–7 min llega un pedido: «gana X € en 3 min» (1,25 veces lo que el negocio gana en ese tiempo: hay que mejorar algo o usar la hora punta). Si lo cumples, 10 min de ingresos y 3 💎 (x2 con anuncio, `order_x2`). Si no, no pasa nada.
- **🧐 Restaurante: críticos gastronómicos.** Cada 4–8 min viene un crítico que quiere ver la cocina en marcha: tocar las cocinas 12 veces en 45 s (o «Atender ya» con anuncio, `critic_now`). Da 6 min de ingresos de propina y una **estrella de reputación**: +5 % de ventas en el restaurante para siempre (hasta 10).
- **🔥 TikTok: hype.** Cada venta (+4) y cada toque (+2) suben el hype, que baja 0,5 por segundo. Con gerentes se llena solo en unos 3 min; tocando, antes. Lleno: **¡directo viral! Ventas x3 durante 90 s**. Con anuncio, «Colaboración» lo lanza al momento (cada 10 min, `hype_collab`).
- **🧠 Agencia de IA: investigación.** Cada venta da 1 dato. 6 mejoras permanentes en orden (de 50 a 6000 datos): +25 % ventas, +25 % producción, +25 % transporte y venta, +50 % ventas, **+10 % ventas en toda la ciudad** y x2 ventas.
- Las estrellas, los datos y la investigación se conservan al salir a bolsa. Todo es solo jugando y el bot de equilibrado no las usa: no cambian los tests de ritmo, son extra para quien juega. Números ajustables desde el servidor (grupo `twists`, [`AJUSTES.md`](AJUSTES.md)).
- **Siguiente fase:** pedidos en el safari (excursiones) y la inmobiliaria (proyectos), hype en el club de playa y reseñas ⭐ en el hotel, investigación en el rascacielos, y «guardar o vender» en el exchange de cripto y el zoco del oro.

### «Mi vida»: el personaje y su tienda de lujo ✅
Un sitio en el que gastar el dinero aparte de las mejoras, para que apetezca ganar más. Botón «Mi vida» en el lateral (con punto rojo cuando hay algo que te puedes permitir) y en el menú.
- **El personaje:** empieza en chándal de rider, en moto de reparto y en casa de sus padres. Lo que compras se le ve encima (ropa, joyas), y se ve su casa al fondo, su coche, su mascota y su capricho de lujo. **Tu coche circula por la ciudad** con un cartel «Tú».
- **6 colecciones (32 objetos):** ropa, relojes y joyas, garaje, casas, mascotas y lujo extremo. Se pagan con el dinero del juego de la ciudad en la que estás, con precios de 500 € a 10^35 € (siempre hay algo a lo que aspirar). Hay 5 **exclusivos con diamantes** (de 250 a 500 💎).
- **Bonus:** cada objeto da prestigio y **cada punto, +1 % de ingresos para siempre** (también al salir a bolsa y en todas las ciudades). **Cada colección completa, +10 %**. Con todo, x2,1 como mucho. No cambia el ritmo de los tests (el bot no compra), pero un jugador que compra va algo más rápido; es la idea.
- **Anuncios:** «**Probar 1 h**» (`lux_trial`, 5 al día): lo usas y lo ves puesto una hora, con su bonus, para que entren ganas de comprarlo. «**Oferta del día**» (`lux_deal`): uno de los 4 objetos más baratos que no tienes, a mitad de precio con un anuncio.
- Lógica en `src/game/luxury.ts` (tests en `tests/luxury.test.ts`), pantalla en `src/ui/lifePanel.ts` y personaje en `src/ui/avatar.ts` (SVG por capas hasta que llegue el arte).

### Invitar a amigos y partida en la nube ✅
Ambas usan una **cuenta anónima** que se crea sola al terminar el tutorial (sin email ni datos personales): el servidor da un id y una clave secreta (se guardan con la partida), un **código de invitación** público de 6 caracteres y una **clave de recuperación** privada (`XXXX-XXXX-XXXX`). Migración 0014 y Edge Function `account`.
- **Invitar** (menú → «Invita a amigos»): tu código, botón para compartir (enlace a la beta con `?ref=CÓDIGO`, que lo aplica solo) y cuántos amigos van. El amigo recibe al momento **50 💎 y un maletín**; tú, **100 💎 y un maletín** por cada amigo que abre su segundo negocio (hasta 10). Solo premios del juego.
- **Contra abusos:** un código por persona y solo en sus primeros 7 días; no vale el propio ni el de alguien con la misma conexión; el amigo cuenta solo si su cuenta tiene más de 15 min; máximo de altas por IP y día.
- **Nube** (Ajustes → «Partida en la nube»): la partida firmada se sube sola cada 5 min y al salir. Con la clave de recuperación se recupera en otro móvil (se comprueba la firma; la clave secreta anterior deja de valer). Límites ajustables en `league_config`.

### Eventos de temporada: Halloween ✅
Del **24 de octubre al 1 de noviembre** (calendario local, con la hora del juego). Botón 🎃 en el lateral mientras dura y calabazas en las plazas de la ciudad.
- **Fantasmas 👻:** aparecen cada 1–2 min mientras juegas y se van a los 20 s. Al tocarlos dan 5–10 **caramelos 🍬**, **x3 con un anuncio** (`season_x3`). Las ventas también dan 1 caramelo cada 50.
- **Tienda de Halloween:** 5 objetos de «Mi vida» que **solo se consiguen esas fechas** (disfraz de vampiro 150 🍬, anillo de calavera 80, coche fúnebre 250, mansión encantada 400 y calabaza mascota 100; dan prestigio pero no cuentan para completar colecciones), más 30 💎 por 60 🍬 (5 veces) y un maletín de oro por 150 🍬 (3 veces).
- **Caducan:** los caramelos desaparecen al acabar (los objetos comprados se quedan para siempre).
- Con ~250 caramelos por hora de juego activo sin anuncios, todo pide unas 6–7 horas en 9 días; con anuncios, la mitad.
- Es genérico (`SEASONS` en `src/game/season.ts`): para Navidad basta con añadir fechas, moneda, visitante y objetos.

### Rangos de los puestos: mejoras que se ven ✅
Cada parte de la cadena (cada puesto, el transporte y la venta) sube de **rango** al llegar a los hitos que ya duplican su rendimiento: **🥉 bronce (nivel 10), 🥈 plata (25), 🥇 oro (50), 💎 diamante (100) y 👑 leyenda (200)**. Es para todos los negocios de todas las ciudades y no cambia ningún número: es la recompensa visual de llegar al hito.
- **En el recinto:** pedestal con el borde del color del rango (desde plata, también el centro), brillo que late bajo el puesto (desde oro), destellos de vez en cuando (diamante y leyenda) y una medalla junto al nivel. El transporte y la venta llevan un aro del color en el suelo.
- **Arte por rango (Codex):** cada puesto, trabajador y vehículo puede tener su versión `_r1`…`_r5` (ver [`ART.md`](ART.md), «Rangos»). El juego la usa sola en cuanto existe.
- **Al ascender:** aro y destellos del color en la escena, y una banda dorada (bronce y plata) o una celebración a pantalla completa (oro, diamante y leyenda) con el siguiente rango como objetivo. Sale una sola vez, venga la mejora del panel, del Imperio o de «Máx» (`watchRanks` en `main.ts`).
- **Panel del puesto:** las 5 medallas con el nivel de cada una (las conseguidas, en color) y «Nivel 50: rango Oro y rendimiento x2 (te faltan 7)». En la barra de la cadena, la medalla junto al nivel (en Producción, la del puesto con menos rango).
- **Decoración del recinto por categoría:** con ★★ aparecen jardineras y farolas junto al camino; con ★★★, alfombra roja con borde dorado desde el portón y guirnaldas de luces sobre los puestos. El almacén y el restaurante tienen sala propia y de momento no la llevan. Codex puede añadir `decor_<negocio>_2/_3`.
- Lógica en `src/game/ranks.ts` (tests en `tests/ranks.test.ts`) y efectos en `src/scenes/rankFx.ts`.

### Retención (fase 2 ✅)
- **Tutorial guiado** de 6 pasos, con premio en diamantes al terminar. En cada paso solo se señala lo que hay que tocar: mano, aro dorado en el suelo y cartel con el nombre (Carretilla, Furgonetas). Las etiquetas de la barra de la cadena no aparecen hasta el paso 4.
- **Panel Imperio** (tocar el centro de la barra inferior): todos los negocios de la ciudad con sus €/s, atasco y gerentes que faltan, y un botón para ir a cada uno.
- **Avisos en el móvil:** caja llena, maletín gratis y premio diario. Se programan al salir de la app, nunca de noche, y se pueden desactivar en Ajustes.
- **Edificios que crecen:** ★★ con 3 puestos y ★★★ con 6. Se celebra y el edificio cambia de imagen (si existe `bld_<id>_2/_3`).
- **3 misiones diarias** elegidas al azar cada día, con un premio extra por completar las tres.
- **Premio diario** con racha de 7 días (diamantes, dinero, maletines). Se puede duplicar viendo un anuncio. Si te saltas un día, la racha vuelve a empezar.
- **13 logros** con diamantes.
- **Evento del fin de semana** (`src/game/event.ts`): de viernes 00:00 a lunes 00:00, hora del móvil. Jugar da puntos y con ellos se desbloquean **10 premios**: diamantes, horas de ingresos, maletines y, al final, un maletín de oro.
  - **Puntos:** 1 por cada 10 ventas, 1 por nivel de mejora, 15 por gerente, 25 por puesto y 10 por maletín o por habilidad.
  - **Tema semanal:** rota entre tres (Black Friday del reparto, Semana de reformas y Feria del talento), y cada uno hace valer el doble un tipo de acción.
  - **Anuncio:** «Puntos x2 durante 30 min», acumulable hasta 2 h.
  - **Ritmo:** calibrado con el bot en unos 800 puntos por hora de juego activo. El primer premio llega en unos minutos y el último pide unas 3 horas de juego en el fin de semana.
  - **Cobro:** los premios se pueden cobrar hasta que empieza el siguiente evento.
  - **Avisos:** uno al empezar (viernes 9:30) y otro el domingo a las 18:00 si quedan premios.
  - **Liga:** no da puntos de Liga.
- **Más adelante:** eventos de temporada de 7 días con su propia ciudad (fase 3) y avatar u oficina personalizables.

### Liga Millonario (fase 0 en marcha)
Torneo **semanal** gratuito con premios reales, pensado como gancho principal para atraer jugadores. El diseño completo está en [`LIGA.md`](LIGA.md):
- **Liga por esfuerzo:** cada lunes todos empiezan a 0 y gana quien más juega esa semana.
  - **Puntos:** tiempo de juego activo, entrar cada día y misiones diarias. Nada que dependa del tamaño del imperio, así que llevar más tiempo en el juego no da ventaja.
  - **Horas:** 3 h al día a puntos completos, de 3 a 6 h a la mitad, y más de 6 h no suman.
  - **Anuncios y compras:** no dan puntos, y el tiempo viendo un anuncio no cuenta.
- **Premios del 1.º al 10.º:** dinero para los 3 primeros que pueden cobrarlo y diamantes para todos.
  - **Descanso:** quien gana dinero descansa una semana.
  - **Muro de la fama:** con los ganadores de cada semana.
- **Bote** = el mayor de un mínimo garantizado (50 €/semana, lo pone el dueño) o el 10 % de los ingresos de la semana anterior.
- Validación en el servidor (Supabase), mayores de 18, bases legales en la app y revisión de un asesor antes de dar dinero.

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

**Escalera diaria de anuncios** (`src/game/adLadder.ts`): al ver 3, 6 y 10 anuncios en el día se ganan un maletín, 40 💎 y un maletín de oro. El menú muestra cuántos llevas y cuál es el siguiente premio. Solo da premios del juego: nunca puntos de Liga ni nada de valor real (política de AdMob).

**Visitas y ruleta** (`src/game/offers.ts`): el camión de suministros y el cliente VIP llegan solos al negocio que estás viendo (después del tutorial, nunca a la vez que el 💸 viral) y se van a los 30 s. La ruleta diaria está en el menú, con aviso cuando hay giro gratis. Ninguno da puntos de Liga.

**Retos del día y de la semana** (`src/game/challenges.ts`): iguales para todos, dan diamantes y puntos de Liga. Los retos que se aceleran directamente con anuncios (maletines gratis, habilidades, evento) no se usan en la Liga.

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
| `gold_lock` | Contrato de oro en Dubái: fija el precio máximo (ventas x3) durante 4 min | 3 ✅ |
| `lux_trial` | «Mi vida»: probar un objeto 1 hora, con su bonus (5 al día) | 4 ✅ |
| `lux_deal` | «Mi vida»: oferta del día a mitad de precio | 4 ✅ |
| `season_x3` | Halloween: triple de caramelos del fantasma | 4 ✅ |
| `order_x2` | Almacén: doble premio del pedido urgente | 4 ✅ |
| `critic_now` | Restaurante: atender al crítico al momento | 4 ✅ |
| `hype_collab` | TikTok: directo viral al momento (cada 10 min) | 4 ✅ |
| `supply_truck` | Camión de suministros: llega al negocio que estás viendo cada 5–9 min y trae lo que vende en 15 min a pleno rendimiento | 4 ✅ |
| `vip_client` | Cliente VIP: cada 7–13 min, paga 10 💎 (4 al día como máximo) | 4 ✅ |
| `wheel_spin` | Ruleta diaria: un giro gratis al día y 3 más con anuncio (dinero, diamantes o maletines) | 4 ✅ |

Más adelante: compras dentro de la app (packs de diamantes y "sin anuncios + x2 permanente").

## Hoja de ruta

| Fase | Contenido |
| --- | --- |
| **1. Núcleo jugable** ✅ | Motor Phaser, ciudad isométrica con 4 negocios, recintos con puestos animados, gerentes básicos, mejoras, offline, anuncios, bolsa, guardado, arte sustituible |
| **2. Retención** | ✅ 💎, ejecutivos con rareza y habilidades, maletines, misiones diarias, premio diario, logros, tutorial guiado · ✅ sonido, música, vibración y ajustes · Pendiente: Liga Millonario (servidor) |
| **3. Contenido** | ✅ Expansión mundial: Miami, Dubái (precio del oro y carrera de fundadores), estrellas y Oficina central · Pendiente: más ciudades, eventos de temporada, avatar |
| **4. Lanzamiento** | Arte profesional (sprites), analítica, tiendas, compras dentro de la app, SSV de AdMob |
