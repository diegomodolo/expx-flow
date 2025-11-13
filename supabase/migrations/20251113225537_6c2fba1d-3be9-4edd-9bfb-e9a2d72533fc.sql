-- Alterar colunas entity_id e facebook_id de UUID para TEXT
-- Isso permite armazenar IDs numéricos do Facebook
ALTER TABLE automation_execution_progress 
  ALTER COLUMN entity_id TYPE TEXT,
  ALTER COLUMN facebook_id TYPE TEXT;