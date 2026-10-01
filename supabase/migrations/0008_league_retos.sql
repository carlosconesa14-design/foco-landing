-- Liga: retos diarios y semanales, constancia y menos peso del tiempo de juego. Ver docs/LIGA.md.
-- · Tiempo: 4 puntos por bloque de 5 min las 2 primeras horas del día, 2 de 2 a 4 h, nada después.
-- · Reto del día (40, uno al día), retos de la semana (60 cada uno: misiones, mejoras, ventas, retos del día)
--   y extra por completarlos todos (100).
-- · Constancia: 10 por entrar cada día, +50 al 5.º día distinto de la semana y +100 al 7.º.

update public.league_config set play_block_points = 4, play_half_points = 2, play_full_blocks = 24, play_half_blocks = 24 where id = 1;

create or replace function public.league_kind_points(k text) returns int
language sql immutable set search_path = '' as $$
  select case k
    when 'login' then 10 when 'mission' then 15 when 'missions_all' then 20 when 'play' then 0
    when 'daily_reto' then 40 when 'weekly_reto' then 60 when 'weekly_all' then 100
    else null end
$$;

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
    pts := public.league_kind_points(k);
    continue when pts is null;

    if k = 'play' then
      continue when r !~ '^[0-9]{1,12}$';
      blk := r::bigint;
      continue when blk > now_block or to_timestamp(blk * 300) < w.starts_at;
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
      continue when r = '' or r = 'ads';   -- la misión de ver anuncios no da puntos
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

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
