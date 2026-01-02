import { AdPreviewCard } from "./AdPreviewCard";
import { Loader2 } from "lucide-react";

interface GeneratedAd {
  id: string;
  generation_type: string;
  generated_content: {
    headline?: string;
    body?: string;
    cta?: string;
    image_prompt?: string;
    concept?: string;
  };
  status: string;
  quality_score: number | null;
  generated_at: string;
  source_competitor_id?: string;
  source_ad_id?: string;
  concept_description?: string;
}

interface AdReviewGridProps {
  ads: GeneratedAd[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
}

export function AdReviewGrid({
  ads,
  selectedIds,
  onSelect,
  onApprove,
  onReject,
  isLoading,
}: AdReviewGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ads.map((ad) => (
        <AdPreviewCard
          key={ad.id}
          ad={ad}
          isSelected={selectedIds.includes(ad.id)}
          onSelect={() => onSelect(ad.id)}
          onApprove={() => onApprove(ad.id)}
          onReject={() => onReject(ad.id)}
        />
      ))}
    </div>
  );
}
