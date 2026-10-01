# Liga Millonario: modelo de premios reales

> **Estado:** fase 0 en marcha, con premios dentro del juego (diamantes). La sección [«Cómo se opera»](#cómo-se-opera) explica cómo funciona y cómo se gestiona.

Objetivo: usar **premios reales** como gancho principal para atraer y retener jugadores, sin perder la cuenta de AdMob, sin entrar en la ley del juego y sin que se lo lleven los tramposos. El bote lo pone primero el dueño del juego (gasto de marketing) y, cuando haya ingresos, sale de un % de ellos.

> Este documento es un diseño. Antes de pagar el primer euro, un asesor tiene que revisar las bases legales y los impuestos.

---

## 1. Las 4 reglas que no se pueden romper

1. **Participar es gratis y pagar no ayuda.** Ni comprar en la app ni ver anuncios puede dar puntos, papeletas ni ventaja. Si no, puede considerarse juego de azar (licencia) y lo prohíben las tiendas.
2. **El dinero nunca es la recompensa de un anuncio** (política de AdMob).
3. **La puntuación tiene que ser verificable.** Hoy la partida vive en el móvil y se puede editar. Lo que da premios tiene que pasar por el servidor.
4. **Mensaje honesto:** "Torneo semanal con premios reales", nunca "gana dinero jugando" ni "gana X € al día".

---

## 2. Qué se puntúa (el problema de fondo)

| Opción | Cómo funciona | A favor | En contra | Veredicto |
| --- | --- | --- | --- | --- |
| A. Dinero ganado en la semana | Ranking por € ganados | Fácil de entender | Los anuncios lo multiplican (regla 1); crece en órdenes de magnitud y los veteranos ganan siempre; imposible de validar sin simular la economía en el servidor | ❌ |
| B. Crecimiento relativo | Cuántas veces has multiplicado tu imperio esta semana | Iguala a nuevos y veteranos | Los multiplicadores de anuncios siguen influyendo; difícil de validar | ⚠️ |
| **C. Puntos de Liga por acciones** | Puntos fijos por cosas que hace cualquier jugador, **con tope diario** | Igual para todos; premia volver cada día (justo lo que interesa); fácil de validar; un tramposo gana como mucho el tope | Hay que diseñar bien la tabla de puntos | ✅ **Recomendada** |

### Tabla de puntos propuesta (opción C)

| Acción | Puntos | Notas |
| --- | --- | --- |
| Entrar en el día | 10 | Una vez al día |
| Cada misión diaria completada | 15 | **Se excluye la misión "Mira N anuncios"** |
| Las 3 misiones del día | +20 | Bonus |
| Hito x2 de cualquier parte (Nv 10, 25, 50…) | 5 | Tope 6 al día |
| Abrir un puesto | 10 | |
| Subir de categoría un negocio (★★ / ★★★) | 25 | |
| Comprar un negocio | 40 | |
| **Tope diario** | **~150** | Nadie puede "farmear" infinito |

- **Lo que no da puntos:** ver anuncios, compras, el x2 del modo hustle, abrir maletines con diamantes comprados.
- **Semana:** de lunes 00:00 a domingo 23:59 (hora de Madrid). Máximo teórico ~1.050 puntos.
- **Desempate:** quien llegó antes a esa puntuación.

---

## 3. Cómo se reparte el bote

| Opción | Cómo funciona | Atrae a… | Riesgo |
| --- | --- | --- | --- |
| 1. Top 3 absoluto | 1.º, 2.º y 3.º de toda la liga | Muy competitivos | El nuevo ve el podio imposible y no lo intenta |
| 2. Divisiones | Bronce / Plata / Oro según el progreso; cada una con su top | Nuevos y veteranos | Más premios que pagar |
| 3. Sorteo con papeletas | Cada 100 puntos de la semana = 1 papeleta (máx. 10). Sorteo entre todos | **Todo el mundo** | Hay que validar bien quién participa |
| 4. Retos de lanzamiento | "El primero en completar Madrid gana 100 €" | Ruido en redes | Puntual |
| **5. Mixto (recomendado)** | **Sorteo (60 %) + top por división (40 %)** | Todo el mundo + los competitivos | — |

**Por qué el mixto:** el sorteo hace que *cualquiera* sienta que puede ganar esta semana (es lo que más atrae), y el top premia a los que más juegan (es lo que más retiene). Las papeletas salen de los puntos, y los puntos de jugar cada día: el sorteo premia la constancia, no la suerte de un día.

### Ejemplo con el bote mínimo de 50 €/semana

| Premio | Importe | Ganadores |
| --- | --- | --- |
| Sorteo | 5 € | 6 |
| Top 1 por división (Bronce, Plata, Oro) | 7 € / 7 € / 6 € | 3 |
| **Total** | **50 €** | **9 ganadores por semana** |

Con 9 ganadores a la semana hay un "ganador nuevo" cada día. Es contenido constante para el muro de ganadores y para TikTok.

---

## 4. De dónde sale el dinero

**Bote de la semana = el mayor de (bote garantizado, 10 % de los ingresos de la semana anterior)**

Se anuncia antes de que empiece la semana y no cambia durante ella.

| Jugadores al día | Ingresos/semana (aprox., 0,035 €/jugador/día) | 10 % | Bote (con garantía de 50 €) | Lo pones tú |
| --- | --- | --- | --- | --- |
| 500 | ~120 € | 12 € | 50 € | ~38 €/semana |
| 2.000 | ~490 € | 49 € | 50 € | ~1 €/semana |
| 5.000 | ~1.230 € | 123 € | 123 € | 0 € |
| 50.000 | ~12.250 € | 1.225 € | 1.225 € | 0 € (más ganadores, no premios más grandes) |

- Con unos **2.000 jugadores al día, el bote se paga solo.**
- Si crece mucho, se reparten **más premios**, no premios más grandes. Así cada premio se queda por debajo del umbral de retención de impuestos (a confirmar con el asesor) y gana más gente.
- Lanzamiento de prueba: **4–6 semanas a 50 € = 200–300 €** en total.

---

## 5. Cómo se evitan las trampas

| Capa | Qué hace | Cuándo |
| --- | --- | --- |
| 1. Cuenta | Iniciar sesión (Google/Apple o email). Una cuenta por persona y por dispositivo | Desde el principio |
| 2. Eventos al servidor | El juego envía cada acción que da puntos (misión, hito, puesto…). El servidor aplica la tabla y el **tope diario**; los puntos nunca los calcula el móvil | Desde el principio |
| 3. Coherencia | El servidor rechaza lo imposible: niveles que saltan, 50 hitos en un minuto, acciones fuera de orden | Desde el principio |
| 4. Integridad del dispositivo | Play Integrity (Android) / App Attest (iOS): descarta emuladores y apps modificadas | Antes de los premios en dinero |
| 5. Revisión del ganador | Antes de pagar se mira su historial; email o teléfono verificado; un premio por persona y semana | Siempre, a mano al principio |

Clave: con **puntos con tope diario**, el máximo que puede sacar un tramposo es lo mismo que un jugador constante. Hacer trampas no compensa, y eso hace el sistema viable sin tener que simular toda la economía en el servidor.

---

## 6. Identidad y pago a los ganadores

- **Mayores de 18:** se declara al apuntarse a la Liga y se comprueba al ganar.
- **Pago:** tarjeta regalo de Amazon (lo más sencillo), PayPal o Bizum. Al principio a mano (~30 min a la semana); después se puede automatizar.
- **Muro de ganadores:** nombre de pila y ciudad, **solo con su permiso** (protección de datos).

---

## 7. Legal y fiscal (para revisar con un asesor)

- **Bases legales** dentro de la app: organizador, fechas, cómo se puntúa, número de premios, cómo se sortea, cómo se paga y plazos.
- **Apple (norma 5.3):** el concurso lo organiza el desarrollador y hay que dejar claro que Apple no lo patrocina. **Google Play:** revisar la política vigente de concursos y premios.
- **España:** un sorteo promocional gratuito tiene su propio encaje en la ley del juego. Confirmar con el asesor si hay que comunicarlo o cumplir algún requisito.
- **Impuestos:** según el importe, el que paga puede tener que retener IRPF del premio. El bote probablemente sea un gasto de marketing deducible.

---

## 8. Qué hay que construir

| Pieza | Dónde |
| --- | --- |
| Proyecto de Supabase: cuentas, tablas (jugadores, eventos, semanas, puntos, papeletas, ganadores) | Servidor |
| Función que recibe eventos, aplica la tabla de puntos, el tope y las comprobaciones | Servidor |
| Cierre semanal: clasificación por división, sorteo con semilla publicada, lista de ganadores | Servidor |
| Pestaña "Liga" en el juego: contador del bote, tus puntos y papeletas, clasificación de tu división, muro de ganadores, bases | App |
| Registro e inicio de sesión, aceptación de bases y edad | App |
| Panel interno para ver los ganadores y marcar los pagos | Servidor / página privada |

**Sorteo transparente:** la semilla del sorteo se publica antes del cierre (por ejemplo, un número que se fija el lunes) y se puede comprobar después. Da confianza, y eso es clave con dinero real.

---

## 9. Fases

| Fase | Qué | Bote |
| --- | --- | --- |
| 0. Ahora | Servidor, cuentas, puntos y clasificación con **premios dentro del juego** (diamantes, ejecutivo legendario) | 0 € |
| 1. Lanzamiento de prueba | Sorteo + top por división con dinero real | 50 €/semana garantizados |
| 2. Crecimiento | Invitar amigos da papeletas extra; retos de lanzamiento; vídeos de ganadores | 10 % de los ingresos, con mínimo de 50 € |
| 3. Escala | Más premios (no más grandes); ligas por país si se traduce el juego | 10 % de los ingresos |

**Qué medir en la fase 1:** descargas que trae el mensaje de "premios reales" frente a la publicidad normal, retención a 1 y 7 días de quien juega la Liga frente a quien no, y coste del bote frente a lo que costaría traer esos jugadores con anuncios.

---

## Cómo se opera

**Dónde está cada cosa**
- **Supabase** (proyecto `de-rider-a-millonario`, región París): las tablas `league_*`, las funciones SQL y la Edge Function `league`. El código está en `supabase/` (migraciones y función).
- **Juego:**
  - `src/game/league.ts`: qué acciones se informan;
  - `src/platform/league.ts`: cliente de la API;
  - `src/ui/leaguePanel.ts`: pantalla y sincronización cada 20 s.

**Seguridad**
- Las tablas tienen RLS **sin políticas**: con la clave pública no se puede leer nada ni llamar a las funciones (comprobado).
- Solo la Edge Function accede, con la clave de servicio.
- Cada jugador se identifica con un id y una clave secreta que se guarda en su partida. El servidor solo guarda el hash de esa clave.
- Altas limitadas a 20 por IP y día; de la IP solo se guarda el hash.

**Cierre semanal:** automático cada hora con `pg_cron` (`league_close_due`). El cierre de la semana del lunes a las 00:00 (Madrid) se ejecuta a las 00:07 o a la hora siguiente.

**Cambiar premios o reglas:** en el panel de Supabase, tabla `league_config` (una sola fila):
- `draw_prize_gems` / `draw_prize_cents`: premio de cada ganador del sorteo (`draw_prize_cents = 500` son 5 €);
- `top_prize_gems` / `top_prize_cents`: premio del primero de cada división, por ejemplo `{"bronce":700,"plata":700,"oro":600}`;
- `draw_winners`, `daily_cap`, `ticket_points`, `max_tickets`, `plata_from`, `oro_from`.

Los cambios se aplican en el siguiente cierre. Para respetar las bases, cámbialos antes de que empiece la semana.

**Pagar premios en dinero (fase 1):** en `league_winners` están los ganadores con `prize_cents > 0` y `paid_at` vacío. Tras pagar, se rellena `paid_at`.

**Expulsar a un tramposo:** `update league_players set banned = true where id = '…'`. Deja de puntuar y no entra en el cierre.

**Comprobar un sorteo:** `sha256(semilla)` tiene que coincidir con el hash que se publicó al empezar la semana. Con la semilla se puede repetir el sorteo (`league_close_week`).

**Pasar a premios en dinero (fase 1).** El código ya está preparado:
1. Bases definitivas (borrador en [`BASES_LIGA.md`](BASES_LIGA.md)) y política de privacidad ([`PRIVACIDAD.md`](PRIVACIDAD.md)) revisadas por un asesor y publicadas en una web.
2. En `league_config`, poner los importes antes del lunes, por ejemplo `draw_prize_cents = 500`, `draw_prize_gems = 0` y `top_prize_cents = {"bronce":700,"plata":700,"oro":600}`. Así salen 50 €/semana.
3. Los ganadores ven en la app «¡Has ganado X €!» y dejan su email y la declaración de mayoría de edad.
4. Pagos pendientes: `select * from league_payouts_pending;`
5. Tras pagar: `update league_winners set paid_at = now(), payout_note = 'Amazon, código enviado' where week_id = '…' and player_id = '…';` El jugador lo ve como «✅ Premio pagado».

**Antes de subir los premios** (más de 50 €/semana o muchos jugadores):
- verificar el dispositivo con Play Integrity (necesita un proyecto de Google Cloud);
- verificar el email del ganador con un código;
- revisar a mano los historiales de los ganadores (`league_events`).
