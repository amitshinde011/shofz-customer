-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the credit deduction process to run daily at 1 AM UTC
SELECT cron.schedule(
  'process-daily-credit-deductions',
  '0 1 * * *', -- Run at 1 AM UTC every day
  $$
  SELECT
    net.http_post(
        url:='https://ikxmehpfxjycevztjrvc.supabase.co/functions/v1/process-credit-deductions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlreG1laHBmeGp5Y2V2enRqcnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDQwMjMsImV4cCI6MjA3NDYyMDAyM30.avXl3qP_sXZ4-YJC3XhJhxFdBscPyXHzxDb5PJ-jmcc"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Add a comment to document the cron job
COMMENT ON EXTENSION pg_cron IS 'Used for scheduling daily credit deductions for featured items';
