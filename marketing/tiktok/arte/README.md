# Arte para montaje de Rider Millionaire

28 piezas PNG/WebP compartidas con `site/img/` (15 landing, 13 TikTok).

- `endcard.png` / `endcard-en.png`: 1080×1920. Fondo común sin texto de llamada a la acción. Escribirlo en la banda x=100..980, y=1610..1780; respetar las zonas seguras del montaje. Ambos idiomas comparten intencionadamente la imagen.
- `cover-template-{madrid,miami,dubai}.png`: 1080×1920. Título en la zona superior, y=160..650. Madrid de día, Miami con paleta de atardecer, Dubái con fondo nocturno y arquitectura iluminada.
- `avatar.png`: 400×400, cara sobre verde plano.
- `sticker-{atasco,gerente,x3,nivel-maximo,salida-bolsa,record}.png`: 600×180, transparentes. Cintas SIN TEXTO: añadir el rótulo localizado con Lilita One, azul marino, en x=40..560, y=35..145. Fuentes con licencia en `public/fonts/`.
- `coin-burst.png`: 2048×256, ocho frames consecutivos de 256×256, horizontal. Reproducir a 12–16 fps; último frame vacío para terminar limpiamente. Fondo transparente. Moneda original del juego, sin emisor en runtime.

Las imágenes son ilustraciones promocionales, no capturas del juego. Los vídeos deben usar gameplay real. No incorporan cifras de dinero, premios inventados ni marcas ajenas.

Reproducción: `node scripts/export-marketing-art.mjs`. Fuentes originales y recortes: `site/img/source/`. La exportación incluye WebP en ambas carpetas. No modificar los PNG fuente.

Entrega para Claude: arte listo para montar la landing y los vídeos del último encargo de `docs/ART.md`. Esta entrega no incluye montaje de vídeos ni despliegue web.
