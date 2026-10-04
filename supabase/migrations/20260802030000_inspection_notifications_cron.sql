-- ============================
-- INSPECTION SCHEDULING — daily notification cron
--
-- Schedules a daily invocation of the inspection-notifications Edge
-- Function via pg_cron + pg_net. The service_role key used to authorize
-- the call is stored in Vault under the name 'edge_function_service_role_key'
-- rather than embedded here — inserted separately via
-- `supabase db query --linked` so it never lands in a tracked file.
-- If the secret hasn't been inserted yet, the Authorization header
-- resolves to NULL and the call fails harmlessly (401) until it is.
-- ============================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select
  cron.schedule(
    'inspection-notifications-daily',
    '0 12 * * *', -- 12:00 UTC daily — adjust with cron.alter_job if a different local time is preferred
    $$
    select net.http_post(
      url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/inspection-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'edge_function_service_role_key'
          limit 1
        )
      ),
      body := '{}'::jsonb
    ) as request_id;
    $$
  );
