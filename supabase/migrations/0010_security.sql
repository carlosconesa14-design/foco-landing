-- Seguridad (auditoría del 2 de octubre de 2026). Ver docs/SEGURIDAD.md.
-- 1. Permisos: anon y authenticated no tienen nada en las tablas, vistas ni funciones de «public»,
--    tampoco en las que se creen en el futuro (antes había que acordarse en cada migración).
-- 2. Tiempo de juego: solo cuentan bloques de 5 min de la última media hora. Antes se podían
--    enviar de golpe todos los bloques pasados de la semana sin haber jugado.
-- 3. Dinero real: solo para jugadores con el dispositivo verificado (Play Integrity, pendiente) y
--    sin señales de trampa sin revisar. La plataforma que dice el móvil («app») ya no basta.
-- 4. Un email solo puede cobrar premios de una cuenta. Menos altas por IP y día (20 → 5).
-- 5. Señales de trampa que informa el juego (hora del móvil cambiada, partida editada) para revisarlas.
-- 6. Analítica: tope de eventos por dispositivo y día, contra el relleno masivo.

/* ---------- 1. Permisos ---------- */
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

/* ---------- Configuración ---------- */
alter table public.league_config
  add column play_max_age_blocks int not null default 6,          -- 6 × 5 min = 30 min hacia atrás
  add column analytics_device_day_cap int not null default 3000;
update public.league_config set reg_per_ip_day = 5 where id = 1;

/* ---------- Jugadores: verificación y señales ---------- */
alter table public.league_players
  add column verified_at timestamptz,                -- Play Integrity correcto (lo pondrá la función de verificación)
  add column flags text[] not null default '{}',     -- señales de trampa: clock, clock_future, save
  add column flags_reviewed_at timestamptz;          -- revisadas a mano: vuelve a poder cobrar dinero

/* ---------- 2 y 5. Eventos ---------- */
create or replace function public.league_add_events(p_player uuid, p_events jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  cfg public.league_config;
  w public.league_weeks;
  d date := (now() at time zone 'Europe/Madrid')::date;
  now_block bigint := floor(extract(epoch from now()) / 300);
  ev jsonb;
  k text;
  r text;
  pts int;
  n int;
  blk bigint;
  bday date;
  added int := 0;
begin
  select * into cfg from public.league_config where id = 1;
  w := public.league_current_week();
  perform 1 from public.league_players where id = p_player and not banned;
  if not found then return jsonb_build_object('error', 'player'); end if;
  insert into public.league_scores (week_id, player_id, division) values (w.id, p_player, 'bronce') on conflict do nothing;

  for ev in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) limit 50 loop
    k := ev ->> 'kind';
    r := left(coalesce(ev ->> 'ref', ''), 80);

    -- Señales de trampa: no dan ni quitan puntos, se apuntan para revisarlas.
    if k = 'flag' then
      if r in ('clock', 'clock_future', 'save') then
        update public.league_players set flags = array(select distinct unnest(flags || array[r]))
        where id = p_player and not (r = any(flags));
      end if;
      continue;
    end if;

    pts := public.league_kind_points(k);
    continue when pts is null;

    if k = 'play' then
      -- Bloque de 5 minutos: solo de esta semana, nunca del futuro y de la última media hora.
      continue when r !~ '^[0-9]{1,12}$';
      blk := r::bigint;
      continue when blk > now_block or blk < now_block - cfg.play_max_age_blocks or to_timestamp(blk * 300) < w.starts_at;
      bday := (to_timestamp(blk * 300) at time zone 'Europe/Madrid')::date;
      select count(*) into n from public.league_events where player_id = p_player and day = bday and kind = 'play';
      pts := case when n < cfg.play_full_blocks then cfg.play_block_points
                  when n < cfg.play_full_blocks + cfg.play_half_blocks then cfg.play_half_points
                  else 0 end;
      continue when pts = 0;
      insert into public.league_events (week_id, player_id, day, kind, ref, points)
      values (w.id, p_player, bday, k, r, pts) on conflict do nothing;
      if found then added := added + pts; end if;
      continue;
    end if;

    -- Una vez al día (fecha del servidor) o una vez a la semana.
    if k in ('login', 'missions_all', 'daily_reto') then r := d::text; end if;
    if k = 'weekly_all' then r := w.id; end if;
    if k = 'weekly_reto' then
      r := split_part(r, ':', 2);   -- «2026-W40:upgrades» → «upgrades»; la semana la pone el servidor
      continue when r not in ('missions', 'upgrades', 'sales', 'daily');
    end if;
    if k = 'mission' then
      -- Solo misiones que existen (y nunca la de ver anuncios).
      continue when r not in ('upgrades', 'sales', 'earned', 'hires', 'abilities', 'chests', 'floors');
      select count(*) into n from public.league_events where player_id = p_player and day = d and kind = 'mission';
      continue when n >= cfg.mission_daily_cap;
      r := d::text || ':' || r;
    end if;
    continue when r = '';
    insert into public.league_events (week_id, player_id, day, kind, ref, points)
    values (w.id, p_player, d, k, r, pts) on conflict do nothing;
    if found then
      added := added + pts;
      -- Constancia: al 5.º y al 7.º día distinto con entrada esta semana.
      if k = 'login' then
        select count(*) into n from public.league_events where player_id = p_player and week_id = w.id and kind = 'login';
        if n in (5, 7) then
          insert into public.league_events (week_id, player_id, day, kind, ref, points)
          values (w.id, p_player, d, 'streak', n::text, case when n = 5 then 50 else 100 end) on conflict do nothing;
          if found then added := added + case when n = 5 then 50 else 100 end; end if;
        end if;
      end if;
    end if;
  end loop;

  if added > 0 then
    update public.league_scores set points = points + added, reached_at = now() where week_id = w.id and player_id = p_player;
    update public.league_players set lifetime_points = lifetime_points + added where id = p_player;
  end if;
  update public.league_players set last_seen = now() where id = p_player;
  return jsonb_build_object('added', added);
end;
$$;

/* ---------- 3. Quién puede cobrar dinero ---------- */
create or replace function public.league_cash_eligible(p_player uuid, p_week_start timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select exists (
      select 1 from public.league_players p
      where p.id = p_player and p.platform = 'app' and not p.banned
        and p.verified_at is not null                                         -- dispositivo verificado
        and (cardinality(p.flags) = 0 or p.flags_reviewed_at is not null))    -- sin señales sin revisar
    and not exists (
      select 1 from public.league_winners x join public.league_weeks wk on wk.id = x.week_id
      join public.league_config c on c.id = 1
      where x.player_id = p_player and x.prize_cents > 0
        and wk.ends_at <= p_week_start and wk.ends_at > p_week_start - make_interval(days => 7 * c.cash_cooldown_weeks))
$$;

/* ---------- 4. Un email, una cuenta ---------- */
create or replace function public.league_request_payout(p_player uuid, p_week text, p_email text, p_adult boolean) returns jsonb
language plpgsql set search_path = '' as $$
declare e text := lower(btrim(coalesce(p_email, '')));
begin
  if not coalesce(p_adult, false) then return jsonb_build_object('error', 'adult'); end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or char_length(e) > 120 then return jsonb_build_object('error', 'email'); end if;
  if exists (select 1 from public.league_winners where payout_email = e and player_id <> p_player) then
    return jsonb_build_object('error', 'email_used');
  end if;
  update public.league_winners
     set payout_email = e, payout_adult = true, payout_requested_at = now()
   where player_id = p_player and week_id = p_week and prize_cents > 0 and paid_at is null;
  if not found then return jsonb_build_object('error', 'none'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Pagos pendientes con lo necesario para revisarlos antes de pagar.
create or replace view public.league_payouts_pending with (security_invoker = true) as
select w.week_id, p.nickname, w.kind, w.division, w.prize_cents / 100.0 as euros,
       w.payout_email, w.payout_requested_at, w.player_id,
       p.platform, p.verified_at, p.flags, p.flags_reviewed_at, p.created_at as player_since
from public.league_winners w join public.league_players p on p.id = w.player_id
where w.prize_cents > 0 and w.paid_at is null
order by w.payout_requested_at nulls last, w.week_id;

-- Jugadores con señales de trampa sin revisar (para el panel de Supabase).
create view public.league_flagged with (security_invoker = true) as
select p.id, p.nickname, p.platform, p.flags, p.created_at, p.last_seen,
       (select coalesce(sum(s.points), 0) from public.league_scores s where s.player_id = p.id) as points_total
from public.league_players p
where cardinality(p.flags) > 0 and p.flags_reviewed_at is null
order by p.last_seen desc;

/* ---------- 6. Analítica con tope por dispositivo y día ---------- */
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
      'event_claim', 'event_boost', 'offer_shown', 'wheel_spin')
    and octet_length(coalesce(e -> 'props', '{}'::jsonb)::text) < 500;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
