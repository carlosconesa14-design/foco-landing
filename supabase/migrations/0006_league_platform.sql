-- Beta web: se guarda desde qué plataforma se apuntó cada jugador.
-- Los jugadores de la web nunca reciben premios en dinero (es fácil hacer trampas en el navegador):
-- si les toca uno, el importe en dinero se anula y se quedan con los diamantes de ese premio.

alter table public.league_players add column platform text not null default 'app'
  check (platform in ('app', 'web'));

create function public.league_register(p_ip_hash text, p_platform text) returns jsonb
language plpgsql set search_path = '' as $$
declare r jsonb;
begin
  r := public.league_register(p_ip_hash);
  if r ? 'id' and p_platform = 'web' then
    update public.league_players set platform = 'web' where id = (r ->> 'id')::uuid;
  end if;
  return r;
end;
$$;

create function public.league_winners_web_no_cash() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.prize_cents > 0 and exists (select 1 from public.league_players p where p.id = new.player_id and p.platform = 'web') then
    new.prize_cents := 0;
    -- Si ese premio no tenía diamantes, uno de consolación para que no se quede en nada.
    if new.prize_gems = 0 then new.prize_gems := 300; end if;
  end if;
  return new;
end;
$$;

create trigger league_winners_web_no_cash before insert on public.league_winners
  for each row execute function public.league_winners_web_no_cash();

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
