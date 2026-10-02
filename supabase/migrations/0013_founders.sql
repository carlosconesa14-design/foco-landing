-- Carrera de fundadores: los primeros jugadores en llegar a una ciudad nueva (Dubái) reciben
-- un ejecutivo exclusivo. Solo premios del juego: nunca dinero real.
-- Cada jugador recibe su puesto de llegada (1.º, 2.º…) una sola vez por ciudad. Los primeros
-- `spots` son fundadores. Se guardan también los demás puestos, para enseñarle a cada uno
-- en qué lugar llegó.
--
-- Contra trampas (ver docs/SEGURIDAD.md):
-- - jugadores bloqueados o con una partida editada sin revisar: no reciben puesto;
-- - nadie llega a Dubái en menos de `founders_min_days` días desde que empezó a jugar
--   (lo más antiguo entre su alta en la Liga y el primer evento de analítica de su móvil).

alter table public.league_config
  add column founders_spots int not null default 100,
  add column founders_min_days numeric not null default 3;

create table public.founders (
  city text not null,
  player uuid not null references public.league_players (id) on delete cascade,
  rank int not null,
  claimed_at timestamptz not null default now(),
  primary key (city, player),
  unique (city, rank)
);
alter table public.founders enable row level security;

create or replace function public.founder_claim(p_player uuid, p_city text, p_device uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cfg public.league_config;
  p public.league_players;
  r int;
  first_seen timestamptz;
begin
  if p_city not in ('dubai') then
    return jsonb_build_object('error', 'city');
  end if;
  select * into cfg from public.league_config where id = 1;
  select * into p from public.league_players where id = p_player;
  if not found or p.banned then
    return jsonb_build_object('error', 'player');
  end if;

  -- Ya tenía puesto: se devuelve el mismo (la llamada se puede repetir sin riesgo).
  select f.rank into r from public.founders f where f.city = p_city and f.player = p_player;
  if found then
    return jsonb_build_object('rank', r, 'founder', r <= cfg.founders_spots, 'spots', cfg.founders_spots,
      'taken', (select count(*) from public.founders f where f.city = p_city));
  end if;

  if 'save' = any(p.flags) and p.flags_reviewed_at is null then
    return jsonb_build_object('error', 'review');
  end if;

  first_seen := p.created_at;
  if p_device is not null then
    select least(first_seen, min(e.ts)) into first_seen from public.analytics_events e where e.device_id = p_device;
    first_seen := coalesce(first_seen, p.created_at);
  end if;
  if now() - first_seen < make_interval(secs => cfg.founders_min_days * 86400) then
    return jsonb_build_object('error', 'too_fast',
      'after', first_seen + make_interval(secs => cfg.founders_min_days * 86400));
  end if;

  -- Un puesto cada vez, sin huecos ni repetidos.
  perform pg_advisory_xact_lock(hashtext('founders:' || p_city));
  select coalesce(max(f.rank), 0) + 1 into r from public.founders f where f.city = p_city;
  insert into public.founders (city, player, rank) values (p_city, p_player, r);
  return jsonb_build_object('rank', r, 'founder', r <= cfg.founders_spots, 'spots', cfg.founders_spots, 'taken', r);
end $$;

-- Plazas ocupadas (para enseñar «Quedan N plazas» en el mapa del mundo).
create or replace function public.founder_count(p_city text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'spots', (select founders_spots from public.league_config where id = 1),
    'taken', (select count(*) from public.founders f where f.city = p_city))
$$;

comment on table public.founders is 'Carrera de fundadores: puesto de llegada de cada jugador a cada ciudad nueva (los primeros reciben un ejecutivo exclusivo del juego)';

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
