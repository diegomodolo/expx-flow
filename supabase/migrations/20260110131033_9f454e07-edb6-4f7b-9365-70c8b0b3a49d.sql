-- Habilitar REPLICA IDENTITY FULL para que o Supabase Realtime capture os dados completos
ALTER TABLE automation_execution_progress REPLICA IDENTITY FULL;