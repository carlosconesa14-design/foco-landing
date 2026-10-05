-- Premios de la Liga a la vista de todos (landing page): los de esta semana, cuándo acaba,
-- cuántos compiten y los últimos ganadores. Solo datos públicos: lo mismo que ya enseña la app.
-- La landing lo pide a la Edge Function «league» con { action: "prizes" }, sin cuenta.
create or replace function public.league_prizes() returns jsonb
language plpgsql set search_path = '' as $$
declare
  cfg public.league_config;
  w public.league_weeks;
begin
  select * into cfg from public.league_config where id = 1;
  w := public.league_current_week();
  return jsonb_build_object(
    'endsAt', w.ends_at,
    'cents', cfg.prize_cents,
    'gems', cfg.prize_gems,
    'players', (select count(*) from public.league_scores where week_id = w.id and points > 0),
    'fame', coalesce((
      select jsonb_agg(jsonb_build_object('nickname', f.nickname, 'cents', f.prize_cents, 'gems', f.prize_gems) order by f.ends_at desc)
      from (select p.nickname, x.prize_cents, x.prize_gems, wk.ends_at from public.league_winners x
            join public.league_players p on p.id = x.player_id join public.league_weeks wk on wk.id = x.week_id
            where x.rank = 1 order by wk.ends_at desc limit 3) f), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.league_prizes() from public, anon, authenticated;
grant execute on function public.league_prizes() to service_role;
