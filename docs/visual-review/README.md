# Revisión visual

Antes: commit `8b0f8a2` de `claude/festive-allen-vb7bc1`. Después: esta rama.
Las comparaciones usan la misma partida local preparada, español, 390×844 y fecha de Halloween. No representan una cuenta real. Supabase se simula y no recibe escrituras.

| Escena | Antes | Después |
| --- | --- | --- |
| Mi vida | ![Antes](before-life.png) | ![Después](after-life.png) |
| Dubái | ![Antes](before-dubai.png) | ![Después](after-dubai.png) |

![Rangos del arte real](ranks.png)

![Suministros](supply-truck.png) ![Cliente VIP](vip.png)

`report.json` recoge 122 comprobaciones de Chromium: paneles, 14 negocios, tres ciudades, dos idiomas, 320/390/560 px, visitantes, compras/equipamiento, límites de texturas por rango y movimiento reducido. No certifica rendimiento físico ni integración del servidor. También comprueba el apoyo de los 18 frames de animación, las cuatro mecánicas físicas y el cobro del fantasma mediante su modal existente.

Las capturas de tienda 1080×1920 y el gráfico 1024×500 están en `public/brand/store/`. Receta: `VISUAL_OUTPUT=artifacts/store npm run capture:visuals -- --store`, seguida de `npm run brand:store`. Para repetir el contacto de rangos: Vite en 5173 y `node scripts/capture-ranks.mjs`.

La ampliación entrega ciclos reales y puestos premium específicos:

![Tres poses por trabajador](dubai-walk.png)

![Pedido urgente](urgent-order.png) ![Crítico](critic.png)

![Directo](broadcast.png) ![Investigación](research.png)

Las tarjetas existentes conservan sus botones y recompensas; los sprites reflejan su estado. No se modifican los sistemas económicos.

`final-report.json` recoge la pasada final de 25 comprobaciones después de la limpieza del atlas de decoración.

La ampliación de Miami añade reposo y dos pasos a sus 12 roles propios:

![Miami: restauración y costa](miami-walk-a.png)

![Miami: navegación y oficinas](miami-walk-b.png)

`miami-report.json`: 25 comprobaciones en Chromium después de integrar Miami,
sin errores de carga ni JavaScript; verifica los 54 frames de Miami y Dubái.
También pasan los 225 tests y la compilación de producción.

## Mundo integrado y pantalla limpia

| Entorno | Captura del juego |
| --- | --- |
| Madrid | ![Madrid](neighborhood-madrid.png) |
| Miami | ![Miami](neighborhood-miami.png) |
| Dubái | ![Dubái](neighborhood-dubai.png) |
| Polígono | ![Almacén](neighborhood-industrial.png) |
| Terrazas | ![Restaurante](neighborhood-terrace.png) |
| Estudios | ![TikTok](neighborhood-neon.png) |

`neighborhood-report.json` contiene 158 comprobaciones: español/inglés,
320/390/560 px, los 14 negocios, tres ciudades, carga de barrios y cobertura de
cámara, compras, visitantes, rangos y pausa/reanudación de la vida ambiental.
`neighborhood-final-report.json` contiene la pasada final de 43 comprobaciones
tras compactar los avisos temporales. Ambos terminan sin errores. Pasan los
225 tests y la compilación de producción. Las pruebas simulan Supabase y no
certifican rendimiento en un dispositivo físico.
