import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Copy, RefreshCw, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdPreviewCardProps {
  ad: {
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
    concept_description?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
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
}: AdPreviewCardProps) {
  const config = typeConfig[ad.generation_type as keyof typeof typeConfig] || typeConfig.concept;
  const TypeIcon = config.icon;
  const content = ad.generated_content;
  const isPending = ad.status === "pending";

  return (
    <Card
      className={cn(
        "relative transition-all duration-200 hover:shadow-lg",
        isSelected && "ring-2 ring-primary",
        ad.status === "approved" && "border-green-500/50 bg-green-500/5",
        ad.status === "rejected" && "border-red-500/50 bg-red-500/5 opacity-60"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
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
          {ad.quality_score && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{ad.quality_score}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Concept/Source Info */}
        {ad.concept_description && (
          <p className="text-xs text-muted-foreground italic">
            "{ad.concept_description}"
          </p>
        )}

        {/* Headline */}
        {content?.headline && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Headline</p>
            <p className="font-semibold text-foreground">{content.headline}</p>
          </div>
        )}

        {/* Body */}
        {content?.body && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Texto</p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {content.body}
            </p>
          </div>
        )}

        {/* CTA */}
        {content?.cta && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">CTA</p>
            <Badge variant="secondary">{content.cta}</Badge>
          </div>
        )}

        {/* Image Prompt Preview */}
        {content?.image_prompt && (
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Prompt de Imagem</p>
            <p className="text-xs text-foreground line-clamp-2">
              {content.image_prompt}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-border">
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
              variant={ad.status === "approved" ? "default" : "destructive"}
              className={cn(
                ad.status === "approved" && "bg-green-500",
                ad.status === "rejected" && "bg-red-500"
              )}
            >
              {ad.status === "approved" ? "Aprovado" : "Rejeitado"}
            </Badge>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
