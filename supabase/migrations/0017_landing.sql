-- Landing page (raíz de la web): visitas, clics y apuntarse a la beta cerrada de Android.
-- Van en tablas propias para no mezclar visitantes con jugadores en las cohortes del juego.
-- El id de dispositivo es el mismo que usa el juego en esa web, así se puede medir quién pasa
-- de la landing a jugar (unir landing_events con analytics_events por device_id).

/* ---------- 1. Eventos de la landing ---------- */
create table public.landing_events (
  id bigint generated always as identity primary key,
  device_id uuid not null,
  ts timestamptz not null default now(),
  name text not null,                    -- view | click | signup
  props jsonb not null default '{}'::jsonb -- idioma, botón, de dónde viene (referrer / utm_source)
);
create index landing_events_ts on public.landing_events (ts);
create index landing_events_device on public.landing_events (device_id, ts);
alter table public.landing_events enable row level security;

create or replace function public.landing_insert(p_device uuid, p_events jsonb) returns int
language plpgsql set search_path = '' as $$
declare
  n int;
  used int;
begin
  select count(*) into used from public.landing_events
  where device_id = p_device and ts > now() - interval '1 day';
  if used >= 60 then return 0; end if;
  insert into public.landing_events (device_id, name, props)
  select p_device, e ->> 'name', coalesce(e -> 'props', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) with ordinality as t(e, i)
  where i <= least(10, 60 - used)
    and e ->> 'name' in ('view', 'click', 'signup')
    and octet_length(coalesce(e -> 'props', '{}'::jsonb)::text) < 400;
  get diagnostics n = row_count;
  return n;
end;
$$;

/* ---------- 2. Apuntarse a la beta cerrada (email de la cuenta de Google) ---------- */
create table public.beta_signups (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) <= 254),
  lang text,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  invited_at timestamptz                  -- lo marca Carlos al añadirlo a la prueba de Google Play
);
create unique index beta_signups_email on public.beta_signups (lower(email));
alter table public.beta_signups enable row level security;

-- Como mucho 3 intentos por dispositivo y día. Repetir un email no da error (devuelve true).
create or replace function public.beta_signup(p_device uuid, p_email text, p_lang text) returns boolean
language plpgsql set search_path = '' as $$
declare
  mail text := lower(btrim(left(coalesce(p_email, ''), 254)));
begin
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then return false; end if;
  if (select count(*) from public.beta_signups where device_id = p_device and created_at > now() - interval '1 day') >= 3 then
    return false;
  end if;
  insert into public.beta_signups (email, lang, device_id) values (mail, left(p_lang, 8), p_device)
  on conflict ((lower(email))) do nothing;
  return true;
end;
$$;


/* ---------- 3. Informe para el panel ---------- */
create or replace function public.landing_report(p_days int default 14) returns jsonb
language sql stable set search_path = '' as $$
  with ev as (select * from public.landing_events where ts > now() - make_interval(days => p_days)),
  played as (
    select distinct e.device_id from ev e
    join public.analytics_events a on a.device_id = e.device_id and a.name = 'session_start' and a.ts >= e.ts
  )
  select jsonb_build_object(
    'visitors', (select count(distinct device_id) from ev where name = 'view'),
    'views', (select count(*) from ev where name = 'view'),
    'clicks', (select coalesce(jsonb_object_agg(k, c), '{}'::jsonb) from (select coalesce(props ->> 'target', '?') k, count(*) c from ev where name = 'click' group by 1) x),
    'sources', (select coalesce(jsonb_object_agg(k, c), '{}'::jsonb) from (select coalesce(nullif(props ->> 'src', ''), 'directo') k, count(distinct device_id) c from ev where name = 'view' group by 1) x),
    'played', (select count(*) from played),
    'signups', (select count(*) from public.beta_signups where created_at > now() - make_interval(days => p_days)),
    'signups_total', (select count(*) from public.beta_signups)
  );
$$;

/* ---------- 4. Solo el servidor (Edge Function «track» y el panel) ---------- */
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
