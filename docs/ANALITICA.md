# Analítica

Analítica propia en Supabase, sin cuentas externas. Es **anónima**: cada instalación tiene un id aleatorio y no se guarda ningún dato personal. Solo funciona en el móvil; en el navegador de pruebas está apagada (se activa con `__game.analytics.enable()`).

## Qué se mide

| Evento | Cuándo | Datos |
| --- | --- | --- |
| `session_start` / `session_end` | Abrir y cerrar la app | Días desde la instalación, ciudad, paso del tutorial / segundos de sesión |
| `tutorial_step` / `tutorial_done` | Cada paso del tutorial | Paso y minutos desde la instalación |
| `ad_watched` | Anuncio visto entero | Ubicación (`boost_x2`, `offline_x3`…) |
| `business_bought` | Comprar un negocio | Negocio y minutos desde la instalación |
| `floor_opened` | Abrir un puesto | Negocio y número de puestos |
| `ipo` | Salir a bolsa | Acciones, si fue con anuncio, minutos |
| `city_expand` | Expandirse a otra ciudad | Ciudad, estrellas, minutos |
| `league_join` | Apuntarse a la Liga | Minutos |
| `offline_collect` | Cobrar lo ganado offline | Minutos fuera, si se triplicó |

Los eventos se guardan en el móvil y se envían cada 30 s y al salir. Si no hay conexión, se reintenta después.

## Informes

En el panel de Supabase → **SQL Editor**:

```sql
select * from analytics_retention;        -- % que vuelve el día 1, 3, 7 y 30 por cohorte
select * from analytics_dau;              -- jugadores activos y sesiones por día
select * from analytics_tutorial_funnel;  -- cuántos llegan a cada paso del tutorial
select * from analytics_ads;              -- anuncios por día y ubicación, y por jugador activo
select * from analytics_progress;         -- minutos (mediana) hasta comprar cada negocio
```

## Objetivos para el lanzamiento de prueba

| Métrica | Objetivo |
| --- | --- |
| Retención día 1 | > 35 % |
| Retención día 7 | > 12 % |
| Tutorial completado | > 80 % de quienes empiezan |
| Anuncios por jugador activo y día | 3–6 |

## Privacidad

En la política de privacidad tiene que constar que se recogen estadísticas de uso anónimas para mejorar el juego. Los informes no se pueden leer desde fuera: solo se ven desde el panel de Supabase.
