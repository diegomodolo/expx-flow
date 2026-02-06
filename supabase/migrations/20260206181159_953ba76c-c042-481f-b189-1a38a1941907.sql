-- =============================================
-- WORKSPACE SYSTEM TABLES
-- =============================================

-- Table: workspace_folders
CREATE TABLE public.workspace_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.workspace_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: workspace_documents
CREATE TABLE public.workspace_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.workspace_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Sem título',
  content JSONB DEFAULT '[]'::jsonb,
  icon TEXT DEFAULT '📄',
  cover_image TEXT,
  created_by UUID NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: workspace_shares
CREATE TABLE public.workspace_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('folder', 'document')),
  resource_id UUID NOT NULL,
  shared_with_user_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  shared_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate shares
CREATE UNIQUE INDEX workspace_shares_unique_idx ON public.workspace_shares(resource_type, resource_id, shared_with_user_id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_workspace_folders_company ON public.workspace_folders(company_id);
CREATE INDEX idx_workspace_folders_parent ON public.workspace_folders(parent_id);
CREATE INDEX idx_workspace_folders_created_by ON public.workspace_folders(created_by);
CREATE INDEX idx_workspace_documents_company ON public.workspace_documents(company_id);
CREATE INDEX idx_workspace_documents_folder ON public.workspace_documents(folder_id);
CREATE INDEX idx_workspace_documents_created_by ON public.workspace_documents(created_by);
CREATE INDEX idx_workspace_documents_favorite ON public.workspace_documents(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_workspace_shares_resource ON public.workspace_shares(resource_type, resource_id);
CREATE INDEX idx_workspace_shares_user ON public.workspace_shares(shared_with_user_id);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.workspace_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_shares ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR workspace_folders
-- =============================================

-- Users can view folders in their company
CREATE POLICY "Users can view folders in their company" 
ON public.workspace_folders FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

-- Users can view shared folders
CREATE POLICY "Users can view shared folders" 
ON public.workspace_folders FOR SELECT 
USING (
  id IN (
    SELECT resource_id FROM public.workspace_shares 
    WHERE resource_type = 'folder' AND shared_with_user_id = auth.uid()
  )
);

-- Users can create folders in their company
CREATE POLICY "Users can create folders in their company" 
ON public.workspace_folders FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Users can update their own folders or folders they have admin access to
CREATE POLICY "Users can update folders they own or admin" 
ON public.workspace_folders FOR UPDATE 
USING (
  created_by = auth.uid()
  OR id IN (
    SELECT resource_id FROM public.workspace_shares 
    WHERE resource_type = 'folder' 
    AND shared_with_user_id = auth.uid() 
    AND permission = 'admin'
  )
);

-- Users can delete their own folders
CREATE POLICY "Users can delete their own folders" 
ON public.workspace_folders FOR DELETE 
USING (created_by = auth.uid());

-- =============================================
-- RLS POLICIES FOR workspace_documents
-- =============================================

-- Users can view documents in their company
CREATE POLICY "Users can view documents in their company" 
ON public.workspace_documents FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

-- Users can view shared documents
CREATE POLICY "Users can view shared documents" 
ON public.workspace_documents FOR SELECT 
USING (
  id IN (
    SELECT resource_id FROM public.workspace_shares 
    WHERE resource_type = 'document' AND shared_with_user_id = auth.uid()
  )
);

-- Users can create documents in their company
CREATE POLICY "Users can create documents in their company" 
ON public.workspace_documents FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Users can update their own documents or with edit/admin permission
CREATE POLICY "Users can update documents they own or have edit access" 
ON public.workspace_documents FOR UPDATE 
USING (
  created_by = auth.uid()
  OR id IN (
    SELECT resource_id FROM public.workspace_shares 
    WHERE resource_type = 'document' 
    AND shared_with_user_id = auth.uid() 
    AND permission IN ('edit', 'admin')
  )
);

-- Users can delete their own documents
CREATE POLICY "Users can delete their own documents" 
ON public.workspace_documents FOR DELETE 
USING (created_by = auth.uid());

-- =============================================
-- RLS POLICIES FOR workspace_shares
-- =============================================

-- Users can view shares they created or are shared with
CREATE POLICY "Users can view their shares" 
ON public.workspace_shares FOR SELECT 
USING (
  shared_by = auth.uid() 
  OR shared_with_user_id = auth.uid()
);

-- Users can create shares for resources they own
CREATE POLICY "Users can create shares for owned resources" 
ON public.workspace_shares FOR INSERT 
WITH CHECK (
  shared_by = auth.uid()
  AND (
    (resource_type = 'folder' AND resource_id IN (
      SELECT id FROM public.workspace_folders WHERE created_by = auth.uid()
    ))
    OR (resource_type = 'document' AND resource_id IN (
      SELECT id FROM public.workspace_documents WHERE created_by = auth.uid()
    ))
  )
);

-- Users can delete shares they created
CREATE POLICY "Users can delete their shares" 
ON public.workspace_shares FOR DELETE 
USING (shared_by = auth.uid());

-- =============================================
-- TRIGGER FOR updated_at
-- =============================================
CREATE TRIGGER update_workspace_folders_updated_at
  BEFORE UPDATE ON public.workspace_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_documents_updated_at
  BEFORE UPDATE ON public.workspace_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();