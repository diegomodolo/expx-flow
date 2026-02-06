import { useState } from "react";
import { 
  FolderPlus, 
  FilePlus, 
  Star, 
  ChevronRight, 
  ChevronDown,
  Folder,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit2,
  Share2,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaceFolders } from "@/hooks/useWorkspaceFolders";
import { useWorkspaceDocuments } from "@/hooks/useWorkspaceDocuments";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { WorkspaceShareDialog } from "./WorkspaceShareDialog";
import type { WorkspaceFolder, WorkspaceDocument } from "@/types/workspace";
import { cn } from "@/lib/utils";

interface WorkspaceSidebarProps {
  selectedDocumentId: string | null;
  onSelectDocument: (doc: WorkspaceDocument | null) => void;
  onSelectFolder: (folderId: string | null) => void;
  selectedFolderId: string | null;
}

export function WorkspaceSidebar({ 
  selectedDocumentId, 
  onSelectDocument, 
  onSelectFolder,
  selectedFolderId 
}: WorkspaceSidebarProps) {
  const { folders, deleteFolder } = useWorkspaceFolders();
  const { allDocuments, favoriteDocuments, createDocument, deleteDocument } = useWorkspaceDocuments();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WorkspaceFolder | null>(null);
  const [shareResource, setShareResource] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateDocument = async (folderId?: string | null) => {
    const doc = await createDocument.mutateAsync({ folderId });
    onSelectDocument(doc);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.type === 'folder') {
      deleteFolder.mutate(deleteConfirm.id);
    } else {
      deleteDocument.mutate(deleteConfirm.id);
      if (selectedDocumentId === deleteConfirm.id) {
        onSelectDocument(null);
      }
    }
    setDeleteConfirm(null);
  };

  // Build folder tree
  const rootFolders = folders.filter(f => !f.parent_id);
  const getChildFolders = (parentId: string) => folders.filter(f => f.parent_id === parentId);
  const getDocumentsInFolder = (folderId: string | null) => 
    allDocuments.filter(d => d.folder_id === folderId);

  const renderFolderItem = (folder: WorkspaceFolder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = getChildFolders(folder.id);
    const docs = getDocumentsInFolder(folder.id);
    const hasChildren = childFolders.length > 0 || docs.length > 0;

    return (
      <div key={folder.id}>
        <div 
          className={cn(
            "group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
            selectedFolderId === folder.id && "bg-muted"
          )}
          style={{ paddingLeft: `${8 + level * 16}px` }}
        >
          <button
            onClick={() => hasChildren && toggleFolder(folder.id)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <span className="w-3.5" />
            )}
          </button>
          
          <span className="text-base" onClick={() => onSelectFolder(folder.id)}>{folder.icon}</span>
          
          <span 
            className="flex-1 text-sm truncate"
            onClick={() => onSelectFolder(folder.id)}
          >
            {folder.name}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateDocument(folder.id)}>
                <FilePlus className="h-4 w-4 mr-2" />
                Novo documento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingFolder(folder)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShareResource({ type: 'folder', id: folder.id, name: folder.name })}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteConfirm({ type: 'folder', id: folder.id, name: folder.name })}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div>
            {childFolders.map(child => renderFolderItem(child, level + 1))}
            {docs.map(doc => renderDocumentItem(doc, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderDocumentItem = (doc: WorkspaceDocument, level: number = 0) => (
    <div
      key={doc.id}
      className={cn(
        "group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
        selectedDocumentId === doc.id && "bg-primary/10"
      )}
      style={{ paddingLeft: `${24 + level * 16}px` }}
      onClick={() => onSelectDocument(doc)}
    >
      <span className="text-base">{doc.icon}</span>
      <span className="flex-1 text-sm truncate">{doc.title}</span>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShareResource({ type: 'document', id: doc.id, name: doc.title })}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setDeleteConfirm({ type: 'document', id: doc.id, name: doc.title })}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const rootDocuments = getDocumentsInFolder(null);

  return (
    <div className="h-full flex flex-col bg-card border-r">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">Workspace</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCreateDocument(null)}>
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Home/All Documents */}
          <div 
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
              selectedFolderId === null && !selectedDocumentId && "bg-muted"
            )}
            onClick={() => { onSelectFolder(null); onSelectDocument(null); }}
          >
            <Home className="h-4 w-4" />
            <span className="text-sm">Início</span>
          </div>

          {/* Favorites Section */}
          {favoriteDocuments.length > 0 && (
            <Collapsible open={favoritesExpanded} onOpenChange={setFavoritesExpanded}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50">
                  {favoritesExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Favoritos</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {favoriteDocuments.map(doc => renderDocumentItem(doc, 0))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Folders */}
          <div className="pt-2">
            <span className="text-xs text-muted-foreground px-2">Pastas</span>
            {rootFolders.map(folder => renderFolderItem(folder))}
          </div>

          {/* Root Documents */}
          {rootDocuments.length > 0 && (
            <div className="pt-2">
              <span className="text-xs text-muted-foreground px-2">Documentos</span>
              {rootDocuments.map(doc => renderDocumentItem(doc))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <CreateFolderDialog 
        open={createFolderOpen || !!editingFolder} 
        onOpenChange={(open) => {
          setCreateFolderOpen(open);
          if (!open) setEditingFolder(null);
        }}
        editingFolder={editingFolder}
      />

      <WorkspaceShareDialog
        open={!!shareResource}
        onOpenChange={(open) => !open && setShareResource(null)}
        resourceType={shareResource?.type || 'document'}
        resourceId={shareResource?.id || ''}
        resourceName={shareResource?.name || ''}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.name}"? Esta ação não pode ser desfeita.
              {deleteConfirm?.type === 'folder' && ' Todos os documentos dentro da pasta serão movidos para a raiz.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
