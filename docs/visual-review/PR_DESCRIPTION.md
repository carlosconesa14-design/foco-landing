Los 12 personajes propios de Miami reutilizaban la imagen de reposo al caminar. Esta ampliación añade 36 sprites individuales: reposo y dos pasos por personaje, con el mismo vestuario, herramientas y apoyo común. El cargador existente los selecciona antes que los alias del atlas.

Se incluyen los originales, metadatos de recorte, exportadores reproducibles y contactos de revisión. Los assets se distribuyen en PNG y WebP. Se amplía la comprobación de animaciones para Miami y Dubái. No cambia la economía ni las recompensas.

Revisión visual: `docs/visual-review/miami-walk-a.png` y `miami-walk-b.png`.

Validación: 225 tests, build de producción y 25 comprobaciones de Chromium sin errores. El navegador verifica los 54 PNG de animación de Miami y Dubái y la carga de los nuevos assets. Informe: `docs/visual-review/miami-report.json`.
