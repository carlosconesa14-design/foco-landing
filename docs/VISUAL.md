# Biblia visual de Rider Millionaire (encargo completo para ChatGPT/Codex)

**Versión 1, 5 de octubre de 2026.** Este documento sustituye a todos los encargos visuales anteriores de `ART.md`. Ese archivo queda como histórico y como catálogo de claves ya entregadas.

**Para ChatGPT/Codex:** eres **responsable de todo lo visual del juego**. No es solo hacer sprites sueltos: tu trabajo es que **cada pantalla** quede terminada, bonita y única. Incluye el arte, la composición, las animaciones, la interfaz HTML/CSS y el código de dibujo de las escenas.

**Claude** se encarga de la lógica: economía, partida, servidor, datos y los «modelos de vista» que te dicen qué mostrar.

Referencia de calidad y estructura: **Idle Miner Tycoon**. Toma de ese juego su orden, su legibilidad y su sensación de recompensa, y dale la identidad propia que se describe aquí. No copies su arte, sus personajes, su mina ni su ascensor.

---

## 0. Frontera lógica / visual (léelo primero)

| | Claude (lógica) | ChatGPT/Codex (visual) |
| --- | --- | --- |
| Archivos | `src/game/*`, `src/view/businessView.ts`, `src/platform/*`, `supabase/*`, `tests/*` (salvo capturas) | `src/scenes/*`, `src/ui/*` (marcado y presentación), `src/styles.css`, `index.html`, `src/art/*`, `src/view/screens.ts`, `public/sprites`, `public/audio`, `site/` (landing) |
| Qué decide | Números, reglas, qué se puede hacer, textos de contenido (nombres, misiones…) | Cómo se ve, dónde está cada cosa, cómo se anima y cómo responde al toque |
| Cómo se comunican | **Modelos de vista** (`businessView()` y los datos de cada panel), sin cambiar la partida | **Bridge** (`tapStation`, `openStation`, `openUnlockFloor`…) y las funciones de acción que ya usan los paneles |

**Reglas:**
- La escena **solo lee** el modelo de vista y **solo cambia la partida a través del Bridge**. Nunca toca `state` directamente.
- Si necesitas un dato que no está en el modelo de vista (por ejemplo, «cuánto falta para el siguiente rango»), **apúntalo en la sección 13 de este documento («Peticiones a Claude»)** y usa un respaldo mientras tanto. No lo calcules tú en la escena.
- Textos siempre con `t()`, y su traducción en `src/i18n/en.ts`. Los nombres de negocios y paradas vienen de los datos (`floorLabel`, `def.name`…).
- `npm test` y `npm run build` sin errores. Prueba a 390×844 en español e inglés, con «reducir movimiento» activado y desactivado.

**Ya preparado por Claude para ti:**
- `src/view/businessView.ts`: todo lo que una pantalla de negocio necesita, con tests.
- `src/view/screens.ts`: **tu fichero**. Tiene una ficha por negocio con paleta, claves de arte, tipo de transporte y ambiente. Hoy lleva valores provisionales para que lo rellenes.
- `src/scenes/RouteScene.ts`: la pantalla de negocio con **arte provisional**. Puedes rehacer todo su dibujo, siempre que respetes la estructura (§3) y la frontera.

---

## 1. Dirección de arte

**Qué tomamos de Idle Miner:**
- **Legibilidad absoluta en el móvil.** Personajes grandes (al menos 1/6 del ancho de la pantalla), contornos gruesos y números grandes.
- **Una estructura que se repite.** Cada parada es igual de forma y distinta de contenido.
- **Botones con volumen:** sombra inferior, brillo arriba y estado «se puede» muy evidente (flecha verde que late).
- **Todo responde:** al tocar hay rebote, monedas volando al contador, destello al subir de nivel y celebración en los hitos.
- **Interfaz con marco propio:** paneles con borde grueso, cabecera de color y cierre ✕ rojo. No usar tarjetas planas genéricas.

**Lo que nos hace distintos:**
- **Tema:** de repartidor a millonario, con negocios reales y reconocibles (reparto, almacén, restaurante, TikTok, IA, Miami, Dubái).
- **La ruta:** el camino serpenteante que recorre el transporte. Es la firma visual del juego.
- **El protagonista:** el rider de la gorra verde, que aparece en la pantalla de carga, en el icono, en «Mi vida» y en el primer negocio.
- **Cada negocio es un mundo distinto** (§4), no un cambio de color.

**Estilo:**
- Juguete 3D pulido (*toy 3D*), contorno azul marino `#0b2440`, luz cálida desde arriba a la izquierda y colores saturados pero no chillones.
- Arte original, **sin marcas ni logotipos reales**.

**Paleta global de interfaz:**
- Marino `#0b2440` / `#14202f` para fondos de interfaz.
- Oro `#ffd36b` / `#f5c542` para dinero y premios.
- Verde `#3ddc97` para «se puede» y ganar.
- Azul `#2f80d1` para el botón de nivel.
- Naranja `#e08a2e` para el atasco.
- Rojo `#e0533d` para cerrar, alertas y viral.
- Diamante `#6fe3ff`.

**Tipografía** (ya cargada): **Lilita One** para cifras y títulos y **Rubik** para el texto. Las cifras grandes llevan siempre trazo marino.

**Kit de interfaz** (entregar como piezas reutilizables, en PNG o CSS):
- **Botones:** primario (verde), secundario (azul), oro (premio) y peligro (rojo), cada uno en normal, pulsado y desactivado.
- **Botón «Nivel»:** `btn_level`, en reposo, se puede y atasco (§3.4).
- **Paneles:** marco de panel y modal con cabecera de color por tipo (mejora, tienda, liga, eventos…) y cierre ✕.
- **Pestañas, barras de progreso, insignias, chips y contadores:** dinero, diamantes, ingresos por segundo y temporizador.
- **Iconos propios para todo:** sin emoji del sistema en la interfaz final. La lista está en §9.
- **Marcos de retrato:** gerente y ejecutivo, uno por rareza.

---

## 2. Mapa de pantallas

```
Carga ─► Negocio (pantalla principal) ◄─► Ciudad ◄─► Mundo
              │                              │
              ├─ panel de mejora (por parte)  ├─ comprar negocio
              ├─ abrir parada                 └─ Oficina central / Imperio
              ├─ mecánica propia (tarjeta)
              └─ menú: misiones, diario, ejecutivos, logros, tienda, Mi vida,
                 liga, evento/temporada, bolsa, invitar, nube, ajustes, opinión
```

El jugador pasa el **90 % del tiempo en la pantalla de negocio**. Es la que tiene que ser espectacular.

---

## 3. La pantalla de negocio (estructura común a los 15)

Ancho de diseño: **390 px lógicos**. El canvas va a doble resolución, así que el arte se entrega al doble (780 px de ancho).

### 3.1 Zonas, de arriba abajo
| Zona | Alto | Contenido |
| --- | --- | --- |
| Cabecera (HTML) | ~100 | Dinero, diamantes, ingresos por segundo, ×2, objetivo actual y botones Misiones/Menú (§7) |
| **Calle y sede** | 280 | Cielo y fondo de la ciudad (`street_<negocio>`), **la sede** (lo más grande de la pantalla, en su versión ★/★★/★★★), la **venta** en la calle (vehículo o personaje que sale por la derecha y vuelve), el **montón de producto** en la puerta, los dos botones «Nivel» de transporte (izquierda) y venta (derecha) y la pieza de la mecánica propia cuando aparece |
| **Ruta con paradas** | 172 por parada | Fondo de franja (`band_<negocio>`), la **ruta** en zigzag y, en el tramo horizontal de cada franja, **una parada** (§3.3) |
| Siguiente parada | 172 | En obras, con su nombre y «Abrir · precio» |
| Barra inferior (HTML) | ~150 | Cadena (Producción · Transporte · Venta), navegación y «Hora punta» (§7) |

Solo se desplaza **en vertical**. Las zonas HTML flotan encima: deja aire para que nada importante quede debajo de los botones flotantes de la derecha (⚡ mejorar todo, viral).

### 3.2 La ruta
- **Recorrido:** baja por un lado, cruza la franja por el centro (donde está la parada) y baja por el otro, alternando izquierda y derecha. La geometría está en `RouteScene.buildPath()`: x izquierda = 34, x derecha = ancho − 112, parada en el centro.
- **Ancho:** 30 px.
- **Piezas por negocio:** tramo horizontal, tramo vertical, 4 curvas, ensanche de parada, tramo no construido (fantasma) y fin en obras (`route_<negocio>_*`).
- **Tramos construidos y por construir:** los construidos se ven completos; los no construidos, fantasma al 35 % o con un andamio.
- **Detalle animado propio de cada ruta:** rodillos que giran, olas, luces que recorren la fibra óptica… Siempre con `calmWorld()`.

### 3.3 Una parada (lo que se repite 8 veces)
Siempre en el mismo sitio:
- **Arriba a la izquierda:** marco del **gerente** (vacío y apagado si no hay; con retrato si lo hay) y **nombre de la parada** (`stop.name`).
- **Centro:** el **puesto** (unos 104×80) y el **trabajador** grande a su izquierda, que se anima cuando `stop.working`.
- **Junto a la ruta, a la derecha del puesto:** el **montón de producto** (`stop.pile`, de 0 a 6 piezas) y la cifra `stop.stock`.
- **Bajo la ruta:** la **barra de producción** (`stop.progress`).
- **A la derecha:** el **botón «Nivel»** (§3.4), con la **medalla de rango** encima a la izquierda.
- **Mano del tutorial** cuando `stop.hint`.

Cada parada de un negocio es **un local o una variante distinta**: los 8 nombres están en los datos, por ejemplo «Hamburguesería…» o «Juguetes, Móviles…». Si `screens.ts` marca `stationPerStop`, el puesto de la parada `i` es `st_<negocio>_<i>`. Si no, se usa uno común con 8 decorados distintos.

**Rangos:** al alcanzar `stop.rank` de 1 a 5 (bronce a leyenda), el puesto y el trabajador cambian a su versión `_r1`…`_r5`, con cambios **de estructura** y no solo de color. Al ascender sale una explosión de rango (`rankBurst`, se puede rehacer).

### 3.4 El botón «Nivel»
Es **el botón más importante del juego**: 70×56, con número grande.
- `idle`: azul apagado.
- `ready`: azul vivo y flecha verde ▲ que late.
- `bottleneck`: naranja, para la parte que frena la cadena.

Al tocarlo se abre el **panel de mejora** (§8.1). Al subir de nivel: rebote, destellos y el número sube con animación.

### 3.5 Transporte y venta
- **El transporte recorre la ruta** según `transport.pos`, que va de 0 en la sede a k en la parada k−1:
  - mirando a la dirección de marcha;
  - animado al moverse y quieto en `idle`;
  - cargando con una pausa visible en `load`/`unload`;
  - con lo que lleva (`carry`) visible encima.
- **Si es vehículo** (`screens.ts`: `mover`), necesita **vistas de frente y de espaldas** (§10.4). Hoy solo hay de frente.
- **Si es «bike»** (reparto), es el rider en bici. Al mantener pulsado, pedalea: pose `fast`, rayas de velocidad y gotas. Además lleva el aviso «¡Mantén pulsado para pedalear!» en el tutorial.
- **La venta** sale de la puerta de la sede hacia la derecha y vuelve (`sale.phase`, `sale.progress`). Al cobrar, las **monedas vuelan al contador**. En las ventas virales hay lluvia de monedas, sacudida y un rótulo dorado.

### 3.6 Lo que ya hace la escena y debe seguir haciendo
- Mano del tutorial en lo que toca.
- Producto que vuela del puesto al montón y del transporte a la sede.
- Monedas al vender.
- Celebración de rango, de sede nueva («¡Nueva sede!») y de puesto nuevo («¡Puesto nuevo!»).
- Visitantes con oferta (camión de suministros, cliente VIP), a través de `WorldVisitor`.
- Pieza física de la mecánica propia (`TwistWorld`).
- Recuerda la posición de desplazamiento de cada negocio.

---

## 4. Los 15 mundos (qué hace única a cada pantalla)

Para **cada negocio** hay que entregar el juego completo:
- **Calle superior:** `street_<id>`, 780×560.
- **Sede ★/★★/★★★:** `bld_<id>_1..3`. Ya existen, pero hay que rehacerlas más grandes y con más detalle para esta vista: hasta 340×300 lógicos.
- **Fondo de franja:** `band_<id>`, 780×344, que se repite en vertical.
- **Tramos de ruta:** `route_<id>_*`.
- **8 puestos:** `st_<id>_0..7`, o uno con 8 decorados, más sus rangos `_r1.._r5`.
- **Trabajador:** 3 poses y sus rangos.
- **Transporte:** frente y espaldas, más poses.
- **Venta:** poses o vehículo.
- **Producto:** `item_*`.
- **Pieza de la mecánica propia:** ya existe; integrarla en la calle.
- **Ambiente animado:** 2–3 detalles.
- **Su propia música** (opcional, `public/audio`).

| Negocio | Concepto y calle superior | La ruta es… | Fondo de franja | Las 8 paradas | Transporte | Venta | Ambiente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Reparto en bici** (`bike`) | Barrio madrileño de mañana: portal con bicis y mochilas (★), local de riders (★★), central de reparto con motos (★★★) | Asfalto con pasos de cebra y alcantarillas | Acera con alcorques, árboles y bancos | Hamburguesería, pizzería, sushi, kebab, tacos, poke, panadería, heladería (cada una con su fachada y su cocinero) | **El rider en bici** (protagonista) | Clientes en sus portales que recogen la bolsa | Palomas, toldos al viento, tráfico |
| **Almacén** (`dropship`) | Polígono industrial: nave pequeña, nave con muelles, centro logístico con camiones | Cinta transportadora con rodillos que giran | Suelo de nave con líneas amarillas y palés | Juguetes, móviles, ropa, hogar, belleza, deporte, gaming, lujo (estanterías con su producto) | Carretilla elevadora | Furgonetas de reparto | Camiones, luces de nave, cajas en la cinta |
| **Restaurante** | Calle del centro al atardecer: tasca, restaurante con terraza, restaurante de lujo con estrella | Pasillo de baldosa entre mesas | Comedor con mesas y clientes | Pastas, pizzas, parrilla, arroces, tapas, postres, marisco, menú degustación (cocinas distintas) | Camareros con bandeja | Repartidores en moto | Vapor, clientes comiendo, guirnaldas |
| **Estudio de TikTok** | Barrio creativo de noche: piso con aro de luz, estudio, edificio de creadores con neones | Cables y cinta de plató en el suelo | Plató con focos y fondos de color | Bailes, recetas, bromas, gaming, belleza, viajes, deportes, directo 24 h (sets distintos) | Editores con portátil | Marcas que pagan | Corazones flotando, focos que barren |
| **Agencia de IA** | Parque tecnológico nocturno: oficina, campus, torre con cúpula de servidores | Canaleta de cableado con pulsos de luz | Suelo técnico con baldosas elevadas | Chatbots, visión, voz, traducción, código, medicina, finanzas, robótica (racks y robots distintos) | Técnicos | Comerciales | Pulsos de datos y LED parpadeando |
| **Food trucks** (Miami) | Paseo marítimo soleado | Tablas del paseo | Arena y palmeras | Tacos, burritos, batidos, perritos, arepas, helados, hamburguesas, poke (camiones distintos) | Patinadores | Puestos de playa | Gaviotas, olas, sombrillas |
| **Club de playa** | Atardecer en la playa: chiringuito, club, beach club de lujo | Pasarela de madera sobre la arena | Tumbonas y arena | Mojitos, piña colada, daiquiri, margarita, sangría, sin alcohol, champán, barra VIP | Camareros | Relaciones públicas | Cabina de DJ, palmeras, luces |
| **Alquiler de yates** | Puerto deportivo | Muelle de madera sobre agua | Agua con reflejos | Lancha, velero, catamarán, yate, yate de fiesta, megayate, submarino, superyate | Marineros | Agentes de viaje | Olas, barcos que pasan, gaviotas |
| **Inmobiliaria** | Urbanización de chalets | Calle residencial | Césped con aspersores | Estudio, apartamento, ático, casa, chalet, villa, mansión, isla privada (maquetas o fachadas) | Administrativos | Agentes en coche | Aspersores, carteles de «Vendido» |
| **Exchange cripto** | Distrito financiero de noche | Fibra óptica luminosa | Sala de *trading* con pantallas | Monederos, minería, exchange, coleccionables, *staking*, finanzas abiertas, metaverso, banco digital (sin logotipos reales) | Técnicos | *Traders* | Gráficas que suben, monedas holográficas |
| **Superdeportivos** (Dubái) | Avenida de concesionarios | Circuito con pianos rojos y blancos | Exposición pulida | Compactos, deportivos, descapotables, clásicos, eléctricos, superdeportivos, hiperdeportivos, edición única (coches en pedestal) | Grúa plataforma | Aparcacoches | Banderas a cuadros, brillo de carrocería |
| **Hotel de lujo** | Fachada del hotel con fuentes | Moqueta roja con remates dorados | Vestíbulo de mármol | Recepción, habitaciones, suites, spa, piscina, restaurante, ático, suite real | Carrito de equipaje | Aparcacoches | Fuentes, huéspedes, botones |
| **Safari** | Desierto al atardecer | Pista de arena con huellas | Dunas | Camellos, dunas, halcones, oasis, campamento, globo, quads, noche estrellada | 4×4 | Guías | Camellos, polvo y calima |
| **Zoco del oro** | Medina con faroles | Callejuela empedrada | Toldos y puestos | Especias, alfombras, lámparas, perfumes, telas, oro, perlas, diamantes | Porteadores | Furgoneta dorada | Faroles, gente paseando |
| **Rascacielos** | Obra con el skyline detrás | Andamio y tablones | Estructura de vigas | Cimientos, estructura, fachada, ascensores, oficinas, hotel, mirador, aguja (fases de obra) | Grúa | Inversores | Grúas que giran, chispas de soldadura |

**Variedad entre ciudades:**
- **Madrid:** tonos cálidos, teja y ladrillo.
- **Miami:** coral, turquesa y *art déco*.
- **Dubái:** crema, oro y cristal.

**Día y noche:** opcional pero muy deseable. La calle superior y el cielo cambian con la hora real; las ventanas y farolas se encienden de noche.

---

## 5. Ciudad (mapa isométrico)

Pantalla de paso entre negocios (`CityScene`, `Neighborhood.ts`). Mantener la isometría actual y mejorarla:
- **Parcelas de negocio:** sede, nombre, estrellas e ingresos por segundo. **Comprables**, con cartel y precio; **en obras**, con «Próximamente».
- **Más vida:** el coche del jugador con su cartel «Tú», peatones, tráfico (que necesita las vistas de espaldas, §10.4), barcos en Miami y camellos en Dubái.
- **Entrada y salida:** al entrar en un negocio, transición con zoom a la sede. Al volver, la cámara se aleja.
- **Límites:** que se vea el fin del mapa con elegancia (mar, desierto o barrio difuminado).
- **Celebraciones:** sede nueva, negocio comprado y ciudad completada.

## 6. Mundo y viaje
`worldPanels.ts` (mapa del mundo) y la Oficina central.
- **Mapa ilustrado:** España, Florida y Emiratos con sus ciudades, y Tokio como «Próximamente». Cada ciudad muestra su progreso, los fundadores y su estado (bloqueada, actual o completada).
- **Viaje:** animación de avión al expandirse a otra ciudad, con su celebración.
- **Oficina central:** pantalla propia, un despacho que mejora con las estrellas de franquicia y con mejoras permanentes en forma de muebles o placas.

## 7. Interfaz fija (HUD)
- **Cabecera:**
  - dinero con su icono propio de moneda;
  - diamantes;
  - ingresos por segundo;
  - ×2 de impulso con temporizador.
  Todo en una fila.
- **Objetivo actual:** barra con icono, texto y progreso. Al completarse, destello y recompensa.
- **Botones del lado derecho:** Misiones y Menú, con insignias, más los botones de evento o temporada cuando estén activos.
- **Menú:** pantalla o cajón con iconos grandes y candado si la función está bloqueada (`unlockUi.ts`: candado con «se desbloquea al…»).
- **Barra inferior:**
  - **cadena** con 3 tarjetas (Producción, Transporte, Venta), con nivel, ingresos por segundo y la etiqueta «Atasco» o «Mejorar»;
  - **navegación** (Ciudad o Bolsa, nombre del negocio o ciudad, Mundo);
  - **«Hora punta x3»** (anuncio).

  Hay que **rediseñarla con el kit**: hoy está cargada.
- **Flotantes:**
  - ⚡ mejorar todo, con su contador;
  - viral;
  - tarjeta de la mecánica propia (aparece y se va);
  - tarjetas de ola de turistas (Miami) y precio del oro (Dubái).

  Que nunca tapen el botón «Nivel» de la parada visible (deja una columna libre o colócalas en la zona de la barra).
- **Visitantes con oferta:** el camión y el cliente VIP.

## 8. Paneles y modales (cada uno con su cabecera de color e iconos propios)

### 8.1 Mejora de una parte (el más usado; estilo Idle Miner)
- **Cabecera:** retrato del trabajador o transporte, nombre, «Nivel X» y medalla de rango con su barra hasta el siguiente.
- **Tabla de estadísticas:** valor actual → siguiente, con la diferencia en verde. Por ejemplo, producción por ciclo, velocidad, capacidad y gerente.
- **Selector** ×1 / ×10 / ×50 / Máx.
- **Botón grande «Mejorar»** con el coste.
- **Fila del gerente:** contratar o asignado.
- **Hito:** siguiente hito ×2 con su nivel (las líneas de 10, 25, 50…).
- **Flechas ‹ ›** para pasar a la parte anterior o a la siguiente sin cerrar.

Archivo: `panels.ts` (`openStationSheet`).

### 8.2 Abrir parada
Ilustración de la parada en obras, nombre, coste y botón «Abrir». Al abrirla, animación de construcción en la ruta (`openUnlockSheet`).

### 8.3 Comprar negocio (desde la ciudad)
Ilustración grande del negocio, descripción, coste y botón. Al comprarlo, celebración (`openPlotSheet`).

### 8.4 Ejecutivos y maletines (`metaPanels.ts` `openExecs`)
- Retratos por rareza con su marco (común a legendario).
- Maletines que se abren con suspense.
- Asignación a negocios.
- Fusión de ejecutivos.

### 8.5 El resto de pantallas del menú
Cada una con ilustración de cabecera e iconos propios:
- **Misiones** y **retos diarios y semanales** (`openMissions`, `openDaily`).
- **Ruleta diaria** (`wheelPanel.ts`): ruleta ilustrada que gira con física.
- **Logros** (`openAchievements`): medallas.
- **Tienda** (`shopPanel.ts`): paquetes con ilustración. Los textos de precio vienen de la tienda.
- **Mi vida** (`lifePanel.ts`): el personaje vestido con lo que compra y su casa, coche, mascota y joyas. Ya tiene arte; integrarlo en una «habitación» que cambia.
- **Liga Millonario** (`leaguePanel.ts`): podio, clasificación, cuenta atrás, premios y muro de la fama.
- **Evento de fin de semana y temporada** (Halloween) (`eventPanel.ts`, `seasonPanel.ts`): decorado de temporada que también cambia las pantallas de negocio, por ejemplo calabazas en la calle.
- **Salir a bolsa** (`openIpoSheet`): parqué con acciones, gráfica y animación de campana.
- **Imperio** (`empirePanel.ts`): resumen de negocios con sus ingresos por segundo.
- **Invitar a amigos y nube** (`invitePanel.ts`).
- **Ajustes, opinión y legales** (`metaPanels.ts` `openSettings`, `feedbackPanel.ts`, `legal.ts`).

## 9. Momentos de recompensa (`celebrate.ts`, `feedback.ts`, `rewards.ts`)
Revisar y unificar con el kit:
- **Monedas al contador:** ya existe; usar el icono propio.
- **Subida de nivel:** rebote y destellos. **Hito ×2:** banda dorada.
- **Ascenso de rango:** medalla gigante.
- **Puesto nuevo, sede nueva, negocio nuevo y ciudad completada:** de menor a mayor espectáculo.
- **Venta viral:** rótulo y lluvia de monedas.
- **«Mientras no estabas»:** las ganancias sin conexión, con su ×2 por anuncio.
- **Desbloqueo de una función:** el candado se rompe.
- **Tutorial:** mano, globo de texto y foco que oscurece el resto.

**Iconos propios** (sustituir todo emoji visible de la interfaz):
- dinero, diamante, rayo, maletín, gerente, estrella, trofeo, calendario, regalo, ruleta;
- ajustes, tienda, liga, misiones, logros, mundo, ciudad, bolsa, nube, invitar, opinión;
- candado, play (anuncio), reloj, cerrar, flechas, mano;
- un icono por negocio.

## 10. Piezas transversales

### 10.1 Pantalla de carga y marca
- **Carga:** el rider pedaleando por una ruta que se dibuja, la barra de carga y un consejo.
- **Icono de la app, logotipo y *splash*:** ya existen. Revisar que sean coherentes con la nueva identidad de la ruta.

### 10.2 Audio (opcional pero deseable)
- Efectos y música por ciudad en `public/audio`. Ver el formato en `src/audio/sound.ts`.

### 10.3 Accesibilidad
- `prefers-reduced-motion`: sin sacudidas ni ráfagas.
- Contraste legible y objetivos táctiles de al menos 44 px.

### 10.4 Vehículos vistos de espaldas
Todo vehículo que circula (transportes, ventas, tráfico de la ciudad y el coche del jugador) necesita la vista **de espaldas** (`<clave>_rear`), además de la de frente.

## 11. Técnica y entregas
- **Tamaños:** el arte va al doble del tamaño lógico. Atlas de 2048 px como máximo. PNG con transparencia y después `npm run art:webp`.
- **Rendimiento:** fluido en un Android de gama media. Pocas partículas, texturas grandes y fijas en vez de cientos de piezas, y nada de 4K.
- **Respaldos:** si falta un arte, la escena dibuja el respaldo por código. Nunca puede quedar un hueco ni un error.
- **Documentar** cada clave y su prompt en `ART.md` («Catálogo»).
- **Comprobar:**
  - capturas con Playwright a 390×844, de cada negocio con 1 y con 8 paradas, de la ciudad, del mundo y de todos los paneles, en español e inglés, con y sin «reducir movimiento»;
  - galería en `docs/visual-review/`.
- **Entregas por fases** (cada una, una PR revisable):
  1. **Kit de interfaz** (§1) y **botón «Nivel»**. Rehacer el HUD y la barra inferior.
  2. **Pantalla de negocio completa del reparto en bici** (`bike`): calle, sede, ruta, franjas, las 8 paradas, el rider en bici con el pedaleo, los clientes y el ambiente. **Es la pantalla de referencia:** cuando esté aprobada, se replica el nivel en el resto.
  3. Almacén, restaurante, TikTok e IA (Madrid).
  4. Panel de mejora (§8.1), abrir parada y comprar negocio.
  5. Miami (5 negocios).
  6. Dubái (5 negocios).
  7. Ciudad, mundo, Oficina central y viaje.
  8. El resto de paneles y momentos de recompensa.
  9. Vehículos de espaldas, día y noche, y pulido final.

## 12. Criterios de aceptación de cada pantalla
- Se entiende en 3 segundos qué hacer: qué tocar, qué mejorar y qué frena la cadena.
- Las 8 paradas son distintas entre sí y la pantalla es distinta de las demás negocios.
- Nada se superpone mal: textos legibles y botones nunca tapados.
- Todo toque tiene respuesta visual.
- Respeta «reducir movimiento» y funciona en inglés.
- 60 fps en el móvil de prueba. `npm test` y `npm run build` correctos.

## 13. Peticiones a Claude
(ChatGPT/Codex: apunta aquí lo que necesites de la lógica, con fecha, y Claude lo añadirá al modelo de vista.)

- *(vacío)*

## 14. Funciones nuevas que hay que dibujar (octubre de 2026)
La lógica ya funciona con piezas provisionales dibujadas por código. Hay que sustituirlas por arte e interfaz definitivos con el mismo nivel que el resto de la biblia.

### 14.1 Habilidad del gerente (`skills.ts`, `StationView.skill`)
Cada parte con gerente (cada parada, el transporte y la venta) tiene un **botón de habilidad**: x2 de velocidad durante 5 minutos (más con la escuela) y luego se recarga en 20 minutos. Solo funciona jugando.

| `skill.state` | Qué se ve |
| --- | --- |
| `locked` | Nada (no hay gerente). |
| `ready` | Botón amarillo con ⚡ que late y brilla: se puede usar. |
| `active` | Verde, con la cuenta atrás (`skill.left`, ms) y un aro que se vacía (`skill.progress`). La parte se ve acelerada: trabajador más rápido, rastro de velocidad, chispas. |
| `cooldown` | Gris, con la recarga (`skill.left`) y un aro que se llena (`skill.progress`). |

- **Dónde:** pegado al marco del gerente de cada parada; en transporte y venta, encima de su botón «Nivel». Hoy es la pieza `SkillChip` de `RouteScene.ts`.
- **Al tocar:** `bridge.useSkill(bizId, station)`. Al activarse, destello grande y el gerente hace un gesto.
- **Panel de mejora (§8.1):** ya tiene la fila «Habilidad del gerente» con el botón «Activar». Darle el estilo del kit.
- **Arte pedido:** icono de habilidad (`ic_skill`) y el gesto del gerente (`mgr_cheer`, 2 poses). Además, un efecto de velocidad reutilizable.

### 14.2 Escuela de negocios (`school.ts`, `schoolPanel.ts`)
Investigación permanente. Cada hito x2 da una **idea 💡**, que se gasta en un árbol de 5 ramas que no se pierde nunca:
- Procesos 🏭
- Logística 🚚
- Marketing 💰 (pide Procesos 2)
- Liderazgo 👔 (pide Logística 2)
- Capital semilla 🚀 (pide Marketing 3)

Hoy es una lista. **Lo que queremos:**
- Un **árbol visual** de verdad: pizarra o campus, con las ramas unidas por líneas que se encienden al desbloquearse.
- Nodos con nivel `x/max`, coste en ideas y candado si falta el requisito.
- Animación al investigar (la idea vuela al nodo).
- **Icono de idea** (`ic_idea`) para sustituir el emoji 💡 en el panel, en el menú y en la cabecera del panel.
- **Iconos de rama:** `ic_school_prod`, `ic_school_log`, `ic_school_sale`, `ic_school_mgr`, `ic_school_start`.
- **Botón del menú «Escuela de negocios» 🎓** con su icono (`ic_school`). Se desbloquea con 12 hitos y lleva punto rojo si hay algo que investigar.

### 14.3 La feria del evento (`fest.ts`, negocio `fest`)
Durante el evento del fin de semana se abre **«La feria»**, una pantalla de negocio más, con la misma ruta y las mismas reglas que las otras 15. Se entra desde el panel del evento («Ir») y se paga con **fichas 🎟️**, no con dinero. Sus 8 paradas son, por orden:
1. Churrería
2. Algodón de azúcar
3. Tómbola
4. Tiro al blanco
5. Coches de choque
6. Noria
7. Montaña rusa
8. Fuegos artificiales

- **Pantalla (`SCREENS.fest`, `BIZ_ART.fest`):**
  - noche de feria, con guirnaldas de bombillas, globos, música, fuegos al abrir la última caseta y suelo de albero;
  - ruta de feria (`route_fest_*`), con un **carrito** como transporte y la **taquilla** como venta;
  - sede: la **entrada de la feria** con arco luminoso, en 3 tamaños (`bld_fest_1/2/3`). Hoy usa provisionalmente el club de playa.
- **8 casetas propias** (`st_fest_0`…`st_fest_7`) y feriantes como trabajadores.
- **Moneda:** icono de ficha (`ic_ticket`) para la cabecera, los precios y el «Abrir · 🎟️ 550». Cuando `view.scene === "fest"`, la cabecera ya muestra las fichas en vez del dinero.
- **Barra inferior en la feria:** «Ciudad» y el botón central «La feria», que abre los premios del evento.
- **Premios exclusivos:** se cobran en el panel del evento, al abrir 2, 4, 6 y 8 casetas. El último da un **trofeo 🏆** permanente (+5 % de ingresos). Hace falta:
  - medalla o copa de feria (`ic_fest_trophy`);
  - vitrina de trofeos en el panel del evento (`meta.fest.trophies`);
  - celebración al completar la feria.
- **Botón lateral «Evento»:** cuando la feria está abierta, que se note (una noria pequeña girando).

### 14.4 Primeros minutos (`onboarding.ts`)
Tras el tutorial salen cuatro avisos, uno cada minuto o dos, hasta el almacén. Hoy son bandas doradas:

| Aviso | Cuándo sale | Qué hay que hacer |
| --- | --- | --- |
| «¡Habilidad lista!» | Con el primer gerente | Enfocar el botón ⚡ con una mano que lo señale. |
| «¡El reparto ya va solo!» | Con el reparto automatizado | Premio de 10 💎. |
| «¡Ya tienes la mitad!» | Con la mitad del dinero del almacén | Mostrar la barra de ahorro hacia el almacén. |
| Tu primer negocio de verdad | Al comprar el almacén | Maletín de regalo después de la celebración de compra. |

Además, **la primera «oportunidad» con anuncio** (la moneda que aparece) llega 20 segundos después del tutorial y nunca durante él. Es el **primer anuncio** del jugador: tiene que ser muy atractiva, con brillo y un globo que diga «¡Pedido grande!».

### Entrega fase 1 — 6 de octubre de 2026

Kit reutilizable CSS/Phaser, estados de botones, paneles con cabecera/cierre rojo, marcos y contadores. `LevelButton` común 70×56 y estados del modelo. HUD y barra inferior renovados; navegación Mundo en negocio y columna derecha reservada. Catálogo/receta en ART y galería `visual-review/phase-1`. 229 tests, build y 60 comprobaciones móviles en ES/EN con/sin movimiento. La pantalla de referencia de bici se entrega por separado en la fase 2.

### Entrega fase 2 — 6 de octubre de 2026

Pantalla de referencia de bici: calle madrileña, tres sedes propias, ocho locales/cocineros con tres poses, rider sobre bicicleta con frente/espalda y pedaleo rápido, bolsas, clientes en portales y ambiente. Sede/calle 280 px, franjas 172 px y zigzag de 30 px. Datos de construcción, nombres, rangos y precios vienen de `businessView`; pedaleo por Bridge mediante la acción existente. Se mantienen tutorial, recompensas, rangos, visitantes, mecánica física y desplazamiento recordado. Las piezas y los prompts están en ART; capturas ES/EN, movimiento completo/reducido y controles móviles en `visual-review/phase-2`. La medición de 60 fps en un móvil físico queda pendiente; Chromium en este entorno usa renderizado por software y no permite certificarla.

### Entrega agrupada de las fases 3–9 — 6 de octubre de 2026

Por petición expresa del usuario, las fases restantes se agrupan en la PR #17 existente. Incluye Madrid, Miami, Dubái, feria, paneles, Escuela, ciudad, mundo, oficina, viajes, traseros, ambiente, iluminación y recompensas. La PR conserva el kit y la referencia de bici de las fases 1/2. Catálogo y recetas en ART; galería en `visual-review/phases-3-9/`. 243 tests y build correctos; 556 comprobaciones y 328 capturas móviles ES/EN con movimiento completo/reducido, sin errores de consola. Queda pendiente certificar 60 fps en un móvil físico; el entorno usa Chromium por software.
