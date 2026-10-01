-- Analítica propia y anónima: un id aleatorio por instalación, sin datos personales.
-- Solo escribe la Edge Function «track»; las vistas solo se leen desde el panel de Supabase.

create table public.analytics_events (
  id bigint generated always as identity primary key,
  device_id uuid not null,
  ts timestamptz not null default now(),       -- hora del servidor (no se fía del móvil)
  name text not null,
  props jsonb not null default '{}'::jsonb,
  platform text,
  app_version text
);
create index analytics_events_device on public.analytics_events (device_id, ts);
create index analytics_events_name on public.analytics_events (name, ts);
alter table public.analytics_events enable row level security;

-- Primer día de cada instalación (para cohortes)
create view public.analytics_installs with (security_invoker = true) as
select device_id, min(ts) as first_seen, (min(ts) at time zone 'Europe/Madrid')::date as cohort_day
from public.analytics_events group by device_id;

-- Jugadores activos por día
create view public.analytics_dau with (security_invoker = true) as
select (ts at time zone 'Europe/Madrid')::date as day, count(distinct device_id) as dau,
       count(*) filter (where name = 'session_start') as sessions
from public.analytics_events group by 1 order by 1 desc;

-- Retención: % de cada cohorte que vuelve el día 1, 3, 7 y 30
create view public.analytics_retention with (security_invoker = true) as
with days as (
  select distinct e.device_id, ((e.ts at time zone 'Europe/Madrid')::date - i.cohort_day) as d
  from public.analytics_events e join public.analytics_installs i using (device_id)
)
select i.cohort_day, count(*) as installs,
  round(100.0 * count(*) filter (where exists (select 1 from days x where x.device_id = i.device_id and x.d = 1)) / count(*), 1) as d1,
  round(100.0 * count(*) filter (where exists (select 1 from days x where x.device_id = i.device_id and x.d = 3)) / count(*), 1) as d3,
  round(100.0 * count(*) filter (where exists (select 1 from days x where x.device_id = i.device_id and x.d = 7)) / count(*), 1) as d7,
  round(100.0 * count(*) filter (where exists (select 1 from days x where x.device_id = i.device_id and x.d = 30)) / count(*), 1) as d30
from public.analytics_installs i group by 1 order by 1 desc;

-- Embudo del tutorial: cuántas instalaciones llegan a cada paso
create view public.analytics_tutorial_funnel with (security_invoker = true) as
select (props ->> 'step')::int as step, count(distinct device_id) as devices
from public.analytics_events where name = 'tutorial_step' group by 1 order by 1;

-- Anuncios vistos por día y ubicación, y por jugador activo
create view public.analytics_ads with (security_invoker = true) as
with a as (
  select (ts at time zone 'Europe/Madrid')::date as day, props ->> 'placement' as placement, count(*) as ads
  from public.analytics_events where name = 'ad_watched' group by 1, 2
)
select a.day, a.placement, a.ads, round(a.ads::numeric / nullif(d.dau, 0), 2) as ads_per_dau
from a left join public.analytics_dau d on d.day = a.day
order by a.day desc, a.ads desc;

-- Progreso: minutos desde la instalación hasta cada negocio comprado (mediana)
create view public.analytics_progress with (security_invoker = true) as
select props ->> 'biz' as business, count(*) as players,
  percentile_cont(0.5) within group (order by (props ->> 'minutes')::numeric) as median_minutes
from public.analytics_events where name = 'business_bought' group by 1 order by 3;

-- Inserción en lote desde la Edge Function (nombres permitidos y tamaño limitado)
create function public.analytics_insert(p_device uuid, p_platform text, p_version text, p_events jsonb) returns int
language plpgsql set search_path = '' as $$
declare n int;
begin
  insert into public.analytics_events (device_id, name, props, platform, app_version)
  select p_device, e ->> 'name', coalesce(e -> 'props', '{}'::jsonb), left(p_platform, 16), left(p_version, 24)
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) with ordinality as t(e, i)
  where i <= 50
    and e ->> 'name' in ('session_start', 'session_end', 'tutorial_step', 'tutorial_done', 'ad_watched',
      'business_bought', 'floor_opened', 'ipo', 'city_expand', 'league_join', 'purchase', 'offline_collect')
    and octet_length(coalesce(e -> 'props', '{}'::jsonb)::text) < 500;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
revoke all on public.analytics_installs, public.analytics_dau, public.analytics_retention,
  public.analytics_tutorial_funnel, public.analytics_ads, public.analytics_progress from anon, authenticated;
