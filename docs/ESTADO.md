# Estado del proyecto

**Rider Millionaire: Idle Tycoon.** Para retomar el trabajo sin tener que leer conversaciones antiguas. Última actualización: 2 de octubre de 2026.

## En una frase
Es un idle tycoon para móvil, publicado como **beta web** en https://carlosconesa14-design.github.io/foco-landing/ (el juego, en `/jugar/`). Está listo para Google Play: solo faltan las cuentas, los datos legales y el material gráfico. Gana dinero con **anuncios bonificados** (AdMob) y compras dentro de la app.

## Quién hace qué
- **Claude:** lógica, economía, servidor, monetización, documentación y comprobaciones.
- **ChatGPT/Codex:** todo lo visual (arte, animaciones, interfaz y marca). Ver [`AGENTS.md`](../AGENTS.md) y [`ART.md`](ART.md).
- **Carlos (dueño):** cuentas, decisiones, datos legales, TikTok y pagos.

## Qué hay hecho

| Área | Qué | Dónde |
| --- | --- | --- |
| Juego | Ciudad isométrica y recintos por negocio. Madrid (4 negocios) y Miami (5, con olas turísticas). Gerentes, ejecutivos y maletines, bolsa, expansión, Oficina central y edificios que crecen | `src/game`, `src/scenes`, [`GDD.md`](GDD.md) |
| Retención | Tutorial, misiones diarias, premio diario, logros, avisos en el móvil, **evento del fin de semana** (10 premios, tema semanal) y **retos del día y de la semana** | `meta.ts`, `event.ts`, `challenges.ts`, `notify.ts` |
| Anuncios | 11 ubicaciones (x2 4 h, hora punta, offline x3, viral, maletín, habilidad, diario, bolsa, expandir, ola, evento) y una **escalera diaria**: a los 3, 6 y 10 anuncios, maletín, 40 💎 y maletín de oro | `src/ads`, `adLadder.ts`, [`GDD.md`](GDD.md) («Monetización») |
| Compras | VIP (sin anuncios y x2), pack de inicio y diamantes. En la web, desactivadas | `shop.ts`, `platform/store.ts`, [`COMPRAS.md`](COMPRAS.md) |
| Liga Millonario | Semanal y por esfuerzo: todos empiezan el lunes a 0. Puntos por tiempo activo (con techo), constancia, reto del día, misiones y retos semanales. Premios del 1.º al 10.º, descanso para quien cobra dinero y Muro de la fama. **Ahora solo diamantes** | Supabase, `leaguePanel.ts`, [`LIGA.md`](LIGA.md), [`BASES_LIGA.md`](BASES_LIGA.md) |
| Analítica | Propia y anónima, también en la web (`platform = 'web'`) | [`ANALITICA.md`](ANALITICA.md) |
| Idiomas | Español e inglés, según el móvil o desde Ajustes | [`IDIOMAS.md`](IDIOMAS.md) |
| Web | Beta en GitHub Pages (`pages.yml`): sin compras, anuncios simulados y sin dinero en la Liga | `src/platform/web.ts` |
| Android | Capacitor, `com.carlosconesa.ridermillionaire`. Hay un APK en cada subida y un AAB firmado manual (`release.yml`) | `android/`, [`TIENDA.md`](TIENDA.md) |

**Servidor (Supabase):** proyecto `de-rider-a-millonario` (id `jpdvpbqiasyjzbdaiedh`, París).
- **Migraciones aplicadas:** de la 0001 a la 0008 (`supabase/migrations`).
- **Edge Functions:** `league` (v3) y `track`.
- **Seguridad:** RLS sin políticas; solo se accede a través de las funciones.

## Decisiones tomadas (no volver a discutir sin motivo)
1. **El dinero real nunca depende de anuncios, compras ni progreso en el juego.** Así lo exige AdMob, y es lo que lo mantiene legal. Los anuncios dan solo premios del juego.
2. **La Liga premia el esfuerzo de la semana, no la antigüedad.** El tiempo activo cuenta poco y con techo: 2 h a puntos completos y 4 h como máximo al día. No es un sorteo.
3. **Nada de prometer premios y no darlos** ni de jugar con el número de ganadores. Es ilegal.
4. **Premios en dinero solo cuando un asesor revise las bases.** Es cambiar `prize_cents` en `league_config`.
5. **Aviso «el dinero del juego es ficticio»:** en las bases, la tienda y el juego.
6. **Nombre:** «Rider Millionaire: Idle Tycoon». «Idle Millionaire» chocaba con *Cash Masters: Idle Millionaire*.
7. **Moneda:** € en español y $ en inglés. Los premios reales, siempre en euros.

## Pendiente de Carlos
- [ ] Google Play Console (25 $) y AdMob: crear las cuentas y pasar los IDs de AdMob.
- [ ] Datos para la política de privacidad: nombre, NIF, domicilio y email (`PRIVACIDAD.md`).
- [ ] Clave de firma y 6 secretos de GitHub (`TIENDA.md`, punto 3). Claude puede generar la clave.
- [ ] Comprobar el nombre en Google Play y en la EUIPO.
- [ ] TikTok, con el enlace de la beta en la bio (`TIKTOK.md`).
- [ ] Prueba cerrada en Google Play: 12 probadores durante 14 días, y luego producción (`LANZAMIENTO.md`).
- [ ] Asesor: bases de la Liga, privacidad e impuestos.

## Pendiente de ChatGPT/Codex
Icono, logotipo «Rider Millionaire», gráfico destacado y capturas para la tienda. Arte de Miami. Una moneda sin €, o en $, para el juego en inglés.

## Próximos pasos (Claude)
1. **Más ocasiones de ver anuncios:** camión de suministros, cliente VIP y ruleta diaria. ← siguiente
2. Panel de números de la beta (jugadores, retención, anuncios por jugador, abandono en el tutorial).
3. Dubái, con la carrera de fundadores: los 100 primeros reciben un ejecutivo exclusivo, sin dinero real.
4. Rendimiento en móviles de gama media.
5. Revisar la primera partida con datos reales.

## Cómo se trabaja
- **Rama:** `claude/festive-allen-vb7bc1`. Después de cada PR unida, se rehace desde `main`.
- **Antes de subir:** `npm test`, `npm run build` y probar en Chromium a 390×844. Los scripts de Playwright usan el Chromium de `/opt/pw-browsers`.
- **Desde el contenedor no se llega a `github.io` ni a `supabase.co`.** Para probar el servidor se usa el MCP de Supabase (`execute_sql` dentro de una transacción con `rollback`).
- **Textos:** con `t()` y su traducción en `src/i18n/en.ts`.
- **Ajustes de la economía:** se comprueban con el bot (`src/game/balance.ts` y `tests/pacing.test.ts`).
