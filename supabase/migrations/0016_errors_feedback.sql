-- Registro de errores, medición de las funciones nuevas y opiniones desde el juego.
-- Todo anónimo (id aleatorio por instalación), como el resto de la analítica (ver docs/ANALITICA.md).

/* ---------- 1. Eventos permitidos: los de antes y los nuevos ---------- */
create or replace function public.analytics_insert(p_device uuid, p_platform text, p_version text, p_events jsonb) returns int
language plpgsql set search_path = '' as $$
declare
  n int;
  cap int;
  used int;
begin
  select analytics_device_day_cap into cap from public.league_config where id = 1;
  select count(*) into used from public.analytics_events
  where device_id = p_device and ts > now() - interval '1 day';
  if used >= cap then return 0; end if;
  insert into public.analytics_events (device_id, name, props, platform, app_version)
  select p_device, e ->> 'name', coalesce(e -> 'props', '{}'::jsonb), left(p_platform, 16), left(p_version, 24)
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) with ordinality as t(e, i)
  where i <= least(50, cap - used)
    and e ->> 'name' in ('session_start', 'session_end', 'tutorial_step', 'tutorial_done', 'ad_watched',
      'business_bought', 'floor_opened', 'ipo', 'city_expand', 'league_join', 'purchase', 'offline_collect',
      'event_claim', 'event_boost', 'offer_shown', 'wheel_spin',
      -- nuevos: errores y funciones de la beta 2
      'error', 'unlock', 'twist', 'lux_buy', 'auto_upgrade', 'fusion', 'rival_win', 'season_buy',
      'ref_used', 'cloud_recover', 'founder')
    and octet_length(coalesce(e -> 'props', '{}'::jsonb)::text) < 500;
  get diagnostics n = row_count;
  return n;
end;
$$;

/* ---------- 2. Opiniones ---------- */
create table public.feedback (
  id bigint generated always as identity primary key,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  rating smallint check (rating between 1 and 5),
  message text check (char_length(message) <= 1000),
  platform text,
  app_version text,
  -- idioma, ciudad, minutos desde que instaló… (pequeño, lo pone el juego)
  meta jsonb not null default '{}'::jsonb check (octet_length(meta::text) < 500),
  read_at timestamptz
);
create index feedback_device on public.feedback (device_id, created_at);
create index feedback_created on public.feedback (created_at desc);
alter table public.feedback enable row level security;

-- Como mucho 3 opiniones por dispositivo y día. Devuelve true si se guarda.
create or replace function public.feedback_insert(p_device uuid, p_platform text, p_version text, p_rating int, p_message text, p_meta jsonb)
returns boolean language plpgsql set search_path = '' as $$
declare
  msg text := nullif(btrim(left(coalesce(p_message, ''), 1000)), '');
  r smallint := case when p_rating between 1 and 5 then p_rating else null end;
begin
  if r is null and msg is null then return false; end if;
  if (select count(*) from public.feedback where device_id = p_device and created_at > now() - interval '1 day') >= 3 then
    return false;
  end if;
  insert into public.feedback (device_id, rating, message, platform, app_version, meta)
  values (p_device, r, msg, left(p_platform, 16), left(p_version, 24),
          case when octet_length(coalesce(p_meta, '{}'::jsonb)::text) < 500 then coalesce(p_meta, '{}'::jsonb) else '{}'::jsonb end);
  return true;
end;
$$;

/* ---------- 3. Panel: funciones nuevas, desbloqueos, errores y opiniones ---------- */
create or replace function public.analytics_dashboard_extra(p_days int default 7, p_platform text default null)
returns jsonb language sql stable set search_path = '' as $$
with ev as (
  select e.*, (e.ts at time zone 'Europe/Madrid')::date as day
  from public.analytics_events e
  where (p_platform is null or e.platform = p_platform)
    and e.ts > now() - make_interval(days => greatest(p_days, 1))
),
players as (select count(distinct device_id) as n from ev)
select jsonb_build_object(
  'days', greatest(p_days, 1),
  'players', (select n from players),
  'features', coalesce((
    select jsonb_agg(jsonb_build_object('feature', f, 'players', p, 'times', c) order by p desc) from (
      select case when name = 'twist' then 'twist_' || coalesce(props ->> 'what', '?') else name end as f,
             count(distinct device_id) as p, count(*) as c
      from ev where name in ('twist', 'lux_buy', 'auto_upgrade', 'fusion', 'rival_win', 'season_buy', 'ref_used', 'cloud_recover', 'founder')
      group by 1) x), '[]'::jsonb),
  'autoUpgrade', jsonb_build_object(
    'uses', (select count(*) from ev where name = 'auto_upgrade'),
    'withAd', (select count(*) from ev where name = 'auto_upgrade' and props ->> 'ad' = 'true'),
    'medianSteps', (select round(percentile_cont(0.5) within group (order by (props ->> 'steps')::numeric)::numeric)
                    from ev where name = 'auto_upgrade' and (props ->> 'steps') ~ '^[0-9]+$')),
  'unlocks', coalesce((
    select jsonb_agg(jsonb_build_object('feature', f, 'players', n, 'medianMinutes', m) order by m) from (
      select props ->> 'feature' as f, count(distinct device_id) as n,
             round(percentile_cont(0.5) within group (order by (props ->> 'minutes')::numeric)::numeric) as m
      from ev where name = 'unlock' and (props ->> 'minutes') ~ '^[0-9.]+$' group by 1) x), '[]'::jsonb),
  'errors', coalesce((
    select jsonb_agg(jsonb_build_object('msg', msg, 'src', src, 'times', c, 'players', p, 'last', last) order by c desc) from (
      select props ->> 'msg' as msg, props ->> 'src' as src, count(*) as c, count(distinct device_id) as p, max(ts) as last
      from ev where name = 'error' group by 1, 2 order by count(*) desc limit 15) x), '[]'::jsonb),
  'errorPlayers', (select count(distinct device_id) from ev where name = 'error'),
  'feedback', jsonb_build_object(
    'count', (select count(*) from public.feedback f where f.created_at > now() - make_interval(days => greatest(p_days, 1))
               and (p_platform is null or f.platform = p_platform)),
    'avgRating', (select round(avg(rating)::numeric, 2) from public.feedback f
                  where f.created_at > now() - make_interval(days => greatest(p_days, 1)) and (p_platform is null or f.platform = p_platform)),
    'byRating', coalesce((select jsonb_object_agg(rating, n) from (
                  select rating, count(*) as n from public.feedback f
                  where f.created_at > now() - make_interval(days => greatest(p_days, 1)) and rating is not null
                    and (p_platform is null or f.platform = p_platform) group by 1) x), '{}'::jsonb),
    'latest', coalesce((select jsonb_agg(jsonb_build_object('at', created_at, 'rating', rating, 'message', message, 'platform', platform, 'meta', meta) order by created_at desc)
                from (select * from public.feedback f where (p_platform is null or f.platform = p_platform)
                      order by created_at desc limit 25) x), '[]'::jsonb))
)
$$;

comment on function public.analytics_dashboard_extra(int, text) is 'Panel de la beta (2): funciones nuevas, desbloqueos, errores y opiniones';

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
