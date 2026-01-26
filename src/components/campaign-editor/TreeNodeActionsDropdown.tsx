import { useState } from "react";
import { TreeNode } from "@/hooks/useCampaignTree";
import { MoreHorizontal, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DuplicateEntityModal } from "./DuplicateEntityModal";
import { useTreeNodeActions } from "@/hooks/useTreeNodeActions";

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
  const { duplicateEntity, isDuplicating, syncEntity, isSyncing } = useTreeNodeActions({ onSuccess: onRefresh });

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
    </>
  );
}
