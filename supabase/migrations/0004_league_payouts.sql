-- Liga fase 1: premios en dinero. El ganador deja un email de contacto y declara ser mayor de 18;
-- el pago se hace a mano (tarjeta regalo / PayPal / Bizum) y se marca con paid_at.

alter table public.league_winners
  add column payout_email text,
  add column payout_adult boolean,
  add column payout_requested_at timestamptz,
  add column payout_note text;

-- Pagos pendientes (para el panel de Supabase; no se puede leer desde fuera)
create view public.league_payouts_pending with (security_invoker = true) as
select w.week_id, p.nickname, w.kind, w.division, w.prize_cents / 100.0 as euros,
       w.payout_email, w.payout_requested_at, w.player_id
from public.league_winners w join public.league_players p on p.id = w.player_id
where w.prize_cents > 0 and w.paid_at is null
order by w.payout_requested_at nulls last, w.week_id;
revoke all on public.league_payouts_pending from anon, authenticated;

-- El ganador pide su premio en dinero
create function public.league_request_payout(p_player uuid, p_week text, p_email text, p_adult boolean) returns jsonb
language plpgsql set search_path = '' as $$
declare e text := lower(btrim(coalesce(p_email, '')));
begin
  if not coalesce(p_adult, false) then return jsonb_build_object('error', 'adult'); end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or char_length(e) > 120 then return jsonb_build_object('error', 'email'); end if;
  update public.league_winners
     set payout_email = e, payout_adult = true, payout_requested_at = now()
   where player_id = p_player and week_id = p_week and prize_cents > 0 and paid_at is null;
  if not found then return jsonb_build_object('error', 'none'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Estado de los premios en dinero del jugador (últimas 8 semanas)
create function public.league_payouts(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'week', week_id, 'cents', prize_cents,
    'state', case when paid_at is not null then 'paid' when payout_requested_at is not null then 'pending' else 'need_data' end)
    order by week_id desc), '[]'::jsonb)
  from (select * from public.league_winners where player_id = p_player and prize_cents > 0 order by week_id desc limit 8) w
$$;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
