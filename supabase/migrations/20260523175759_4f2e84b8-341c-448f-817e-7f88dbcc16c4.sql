
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('dispatch-notifications') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-notifications');

SELECT cron.schedule(
  'dispatch-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--2ea6a8ce-aeb4-4797-af6b-cd4cdd791146.lovable.app/api/public/hooks/dispatch-notifications',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkd2dseGdrbm5qZWZ3bmN2YXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDE5MzQsImV4cCI6MjA5NDUxNzkzNH0.a3tqVMaZUlVffDLVhBmAYg1E3D2wZucIpiUusuzZCpg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
