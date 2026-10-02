-- Camión de suministros, cliente VIP y ruleta diaria: nuevos nombres permitidos y una vista
-- con cuántas visitas se ven y cuántas acaban en anuncio (conversión por día).

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
      'event_claim', 'event_boost', 'offer_shown', 'wheel_spin')
    and octet_length(coalesce(e -> 'props', '{}'::jsonb)::text) < 500;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Por día y tipo de visita: cuántas aparecieron y cuántas se cobraron con anuncio.
create view public.analytics_offers with (security_invoker = true) as
with shown as (
  select (ts at time zone 'Europe/Madrid')::date as day, props ->> 'kind' as kind, count(*) as shown
  from public.analytics_events where name = 'offer_shown' group by 1, 2
), watched as (
  select (ts at time zone 'Europe/Madrid')::date as day,
    case props ->> 'placement' when 'supply_truck' then 'truck' when 'vip_client' then 'vip' end as kind, count(*) as ads
  from public.analytics_events where name = 'ad_watched' and props ->> 'placement' in ('supply_truck', 'vip_client') group by 1, 2
)
select s.day, s.kind, s.shown, coalesce(w.ads, 0) as ads, round(coalesce(w.ads, 0)::numeric / nullif(s.shown, 0), 2) as conversion
from shown s left join watched w using (day, kind)
order by 1 desc, 2;

comment on view public.analytics_offers is 'Visitas (camión, VIP) mostradas y cobradas con anuncio, por día';

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
revoke all on public.analytics_offers from anon, authenticated;
