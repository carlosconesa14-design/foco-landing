# Seguridad y trampas

Auditoría del 2 de octubre de 2026: qué se revisó, qué se arregló y qué falta antes de dar **premios en dinero**.

## Resumen

| Riesgo | Antes | Ahora |
| --- | --- | --- |
| Cambiar la hora del móvil (premio diario, maletines, ruleta, ganancias offline) | Funcionaba: el juego usaba la hora del móvil | **Arreglado.** Hora del servidor y reloj que nunca va hacia atrás |
| Editar la partida guardada (dinero, diamantes) | Sin detección | **Detectado.** Firma en cada guardado; se informa a la Liga |
| Liga: enviar de golpe todos los bloques de juego de la semana sin jugar | Posible con un script | **Arreglado.** Solo cuentan bloques de la última media hora |
| Liga: inventar misiones | Cualquier texto valía | **Arreglado.** Solo las misiones que existen |
| Liga: un jugador de la web se hace pasar por la app para cobrar dinero | Posible (la plataforma la decía el móvil) | **Arreglado.** El dinero exige dispositivo verificado |
| Liga: muchas cuentas por persona | 20 altas por IP y día | 5 altas por IP y día; un email solo cobra con una cuenta |
| Base de datos: permisos de más para usuarios anónimos | Tenían permisos en las tablas (RLS bloqueaba las filas) | **Cerrado.** Ningún permiso, tampoco en tablas futuras |
| Analítica: rellenar la base de datos con eventos falsos | Sin límite | 3000 eventos por dispositivo y día |
| Peticiones enormes o mal formadas al servidor | Errores 500 | Rechazadas antes de tocar la base de datos |
| Secretos en el repositorio o en el historial | — | **Revisado: ninguno.** La clave `sb_publishable_…` es pública por diseño |
| Workflow de publicación | Secretos pegados en el script | Secretos por variables de entorno y permisos mínimos |

## Cómo funciona cada defensa

### Reloj del juego (`src/game/clock.ts`)
- Todo lo que da premios o mide esperas usa `now()`, nunca `Date.now()`.
- **Con conexión** se usa la hora del servidor (`action: "time"` de la función `league`). Se sincroniza al abrir, al volver a la app y cada 15 min. Las ganancias offline esperan a esa hora (como mucho 2,5 s).
- **Sin conexión** se usa la del móvil, pero el reloj **nunca va hacia atrás**. Quien adelanta la hora sin conexión para cobrar antes y luego la retrasa se queda "en el futuro": no vuelve a cobrar nada hasta que el tiempo real le alcanza. Solo adelanta premios que, de todas formas, iba a recibir.
- Si el móvil se desvía más de 10 min de la hora del servidor, se apunta la señal `clock`. Si la partida ya había estado en el futuro, `clock_future`.

### Firma del guardado (`src/platform/storage.ts`)
- Cada guardado es `s1:<firma>:<json>`, en una sola escritura.
- Si alguien edita la partida, la firma no cuadra: la partida **se carga igual** (nunca se castiga ni se borra) y se apunta la señal `save`.
- No es infalible: la clave va dentro de la app. Frena la edición casual y sirve como pista al revisar a un ganador.

### Señales de trampa
- Se guardan en `meta.flags` y, si el jugador está en la Liga, se envían una vez como evento `flag` (no dan ni quitan puntos).
- En el servidor van a `league_players.flags`. Un jugador con señales **no puede cobrar dinero** hasta que alguien lo revise (`flags_reviewed_at`).

### Liga (servidor)
- El servidor decide días, puntos, topes y duplicados; el móvil solo informa.
- Tiempo de juego: bloques de 5 min de la última media hora (`play_max_age_blocks` = 6), nunca del futuro.
- Misiones: solo los ids reales y nunca la de ver anuncios.
- **Dinero solo si** (`league_cash_eligible`):
  - la plataforma es `app`;
  - el dispositivo está verificado (`verified_at`, ver «Pendiente»);
  - no tiene señales sin revisar;
  - no cobró la semana anterior.
- Un email no puede cobrar premios de dos cuentas distintas.
- Ver anuncios o comprar nunca da puntos (política de AdMob y bases de la Liga).

## Revisión antes de pagar un premio en dinero

En Supabase → **SQL Editor**:

```sql
select * from league_payouts_pending;   -- premios pendientes con plataforma, verificación y señales
select * from league_flagged;           -- jugadores con señales sin revisar
```

Si las señales son inocentes (por ejemplo, un móvil con la hora mal), se marcan como revisadas:

```sql
update league_players set flags_reviewed_at = now() where id = '<id>';
```

Si es trampa, se le excluye (deja de puntuar y de ganar):

```sql
update league_players set banned = true where id = '<id>';
```

## Pendiente

### Antes de activar premios en dinero (imprescindible)
1. **Play Integrity API.** Comprueba en el servidor que la petición viene de la app oficial de Google Play, en un móvil real y sin modificar. Es lo único que frena de verdad a los bots y a las apps modificadas.
   - **Carlos:** Google Play Console → Integración de la app → **Play Integrity API** → vincular un proyecto de Google Cloud. Crear una **cuenta de servicio** con acceso a esa API y descargar su clave JSON.
   - **Claude:** con la app real y el JSON, una función `verify` que pide un token de integridad al abrir la app, lo comprueba con Google y marca `verified_at`. La clave JSON va como secreto de Supabase (`GOOGLE_PLAY_SERVICE_ACCOUNT`), **nunca en el repositorio**. Hasta entonces nadie es elegible para dinero, y así debe ser.
2. **Desempates.** Hoy, a igualdad de puntos gana quien llegó antes. Si muchos llegan al máximo, un bot que juega de madrugada llega primero. Antes de dar dinero hay que decidir con el asesor otra regla: por ejemplo, repartir el premio entre los empatados o exigir un mínimo de días distintos jugados.
3. Revisar a mano cada ganador con dinero (consultas de arriba) antes de pagar.

### Antes de publicar en Google Play
4. **Verificar las compras en el servidor.** Hoy la app se fía de lo que dice la tienda en el móvil. Con una app modificada (por ejemplo, Lucky Patcher) se pueden fingir compras. Solo afecta al juego (VIP, diamantes), no a la Liga ni al dinero real.
   - **Pasos:** una función `purchase` que comprueba cada compra con la Google Play Developer API (`purchases.products.get`) antes de entregarla.
   - **Credenciales:** la misma cuenta de servicio del punto 1, con permiso de «Ver información financiera» en Play Console.
5. **Ofuscar el código de Android** (`minifyEnabled true` con R8) cuando la versión de Play esté estable. Es poca ayuda (el juego es JavaScript), pero no cuesta nada.

### Menor
6. La extensión `pg_net` está en el esquema `public` (aviso de Supabase). No la usa el juego. Se puede mover a `extensions` cuando no haya jugadores conectados.
7. Las recompensas de anuncios se dan en el móvil. Como solo son premios del juego, no hace falta la verificación del servidor de AdMob (SSV). Si algún día un anuncio diera algo con valor real, sí haría falta.

## Secretos

| Dónde | Secreto | Para qué |
| --- | --- | --- |
| GitHub → Settings → Secrets → Actions | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Firmar el AAB de Google Play (ver `TIENDA.md`, punto 3) |
| GitHub | `ADMOB_APP_ID`, `ADMOB_REWARDED_ANDROID` | Anuncios reales en la versión de Play |
| Supabase → Edge Functions → Secrets | `SUPABASE_SERVICE_ROLE_KEY` | Ya está (lo pone Supabase). Nunca sale del servidor |
| Supabase (futuro) | `GOOGLE_PLAY_SERVICE_ACCOUNT` | Play Integrity y verificación de compras |
| En el juego (público) | `sb_publishable_…` | Clave publicable: solo deja llamar a las funciones, no leer la base de datos |

Reglas:
- **Nunca** subir al repositorio `.env`, `upload.jks`, claves JSON ni contraseñas. `.gitignore` ya excluye `.env`.
- La clave de servicio de Supabase (`service_role`) no se copia nunca fuera del panel de Supabase.
- Si un secreto se filtra: se rota (nueva clave) y se actualiza donde se use. La clave de subida de Android se restablece desde Play Console (firma de apps de Google Play).

## Comprobar que sigue todo bien

- `npm test` incluye `tests/security.test.ts`: reloj, firma y señales.
- En Supabase → Advisors → Security, solo deben salir «RLS sin políticas» (a propósito: solo entra la función del servidor) y el aviso de `pg_net`.
- Las migraciones nuevas ya no necesitan repetir los `revoke`: los permisos por defecto de `public` están cerrados (migración 0010). Se dejan igualmente al final, por si acaso.
