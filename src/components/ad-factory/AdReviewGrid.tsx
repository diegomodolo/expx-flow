import { useState } from "react";
import { AdPreviewCard, GeneratedAdType } from "./AdPreviewCard";
import { ApprovalDestinationDialogV2 } from "./ApprovalDestinationDialogV2";
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

interface AdConfig {
  destination_url: string;
  primary_text: string;
  headline: string;
  description: string;
  cta: string;
  pixel_id: string;
  url_params: string;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<GeneratedAdType | null>(null);

  const handleApproveClick = (ad: GeneratedAdType) => {
    if (!clientId || !companyId) {
      toast.error('Selecione um cliente primeiro');
      return;
    }
    setSelectedAd(ad);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedAd(null);
    }
    setDialogOpen(open);
  };

  const handleViewDetails = (ad: GeneratedAdType) => {
    // Now uses the same modal as approve
    if (!clientId || !companyId) {
      toast.error('Selecione um cliente primeiro');
      return;
    }
    setSelectedAd(ad);
    setDialogOpen(true);
  };

  const handleApproveAndPublish = async (destinations: SelectedDestination[], adConfig: AdConfig) => {
    if (!selectedAd || !clientId || !companyId) return;

    console.log('[AdReviewGrid] Publishing ad:', selectedAd.id, 'to destinations:', destinations);

    const { data, error } = await supabase.functions.invoke('publish-approved-ads', {
      body: {
        client_id: clientId,
        company_id: companyId,
        ad_id: selectedAd.id,
        destinations,
        ad_config: adConfig,
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

    setSelectedAd(null);
    setDialogOpen(false);
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
            onViewDetails={() => handleViewDetails(ad)}
          />
        ))}
      </div>

      {clientId && companyId && (
        <ApprovalDestinationDialogV2
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          adId={selectedAd?.id || ''}
          clientId={clientId}
          companyId={companyId}
          defaultCampaignId={defaultCampaignId}
          defaultAdSetId={defaultAdSetId}
          onApprove={handleApproveAndPublish}
          onStatusChange={onRefetch}
          ad={selectedAd}
          adContent={selectedAd?.generated_content}
        />
      )}
    </>
  );
}
