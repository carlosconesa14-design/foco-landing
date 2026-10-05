# Estado del proyecto

**Rider Millionaire: Idle Tycoon.** Para retomar el trabajo sin tener que leer conversaciones antiguas. Última actualización: 2 de octubre de 2026.

## En una frase
Es un idle tycoon para móvil, publicado como **beta web** en https://carlosconesa14-design.github.io/foco-landing/ (el juego, en `/jugar/`). Tiene el material gráfico preparado para Google Play; faltan las cuentas, los datos legales y la validación nativa antes de publicar. Gana dinero con **anuncios bonificados** (AdMob) y compras dentro de la app.

## Quién hace qué
- **Claude:** lógica, economía, servidor, monetización, documentación y comprobaciones.
- **ChatGPT/Codex:** todo lo visual (arte, animaciones, interfaz y marca). Ver [`AGENTS.md`](../AGENTS.md) y [`ART.md`](ART.md).
- **Carlos (dueño):** cuentas, decisiones, datos legales, TikTok y pagos.

## Qué hay hecho

| Área | Qué | Dónde |
| --- | --- | --- |
| Juego | Ciudad isométrica y recintos por negocio. Madrid (4 negocios), Miami (5, con olas turísticas) y **Dubái** (5, con el precio del oro y la carrera de fundadores; arte propio integrado). Gerentes, ejecutivos y maletines, bolsa, expansión, Oficina central y edificios que crecen | `src/game`, `src/scenes`, [`GDD.md`](GDD.md) |
| Comodidad y vuelta | **Mejorar todo** (3 gratis/día + 2 con anuncio; ilimitado con el Gestor automático de 0,99 € o VIP), **fusionar ejecutivos**, **«Mientras no estabas»** y **rival de la semana**. Tokio «Próximamente» | `autoUpgrade.ts`, `fusion.ts`, `away.ts`, `rival.ts` |
| Mecánicas por negocio | Madrid: **pedidos urgentes** (almacén), **críticos** con estrellas (restaurante), **hype** y directo viral (TikTok) e **investigación** (IA). Reutilizables para Miami y Dubái | `twists.ts`, `twistUi.ts` |
| Ajustes remotos | Números de ofertas, viral, «Mi vida» y temporada cambiables desde Supabase sin publicar versión (¼–4× del valor de fábrica) | `remote.ts`, migración 0015, [`AJUSTES.md`](AJUSTES.md) |
| Amigos y nube | Cuenta anónima automática: **invitar a amigos** (50 💎 + maletín para el amigo, 100 💎 + maletín para quien invita) y **partida en la nube** con clave de recuperación | `account.ts`, `invitePanel.ts`, migración 0014, función `account` |
| Temporada | **Halloween** (24 oct – 1 nov): fantasmas con caramelos (x3 con anuncio), tienda con 5 objetos exclusivos de «Mi vida», diamantes y maletines, y calabazas en la ciudad | `season.ts`, `seasonPanel.ts` |
| Mi vida | Tienda de lujo con personaje: 32 objetos en 6 colecciones, prestigio (+0,5 % de ingresos por punto, +5 % por colección), exclusivos con 💎, probar 1 h y oferta del día con anuncio. Tu coche circula por la ciudad | `luxury.ts`, `lifePanel.ts`, `avatar.ts` |
| Mejoras visibles | **Rangos de los puestos** (bronce, plata, oro, diamante y leyenda en los niveles 10–200): pedestal, brillo, medalla y celebración, en todos los negocios. Decoración del recinto con ★★ y ★★★ | `ranks.ts`, `rankFx.ts`, [`GDD.md`](GDD.md) |
| Desbloqueo gradual | Las funciones se ven con candado y dicen cómo conseguirlas; se abren una a una en la primera hora y media (premio diario, misiones, ejecutivos, Mejorar todo, ruleta, logros, Mi vida, Liga, rival, evento e invitar) | `unlocks.ts`, `unlockUi.ts` |
| Retención | Tutorial, misiones diarias, premio diario, logros, avisos en el móvil, **evento del fin de semana** (10 premios, tema semanal) y **retos del día y de la semana** | `meta.ts`, `event.ts`, `challenges.ts`, `notify.ts` |
| Anuncios | 14 ubicaciones (x2 4 h, hora punta, offline x3, viral, maletín, habilidad, diario, bolsa, expandir, ola, evento, **camión de suministros, cliente VIP y ruleta diaria**) y una **escalera diaria**: a los 3, 6 y 10 anuncios, maletín, 40 💎 y maletín de oro | `src/ads`, `adLadder.ts`, `offers.ts`, [`GDD.md`](GDD.md) («Monetización») |
| Compras | VIP (sin anuncios y x2), pack de inicio y diamantes. En la web, desactivadas | `shop.ts`, `platform/store.ts`, [`COMPRAS.md`](COMPRAS.md) |
| Liga Millonario | Semanal y por esfuerzo: todos empiezan el lunes a 0. Puntos por tiempo activo (con techo), constancia, reto del día, misiones y retos semanales. Premios del 1.º al 10.º, descanso para quien cobra dinero y Muro de la fama. **Ahora solo diamantes** | Supabase, `leaguePanel.ts`, [`LIGA.md`](LIGA.md), [`BASES_LIGA.md`](BASES_LIGA.md) |
| Analítica | Propia y anónima, con **registro de errores**, eventos de las funciones nuevas y **opiniones** desde Ajustes (migración 0016, `track` v3), también en la web (`platform = 'web'`). **Panel de la beta** en directo: https://claude.ai/artifact/PerKxxxMATFCAmg5y5YZyV | [`ANALITICA.md`](ANALITICA.md) |
| Idiomas | Español e inglés, según el móvil o desde Ajustes | [`IDIOMAS.md`](IDIOMAS.md) |
| Web | Beta en GitHub Pages (`pages.yml`): sin compras, anuncios simulados y sin dinero en la Liga | `src/platform/web.ts` |
| Android | Capacitor, `com.carlosconesa.ridermillionaire`. Hay un APK en cada subida y un AAB firmado manual (`release.yml`) | `android/`, [`TIENDA.md`](TIENDA.md) |

**Servidor (Supabase):** proyecto `de-rider-a-millonario` (id `jpdvpbqiasyjzbdaiedh`, París).
- **Migraciones aplicadas:** de la 0001 a la 0016 (`supabase/migrations`). La 0014 son las cuentas anónimas (invitaciones y nube) y la 0015 los ajustes remotos. La 0010 es la de seguridad, la 0011 deja sin premios las partidas editadas, la 0012 es la función del panel y la 0013 la carrera de fundadores.
- **Edge Functions:** `league` (v5, con la hora del servidor y la carrera de fundadores), `track` (v3, también opiniones) y `account` (v2, invitaciones, nube y ajustes).
- **Seguridad:** RLS sin políticas y ningún permiso para anónimos; solo se accede a través de las funciones. Auditoría completa, defensas y pendientes en [`SEGURIDAD.md`](SEGURIDAD.md).

## Decisiones tomadas (no volver a discutir sin motivo)
1. **El dinero real nunca depende de anuncios, compras ni progreso en el juego.** Así lo exige AdMob, y es lo que lo mantiene legal. Los anuncios dan solo premios del juego.
2. **La Liga premia el esfuerzo de la semana, no la antigüedad.** El tiempo activo cuenta poco y con techo: 2 h a puntos completos y 4 h como máximo al día. No es un sorteo.
3. **Nada de prometer premios y no darlos** ni de jugar con el número de ganadores. Es ilegal.
4. **Premios en dinero solo cuando un asesor revise las bases** y esté hecha la verificación Play Integrity ([`SEGURIDAD.md`](SEGURIDAD.md), «Pendiente»). Es cambiar `prize_cents` en `league_config`.
8. **Contra trampas:**
   - el juego nunca usa la hora del móvil, solo la del servidor y el tiempo con la app abierta (`src/game/clock.ts`);
   - una partida editada no sirve: se recupera la última copia válida y el jugador queda fuera de los premios de la Liga hasta que se revise (`storage.ts`, migración 0011);
   - las demás señales impiden cobrar dinero hasta revisarlas.
5. **Aviso «el dinero del juego es ficticio»:** en las bases, la tienda y el juego.
6. **Nombre:** «Rider Millionaire: Idle Tycoon». «Idle Millionaire» chocaba con *Cash Masters: Idle Millionaire*.
7. **Moneda:** € en español y $ en inglés. Los premios reales, siempre en euros.

## Pendiente de Carlos
- [ ] Google Play Console (25 $) y AdMob: crear las cuentas y pasar los IDs de AdMob. Dar de alta el producto nuevo `auto_manager` (0,99 €, ver `COMPRAS.md`).
- [ ] Datos para la política de privacidad: nombre, NIF, domicilio y email (`PRIVACIDAD.md`).
- [ ] Subir los secretos de GitHub (`TIENDA.md`, punto 3). La clave de subida ya está generada (te la pasó Claude el 2 de octubre): guárdala en un gestor de contraseñas.
- [ ] Play Console → Play Integrity API: vincular un proyecto de Google Cloud y crear una cuenta de servicio (`SEGURIDAD.md`, «Pendiente»).
- [ ] Comprobar el nombre en Google Play y en la EUIPO.
- [ ] TikTok, con el enlace de la beta en la bio (`TIKTOK.md`).
- [ ] Prueba cerrada en Google Play: 12 probadores durante 14 días, y luego producción (`LANZAMIENTO.md`).
- [ ] Asesor: bases de la Liga, privacidad e impuestos.

## Bloque visual completado por ChatGPT/Codex

Dubái tiene sus quince evoluciones de edificios, puestos, productos, roles, vehículos, desierto, skyline y fundador. Mi vida incluye todas las ropas, lujo, coches y exclusivos de Halloween. Rangos con cambios estructurales sobre el arte base, medallas propias, visitantes físicos, moneda neutral, kit de iconos coherente, decoración de Miami y revisión responsive en español/inglés a 320/390/560 px. Madrid conserva su arte y animaciones existentes. La ampliación final añade los 18 frames reales de Dubái, 28 decoraciones por negocio, puestos Diamante/Leyenda personalizados, cuatro mecánicas físicas y vegetación, mobiliario y pavimentos propios.

Marca: logos claro/oscuro, iconos web/Android, carga y splash, gráfico de Google Play y cinco capturas reales de tienda. Catálogo, herramientas y límites documentados en [`ART.md`](ART.md), «Cierre visual». La economía, guardado y frecuencia/recompensa de las ofertas permanecen intactos (`src/game/*` sin cambios).

Validación local: 225 tests correctos, build de producción correcto y 122 comprobaciones automatizadas de Chromium, incluidos compra/equipamiento, fantasma, mecánicas físicas y apoyos de animación. **Pendiente antes de publicar:** probar rendimiento en Android físico de gama media, compilar/verificar recursos nativos y revisar el material en Play Console. La prueba visual simula Supabase; no valida cuentas, anuncios reales ni servidor.

## Próximos pasos (Claude)
**Plan actual hacia el lanzamiento:** [`PLAN.md`](PLAN.md) (landing page, vídeos de TikTok, primeros 10 minutos, PWA, ficha de la tienda). Se espera el arte encargado en `ART.md` («Encargo: landing page y vídeos de TikTok»).

0. ~~Auditoría de seguridad y anti-trampas~~ ✅ ([`SEGURIDAD.md`](SEGURIDAD.md)). Pendiente: Play Integrity y verificar compras en el servidor, cuando existan las cuentas de Google.
1. ~~Más ocasiones de ver anuncios: camión de suministros, cliente VIP y ruleta diaria.~~ ✅ (`offers.ts`)
2. ~~Panel de números de la beta~~ ✅ ([`ANALITICA.md`](ANALITICA.md), «Informes»).
3. ~~Dubái, con la carrera de fundadores~~ ✅ (`founders.ts`, migración 0013). Arte completado en la rama visual (Codex).
3c. Mecánicas de cada negocio: ~~fase 1 (Madrid)~~ ✅. Fase 2: Miami y Dubái con los mismos módulos.
3b. ~~Rangos de los puestos, «Mi vida», Halloween, invitar a amigos, nube y ajustes remotos~~ ✅. Arte completado (Codex, ver `ART.md`).
4. Rendimiento en móviles de gama media (antes de salir en Google Play: ahora hay más efectos).
5. Revisar la primera partida con datos reales.

## Cómo se trabaja
- **Rama:** `claude/festive-allen-vb7bc1`. Después de cada PR unida, se rehace desde `main`.
- **Antes de subir:** `npm test`, `npm run build` y probar en Chromium a 390×844. Los scripts de Playwright usan el Chromium de `/opt/pw-browsers`.
- **Desde el contenedor no se llega a `github.io` ni a `supabase.co`.** Para probar el servidor se usa el MCP de Supabase (`execute_sql` dentro de una transacción con `rollback`).
- **Textos:** con `t()` y su traducción en `src/i18n/en.ts`.
- **Ajustes de la economía:** se comprueban con el bot (`src/game/balance.ts` y `tests/pacing.test.ts`), también con el bot «implicado» (`engaged`), que usa las mecánicas y «Mi vida».
- **Rendimiento:** el canvas se pinta como mucho a x2 (`DPR` en `common.ts`) y las imágenes se cargan en WebP (`npm run art:webp`, `src/art/imgExt.ts`): 9,6 MB en vez de 37 MB al arrancar.
- **Partidas antiguas:** `tests/migration.test.ts` carga partidas reales de la beta publicada (`tests/fixtures/beta-*.json`, generadas con el código de `main`). Si cambia el guardado, tienen que seguir cargando sin perder nada.

Arte de Miami completado el 5 de octubre: 36 PNG/WebP para los 12 roles propios; originales, exportadores y contactos incluidos. Pasada adicional de 25 comprobaciones de navegador sin errores en `docs/visual-review/miami-report.json`.

Mundo integrado y pantalla limpia (5 de octubre): seis dioramas de barrios originales para ciudades y recintos, calles/aceras exteriores, peatones, pájaros, paseo y yate en Miami, farolas nocturnas, cámara ampliada, cabecera en una fila y etiquetas de producción contextuales. No cambia la economía. Véase el cierre de `ART.md`.
