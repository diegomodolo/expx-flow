-- Reset last_executed_at for the weekly report trigger to allow next execution
UPDATE whatsapp_trigger_schedules 
SET last_executed_at = NULL, next_execution_at = NOW()
WHERE trigger_id = '9a70ad21-95bb-4129-92f1-338e75592ff1';