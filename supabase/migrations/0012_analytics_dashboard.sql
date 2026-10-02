-- Panel de la beta: todos los números en un solo JSON, para la página «Panel Rider Millionaire».
-- Solo lectura. Se llama desde el conector de Supabase del dueño (nunca desde el juego):
--   select public.analytics_dashboard(14, null);      -- todas las plataformas, 14 días
--   select public.analytics_dashboard(14, 'web');     -- solo la beta web
-- Fechas en hora de Madrid.

create or replace function public.analytics_dashboard(p_days int default 14, p_platform text default null)
returns jsonb language sql stable set search_path = '' as $$
with ev as (
  select e.*, (e.ts at time zone 'Europe/Madrid')::date as day
  from public.analytics_events e
  where p_platform is null or e.platform = p_platform
),
inst as (
  select device_id, min(day) as cohort from ev group by device_id
),
days as (
  select generate_series((now() at time zone 'Europe/Madrid')::date - (greatest(p_days, 1) - 1), (now() at time zone 'Europe/Madrid')::date, '1 day')::date as day
),
active as (
  select distinct device_id, day from ev
),
sess as (
  select (props ->> 'seconds')::numeric as s from ev
  where name = 'session_end' and day > (now() at time zone 'Europe/Madrid')::date - 7 and (props ->> 'seconds') ~ '^[0-9.]+$'
)
select jsonb_build_object(
  'generatedAt', now(),
  'platform', coalesce(p_platform, 'all'),
  'totals', jsonb_build_object(
    'players', (select count(*) from inst),
    'newToday', (select count(*) from inst where cohort = (now() at time zone 'Europe/Madrid')::date),
    'activeToday', (select count(*) from active where day = (now() at time zone 'Europe/Madrid')::date),
    'active7d', (select count(distinct device_id) from active where day > (now() at time zone 'Europe/Madrid')::date - 7),
    'ads7d', (select count(*) from ev where name = 'ad_watched' and day > (now() at time zone 'Europe/Madrid')::date - 7),
    'adsToday', (select count(*) from ev where name = 'ad_watched' and day = (now() at time zone 'Europe/Madrid')::date),
    'sessionMedianSec', (select round(percentile_cont(0.5) within group (order by s)::numeric) from sess),
    'sessions7d', (select count(*) from sess),
    'tutorialDone', (select count(distinct device_id) from ev where name = 'tutorial_done'),
    'leagueJoins', (select count(distinct device_id) from ev where name = 'league_join'),
    'purchases', (select count(*) from ev where name = 'purchase')
  ),
  'platforms', coalesce((
    select jsonb_object_agg(coalesce(p, '?'), n) from (
      select platform as p, count(distinct device_id) as n from ev group by platform) x), '{}'::jsonb),
  'daily', (
    select jsonb_agg(jsonb_build_object(
      'day', d.day,
      'installs', (select count(*) from inst i where i.cohort = d.day),
      'active', (select count(*) from active a where a.day = d.day),
      'sessions', (select count(*) from ev where ev.day = d.day and name = 'session_start'),
      'ads', (select count(*) from ev where ev.day = d.day and name = 'ad_watched')
    ) order by d.day) from days d),
  'retention', coalesce((
    select jsonb_agg(r order by r ->> 'cohort' desc) from (
      select jsonb_build_object(
        'cohort', i.cohort,
        'installs', count(*),
        'd1', count(*) filter (where exists (select 1 from active a where a.device_id = i.device_id and a.day = i.cohort + 1)),
        'd3', count(*) filter (where exists (select 1 from active a where a.device_id = i.device_id and a.day = i.cohort + 3)),
        'd7', count(*) filter (where exists (select 1 from active a where a.device_id = i.device_id and a.day = i.cohort + 7)),
        'eligible1', (now() at time zone 'Europe/Madrid')::date >= i.cohort + 1,
        'eligible3', (now() at time zone 'Europe/Madrid')::date >= i.cohort + 3,
        'eligible7', (now() at time zone 'Europe/Madrid')::date >= i.cohort + 7
      ) as r
      from inst i where i.cohort > (now() at time zone 'Europe/Madrid')::date - greatest(p_days, 1)
      group by i.cohort) x), '[]'::jsonb),
  'tutorial', coalesce((
    select jsonb_agg(jsonb_build_object('step', step, 'players', n) order by step) from (
      select (props ->> 'step')::int as step, count(distinct device_id) as n
      from ev where name = 'tutorial_step' and (props ->> 'step') ~ '^[0-9]+$' group by 1) x), '[]'::jsonb),
  'adsByPlacement', coalesce((
    select jsonb_agg(jsonb_build_object('placement', placement, 'ads', n) order by n desc) from (
      select coalesce(props ->> 'placement', '?') as placement, count(*) as n
      from ev where name = 'ad_watched' and day > (now() at time zone 'Europe/Madrid')::date - 7 group by 1) x), '[]'::jsonb),
  'offers', coalesce((
    select jsonb_agg(jsonb_build_object('kind', kind, 'shown', shown, 'ads', ads) order by kind) from (
      select s.kind, s.shown, coalesce(w.ads, 0) as ads from (
        select props ->> 'kind' as kind, count(*) as shown from ev
        where name = 'offer_shown' and day > (now() at time zone 'Europe/Madrid')::date - 7 group by 1) s
      left join (
        select case props ->> 'placement' when 'supply_truck' then 'truck' when 'vip_client' then 'vip' end as kind, count(*) as ads
        from ev where name = 'ad_watched' and day > (now() at time zone 'Europe/Madrid')::date - 7
          and props ->> 'placement' in ('supply_truck', 'vip_client') group by 1) w using (kind)) x), '[]'::jsonb),
  'progress', coalesce((
    select jsonb_agg(jsonb_build_object('business', biz, 'players', n, 'medianMinutes', m) order by m) from (
      select props ->> 'biz' as biz, count(distinct device_id) as n,
        round(percentile_cont(0.5) within group (order by (props ->> 'minutes')::numeric)::numeric) as m
      from ev where name = 'business_bought' and (props ->> 'minutes') ~ '^[0-9.]+$' group by 1) x), '[]'::jsonb)
)
$$;

comment on function public.analytics_dashboard(int, text) is 'Panel de la beta: números agregados (jugadores, retención, tutorial, anuncios, ofertas, progreso) en un JSON';

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
