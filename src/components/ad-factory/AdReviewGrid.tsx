import { useState } from "react";
import { AdPreviewCard, GeneratedAdType } from "./AdPreviewCard";
import { ApprovalDestinationDialog } from "./ApprovalDestinationDialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdReviewGridProps {
  ads: GeneratedAdType[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
  clientId?: string;
  companyId?: string;
  defaultCampaignId?: string | null;
  defaultAdSetId?: string | null;
  onRefetch?: () => void;
}

interface SelectedDestination {
  campaignId: string;
  campaignName: string;
  adSetIds: string[];
}

export function AdReviewGrid({
  ads,
  selectedIds,
  onSelect,
  onApprove,
  onReject,
  isLoading,
  clientId,
  companyId,
  defaultCampaignId,
  defaultAdSetId,
  onRefetch,
}: AdReviewGridProps) {
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedAdForApproval, setSelectedAdForApproval] = useState<GeneratedAdType | null>(null);

  const handleApproveClick = (ad: GeneratedAdType) => {
    if (!clientId || !companyId) {
      // Fallback to simple approve without dialog
      onApprove(ad.id);
      return;
    }
    setSelectedAdForApproval(ad);
    setApprovalDialogOpen(true);
  };

  const handleApproveAndPublish = async (destinations: SelectedDestination[]) => {
    if (!selectedAdForApproval || !clientId || !companyId) return;

    console.log('[AdReviewGrid] Publishing ad:', selectedAdForApproval.id, 'to destinations:', destinations);

    const { data, error } = await supabase.functions.invoke('publish-approved-ads', {
      body: {
        client_id: clientId,
        company_id: companyId,
        ad_id: selectedAdForApproval.id,
        destinations,
      },
    });

    if (error) {
      console.error('[AdReviewGrid] Publish error:', error);
      throw new Error(error.message);
    }

    if (!data.success && data.error) {
      throw new Error(data.error);
    }

    if (data.published > 0) {
      toast.success(`Anúncio publicado em ${data.published} destino(s)!`);
      if (data.failed > 0) {
        toast.warning(`${data.failed} destino(s) falharam`);
      }
    } else {
      toast.error('Nenhum anúncio foi publicado');
    }

    // Refresh the list
    if (onRefetch) {
      onRefetch();
    }

    setSelectedAdForApproval(null);
    setApprovalDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">📭</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum anúncio encontrado
        </h3>
        <p className="text-muted-foreground max-w-md">
          Clique em "Gerar Anúncios" para criar novos anúncios com IA ou ajuste os filtros.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map((ad) => (
          <AdPreviewCard
            key={ad.id}
            ad={ad}
            isSelected={selectedIds.includes(ad.id)}
            onSelect={() => onSelect(ad.id)}
            onApprove={() => handleApproveClick(ad)}
            onReject={() => onReject(ad.id)}
          />
        ))}
      </div>

      {selectedAdForApproval && clientId && companyId && (
        <ApprovalDestinationDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          adId={selectedAdForApproval.id}
          clientId={clientId}
          companyId={companyId}
          defaultCampaignId={defaultCampaignId}
          defaultAdSetId={defaultAdSetId}
          onApprove={handleApproveAndPublish}
          adContent={selectedAdForApproval.generated_content}
        />
      )}
    </>
  );
}
