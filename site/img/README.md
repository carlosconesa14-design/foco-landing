# Arte de landing

PNG y WebP de las 15 piezas solicitadas en `docs/ART.md`.

`hero`: 1600×1000, usar el tercio izquierdo para el titular. `hero-mobile`: 900×1200, título arriba. Ambos sin texto.

`rider`: 600×800; tres `city-*` y `league`: 800×560; tres `step-*`: 256×256; todos transparentes. `phone-frame`: 520×1040, ventana transparente x=18, y=18, 484×1004; vídeo debajo del marco. Marco genérico, sin marca.

`og-image` / `og-image-en`: 1200×630, logo real del juego y lema localizado. `favicon-32` / `favicon-180`: derivados del icono original de la app.

Las ilustraciones son marketing, no capturas de gameplay. Fuentes preservadas en `source/`; `assets.json` contiene los recortes. Exportar con `node scripts/export-marketing-art.mjs`, incluyendo todas las copias WebP. La integración de la landing corresponde al montaje de Claude según el encargo.
