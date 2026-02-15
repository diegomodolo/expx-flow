
-- Clean up duplicate squad members: keep only the latest entry per agent per squad
DELETE FROM ia_agent_squad_members
WHERE id NOT IN (
  SELECT DISTINCT ON (squad_id, agent_id) id
  FROM ia_agent_squad_members
  ORDER BY squad_id, agent_id, created_at DESC
);
