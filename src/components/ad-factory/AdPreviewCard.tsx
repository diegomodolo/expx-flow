import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, X, Copy, RefreshCw, Sparkles, Star, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScoreBreakdown {
  visual: number;
  copy: number;
  headline_cta: number;
  conformidade: number;
}

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
    score_breakdown?: ScoreBreakdown;
    score_explanation?: string;
    score_flags?: string[];
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
  compact?: boolean;
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
  compact = false,
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
      <div className={cn("flex items-center justify-between border-b border-border", compact ? "p-2" : "p-3")}>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            disabled={!isPending}
            className={compact ? "h-3.5 w-3.5" : undefined}
          />
          <Badge variant="outline" className={cn("gap-1", config.color, compact && "text-[10px] px-1.5 py-0")}>
            <TypeIcon className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {ad.quality_score != null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-amber-500 cursor-help">
                    <Star className={compact ? "w-3 h-3 fill-current" : "w-4 h-4 fill-current"} />
                    <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{ad.quality_score}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-2 p-1">
                    <p className="font-semibold text-xs">Score Breakdown:</p>
                    {content?.score_breakdown ? (
                      <ul className="text-xs space-y-1">
                        <li className="flex justify-between gap-4">
                          <span>Visual (40%):</span>
                          <span className="font-medium">{content.score_breakdown.visual}/10</span>
                        </li>
                        <li className="flex justify-between gap-4">
                          <span>Copy (30%):</span>
                          <span className="font-medium">{content.score_breakdown.copy}/10</span>
                        </li>
                        <li className="flex justify-between gap-4">
                          <span>Headline/CTA (20%):</span>
                          <span className="font-medium">{content.score_breakdown.headline_cta}/10</span>
                        </li>
                        <li className="flex justify-between gap-4">
                          <span>Conformidade (10%):</span>
                          <span className="font-medium">{content.score_breakdown.conformidade}/10</span>
                        </li>
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">Detalhes não disponíveis</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Instagram Mockup - Clickable for details */}
      <div className="bg-background cursor-pointer" onClick={onViewDetails}>
        {/* Instagram Header */}
        <div className={cn("flex items-center justify-between", compact ? "px-2 py-1.5" : "px-3 py-2")}>
          <div className="flex items-center gap-2">
            <div className={cn("rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]", compact ? "w-6 h-6" : "w-8 h-8")}>
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <span className={cn("font-bold text-foreground", compact ? "text-[8px]" : "text-xs")}>AD</span>
              </div>
            </div>
            <div>
              <p className={cn("font-semibold text-foreground", compact ? "text-[10px]" : "text-xs")}>preview_anuncio</p>
              <p className={cn("text-muted-foreground", compact ? "text-[8px]" : "text-[10px]")}>Patrocinado</p>
            </div>
          </div>
          <MoreHorizontal className={compact ? "w-4 h-4 text-foreground" : "w-5 h-5 text-foreground"} />
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
                  <p className={cn("font-bold text-foreground leading-tight", compact ? "text-sm" : "text-lg")}>
                    {content.headline}
                  </p>
                </div>
              )}
              <div className="flex-1 flex items-center justify-center w-full">
                <div className="text-center px-4">
                  <div className={cn("mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center", compact ? "w-8 h-8" : "w-12 h-12")}>
                    <Sparkles className={compact ? "w-4 h-4 text-primary" : "w-6 h-6 text-primary"} />
                  </div>
                  <p className={cn("text-muted-foreground italic", compact ? "text-[10px] line-clamp-3" : "text-xs line-clamp-4")}>
                    "{content.image_prompt}"
                  </p>
                </div>
              </div>
              {content?.cta && (
                <div className="w-full px-4 pb-4">
                  <div className={cn("w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg text-center", compact ? "text-xs" : "text-sm")}>
                    {content.cta}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-muted to-muted/50">
              {content?.headline && (
                <p className={cn("font-bold text-foreground text-center leading-tight mb-4", compact ? "text-sm" : "text-lg")}>
                  {content.headline}
                </p>
              )}
              <div className={cn("rounded-full bg-muted-foreground/10 flex items-center justify-center", compact ? "w-12 h-12" : "w-16 h-16")}>
                <span className={compact ? "text-xl" : "text-2xl"}>📷</span>
              </div>
              <p className={cn("text-muted-foreground mt-2", compact ? "text-[10px]" : "text-xs")}>Imagem do anúncio</p>
              {content?.cta && (
                <div className="w-full px-4 mt-4">
                  <div className={cn("w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg text-center", compact ? "text-xs" : "text-sm")}>
                    {content.cta}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Format badge */}
          {!compact && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-0">
                3:4 • 1080×1440
              </Badge>
            </div>
          )}
        </div>

        {/* Instagram Actions */}
        <div className={compact ? "px-2 py-1.5" : "px-3 py-2"}>
          {!compact && (
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <Heart className="w-6 h-6 text-foreground cursor-pointer hover:text-red-500 transition-colors" />
                <MessageCircle className="w-6 h-6 text-foreground cursor-pointer hover:text-primary transition-colors" />
                <Send className="w-6 h-6 text-foreground cursor-pointer hover:text-primary transition-colors" />
              </div>
              <Bookmark className="w-6 h-6 text-foreground cursor-pointer hover:text-primary transition-colors" />
            </div>
          )}
          
          {/* Likes */}
          {!compact && <p className="text-xs font-semibold text-foreground mb-1">1.234 curtidas</p>}
          
          {/* Caption */}
          {content?.body && (
            <p className={cn("text-foreground", compact ? "text-[10px] line-clamp-2" : "text-xs")}>
              <span className="font-semibold">preview_anuncio</span>{" "}
              <span className={cn("text-muted-foreground", compact ? "line-clamp-1" : "line-clamp-2")}>{content.body}</span>
            </p>
          )}
          
          {/* Concept description if present */}
          {ad.concept_description && !compact && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Conceito: {ad.concept_description}
            </p>
          )}
          
          {/* Timestamp */}
          <p className={cn("text-muted-foreground mt-1 uppercase", compact ? "text-[8px]" : "text-[10px]")}>
            {new Date(ad.generated_at).toLocaleDateString('pt-BR', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={cn("border-t border-border", compact ? "p-2" : "p-3")}>
        {isPending ? (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className={cn("flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10", compact && "h-7 text-xs px-2")}
              onClick={onReject}
            >
              <X className={compact ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1"} />
              {compact ? "Não" : "Rejeitar"}
            </Button>
            <Button
              size="sm"
              className={cn("flex-1 bg-green-500 hover:bg-green-600", compact && "h-7 text-xs px-2")}
              onClick={onApprove}
            >
              <Check className={compact ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1"} />
              {compact ? "Sim" : "Aprovar"}
            </Button>
          </div>
        ) : (
          <div className="w-full text-center">
            <Badge
              variant={ad.status === "approved" || ad.status === "published" ? "default" : "destructive"}
              className={cn(
                compact && "text-[10px] px-2 py-0.5",
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
