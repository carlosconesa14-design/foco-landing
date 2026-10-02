# Ajustes desde el servidor

Algunos números del juego se pueden cambiar **sin publicar una versión nueva**: el juego los pide al servidor al arrancar (y guarda los últimos por si no hay conexión). Sirve para probar cambios y ver en el [panel de la beta](ANALITICA.md) si suben los anuncios vistos por jugador.

## Cómo se cambian

En Supabase → **SQL Editor**:

```sql
-- Ver los ajustes actuales
select values, updated_at from public.remote_config;

-- Cambiar: el camión llega cada 4–7 min y el cliente VIP paga 15 💎
update public.remote_config
set values = '{"version": "camion-4min", "offers": {"truckMinSec": 240, "truckMaxSec": 420, "vipGems": 15}}', updated_at = now()
where id = 1;

-- Volver a los valores de fábrica
update public.remote_config set values = '{}', updated_at = now() where id = 1;
```

- Los jugadores reciben los ajustes la próxima vez que abran el juego.
- **`version`** es un nombre libre para el cambio. Se apunta en la analítica (`session_start`, propiedad `cfg`) para comparar antes y después.
- Lo que no se ponga vuelve al valor de fábrica.

## Qué se puede cambiar

Solo esta lista (`src/game/remote.ts`). Cada valor se limita a **entre ¼ y 4 veces el de fábrica**, así que un error al escribirlo nunca puede romper la partida. Los precios y la producción de los negocios no se tocan desde aquí.

| Grupo | Clave | De fábrica | Qué hace |
| --- | --- | --- | --- |
| `offers` | `truckMinSec`, `truckMaxSec` | 300, 540 | Cada cuánto llega el camión de suministros (segundos) |
| `offers` | `truckMinutes` | 15 | Minutos de ventas que trae el camión |
| `offers` | `vipMinSec`, `vipMaxSec` | 420, 780 | Cada cuánto llega el cliente VIP |
| `offers` | `vipGems`, `vipPerDay` | 10, 4 | Diamantes del cliente VIP y cuántos al día |
| `offers` | `visibleSec` | 30 | Segundos que esperan el camión y el VIP |
| `offers` | `wheelAdSpins` | 3 | Giros extra de la ruleta con anuncio |
| `viral` | `viralMinSec`, `viralMaxSec` | 120, 240 | Cada cuánto sale el 💸 viral |
| `viral` | `viralVisibleSec` | 25 | Segundos que se ve el 💸 |
| `viral` | `rushMinutes` | 30 | Duración de la hora punta (anuncio) |
| `viral` | `boostHours` | 4 | Horas del x2 por anuncio |
| `lux` | `trialMin`, `trialsPerDay` | 60, 5 | «Mi vida»: minutos de la prueba con anuncio y pruebas al día |
| `lux` | `dealOff` | 0,5 | Descuento de la oferta del día (máximo 0,9) |
| `season` | `visitorMinSec`, `visitorMaxSec` | 60, 120 | Cada cuánto aparecen los fantasmas de Halloween |
| `season` | `visitorMin`, `visitorMax` | 5, 10 | Caramelos por fantasma |
| `season` | `adMult` | 3 | Multiplicador de caramelos con anuncio |
| `season` | `salesPer` | 50 | Ventas por caramelo |
| `twists` | `orderMinMin`, `orderMaxMin` | 6, 10 | Almacén: minutos entre pedidos urgentes |
| `twists` | `orderMinutes`, `orderTarget` | 3, 1,25 | Plazo del pedido y cuánto pide (veces el ritmo del negocio) |
| `twists` | `orderRewardMin`, `orderGems` | 4, 3 | Premio del pedido: minutos de ingresos y diamantes |
| `twists` | `criticMinMin`, `criticMaxMin`, `criticWaitSec` | 6, 10, 45 | Restaurante: cada cuánto viene el crítico y cuánto espera |
| `twists` | `criticTaps`, `criticTipMin` | 12, 2 | Toques en la cocina que pide el crítico y propina (minutos de ingresos) |
| `twists` | `hypePerSale`, `hypePerTap`, `hypeDecay` | 4, 2, 0,5 | TikTok: lo que sube el hype por venta y por toque, y lo que baja por segundo |
| `twists` | `viralSec`, `viralRestMin`, `hypeAdCooldownMin` | 60, 6, 10 | Duración del directo viral, minutos de descanso después y espera entre colaboraciones (anuncio) |

Para añadir otra clave: ponerla en `GROUPS` (`src/game/remote.ts`), en esta tabla y en `tests/remote.test.ts` si tiene reglas especiales.

## Cosas a tener en cuenta
- Los límites del servidor (invitaciones, nube, fundadores, Liga) se cambian aparte, en `league_config`.
- No subas mucho las ocasiones de anuncio de golpe: AdMob vigila que los anuncios sean opcionales y no molesten. Mejor cambios pequeños y comparar.
