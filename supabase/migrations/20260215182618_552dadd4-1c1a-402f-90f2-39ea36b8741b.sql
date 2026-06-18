-- Fix FK constraint that blocks member deletion
ALTER TABLE ia_agent_squad_execution_steps
  DROP CONSTRAINT ia_agent_squad_execution_steps_member_id_fkey;
DO $$ BEGIN
  ALTER TABLE ia_agent_squad_execution_steps
  ADD CONSTRAINT ia_agent_squad_execution_steps_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES ia_agent_squad_members(id)
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Also make member_id nullable since we're setting it to null on delete
ALTER TABLE ia_agent_squad_execution_steps
  ALTER COLUMN member_id DROP NOT NULL;