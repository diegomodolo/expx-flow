-- 1. change_audit_log.changed_by → ON DELETE CASCADE
ALTER TABLE public.change_audit_log DROP CONSTRAINT IF EXISTS fk_change_audit_user;
ALTER TABLE public.change_audit_log
  ADD CONSTRAINT fk_change_audit_user
  FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. ia_agent_knowledge_documents.uploaded_by → SET NULL
--    Primeiro tornar a coluna nullable
ALTER TABLE public.ia_agent_knowledge_documents ALTER COLUMN uploaded_by DROP NOT NULL;
--    Agora alterar a FK para ON DELETE SET NULL
ALTER TABLE public.ia_agent_knowledge_documents DROP CONSTRAINT IF EXISTS ia_agent_knowledge_documents_uploaded_by_fkey;
ALTER TABLE public.ia_agent_knowledge_documents
  ADD CONSTRAINT ia_agent_knowledge_documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. acquisition_funnels.user_id → ON DELETE CASCADE (já é NOT NULL, faz sentido deletar junto)
ALTER TABLE public.acquisition_funnels DROP CONSTRAINT IF EXISTS acquisition_funnels_user_id_fkey;
ALTER TABLE public.acquisition_funnels
  ADD CONSTRAINT acquisition_funnels_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. wordpress_sites.created_by e wordpress_auto_post_configs.created_by → ON DELETE CASCADE
--    (São NOT NULL, então vamos deletar junto ou precisamos trocar para nullable; deleta é mais simples)
ALTER TABLE public.wordpress_sites DROP CONSTRAINT IF EXISTS wordpress_sites_created_by_fkey;
ALTER TABLE public.wordpress_sites
  ADD CONSTRAINT wordpress_sites_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.wordpress_auto_post_configs DROP CONSTRAINT IF EXISTS wordpress_auto_post_configs_created_by_fkey;
ALTER TABLE public.wordpress_auto_post_configs
  ADD CONSTRAINT wordpress_auto_post_configs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Transformar FKs restantes (nullable) para ON DELETE SET NULL de uma vez
-- super_admins.created_by
ALTER TABLE public.super_admins DROP CONSTRAINT IF EXISTS super_admins_created_by_fkey;
ALTER TABLE public.super_admins
  ADD CONSTRAINT super_admins_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- client_health_config.cs_manager_id
ALTER TABLE public.client_health_config DROP CONSTRAINT IF EXISTS client_health_config_cs_manager_id_fkey;
ALTER TABLE public.client_health_config
  ADD CONSTRAINT client_health_config_cs_manager_id_fkey
  FOREIGN KEY (cs_manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- client_touchpoints.created_by
ALTER TABLE public.client_touchpoints DROP CONSTRAINT IF EXISTS client_touchpoints_created_by_fkey;
ALTER TABLE public.client_touchpoints
  ADD CONSTRAINT client_touchpoints_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- creative_versions.replaced_by
ALTER TABLE public.creative_versions DROP CONSTRAINT IF EXISTS fk_creative_versions_user;
ALTER TABLE public.creative_versions
  ADD CONSTRAINT fk_creative_versions_user
  FOREIGN KEY (replaced_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- crm_boards.created_by
ALTER TABLE public.crm_boards DROP CONSTRAINT IF EXISTS crm_boards_created_by_fkey;
ALTER TABLE public.crm_boards
  ADD CONSTRAINT crm_boards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- crm_contacts.created_by
ALTER TABLE public.crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_created_by_fkey;
ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- crm_deal_activities.created_by
ALTER TABLE public.crm_deal_activities DROP CONSTRAINT IF EXISTS crm_deal_activities_created_by_fkey;
ALTER TABLE public.crm_deal_activities
  ADD CONSTRAINT crm_deal_activities_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- crm_deals.created_by
ALTER TABLE public.crm_deals DROP CONSTRAINT IF EXISTS crm_deals_created_by_fkey;
ALTER TABLE public.crm_deals
  ADD CONSTRAINT crm_deals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- crm_lead_links.created_by
ALTER TABLE public.crm_lead_links DROP CONSTRAINT IF EXISTS crm_lead_links_created_by_fkey;
ALTER TABLE public.crm_lead_links
  ADD CONSTRAINT crm_lead_links_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- crm_workspace_goals.created_by
ALTER TABLE public.crm_workspace_goals DROP CONSTRAINT IF EXISTS crm_workspace_goals_created_by_fkey;
ALTER TABLE public.crm_workspace_goals
  ADD CONSTRAINT crm_workspace_goals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- crm_workspaces.created_by
ALTER TABLE public.crm_workspaces DROP CONSTRAINT IF EXISTS crm_workspaces_created_by_fkey;
ALTER TABLE public.crm_workspaces
  ADD CONSTRAINT crm_workspaces_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- editor_element_library.created_by
ALTER TABLE public.editor_element_library DROP CONSTRAINT IF EXISTS editor_element_library_created_by_fkey;
ALTER TABLE public.editor_element_library
  ADD CONSTRAINT editor_element_library_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- instagram_autopost_knowledge_files.created_by
ALTER TABLE public.instagram_autopost_knowledge_files DROP CONSTRAINT IF EXISTS instagram_autopost_knowledge_files_created_by_fkey;
ALTER TABLE public.instagram_autopost_knowledge_files
  ADD CONSTRAINT instagram_autopost_knowledge_files_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- instagram_autopost_knowledge_videos.created_by
ALTER TABLE public.instagram_autopost_knowledge_videos DROP CONSTRAINT IF EXISTS instagram_autopost_knowledge_videos_created_by_fkey;
ALTER TABLE public.instagram_autopost_knowledge_videos
  ADD CONSTRAINT instagram_autopost_knowledge_videos_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;