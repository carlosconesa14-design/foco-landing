-- Cierre automático: cada hora cierra las semanas vencidas (sorteo + top por división).
create extension if not exists pg_cron;
select cron.schedule('league-close-due', '7 * * * *', $$select public.league_close_due()$$);

-- OJO en migraciones futuras: Supabase da permiso de ejecución a anon en las funciones nuevas
-- de «public». Repetir siempre al final:
--   revoke all on all functions in schema public from public, anon, authenticated;
--   grant execute on all functions in schema public to service_role;
