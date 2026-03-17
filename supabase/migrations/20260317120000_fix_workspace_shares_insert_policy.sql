-- Fix: colaboradores não-admin não conseguem compartilhar suas próprias notas
-- Causa: policy INSERT em workspace_shares faz sub-query em workspace_documents
-- que por sua vez tem RLS referenciando workspace_shares (dependência circular)
-- Solução: função SECURITY DEFINER que bypassa RLS para verificar ownership

CREATE OR REPLACE FUNCTION public.user_owns_workspace_resource(
  _resource_type TEXT,
  _resource_id UUID,
  _user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_documents
    WHERE id = _resource_id AND created_by = _user_id AND _resource_type = 'document'
    UNION ALL
    SELECT 1 FROM workspace_folders
    WHERE id = _resource_id AND created_by = _user_id AND _resource_type = 'folder'
  );
$$;

-- Drop old policy
DROP POLICY IF EXISTS "Users can create shares for owned resources" ON public.workspace_shares;

-- Recreate with SECURITY DEFINER function (no circular RLS dependency)
CREATE POLICY "Users can create shares for owned resources"
ON public.workspace_shares FOR INSERT
WITH CHECK (
  shared_by = auth.uid()
  AND user_owns_workspace_resource(resource_type, resource_id, auth.uid())
);
