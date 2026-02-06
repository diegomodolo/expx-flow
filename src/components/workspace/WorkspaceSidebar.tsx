import { useState } from "react";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DroppableProvided,
  DraggableProvided
} from "react-beautiful-dnd";
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
  Home,
  GripVertical
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
import { useToast } from "@/hooks/use-toast";

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
  const { allDocuments, favoriteDocuments, createDocument, deleteDocument, updateDocument } = useWorkspaceDocuments();
  const { toast } = useToast();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WorkspaceFolder | null>(null);
  const [shareResource, setShareResource] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

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

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    setDragOverFolderId(null);
    
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    
    // Get the destination folder ID from droppableId
    // Format: "folder-{folderId}" or "root"
    let targetFolderId: string | null = null;
    
    if (destination.droppableId === 'root') {
      targetFolderId = null;
    } else if (destination.droppableId.startsWith('folder-')) {
      targetFolderId = destination.droppableId.replace('folder-', '');
    }
    
    // Get the document being dragged
    const docId = draggableId.replace('doc-', '');
    const doc = allDocuments.find(d => d.id === docId);
    
    if (!doc) return;
    
    // Don't do anything if dropped in the same folder
    if (doc.folder_id === targetFolderId) return;
    
    // Update the document's folder
    try {
      await updateDocument.mutateAsync({ 
        id: docId, 
        folderId: targetFolderId 
      });
      
      const folderName = targetFolderId 
        ? folders.find(f => f.id === targetFolderId)?.name || 'pasta'
        : 'raiz';
      
      toast({
        title: 'Documento movido',
        description: `"${doc.title}" foi movido para ${targetFolderId ? `"${folderName}"` : 'a raiz'}`,
      });
      
      // Auto-expand the target folder
      if (targetFolderId) {
        setExpandedFolders(prev => new Set([...prev, targetFolderId!]));
      }
    } catch (error) {
      toast({
        title: 'Erro ao mover documento',
        description: 'Não foi possível mover o documento.',
        variant: 'destructive',
      });
    }
  };

  const handleDragUpdate = (update: any) => {
    if (update.destination?.droppableId) {
      if (update.destination.droppableId === 'root') {
        setDragOverFolderId('root');
      } else if (update.destination.droppableId.startsWith('folder-')) {
        setDragOverFolderId(update.destination.droppableId.replace('folder-', ''));
      }
    } else {
      setDragOverFolderId(null);
    }
  };

  // Build folder tree
  const rootFolders = folders.filter(f => !f.parent_id);
  const getChildFolders = (parentId: string) => folders.filter(f => f.parent_id === parentId);
  const getDocumentsInFolder = (folderId: string | null) => 
    allDocuments.filter(d => d.folder_id === folderId);

  const renderDraggableDocument = (doc: WorkspaceDocument, index: number, level: number = 0) => (
    <Draggable key={doc.id} draggableId={`doc-${doc.id}`} index={index}>
      {(provided: DraggableProvided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
            selectedDocumentId === doc.id && "bg-primary/10",
            snapshot.isDragging && "bg-muted shadow-lg"
          )}
          style={{ 
            paddingLeft: `${16 + level * 16}px`,
            ...provided.draggableProps.style 
          }}
          onClick={() => onSelectDocument(doc)}
        >
          <div 
            {...provided.dragHandleProps} 
            className="opacity-0 group-hover:opacity-100 cursor-grab"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
          
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
      )}
    </Draggable>
  );

  const renderFolderItem = (folder: WorkspaceFolder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = getChildFolders(folder.id);
    const docs = getDocumentsInFolder(folder.id);
    const hasChildren = childFolders.length > 0 || docs.length > 0;
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <Droppable key={folder.id} droppableId={`folder-${folder.id}`} type="DOCUMENT">
        {(provided: DroppableProvided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <div 
              className={cn(
                "group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
                selectedFolderId === folder.id && "bg-muted",
                (isDragOver || snapshot.isDraggingOver) && "bg-primary/20 ring-2 ring-primary ring-inset"
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
              
              <span className="text-base" onClick={() => { onSelectFolder(folder.id); toggleFolder(folder.id); }}>
                {folder.icon}
              </span>
              
              <span 
                className="flex-1 text-sm truncate"
                onClick={() => { onSelectFolder(folder.id); toggleFolder(folder.id); }}
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
                {docs.map((doc, index) => renderDraggableDocument(doc, index, level + 1))}
              </div>
            )}
            
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  const rootDocuments = getDocumentsInFolder(null);

  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate}>
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
                  {favoriteDocuments.map((doc, index) => (
                    <div
                      key={doc.id}
                      className={cn(
                        "group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
                        selectedDocumentId === doc.id && "bg-primary/10"
                      )}
                      style={{ paddingLeft: '24px' }}
                      onClick={() => onSelectDocument(doc)}
                    >
                      <span className="text-base">{doc.icon}</span>
                      <span className="flex-1 text-sm truncate">{doc.title}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Folders */}
            <div className="pt-2">
              <span className="text-xs text-muted-foreground px-2">Pastas</span>
              {rootFolders.map(folder => renderFolderItem(folder))}
            </div>

            {/* Root Documents - Droppable area */}
            <Droppable droppableId="root" type="DOCUMENT">
              {(provided: DroppableProvided, snapshot) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps}
                  className={cn(
                    "pt-2 min-h-[50px] rounded-md transition-colors",
                    (dragOverFolderId === 'root' || snapshot.isDraggingOver) && "bg-primary/10 ring-2 ring-primary/30 ring-inset"
                  )}
                >
                  <span className="text-xs text-muted-foreground px-2">Documentos</span>
                  {rootDocuments.map((doc, index) => renderDraggableDocument(doc, index))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
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
    </DragDropContext>
  );
}