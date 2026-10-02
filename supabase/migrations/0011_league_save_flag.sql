-- Partidas editadas: quien tiene la señal «save» sin revisar no recibe ningún premio de la Liga
-- (ni dinero ni diamantes) hasta que alguien la revise (flags_reviewed_at). Ver docs/SEGURIDAD.md.

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
      -- partida editada a mano sin revisar: fuera de todos los premios (también diamantes)
      and not ('save' = any(p.flags) and p.flags_reviewed_at is null)
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
