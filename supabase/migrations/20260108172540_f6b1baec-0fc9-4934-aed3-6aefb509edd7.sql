-- Clean up stuck sync jobs (processing for more than 2 minutes)
UPDATE sync_jobs 
SET status = 'completed', 
    completed_at = now()
WHERE status = 'processing' 
AND created_at < now() - interval '2 minutes';