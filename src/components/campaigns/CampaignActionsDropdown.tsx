import { useState } from "react";
import { MoreHorizontal, Play, Pause, Edit2, DollarSign, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CampaignRenameModal } from "./CampaignRenameModal";
import { CampaignBudgetModal } from "./CampaignBudgetModal";
import { CampaignDuplicateModal } from "./CampaignDuplicateModal";
import { useCampaignActions } from "@/hooks/useCampaignActions";

interface Campaign {
  id: string;
  client_id: string;
  name: string;
  status: 'active' | 'paused' | 'finished';
  facebook_id?: string;
  spend?: number;
}

interface CampaignActionsDropdownProps {
  campaign: Campaign;
  onRefresh: () => void;
}

export function CampaignActionsDropdown({ campaign, onRefresh }: CampaignActionsDropdownProps) {
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  
  const { loading, currentAction, toggleStatus, renameCampaign, updateBudget, duplicateCampaign } = useCampaignActions(onRefresh);

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    await toggleStatus(campaign.id, campaign.client_id, newStatus);
  };

  const isMetaCampaign = campaign.facebook_id || campaign.id;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={handleToggleStatus}
            disabled={loading || campaign.status === 'finished'}
          >
            {campaign.status === 'active' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausar Campanha
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Ativar Campanha
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              setRenameModalOpen(true);
            }}
            disabled={loading}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Renomear
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              setBudgetModalOpen(true);
            }}
            disabled={loading}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Editar Orçamento
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              setDuplicateModalOpen(true);
            }}
            disabled={loading}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicar Campanha
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CampaignRenameModal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        campaign={campaign}
        onRename={async (newName) => {
          await renameCampaign(campaign.id, campaign.client_id, newName);
          setRenameModalOpen(false);
        }}
        loading={loading && currentAction === 'rename'}
      />

      <CampaignBudgetModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        campaign={campaign}
        onUpdateBudget={async (budgetType, amount) => {
          await updateBudget(campaign.id, campaign.client_id, budgetType, amount);
          setBudgetModalOpen(false);
        }}
        loading={loading && currentAction === 'budget'}
      />

      <CampaignDuplicateModal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        campaign={campaign}
        onDuplicate={async (newName) => {
          await duplicateCampaign(campaign.id, campaign.client_id, newName);
          setDuplicateModalOpen(false);
        }}
        loading={loading && currentAction === 'duplicate'}
      />
    </>
  );
}
