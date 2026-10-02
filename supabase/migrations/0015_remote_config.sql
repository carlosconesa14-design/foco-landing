-- Ajustes del juego desde el servidor (ver docs/AJUSTES.md): números que se pueden cambiar sin
-- publicar una versión nueva. El juego solo acepta las claves de su lista blanca (src/game/remote.ts)
-- y cada valor entre ¼ y 4 veces el de fábrica. Para volver a los de fábrica: values = '{}'.
--
--   update public.remote_config set values = '{"version":"camion-4min","offers":{"truckMinSec":240,"truckMaxSec":420}}' where id = 1;

create table public.remote_config (
  id int primary key check (id = 1),
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.remote_config (id) values (1);
alter table public.remote_config enable row level security;

create or replace function public.config_get() returns jsonb
language sql stable security definer set search_path = '' as $$
  select values from public.remote_config where id = 1
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
