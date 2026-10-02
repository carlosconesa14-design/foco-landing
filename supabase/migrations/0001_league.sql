-- Liga Millonario (fase 0). Ver docs/LIGA.md.
-- Todo con RLS activado y SIN políticas: desde fuera no se puede leer ni escribir nada.
-- Solo la Edge Function «league» (con la clave de servicio) llama a estas funciones.

create extension if not exists pgcrypto with schema extensions;

/* ---------- Configuración (una fila; se edita desde el panel de Supabase) ---------- */
create table public.league_config (
  id int primary key default 1 check (id = 1),
  daily_cap int not null default 150,            -- puntos máximos por día
  milestone_daily_cap int not null default 6,    -- hitos x2 que puntúan al día
  ticket_points int not null default 100,        -- puntos por papeleta
  max_tickets int not null default 10,
  draw_winners int not null default 6,
  draw_prize_cents int not null default 0,       -- fase 0: sin dinero
  draw_prize_gems int not null default 50,
  top_prize_cents jsonb not null default '{"bronce":0,"plata":0,"oro":0}',
  top_prize_gems jsonb not null default '{"bronce":100,"plata":150,"oro":200}',
  plata_from int not null default 1000,          -- puntos de por vida para subir a Plata
  oro_from int not null default 4000,
  reg_per_ip_day int not null default 20         -- altas máximas por IP y día
);
insert into public.league_config (id) values (1);

/* ---------- Tablas ---------- */
create table public.league_players (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  nickname text not null,
  lifetime_points int not null default 0,
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table public.league_weeks (
  id text primary key,                 -- '2026-W40' (semana ISO, hora de Madrid)
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  seed_hash text not null,             -- se publica desde el lunes: compromiso del sorteo
  seed text,                           -- se revela al cerrar; cualquiera puede comprobar el hash
  closed_at timestamptz
);

create table public.league_scores (
  week_id text not null references public.league_weeks(id),
  player_id uuid not null references public.league_players(id) on delete cascade,
  division text not null check (division in ('bronce', 'plata', 'oro')),
  points int not null default 0,
  reached_at timestamptz not null default now(),   -- desempate: quien llegó antes
  primary key (week_id, player_id)
);
create index league_scores_rank on public.league_scores (week_id, division, points desc, reached_at);

create table public.league_events (
  id bigint generated always as identity primary key,
  week_id text not null,
  player_id uuid not null references public.league_players(id) on delete cascade,
  day date not null,                   -- día en Madrid
  kind text not null,
  ref text not null,
  points int not null,
  created_at timestamptz not null default now(),
  unique (week_id, player_id, kind, ref)
);
create index league_events_day on public.league_events (player_id, day);

create table public.league_winners (
  week_id text not null references public.league_weeks(id),
  player_id uuid not null references public.league_players(id) on delete cascade,
  kind text not null check (kind in ('draw', 'top')),
  division text,
  prize_cents int not null default 0,
  prize_gems int not null default 0,
  claimed_at timestamptz,              -- premio del juego cobrado en la app
  paid_at timestamptz,                 -- premio en dinero pagado (a mano por ahora)
  primary key (week_id, player_id)     -- un premio por persona y semana
);

create table public.league_reg_log (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index league_reg_log_ip on public.league_reg_log (ip_hash, created_at);

alter table public.league_config enable row level security;
alter table public.league_players enable row level security;
alter table public.league_weeks enable row level security;
alter table public.league_scores enable row level security;
alter table public.league_events enable row level security;
alter table public.league_winners enable row level security;
alter table public.league_reg_log enable row level security;

/* ---------- Utilidades ---------- */

-- Puntos fijos de cada acción. Ver la tabla de docs/LIGA.md. Ver anuncios o comprar no aparece: 0 puntos.
create function public.league_kind_points(k text) returns int
language sql immutable set search_path = '' as $$
  select case k
    when 'login' then 10 when 'mission' then 15 when 'missions_all' then 20
    when 'milestone' then 5 when 'floor' then 10 when 'tier' then 25 when 'business' then 40
    else null end
$$;

create function public.league_division(lifetime int) returns text
language sql stable set search_path = '' as $$
  select case when lifetime >= c.oro_from then 'oro' when lifetime >= c.plata_from then 'plata' else 'bronce' end
  from public.league_config c where c.id = 1
$$;

-- Semana actual (la crea con su semilla comprometida si no existe).
create function public.league_current_week() returns public.league_weeks
language plpgsql set search_path = '' as $$
declare
  local_now timestamp := now() at time zone 'Europe/Madrid';
  wid text := to_char(local_now, 'IYYY-"W"IW');
  w public.league_weeks;
  s text;
begin
  select * into w from public.league_weeks where id = wid;
  if found then return w; end if;
  s := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.league_weeks (id, starts_at, ends_at, seed_hash, seed)
  values (
    wid,
    date_trunc('week', local_now) at time zone 'Europe/Madrid',
    (date_trunc('week', local_now) + interval '7 days') at time zone 'Europe/Madrid',
    encode(extensions.digest(s, 'sha256'), 'hex'),
    s
  )
  on conflict (id) do nothing;
  select * into w from public.league_weeks where id = wid;
  return w;
end;
$$;

create function public.league_auth(p_id uuid, p_secret text) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.league_players
    where id = p_id and not banned and secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  )
$$;

/* ---------- Alta ---------- */
create function public.league_register(p_ip_hash text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  lim int;
  n int;
  sec text := encode(extensions.gen_random_bytes(24), 'hex');
  pid uuid;
  nick text := 'Jugador ' || lpad((floor(random() * 10000))::int::text, 4, '0');
begin
  select reg_per_ip_day into lim from public.league_config where id = 1;
  select count(*) into n from public.league_reg_log where ip_hash = p_ip_hash and created_at > now() - interval '1 day';
  if n >= lim then return jsonb_build_object('error', 'too_many'); end if;
  insert into public.league_reg_log (ip_hash) values (p_ip_hash);
  insert into public.league_players (secret_hash, nickname)
  values (encode(extensions.digest(sec, 'sha256'), 'hex'), nick)
  returning id into pid;
  return jsonb_build_object('id', pid, 'secret', sec, 'nickname', nick);
end;
$$;

create function public.league_set_nickname(p_player uuid, p_nick text) returns jsonb
language plpgsql set search_path = '' as $$
declare n text := btrim(regexp_replace(coalesce(p_nick, ''), '\s+', ' ', 'g'));
begin
  if char_length(n) < 3 or char_length(n) > 16 or n !~ '^[[:alnum:] _.-]+$' then
    return jsonb_build_object('error', 'invalid');
  end if;
  update public.league_players set nickname = n where id = p_player;
  return jsonb_build_object('nickname', n);
end;
$$;

/* ---------- Eventos que dan puntos ---------- */
-- p_events: [{ "kind": "...", "ref": "..." }, ...] (máx. 50 por llamada)
-- El servidor decide el día (Madrid), los puntos, los topes y los duplicados. El móvil solo informa.
create function public.league_add_events(p_player uuid, p_events jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  cfg public.league_config;
  w public.league_weeks;
  d date := (now() at time zone 'Europe/Madrid')::date;
  ev jsonb;
  k text;
  r text;
  pts int;
  day_total int;
  ms int;
  added int := 0;
  lifetime int;
begin
  select * into cfg from public.league_config where id = 1;
  w := public.league_current_week();
  select lifetime_points into lifetime from public.league_players where id = p_player and not banned;
  if not found then return jsonb_build_object('error', 'player'); end if;
  insert into public.league_scores (week_id, player_id, division)
  values (w.id, p_player, public.league_division(lifetime))
  on conflict do nothing;

  for ev in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) limit 50 loop
    k := ev ->> 'kind';
    r := left(coalesce(ev ->> 'ref', ''), 80);
    pts := public.league_kind_points(k);
    continue when pts is null;
    -- Lo que solo cuenta una vez al día lleva la fecha del servidor, no la del móvil.
    if k in ('login', 'missions_all') then r := d::text; end if;
    if k = 'mission' then
      continue when r = '' or r = 'ads';   -- la misión de ver anuncios no da puntos
      r := d::text || ':' || r;
    end if;
    continue when r = '';
    select coalesce(sum(points), 0) into day_total from public.league_events where player_id = p_player and day = d;
    exit when day_total >= cfg.daily_cap;
    if k = 'milestone' then
      select count(*) into ms from public.league_events where player_id = p_player and day = d and kind = 'milestone';
      continue when ms >= cfg.milestone_daily_cap;
    end if;
    pts := least(pts, cfg.daily_cap - day_total);
    insert into public.league_events (week_id, player_id, day, kind, ref, points)
    values (w.id, p_player, d, k, r, pts)
    on conflict do nothing;
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

/* ---------- Estado para la pantalla de la Liga ---------- */
create function public.league_status(p_player uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  cfg public.league_config;
  w public.league_weeks;
  me public.league_scores;
  nick text;
  lifetime int;
  div text;
  my_rank int;
  prev text;
begin
  select * into cfg from public.league_config where id = 1;
  w := public.league_current_week();
  select nickname, lifetime_points into nick, lifetime from public.league_players where id = p_player;
  select * into me from public.league_scores where week_id = w.id and player_id = p_player;
  div := coalesce(me.division, public.league_division(coalesce(lifetime, 0)));
  if me.player_id is not null then
    select count(*) + 1 into my_rank from public.league_scores s
    where s.week_id = w.id and s.division = div
      and (s.points > me.points or (s.points = me.points and s.reached_at < me.reached_at));
  end if;
  select id into prev from public.league_weeks where closed_at is not null order by ends_at desc limit 1;

  return jsonb_build_object(
    'week', jsonb_build_object('id', w.id, 'endsAt', w.ends_at, 'seedHash', w.seed_hash),
    'prizes', jsonb_build_object(
      'drawWinners', cfg.draw_winners, 'drawCents', cfg.draw_prize_cents, 'drawGems', cfg.draw_prize_gems,
      'topCents', cfg.top_prize_cents, 'topGems', cfg.top_prize_gems),
    'rules', jsonb_build_object('dailyCap', cfg.daily_cap, 'ticketPoints', cfg.ticket_points, 'maxTickets', cfg.max_tickets,
      'plataFrom', cfg.plata_from, 'oroFrom', cfg.oro_from),
    'me', jsonb_build_object('nickname', nick, 'division', div, 'points', coalesce(me.points, 0),
      'tickets', least(coalesce(me.points, 0) / cfg.ticket_points, cfg.max_tickets), 'rank', my_rank,
      'lifetime', coalesce(lifetime, 0)),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('nickname', p.nickname, 'points', s.points, 'me', s.player_id = p_player) order by s.points desc, s.reached_at)
      from (select * from public.league_scores where week_id = w.id and division = div order by points desc, reached_at limit 10) s
      join public.league_players p on p.id = s.player_id), '[]'::jsonb),
    'players', (select count(*) from public.league_scores where week_id = w.id and division = div),
    'lastWeek', case when prev is null then null else jsonb_build_object(
      'id', prev,
      'seed', (select seed from public.league_weeks where id = prev),
      'seedHash', (select seed_hash from public.league_weeks where id = prev),
      'winners', coalesce((
        select jsonb_agg(jsonb_build_object('nickname', p.nickname, 'kind', x.kind, 'division', x.division,
          'cents', x.prize_cents, 'gems', x.prize_gems) order by x.kind desc, x.division)
        from public.league_winners x join public.league_players p on p.id = x.player_id where x.week_id = prev), '[]'::jsonb))
    end,
    'unclaimed', coalesce((
      select jsonb_agg(jsonb_build_object('week', x.week_id, 'kind', x.kind, 'gems', x.prize_gems, 'cents', x.prize_cents))
      from public.league_winners x where x.player_id = p_player and x.claimed_at is null), '[]'::jsonb)
  );
end;
$$;

/* ---------- Cobrar premios del juego ---------- */
create function public.league_claim(p_player uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare g int;
begin
  with c as (
    update public.league_winners set claimed_at = now()
    where player_id = p_player and claimed_at is null
    returning prize_gems
  ) select coalesce(sum(prize_gems), 0) into g from c;
  return jsonb_build_object('gems', g);
end;
$$;

/* ---------- Cierre semanal: top por división + sorteo con semilla comprometida ---------- */
create function public.league_close_week(p_week text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  cfg public.league_config;
  w public.league_weeks;
  dv text;
  n_top int := 0;
  n_draw int := 0;
begin
  select * into cfg from public.league_config where id = 1;
  select * into w from public.league_weeks where id = p_week for update;
  if not found or w.closed_at is not null or now() < w.ends_at then
    return jsonb_build_object('error', 'not_due');
  end if;

  -- 1) Primero de cada división (con al menos 1 papeleta de puntos)
  foreach dv in array array['bronce', 'plata', 'oro'] loop
    insert into public.league_winners (week_id, player_id, kind, division, prize_cents, prize_gems)
    select w.id, s.player_id, 'top', dv,
      coalesce((cfg.top_prize_cents ->> dv)::int, 0), coalesce((cfg.top_prize_gems ->> dv)::int, 0)
    from public.league_scores s join public.league_players p on p.id = s.player_id
    where s.week_id = w.id and s.division = dv and not p.banned and s.points >= cfg.ticket_points
    order by s.points desc, s.reached_at
    limit 1
    on conflict do nothing;
    if found then n_top := n_top + 1; end if;
  end loop;

  -- 2) Sorteo ponderado por papeletas. La semilla se comprometió el lunes (seed_hash)
  --    y se revela ahora: con ella cualquiera puede repetir el sorteo y comprobarlo.
  perform setseed((('x' || substr(w.seed, 1, 8))::bit(32)::int)::double precision / 2147483648.0);
  insert into public.league_winners (week_id, player_id, kind, division, prize_cents, prize_gems)
  select w.id, t.player_id, 'draw', t.division, cfg.draw_prize_cents, cfg.draw_prize_gems
  from (
    select o.player_id, o.division, -ln(1.0 - random()) / o.tickets as k
    from (
      select s.player_id, s.division, least(s.points / cfg.ticket_points, cfg.max_tickets) as tickets
      from public.league_scores s join public.league_players p on p.id = s.player_id
      where s.week_id = w.id and not p.banned and s.points >= cfg.ticket_points
        and not exists (select 1 from public.league_winners x where x.week_id = w.id and x.player_id = s.player_id)
      order by s.player_id
    ) o
  ) t
  order by t.k
  limit cfg.draw_winners
  on conflict do nothing;
  get diagnostics n_draw = row_count;

  update public.league_weeks set closed_at = now() where id = w.id;
  return jsonb_build_object('week', w.id, 'top', n_top, 'draw', n_draw);
end;
$$;

-- Cierra todas las semanas vencidas (lo llama pg_cron cada hora).
create function public.league_close_due() returns void
language plpgsql set search_path = '' as $$
declare r record;
begin
  for r in select id from public.league_weeks where closed_at is null and ends_at <= now() order by ends_at loop
    perform public.league_close_week(r.id);
  end loop;
end;
$$;

-- La semilla de la semana en curso no puede salir del servidor hasta el cierre.
-- (league_status solo devuelve la semilla de semanas cerradas.)

/* ---------- Permisos: solo la clave de servicio (Edge Function) ---------- */
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
