-- supabase/migrations/20260515020000_fix_user_activity_logs.sql
-- Adiciona FK user_id → auth.users que estava ausente na migration original.
-- Os índices já existem no banco, portanto não precisam ser recriados.

ALTER TABLE public.user_activity_logs
  ADD CONSTRAINT user_activity_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
