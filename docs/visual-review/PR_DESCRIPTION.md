El juego tenía arte provisional de Dubái y Mi vida, rangos sin variantes de las piezas, visitantes presentados como tarjetas HTML y branding incompleto. Esta rama entrega el arte e integra una presentación común para ciudades, escenas y paneles, sin cambios en `src/game/*`, economía, guardado ni recompensas/frecuencia de ofertas.

### Cambios
- Dubái: 15 evoluciones de edificios, puestos, productos, seis roles propios, cinco vehículos, skyline, dunas, farolas, jardineras y retrato del fundador. Se elimina `BLD_SHAPE` y la reutilización de puestos de otras ciudades.
- Mi vida: misma persona en siete outfits, todos los objetos de lujo, coches seleccionados en la ciudad, viviendas, mascotas y exclusivos de Halloween. Halloween integra fantasma, calabazas, vampiro, coche fúnebre y mansión encantada.
- Rangos: medallas originales y variantes `_r1…_r5` compuestas sobre las piezas reales, con herramientas, arquitectura, herrajes, insignias y uniformes; generación diferida y límite de 300×258 px. Incluye poses particulares del almacén/restaurante. Se conservan las animaciones originales de Madrid.
- UI: kit SVG local, moneda neutral, ruleta y controles PNG, banderas, iconos de negocios/categorías/oficina, tarjetas de lujo, ajustes responsive y foco accesible. Se corrigen recortes de atlas que mostraban vecinos y la clase `.ghost` que animaba botones de cancelar. Las etiquetas de prestigio muestran la bonificación real existente.
- Visitantes: camión y VIP físicos, entrada/salida, sombra, halo e interacción; una pequeña etiqueta accesible sigue al actor.
- Miami: se conserva su arte existente y se completa el tráfico pastel y decoración costera.
- Marca: logos claro/oscuro, iconos 512/1024, carga web, iconos Android en cinco densidades, splash, gráfico Play 1024×500 y cinco capturas reales 1080×1920.
- Ampliación final: 18 frames reales de caminar en Dubái, 28 decoraciones específicas por negocio/evolución, 28 puestos Diamante/Leyenda personalizados y vegetación, mobiliario y pavimentos propios.
- Mecánicas físicas: furgoneta de pedidos urgentes, crítico sentado, equipo de directo y monitor holográfico; proyección de solo lectura sin acciones económicas nuevas.
- Documentación antigua corregida y scripts de exportación/captura reproducibles.

### Assets y comparaciones
La primera entrega aporta 119 claves en seis atlas; la ampliación añade 74 frames en tres atlas y 18 PNG de animación. Ningún atlas supera 1774 px. Las fuentes, tamaños, prompts de dirección, alias y puntos de integración se documentan en `docs/ART.md`.

[Comparación antes/después y contacto de rangos](https://github.com/carlosconesa14-design/foco-landing/blob/codex/complete-visual-overhaul/docs/visual-review/README.md)

![Dubái terminado](https://raw.githubusercontent.com/carlosconesa14-design/foco-landing/codex/complete-visual-overhaul/docs/visual-review/after-dubai.png)
![Mi vida terminada](https://raw.githubusercontent.com/carlosconesa14-design/foco-landing/codex/complete-visual-overhaul/docs/visual-review/after-life.png)

### Validación
- `npm test`: 221 tests, 28 archivos, correctos.
- `npm run build`: TypeScript y Vite correctos; permanece el aviso del bundle de Phaser >500 kB.
- `npm run capture:visuals`: 122 comprobaciones sin errores JS/consola; español/inglés a 320, 390×844 y 560 px, 14 negocios y paneles, compra/equipamiento, visitantes, rangos y movimiento reducido.
- Captura final rápida: 25 comprobaciones, incluidos los 18 apoyos de caminar, las cuatro mecánicas físicas y cobro real del fantasma mediante su modal.
- Smoke de producción: canvas, carga de assets y menú correctos, sin errores de navegador.
- `src/game/*` sin cambios; no se modifica el balance.

### Límites de la validación
Las capturas usan una partida local preparada y Supabase simulado: no envían cuentas, guardados ni analítica. No validan anuncios reales, cuentas o servidor. El APK no se ha compilado aquí; quedan la revisión de recursos nativos y rendimiento en un Android físico de gama media, y la revisión de material en Play Console antes de publicar. Los seis trabajadores de Dubái tienen ciclos reales de tres frames a 132×180 y apoyo común.
