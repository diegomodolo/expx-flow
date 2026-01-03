import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Copy, RefreshCw, Sparkles, Star, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GeneratedAdType } from "./AdPreviewCard";

const getScoreLabel = (score: number) => {
  if (score >= 9) return "Unicórnio";
  if (score >= 7) return "Otimizado";
  if (score >= 4) return "Funcional";
  if (score >= 1) return "Baixa Qualidade";
  return "Rejeitado";
};

const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
  if (score >= 7) return "default";
  if (score >= 4) return "secondary";
  return "destructive";
};

const getScoreColor = (score: number) => {
  if (score >= 7) return "bg-green-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-red-500";
};

interface AdDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: GeneratedAdType | null;
  clientId?: string;
  companyId?: string;
  onStatusChange?: () => void;
  onRepublish?: (ad: GeneratedAdType) => void;
}

const statusConfig = {
  pending: { label: "Aberto", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  approved: { label: "Aprovado", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  rejected: { label: "Rejeitado", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  published: { label: "Publicado", color: "bg-green-500/10 text-green-600 border-green-500/30" },
};

const typeConfig = {
  clone: { label: "Clone", icon: Copy, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  concept: { label: "Conceito", icon: Sparkles, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  iteration: { label: "Iteração", icon: RefreshCw, color: "bg-green-500/10 text-green-500 border-green-500/20" },
};

export function AdDetailsDialog({
  open,
  onOpenChange,
  ad,
  clientId,
  companyId,
  onStatusChange,
  onRepublish,
}: AdDetailsDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  if (!ad) return null;

  const content = ad.generated_content;
  const typeConf = typeConfig[ad.generation_type as keyof typeof typeConfig] || typeConfig.concept;
  const TypeIcon = typeConf.icon;
  const currentStatusConf = statusConfig[ad.status as keyof typeof statusConfig] || statusConfig.pending;

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === ad.status) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("ad_generation_queue")
        .update({ status: selectedStatus as "pending" | "approved" | "rejected" | "published" })
        .eq("id", ad.id);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      onStatusChange?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRepublish = () => {
    onRepublish?.(ad);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Detalhes do Anúncio</span>
            <Badge variant="outline" className={cn("gap-1", typeConf.color)}>
              <TypeIcon className="w-3 h-3" />
              {typeConf.label}
            </Badge>
            <Badge variant="outline" className={currentStatusConf.color}>
              {currentStatusConf.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Preview Column */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              {content?.image_url ? (
                <img
                  src={content.image_url}
                  alt={content?.headline || "Preview do anúncio"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-muted to-muted/50">
                  {content?.headline && (
                    <p className="text-lg font-bold text-foreground text-center leading-tight mb-4">
                      {content.headline}
                    </p>
                  )}
                  <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  {content?.image_prompt && (
                    <p className="text-xs text-muted-foreground mt-4 italic text-center line-clamp-3">
                      "{content.image_prompt}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Score Section */}
            {ad.quality_score != null && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                  <span className="font-bold text-lg">{ad.quality_score}/10</span>
                  <Badge variant={getScoreBadgeVariant(ad.quality_score)}>
                    {getScoreLabel(ad.quality_score)}
                  </Badge>
                </div>
                
                {/* Breakdown visual with progress bars */}
                {content?.score_breakdown && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Visual (40%)</span>
                        <span className="font-medium">{content.score_breakdown.visual}/10</span>
                      </div>
                      <Progress value={content.score_breakdown.visual * 10} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Copywriting (30%)</span>
                        <span className="font-medium">{content.score_breakdown.copy}/10</span>
                      </div>
                      <Progress value={content.score_breakdown.copy * 10} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Headline/CTA (20%)</span>
                        <span className="font-medium">{content.score_breakdown.headline_cta}/10</span>
                      </div>
                      <Progress value={content.score_breakdown.headline_cta * 10} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Conformidade (10%)</span>
                        <span className="font-medium">{content.score_breakdown.conformidade}/10</span>
                      </div>
                      <Progress value={content.score_breakdown.conformidade * 10} className="h-2" />
                    </div>
                  </div>
                )}
                
                {/* Explanation */}
                {content?.score_explanation && (
                  <div className="pt-3 border-t border-border">
                    <Label className="text-muted-foreground text-xs">Por que essa nota?</Label>
                    <p className="text-sm mt-1">{content.score_explanation}</p>
                  </div>
                )}
                
                {/* Flags/Alerts */}
                {content?.score_flags && content.score_flags.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium text-sm">Alertas</span>
                    </div>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {content.score_flags.map((flag: string, i: number) => (
                        <li key={i}>• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="space-y-5">
            {content?.headline && (
              <div>
                <Label className="text-muted-foreground text-xs">Título</Label>
                <p className="font-semibold text-foreground mt-1">{content.headline}</p>
              </div>
            )}

            {content?.body && (
              <div>
                <Label className="text-muted-foreground text-xs">Texto Principal</Label>
                <p className="text-foreground mt-1 text-sm">{content.body}</p>
              </div>
            )}

            {content?.cta && (
              <div>
                <Label className="text-muted-foreground text-xs">Call to Action</Label>
                <Badge className="mt-1 bg-primary">{content.cta}</Badge>
              </div>
            )}

            {ad.concept_description && (
              <div>
                <Label className="text-muted-foreground text-xs">Conceito</Label>
                <p className="text-foreground mt-1 text-sm italic">{ad.concept_description}</p>
              </div>
            )}

            <div>
              <Label className="text-muted-foreground text-xs">Gerado em</Label>
              <p className="text-foreground mt-1 text-sm">
                {new Date(ad.generated_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Status Change Section */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="space-y-2">
                <Label>Alterar Status</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedStatus || ad.status}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Aberto</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusChange}
                    disabled={isUpdating || !selectedStatus || selectedStatus === ad.status}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </div>

              {/* Republish Button - shown for published or approved ads */}
              {(ad.status === "published" || ad.status === "approved") && onRepublish && (
                <Button
                  onClick={handleRepublish}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <Send className="w-4 h-4" />
                  {ad.status === "published" ? "Republicar em Outras Campanhas" : "Publicar em Campanhas"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
