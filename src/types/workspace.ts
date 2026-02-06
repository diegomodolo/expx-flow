export interface WorkspaceFolder {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  icon: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceDocument {
  id: string;
  company_id: string;
  folder_id: string | null;
  title: string;
  content: any; // BlockNote content
  icon: string;
  cover_image: string | null;
  created_by: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceShare {
  id: string;
  resource_type: 'folder' | 'document';
  resource_id: string;
  shared_with_user_id: string;
  permission: 'view' | 'edit' | 'admin';
  shared_by: string;
  created_at: string;
}

export type WorkspaceShareWithUser = WorkspaceShare & {
  shared_with_user?: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
};

export interface FolderTreeItem extends WorkspaceFolder {
  children: FolderTreeItem[];
  documents: WorkspaceDocument[];
}
