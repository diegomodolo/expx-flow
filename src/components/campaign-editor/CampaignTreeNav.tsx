import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TreeNode } from '@/hooks/useCampaignTree';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Layers, 
  ImageIcon,
  ChevronRight,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DuplicateEntityModal } from './DuplicateEntityModal';
import { useTreeNodeActions } from '@/hooks/useTreeNodeActions';
import { useSyncingItems } from '@/contexts/SyncingItemsContext';

interface CampaignTreeNavProps {
  tree: TreeNode | null;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNode) => void;
  clientId: string;
  onRefresh?: () => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNode) => void;
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (nodeId: string) => void;
  clientId: string;
  onRefresh?: () => void;
}

function TreeNodeItem({
  node,
  selectedNodeId,
  onSelectNode,
  level,
  expandedNodes,
  toggleExpand,
  clientId,
  onRefresh,
}: TreeNodeItemProps) {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { addSyncingItem, removeSyncingItem } = useSyncingItems();
  const { duplicateEntity, isDuplicating, syncEntity, isSyncing, deleteEntity, isDeleting } = useTreeNodeActions({ 
    onSuccess: onRefresh,
    addSyncingItem,
    removeSyncingItem,
  });

  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  const getIcon = () => {
    switch (node.type) {
      case 'campaign':
        return <Target className="w-4 h-4 flex-shrink-0" />;
      case 'adset':
        return <Layers className="w-4 h-4 flex-shrink-0" />;
      case 'ad':
        return <ImageIcon className="w-4 h-4 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (node.status === 'active') {
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40">
          Ativo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-muted text-muted-foreground">
        Pausado
      </Badge>
    );
  };

  const getEntityLabel = () => {
    switch (node.type) {
      case 'campaign':
        return 'Campanha';
      case 'adset':
        return 'Conjunto';
      case 'ad':
        return 'Criativo';
      default:
        return 'Item';
    }
  };

  const getDeleteWarningMessage = () => {
    switch (node.type) {
      case 'campaign':
        return 'Isso irá excluir a campanha, todos os conjuntos de anúncios e criativos associados, tanto do banco de dados local quanto do Meta. Esta ação não pode ser desfeita.';
      case 'adset':
        return 'Isso irá excluir o conjunto de anúncios e todos os criativos associados, tanto do banco de dados local quanto do Meta. Esta ação não pode ser desfeita.';
      case 'ad':
        return 'Isso irá excluir o criativo tanto do banco de dados local quanto do Meta. Esta ação não pode ser desfeita.';
      default:
        return 'Esta ação não pode ser desfeita.';
    }
  };

  const handleDuplicate = async (newName: string) => {
    await duplicateEntity({
      type: node.type,
      id: node.id,
      clientId,
      facebookId: node.facebookId,
      newName,
      platform: node.platform,
    });
    setShowDuplicateModal(false);
  };

  const handleSync = async () => {
    await syncEntity({
      type: node.type,
      id: node.id,
      clientId,
      facebookId: node.facebookId,
    });
  };

  const handleDelete = async () => {
    await deleteEntity({
      type: node.type,
      id: node.id,
      clientId,
      facebookId: node.facebookId,
    });
    setShowDeleteConfirm(false);
  };

  const showActionsMenu = node.platform !== 'google';

  return (
    <>
      <div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-3 cursor-pointer transition-colors group",
            isSelected
              ? "bg-primary/10 ring-2 ring-primary ring-inset"
              : "hover:bg-muted/50",
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onSelectNode(node)}
        >
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-muted rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform text-muted-foreground",
                  isExpanded && "rotate-90"
                )}
              />
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Icon */}
          <span className={cn(
            node.type === 'campaign' ? "text-primary" : "text-muted-foreground"
          )}>
            {getIcon()}
          </span>

          {/* Name */}
          <span
            className={cn(
              "flex-1 truncate text-xs",
              node.type === 'campaign' && "font-medium text-foreground",
              node.type === 'adset' && "font-normal text-foreground",
              node.type === 'ad' && "font-normal text-foreground"
            )}
            title={node.name}
          >
            {node.name}
          </span>

          {/* Status badge */}
          {getStatusBadge()}

          {/* Actions menu */}
          {showActionsMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-popover" onClick={(e) => e.stopPropagation()}>
                {/* Sync option */}
                <DropdownMenuItem 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={node.needsSync ? "text-amber-600 font-medium" : ""}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar {getEntityLabel()}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Duplicate option */}
                <DropdownMenuItem 
                  onClick={() => setShowDuplicateModal(true)}
                  disabled={node.needsSync}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar {getEntityLabel()}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Delete option */}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting || node.needsSync}
                  className="text-destructive focus:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Excluir {getEntityLabel()}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                level={level + 1}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                clientId={clientId}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>

      <DuplicateEntityModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        entity={{
          id: node.id,
          name: node.name,
          type: node.type,
        }}
        onDuplicate={handleDuplicate}
        loading={isDuplicating}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {getEntityLabel()}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a excluir <strong>"{node.name}"</strong>.
              </p>
              <p className="text-destructive font-medium">
                {getDeleteWarningMessage()}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CampaignTreeNav({
  tree,
  selectedNodeId,
  onSelectNode,
  clientId,
  onRefresh,
}: CampaignTreeNavProps) {
  // Initialize with campaign and all ad sets expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree) {
      initial.add(tree.id);
      tree.children?.forEach(child => initial.add(child.id));
    }
    return initial;
  });

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Calculate totals for the summary
  const summary = useMemo(() => {
    if (!tree) return { adSets: 0, ads: 0, activeAds: 0 };
    
    let adSets = 0;
    let ads = 0;
    let activeAds = 0;
    
    tree.children?.forEach(adSet => {
      adSets++;
      adSet.children?.forEach(ad => {
        ads++;
        if (ad.status === 'active') activeAds++;
      });
    });
    
    return { adSets, ads, activeAds };
  }, [tree]);

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Nenhuma campanha selecionada
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with summary */}
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm mb-2">Estrutura</h3>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{summary.adSets} conjuntos</span>
          <span>•</span>
          <span>{summary.ads} anúncios</span>
        </div>
      </div>

      {/* Tree navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <TreeNodeItem
            node={tree}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            level={0}
            expandedNodes={expandedNodes}
            toggleExpand={toggleExpand}
            clientId={clientId}
            onRefresh={onRefresh}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
