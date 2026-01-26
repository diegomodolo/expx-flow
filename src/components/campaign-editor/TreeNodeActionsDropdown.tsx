import { useState } from "react";
import { TreeNode } from "@/hooks/useCampaignTree";
import { MoreHorizontal, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const { duplicateEntity, isDuplicating } = useTreeNodeActions({ onSuccess: onRefresh });

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

  // Google Ads não suporta duplicação via API
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
          <DropdownMenuItem onClick={() => setShowDuplicateModal(true)}>
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
