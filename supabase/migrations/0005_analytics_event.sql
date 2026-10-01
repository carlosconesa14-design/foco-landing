-- Evento del fin de semana: nuevos nombres permitidos y una vista con el progreso por semana.

create or replace function public.analytics_insert(p_device uuid, p_platform text, p_version text, p_events jsonb) returns int
language plpgsql set search_path = '' as $$
declare n int;
begin
  insert into public.analytics_events (device_id, name, props, platform, app_version)
  select p_device, e ->> 'name', coalesce(e -> 'props', '{}'::jsonb), left(p_platform, 16), left(p_version, 24)
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) with ordinality as t(e, i)
  where i <= 50
    and e ->> 'name' in ('session_start', 'session_end', 'tutorial_step', 'tutorial_done', 'ad_watched',
      'business_bought', 'floor_opened', 'ipo', 'city_expand', 'league_join', 'purchase', 'offline_collect',
      'event_claim', 'event_boost')
    and octet_length(coalesce(e -> 'props', '{}'::jsonb)::text) < 500;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Cuántos jugadores llegan a cada premio del evento, por semana (y cuántos x2 con anuncio).
create view public.analytics_weekend_event with (security_invoker = true) as
select props ->> 'week' as week, (props ->> 'tier')::int as tier, count(distinct device_id) as players
from public.analytics_events where name = 'event_claim' group by 1, 2
union all
select props ->> 'week', 0, count(*) from public.analytics_events where name = 'event_boost' group by 1
order by 1 desc, 2;

comment on view public.analytics_weekend_event is 'tier 0 = anuncios x2 vistos; tier 1..10 = jugadores que cobraron ese premio';

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
revoke all on public.analytics_weekend_event from anon, authenticated;
