# Fase 2: pantalla completa de reparto en bici

La pantalla de reparto sustituye el arte provisional por un barrio madrileño propio: tres sedes, ocho locales y cocineros, rider sobre bicicleta con frente/espalda y pedaleo rápido, bolsas y clientes en sus portales. Incluye 61 piezas PNG/WebP, acera/asfalto, bancos, palomas y tráfico.

La construcción de la escena usa los nombres, rangos, precios y estados de `businessView`. Mantener la bicicleta pulsada llama al Bridge y a la acción de pedaleo existente; soltar fuera, perder foco o salir de la escena lo detiene. Se conservan recompensas, tutorial, visitantes, mecánica física y desplazamiento. No se modifica la lógica del juego.

Esta entrega se basa en `codex/visual-phase-1-interface`, para revisar la fase 2 por separado. Al fusionar primero la fase 1, puede cambiarse la base de esta PR a `main`.

Validación: 229 tests, compilación de producción, comprobación final de arte/WebP/idiomas (11 tests) y 76 controles móviles a 390×844 en ES/EN con movimiento completo/reducido. Incluye una/ocho paradas, las tres sedes, abrir Nivel sin alterar la partida, gesto real de mantener/soltar fuera y siete paneles. Capturas e informe en `docs/visual-review/phase-2`. Los 60 fps en un móvil físico quedan pendientes de medir.
