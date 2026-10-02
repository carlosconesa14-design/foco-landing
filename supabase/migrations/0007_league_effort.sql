-- Liga por esfuerzo (sustituye divisiones y sorteo). Ver docs/LIGA.md.
-- · Todos empiezan cada semana a 0. Solo puntúa lo que es igual para todos:
--   tiempo de juego activo, entrar cada día y las misiones diarias (menos la de ver anuncios).
--   Nada depende del tamaño del imperio: llevar más tiempo jugando no da ventaja.
-- · Tiempo: bloques de 5 minutos jugando de verdad. Las primeras 3 h del día valen 10 por bloque;
--   de 3 a 6 h, 5; a partir de 6 h, nada. Quien más juega gana, sin premiar jugar sin límite.
-- · Un solo ranking. Premios del 1.º al 10.º; el dinero (si lo hay) para los 3 primeros que puedan
--   cobrarlo: quien cobró dinero la semana anterior descansa, y la web nunca cobra dinero.
-- · Ver anuncios o comprar no da puntos, y el tiempo viendo anuncios no cuenta.

alter table public.league_config
  add column play_block_points int not null default 10,
  add column play_half_points int not null default 5,
  add column play_full_blocks int not null default 36,   -- 36 × 5 min = 3 h a puntos completos
  add column play_half_blocks int not null default 36,   -- y 3 h más a la mitad
  add column mission_daily_cap int not null default 3,
  add column prize_cents jsonb not null default '[0, 0, 0]',
  add column prize_gems jsonb not null default '[300, 200, 150, 100, 100, 80, 80, 60, 60, 50]',
  add column cash_cooldown_weeks int not null default 1;

alter table public.league_winners add column rank int;

-- Acciones con puntos fijos. El tiempo («play») se calcula aparte. El resto ya no puntúa.
create or replace function public.league_kind_points(k text) returns int
language sql immutable set search_path = '' as $$
  select case k when 'login' then 10 when 'mission' then 15 when 'missions_all' then 20 when 'play' then 0 else null end
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
      -- Bloque de 5 minutos: número de bloque desde 1970. Solo de esta semana y nunca del futuro.
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

    -- Lo que solo cuenta una vez al día lleva la fecha del servidor, no la del móvil.
    if k in ('login', 'missions_all') then r := d::text; end if;
    if k = 'mission' then
      continue when r = '' or r = 'ads';   -- la misión de ver anuncios no da puntos
      select count(*) into n from public.league_events where player_id = p_player and day = d and kind = 'mission';
      continue when n >= cfg.mission_daily_cap;
      r := d::text || ':' || r;
    end if;
    continue when r = '';
    insert into public.league_events (week_id, player_id, day, kind, ref, points)
    values (w.id, p_player, d, k, r, pts) on conflict do nothing;
    if found then added := added + pts; end if;
  end loop;

  if added > 0 then
    update public.league_scores set points = points + added, reached_at = now() where week_id = w.id and player_id = p_player;
    update public.league_players set lifetime_points = lifetime_points + added where id = p_player;
  end if;
  update public.league_players set last_seen = now() where id = p_player;
  return jsonb_build_object('added', added);
end;
$$;

-- ¿Puede cobrar dinero esta semana? (no es de la web y no cobró dinero en las semanas de descanso)
create function public.league_cash_eligible(p_player uuid, p_week_start timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select not exists (select 1 from public.league_players p where p.id = p_player and p.platform = 'web')
    and not exists (
      select 1 from public.league_winners x join public.league_weeks wk on wk.id = x.week_id
      join public.league_config c on c.id = 1
      where x.player_id = p_player and x.prize_cents > 0
        and wk.ends_at <= p_week_start and wk.ends_at > p_week_start - make_interval(days => 7 * c.cash_cooldown_weeks))
$$;

create or replace function public.league_status(p_player uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  cfg public.league_config;
  w public.league_weeks;
  me public.league_scores;
  nick text;
  my_rank int;
  prev text;
  today_blocks int;
begin
  select * into cfg from public.league_config where id = 1;
  w := public.league_current_week();
  select nickname into nick from public.league_players where id = p_player;
  select * into me from public.league_scores where week_id = w.id and player_id = p_player;
  if me.player_id is not null then
    select count(*) + 1 into my_rank from public.league_scores s
    where s.week_id = w.id and (s.points > me.points or (s.points = me.points and s.reached_at < me.reached_at));
  end if;
  select count(*) into today_blocks from public.league_events
  where player_id = p_player and kind = 'play' and day = (now() at time zone 'Europe/Madrid')::date;
  select id into prev from public.league_weeks where closed_at is not null order by ends_at desc limit 1;

  return jsonb_build_object(
    'week', jsonb_build_object('id', w.id, 'endsAt', w.ends_at),
    'prizes', jsonb_build_object('cents', cfg.prize_cents, 'gems', cfg.prize_gems),
    'rules', jsonb_build_object('blockPoints', cfg.play_block_points, 'halfPoints', cfg.play_half_points,
      'fullBlocks', cfg.play_full_blocks, 'halfBlocks', cfg.play_half_blocks, 'missionCap', cfg.mission_daily_cap,
      'cooldownWeeks', cfg.cash_cooldown_weeks),
    'me', jsonb_build_object('nickname', nick, 'points', coalesce(me.points, 0), 'rank', my_rank,
      'todayBlocks', today_blocks, 'cashEligible', public.league_cash_eligible(p_player, w.starts_at)),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('nickname', p.nickname, 'points', s.points, 'me', s.player_id = p_player) order by s.points desc, s.reached_at)
      from (select * from public.league_scores where week_id = w.id and points > 0 order by points desc, reached_at limit 20) s
      join public.league_players p on p.id = s.player_id), '[]'::jsonb),
    'players', (select count(*) from public.league_scores where week_id = w.id and points > 0),
    'lastWeek', case when prev is null then null else jsonb_build_object(
      'id', prev,
      'winners', coalesce((
        select jsonb_agg(jsonb_build_object('nickname', p.nickname, 'rank', x.rank, 'cents', x.prize_cents, 'gems', x.prize_gems)
          order by x.rank nulls last)
        from public.league_winners x join public.league_players p on p.id = x.player_id where x.week_id = prev), '[]'::jsonb))
    end,
    -- Muro de la fama: el 1.º de cada una de las últimas 8 semanas.
    'fame', coalesce((
      select jsonb_agg(jsonb_build_object('week', f.week_id, 'nickname', f.nickname) order by f.ends_at desc)
      from (select x.week_id, p.nickname, wk.ends_at from public.league_winners x
            join public.league_players p on p.id = x.player_id join public.league_weeks wk on wk.id = x.week_id
            where x.rank = 1 order by wk.ends_at desc limit 8) f), '[]'::jsonb),
    'unclaimed', coalesce((
      select jsonb_agg(jsonb_build_object('week', x.week_id, 'kind', x.kind, 'gems', x.prize_gems, 'cents', x.prize_cents))
      from public.league_winners x where x.player_id = p_player and x.claimed_at is null), '[]'::jsonb)
  );
end;
$$;

-- Cierre semanal: diamantes del 1.º al 10.º por puesto y dinero para los 3 primeros que puedan cobrarlo.
create or replace function public.league_close_week(p_week text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  cfg public.league_config;
  w public.league_weeks;
  n int;
begin
  select * into cfg from public.league_config where id = 1;
  select * into w from public.league_weeks where id = p_week for update;
  if not found or w.closed_at is not null or now() < w.ends_at then
    return jsonb_build_object('error', 'not_due');
  end if;

  with ranked as (
    select s.player_id, row_number() over (order by s.points desc, s.reached_at) as rk,
      public.league_cash_eligible(s.player_id, w.starts_at) as can_cash
    from public.league_scores s join public.league_players p on p.id = s.player_id
    where s.week_id = w.id and not p.banned and s.points > 0
  ), cash as (
    select player_id, row_number() over (order by rk) as ck from ranked where can_cash
  ), prizes as (
    select r.player_id, r.rk,
      coalesce((cfg.prize_gems ->> (r.rk - 1)::int)::int, 0) as gems,
      coalesce((cfg.prize_cents ->> (c.ck - 1)::int)::int, 0) as cents
    from ranked r left join cash c using (player_id)
  )
  insert into public.league_winners (week_id, player_id, kind, division, prize_cents, prize_gems, rank)
  select w.id, player_id, 'top', null, cents, gems, rk from prizes where gems > 0 or cents > 0
  on conflict do nothing;
  get diagnostics n = row_count;

  update public.league_weeks set closed_at = now() where id = w.id;
  return jsonb_build_object('week', w.id, 'winners', n);
end;
$$;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
