-- Cuentas anónimas del juego: sirven para invitar a amigos y para guardar la partida en la nube.
-- No piden ningún dato personal. Cada cuenta tiene:
--   id + clave secreta   → la guarda el juego en el móvil (autenticación);
--   código de invitación → público, 6 letras/números, para que un amigo lo introduzca;
--   clave de recuperación → privada, se enseña al jugador para recuperar la partida en otro móvil.
-- Todo con RLS sin políticas: solo se accede desde la Edge Function «account» con la clave de servicio.

alter table public.league_config
  add column account_per_ip_day int not null default 20,     -- altas de cuentas por IP y día
  add column ref_max_rewards int not null default 10,        -- amigos que dan premio a quien invita
  add column ref_new_days int not null default 7,            -- días que tiene un jugador nuevo para usar un código
  add column ref_qualify_minutes int not null default 15,    -- antigüedad mínima de la cuenta del amigo para contar
  add column save_max_bytes int not null default 300000;     -- tamaño máximo de una partida en la nube

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  invite_code text not null unique,
  recovery_hash text not null unique,
  ip_hash text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  save text,                        -- partida firmada tal cual la guarda el juego (s1:firma:json)
  save_at timestamptz,
  save_earned double precision      -- dinero ganado en total (para no pisar una partida mejor por error)
);
alter table public.accounts enable row level security;

create table public.account_reg_log (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index account_reg_log_ip on public.account_reg_log (ip_hash, created_at);
alter table public.account_reg_log enable row level security;

create table public.referrals (
  friend uuid primary key references public.accounts (id) on delete cascade,
  referrer uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,          -- el amigo llegó al objetivo (comprar el segundo negocio)
  claimed_at timestamptz             -- quien invita ya cobró el premio
);
create index referrals_referrer on public.referrals (referrer);
alter table public.referrals enable row level security;

/* ---------- Cuentas ---------- */

-- Código legible sin letras que se confunden (0/O, 1/I/L).
create or replace function public.account_code(n int) returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, n)
$$;

create or replace function public.account_register(p_ip_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lim int;
  n int;
  sec text := encode(extensions.gen_random_bytes(24), 'hex');
  rec text;
  code text;
  aid uuid;
begin
  select account_per_ip_day into lim from public.league_config where id = 1;
  select count(*) into n from public.account_reg_log where ip_hash = p_ip_hash and created_at > now() - interval '1 day';
  if n >= lim then return jsonb_build_object('error', 'too_many'); end if;
  insert into public.account_reg_log (ip_hash) values (p_ip_hash);
  loop
    code := public.account_code(6);
    rec := public.account_code(4) || '-' || public.account_code(4) || '-' || public.account_code(4);
    begin
      insert into public.accounts (secret_hash, invite_code, recovery_hash, ip_hash)
      values (encode(extensions.digest(sec, 'sha256'), 'hex'), code, encode(extensions.digest(replace(rec, '-', ''), 'sha256'), 'hex'), p_ip_hash)
      returning id into aid;
      exit;
    exception when unique_violation then
      -- código repetido (muy raro): se prueba otro
    end;
  end loop;
  return jsonb_build_object('id', aid, 'secret', sec, 'code', code, 'recovery', rec);
end $$;

create or replace function public.account_auth(p_id uuid, p_secret text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare ok boolean;
begin
  update public.accounts set last_seen = now()
  where id = p_id and secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  returning true into ok;
  return coalesce(ok, false);
end $$;

/* ---------- Invitaciones ---------- */

-- El amigo introduce el código de quien le invitó (una sola vez y solo los primeros días).
create or replace function public.ref_use(p_friend uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg public.league_config;
  me public.accounts;
  ref public.accounts;
begin
  select * into cfg from public.league_config where id = 1;
  select * into me from public.accounts where id = p_friend;
  select * into ref from public.accounts where invite_code = upper(btrim(coalesce(p_code, '')));
  if ref.id is null then return jsonb_build_object('error', 'code'); end if;
  if ref.id = me.id then return jsonb_build_object('error', 'self'); end if;
  if exists (select 1 from public.referrals where friend = me.id) then return jsonb_build_object('error', 'used'); end if;
  if me.created_at < now() - make_interval(days => cfg.ref_new_days) then return jsonb_build_object('error', 'old'); end if;
  -- Dos cuentas desde la misma conexión no se pueden invitar entre sí.
  if me.ip_hash is not null and me.ip_hash = ref.ip_hash then return jsonb_build_object('error', 'same'); end if;
  insert into public.referrals (friend, referrer) values (me.id, ref.id);
  return jsonb_build_object('ok', true);
end $$;

-- El amigo ha llegado al objetivo: cuenta para quien le invitó.
create or replace function public.ref_qualify(p_friend uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cfg public.league_config;
begin
  select * into cfg from public.league_config where id = 1;
  update public.referrals r set qualified_at = now()
  from public.accounts a
  where r.friend = p_friend and a.id = p_friend and r.qualified_at is null
    and a.created_at < now() - make_interval(mins => cfg.ref_qualify_minutes);
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ref_status(p_player uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', (select invite_code from public.accounts where id = p_player),
    'invited', (select count(*) from public.referrals where referrer = p_player),
    'qualified', (select count(*) from public.referrals where referrer = p_player and qualified_at is not null),
    'claimed', (select count(*) from public.referrals where referrer = p_player and claimed_at is not null),
    'max', (select ref_max_rewards from public.league_config where id = 1),
    'referred', exists (select 1 from public.referrals where friend = p_player))
$$;

-- Cobra los premios de los amigos que ya han llegado (hasta el máximo). Devuelve cuántos.
create or replace function public.ref_claim(p_player uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lim int;
  done int;
  n int;
begin
  select ref_max_rewards into lim from public.league_config where id = 1;
  perform pg_advisory_xact_lock(hashtext('ref:' || p_player::text));
  select count(*) into done from public.referrals where referrer = p_player and claimed_at is not null;
  with pick as (
    select friend from public.referrals
    where referrer = p_player and qualified_at is not null and claimed_at is null
    order by qualified_at limit greatest(0, lim - done)
  )
  update public.referrals set claimed_at = now() where friend in (select friend from pick);
  get diagnostics n = row_count;
  return jsonb_build_object('claimed', n);
end $$;

/* ---------- Partida en la nube ---------- */

create or replace function public.save_put(p_player uuid, p_save text, p_earned double precision) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare lim int;
begin
  select save_max_bytes into lim from public.league_config where id = 1;
  if p_save is null or octet_length(p_save) > lim or p_save !~ '^s1:' then return jsonb_build_object('error', 'save'); end if;
  update public.accounts set save = p_save, save_at = now(), save_earned = p_earned where id = p_player;
  return jsonb_build_object('ok', true, 'at', now());
end $$;

-- Recuperar con la clave: devuelve la cuenta (nuevo secreto) y la partida. El secreto anterior deja de valer.
create or replace function public.save_recover(p_recovery text, p_ip_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.accounts;
  sec text := encode(extensions.gen_random_bytes(24), 'hex');
  lim int;
  n int;
begin
  -- Mismo límite por IP que las altas: evita probar claves a lo bruto.
  select account_per_ip_day into lim from public.league_config where id = 1;
  select count(*) into n from public.account_reg_log where ip_hash = p_ip_hash and created_at > now() - interval '1 day';
  if n >= lim then return jsonb_build_object('error', 'too_many'); end if;
  insert into public.account_reg_log (ip_hash) values (p_ip_hash);
  -- Se aceptan con o sin guiones, en mayúsculas o minúsculas.
  select * into a from public.accounts
  where recovery_hash = encode(extensions.digest(regexp_replace(upper(coalesce(p_recovery, '')), '[^A-Z0-9]', '', 'g'), 'sha256'), 'hex');
  if a.id is null then return jsonb_build_object('error', 'recovery'); end if;
  update public.accounts set secret_hash = encode(extensions.digest(sec, 'sha256'), 'hex'), last_seen = now() where id = a.id;
  return jsonb_build_object('id', a.id, 'secret', sec, 'code', a.invite_code, 'save', a.save, 'at', a.save_at);
end $$;

comment on table public.accounts is 'Cuentas anónimas del juego: invitaciones y partida en la nube';
comment on table public.referrals is 'Invitaciones: quién invitó a quién y si ya cuenta';

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
