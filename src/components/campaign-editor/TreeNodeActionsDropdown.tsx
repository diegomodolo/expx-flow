import { useState } from "react";
import { TreeNode } from "@/hooks/useCampaignTree";
import { MoreHorizontal, Copy, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { DuplicateEntityModal } from "./DuplicateEntityModal";
import { useTreeNodeActions } from "@/hooks/useTreeNodeActions";
import { useSyncingItems } from "@/contexts/SyncingItemsContext";

interface TreeNodeActionsDropdownProps {
  node: TreeNode;
  clientId: string;
  onRefresh: () => void;
}

export function TreeNodeActionsDropdown({
  node,
  clientId,
  onRefresh,
}: TreeNodeActionsDropdownProps) {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { addSyncingItem, removeSyncingItem } = useSyncingItems();
  const { duplicateEntity, isDuplicating, syncEntity, isSyncing, deleteEntity, isDeleting } = useTreeNodeActions({ 
    onSuccess: onRefresh,
    addSyncingItem,
    removeSyncingItem,
  });

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

  const getEntityLabel = () => {
    switch (node.type) {
      case "campaign":
        return "Campanha";
      case "adset":
        return "Conjunto";
      case "ad":
        return "Criativo";
      default:
        return "Item";
    }
  };

  const getDeleteWarningMessage = () => {
    switch (node.type) {
      case "campaign":
        return "Isso irá excluir a campanha, todos os conjuntos de anúncios e criativos associados, tanto do banco de dados local quanto do Meta. Esta ação não pode ser desfeita.";
      case "adset":
        return "Isso irá excluir o conjunto de anúncios e todos os criativos associados, tanto do banco de dados local quanto do Meta. Esta ação não pode ser desfeita.";
      case "ad":
        return "Isso irá excluir o criativo tanto do banco de dados local quanto do Meta. Esta ação não pode ser desfeita.";
      default:
        return "Esta ação não pode ser desfeita.";
    }
  };

  // Google Ads não suporta ações via API
  if (node.platform === "google") {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {/* Sync option - always visible, highlighted when needsSync */}
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
