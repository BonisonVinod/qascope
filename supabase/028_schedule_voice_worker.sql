-- QAScope migration 028: Wake the production voice worker every minute
--
-- Before running:
-- 1. Add CRON_SECRET to Vercel Production environment variables.
-- 2. In Supabase SQL Editor run:
--      select vault.create_secret('PASTE_THE_SAME_SECRET', 'qascope_cron_secret');
-- 3. Then run this script.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'qascope-voice-worker') then
    perform cron.unschedule('qascope-voice-worker');
  end if;
end $$;

select cron.schedule(
  'qascope-voice-worker',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://qascope-sdiz.vercel.app/api/cron/voice-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
            from vault.decrypted_secrets
           where name = 'qascope_cron_secret'
           limit 1
        )
      ),
      body := '{"source":"supabase-cron"}'::jsonb
    );
  $$
);
