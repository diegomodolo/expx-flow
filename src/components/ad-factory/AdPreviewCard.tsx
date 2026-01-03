import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Copy, RefreshCw, Sparkles, Star, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GeneratedAdType {
  id: string;
  generation_type: string;
  generated_content: {
    headline?: string;
    body?: string;
    cta?: string;
    image_prompt?: string;
    image_url?: string;
    concept?: string;
  };
  status: string;
  quality_score: number | null;
  generated_at: string;
  concept_description?: string;
  client_id?: string;
  company_id?: string;
}

interface AdPreviewCardProps {
  ad: GeneratedAdType;
  isSelected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewDetails?: () => void;
}

const typeConfig = {
  clone: {
    label: "Clone",
    icon: Copy,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  concept: {
    label: "Conceito",
    icon: Sparkles,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  iteration: {
    label: "Iteração",
    icon: RefreshCw,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
};

export function AdPreviewCard({
  ad,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onViewDetails,
}: AdPreviewCardProps) {
  const config = typeConfig[ad.generation_type as keyof typeof typeConfig] || typeConfig.concept;
  const TypeIcon = config.icon;
  const content = ad.generated_content;
  const isPending = ad.status === "pending";

  return (
    <Card
      className={cn(
        "relative transition-all duration-200 hover:shadow-lg overflow-hidden",
        isSelected && "ring-2 ring-primary",
        ad.status === "approved" && "border-green-500/50 bg-green-500/5",
        ad.status === "rejected" && "border-red-500/50 bg-red-500/5 opacity-60"
      )}
    >
      {/* Selection & Status Bar */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            disabled={!isPending}
          />
          <Badge variant="outline" className={cn("gap-1", config.color)}>
            <TypeIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {ad.quality_score && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{ad.quality_score}</span>
            </div>
          )}
        </div>
      </div>

      {/* Instagram Mockup - Clickable for details */}
      <div className="bg-background cursor-pointer" onClick={onViewDetails}>
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">AD</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">preview_anuncio</p>
              <p className="text-[10px] text-muted-foreground">Patrocinado</p>
            </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-foreground" />
        </div>

        {/* Image Area - 3:4 aspect ratio (1080x1440) */}
        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
          {content?.image_url ? (
            <img 
              src={content.image_url} 
              alt={content?.headline || 'Preview do anúncio'}
              className="w-full h-full object-cover"
            />
          ) : content?.image_prompt ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-muted to-muted/50">
              {content?.headline && (
                <div className="text-center mb-4 px-4">
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {content.headline}
                  </p>
                </div>
              )}
              <div className="flex-1 flex items-center justify-center w-full">
                <div className="text-center px-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground italic line-clamp-4">
                    "{content.image_prompt}"
                  </p>
                </div>
              </div>
              {content?.cta && (
                <div className="w-full px-4 pb-4">
                  <div className="w-full py-2 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg text-center">
                    {content.cta}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-muted to-muted/50">
              {content?.headline && (
                <p className="text-lg font-bold text-foreground text-center leading-tight mb-4">
                  {content.headline}
                </p>
              )}
              <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                <span className="text-2xl">📷</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Imagem do anúncio</p>
              {content?.cta && (
                <div className="w-full px-4 mt-4">
                  <div className="w-full py-2 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg text-center">
                    {content.cta}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Format badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-0">
              3:4 • 1080×1440
            </Badge>
          </div>
        </div>

        {/* Instagram Actions */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Heart className="w-6 h-6 text-foreground cursor-pointer hover:text-red-500 transition-colors" />
              <MessageCircle className="w-6 h-6 text-foreground cursor-pointer hover:text-primary transition-colors" />
              <Send className="w-6 h-6 text-foreground cursor-pointer hover:text-primary transition-colors" />
            </div>
            <Bookmark className="w-6 h-6 text-foreground cursor-pointer hover:text-primary transition-colors" />
          </div>
          
          {/* Likes */}
          <p className="text-xs font-semibold text-foreground mb-1">1.234 curtidas</p>
          
          {/* Caption */}
          {content?.body && (
            <p className="text-xs text-foreground">
              <span className="font-semibold">preview_anuncio</span>{" "}
              <span className="text-muted-foreground line-clamp-2">{content.body}</span>
            </p>
          )}
          
          {/* Concept description if present */}
          {ad.concept_description && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Conceito: {ad.concept_description}
            </p>
          )}
          
          {/* Timestamp */}
          <p className="text-[10px] text-muted-foreground mt-1 uppercase">
            {new Date(ad.generated_at).toLocaleDateString('pt-BR', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-border">
        {isPending ? (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={onReject}
            >
              <X className="w-4 h-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={onApprove}
            >
              <Check className="w-4 h-4 mr-1" />
              Aprovar
            </Button>
          </div>
        ) : (
          <div className="w-full text-center">
            <Badge
              variant={ad.status === "approved" || ad.status === "published" ? "default" : "destructive"}
              className={cn(
                ad.status === "approved" && "bg-blue-500",
                ad.status === "published" && "bg-green-500",
                ad.status === "rejected" && "bg-red-500"
              )}
            >
              {ad.status === "approved" && "Aprovado"}
              {ad.status === "published" && "Publicado"}
              {ad.status === "rejected" && "Rejeitado"}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
