# Diseño: «De rider a millonario» y la vista en ruta

Estado: **aprobado por Carlos el 5 de octubre de 2026**, con pedalear y el resto según las recomendaciones. Primera versión jugable con arte provisional en el reparto en bici y en el almacén (`src/scenes/RouteScene.ts`). El arte está encargado en `ART.md`.

## La idea en una frase
Empiezas repartiendo en bici. Cada negocio es una **ruta** que baja por la pantalla: tus puestos son las paradas y tu transporte la recorre recogiendo hasta la sede, donde se vende. Es tan simple como Idle Miner, pero con mundo propio.

## Reglas de simplicidad (no se negocian)
Lo que hace cómodo a Idle Miner y que mantenemos tal cual:
1. **Un solo eje de movimiento.** Solo vertical, con el dedo. Sin zoom ni desplazamiento lateral.
2. **Una parada = una franja de pantalla.** Cada puesto ocupa el ancho del móvil, con aire alrededor. Nunca se tocan dos puestos.
3. **Siempre lo mismo en el mismo sitio.** En cada parada:
   - encargado a la izquierda;
   - producto junto a la ruta;
   - trabajador y puesto en el centro;
   - botón **«Nivel»** grande a la derecha.

   Nada más fijo en pantalla.
4. **Tres decisiones y ya está:** tocar lo que está parado, mejorar lo que frena (el botón se pone naranja) y abrir la siguiente parada.
5. **Cada toque tiene premio a la vista:** monedas que vuelan, un rebote, un número que sube.
6. **Lo especial aparece y se va.** La mecánica de cada negocio (crítico, pedido urgente, hype…) sale sobre la ruta solo cuando hay algo que hacer.
7. **Misma lógica en los 15 negocios.** Lo que aprendes en el primero vale para todos. Solo cambian el mundo, el transporte y la mecánica propia.

## Cómo se ve una pantalla de negocio
- **Arriba:** la sede grande (la que crece ★/★★/★★★), con la venta en su puerta y su botón «Nivel».
- **Debajo, una ruta que serpentea** hacia abajo:
  - en cada curva hay una parada (puesto), una por franja;
  - las curvas alternan izquierda y derecha, así que la ruta tiene forma propia y no es una columna;
  - el botón «Nivel» queda siempre a la derecha, sin importar hacia dónde gire la ruta.
- **El transporte** baja por la ruta tomando las curvas, se para en cada puesto a cargar y sube a la sede.
- **La siguiente parada** está en obras, al final de la ruta, con «Abrir · precio». Al abrirla, la ruta crece hacia abajo.
- **El fondo** no compite con lo importante: una tira lateral con el barrio de cada negocio, apagada.

Por dentro es la misma economía que ahora: transporte con `pos` de 0 (sede) a k (parada k), producción, venta y encargados. Solo cambia cómo se dibuja.

## El nuevo primer negocio: «Reparto en bici»

| | |
| --- | --- |
| Puestos (paradas) | Restaurantes del barrio que te dan pedidos: hamburguesería, pizzería, sushi, kebab… (hasta 8) |
| Transporte | **Tú, en bici** (el rider de la gorra verde). Recoges en cada restaurante |
| Venta | La entrega: clientes en sus portales; el dinero son las propinas y los pagos |
| Mecánica propia | **Pedalear:** mientras mantienes pulsado sobre el rider, va más rápido. Es el único toque activo del juego, sirve de tutorial y desaparece al contratar encargado |
| Duración | Corta: 5–8 minutos hasta poder comprar el almacén |

**Historia del principio:**
1. Repartes en bici para otros.
2. Ahorras.
3. Te compras el almacén de dropshipping («tu primer negocio de verdad»).
4. Llegan el restaurante, TikTok e IA.
5. Miami.
6. Dubái.

El tutorial actual (tocar el puesto, el transporte y la venta, mejorar, contratar y abrir) se pasa al reparto, con frases de rider.

**Economía:**
- **Se añade un negocio** con precio 0, y el almacén pasa a costar lo que se gana en esos 5–8 minutos.
- **Se reajusta con el simulador:** la llegada al restaurante, a TikTok y a Miami tiene que quedar donde está ahora, y los tests de ritmo lo comprueban.
- **Partidas antiguas:** reciben el reparto ya completado y no pierden nada (`tests/migration.test.ts`).

## Cada negocio, su mundo
Misma ruta y mismas reglas; cambian el camino, quién lo recorre y su mecánica propia (ya programada).

| Ciudad | Negocio | La ruta es… | Transporte | Mecánica propia |
| --- | --- | --- | --- | --- |
| Madrid | Reparto en bici (nuevo) | calles con pasos de cebra | rider en bici | pedalear |
| Madrid | Almacén | cinta transportadora entre estanterías | carretilla | pedidos urgentes |
| Madrid | Restaurante | pasillo entre mesas | camarero | crítico gastronómico |
| Madrid | Estudio de TikTok | cables y focos de plató | ayudante | hype en directo |
| Madrid | Agencia de IA | cableado de servidores | técnico | investigación |
| Miami | Food trucks | paseo marítimo | patinador | foodie famoso |
| Miami | Club de playa | pasarela de madera en la arena | camarero | ambiente (DJ) |
| Miami | Yates | muelle | lancha | excursión urgente |
| Miami | Inmobiliaria | calle de chalets | agente en coche | cliente con prisa |
| Miami | Cripto | fibra óptica | bot | minería |
| Dubái | Superdeportivos | circuito | grúa | encargo VIP |
| Dubái | Hotel | pasillo de moqueta | botones | inspector |
| Dubái | Safari | pista de arena | 4×4 | foto del safari |
| Dubái | Zoco | callejuela | porteador | joya a medida |
| Dubái | Rascacielos | andamio | grúa | ingeniería |

## Qué se reutiliza y qué hay que pedir a ChatGPT
**Ya existe** y se reutiliza:
- puestos y trabajadores de los 14 negocios, con sus rangos;
- transportes y vehículos;
- sedes ★/★★/★★★;
- barrios (`district_*`);
- piezas de las mecánicas;
- iconos.

**Arte nuevo:**
1. **Rider en bici:** quieto y pedaleando (3 poses), con la caja de reparto. Es el mismo personaje de la web.
2. **Reparto en bici:** 8 restaurantes pequeños (fachadas de 180×150) y una sede, el «punto de recogida» (★/★★/★★★).
3. **Tramos de ruta por negocio:** recto, curva a la izquierda, curva a la derecha y parada, unos 390×150 cada uno. Es la pieza clave: 15 juegos de 4 tramos. Se puede empezar por los 5 de Madrid.
4. **Botón «Nivel»** como imagen, en 3 estados: normal, puedes mejorar y atasco.
5. **Tira lateral de barrio** por negocio, apagada (se pueden recortar los `district_*` actuales).

## Orden de trabajo propuesto
1. **Claude:**
   - vista en ruta con arte provisional (la del prototipo de plantas, con la ruta en zigzag) en el almacén, para que Carlos la pruebe;
   - negocio «Reparto en bici» con su economía y el tutorial nuevo;
   - ritmo comprobado con el simulador.
2. **ChatGPT/Codex:**
   - rider, restaurantes y tramos de ruta de Madrid;
   - después Miami y Dubái.
3. **Claude:** extender la vista en ruta a todos los negocios a medida que llega el arte. Quitar el recinto isométrico (`BusinessScene`) cuando ya no lo use nadie.

## Preguntas para Carlos
- **Pedalear:** ¿te gusta como toque activo del reparto, o prefieres que también sea idle puro?
- **Restaurantes del reparto:** ¿hamburguesería, pizzería, sushi, kebab, tacos, poke, panadería y heladería? ¿Cambiarías alguno?
- **Orden de la ruta:** ¿crece hacia abajo como en Idle Miner o hacia arriba (subiendo hacia el éxito)? Recomiendo hacia abajo, porque se lee más natural al desplazar.
