import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Frown, Meh, Smile } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CSNPSCollectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string;
}

export function CSNPSCollectModal({ open, onOpenChange, clientId, clientName }: CSNPSCollectModalProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const saveNPS = useMutation({
    mutationFn: async () => {
      if (score === null || !activeCompany?.company_id || !clientId) {
        throw new Error('Dados incompletos');
      }

      // Update client_health_config with new NPS score
      const { error } = await supabase
        .from('client_health_config')
        .upsert({
          client_id: clientId,
          company_id: activeCompany.company_id,
          nps_score: score,
          nps_collected_at: new Date().toISOString(),
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;

      // Also create a touchpoint for the NPS collection
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('client_touchpoints')
        .insert({
          client_id: clientId,
          company_id: activeCompany.company_id,
          user_id: user?.id,
          touchpoint_type: 'email',
          summary: `NPS coletado: ${score}${feedback ? `. Feedback: ${feedback}` : ''}`,
        });

      return { score };
    },
    onSuccess: (data) => {
      const sentiment = data.score >= 9 ? 'Promotor' : data.score >= 7 ? 'Neutro' : 'Detrator';
      toast.success(`NPS ${data.score} registrado! (${sentiment})`);
      queryClient.invalidateQueries({ queryKey: ['cs-health-360'] });
      queryClient.invalidateQueries({ queryKey: ['cs-cockpit-data'] });
      
      // Reset form
      setScore(null);
      setFeedback('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao salvar NPS', { description: String(error) });
    }
  });

  const getSentimentIcon = (s: number) => {
    if (s >= 9) return Smile;
    if (s >= 7) return Meh;
    return Frown;
  };

  const getSentimentColor = (s: number) => {
    if (s >= 9) return 'text-green-600 border-green-500 bg-green-50';
    if (s >= 7) return 'text-yellow-600 border-yellow-500 bg-yellow-50';
    return 'text-red-600 border-red-500 bg-red-50';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Coletar NPS
          </DialogTitle>
          <DialogDescription>
            Registrar NPS de {clientName || 'cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* NPS Scale */}
          <div className="space-y-3">
            <Label>Qual a probabilidade de recomendar nosso serviço? (0-10)</Label>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => i).map((num) => {
                const Icon = getSentimentIcon(num);
                const isSelected = score === num;
                
                return (
                  <Button
                    key={num}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-10 w-full p-0 text-sm font-medium",
                      isSelected && getSentimentColor(num)
                    )}
                    onClick={() => setScore(num)}
                  >
                    {num}
                  </Button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Frown className="h-3 w-3 text-red-500" />
                Detrator (0-6)
              </span>
              <span className="flex items-center gap-1">
                <Meh className="h-3 w-3 text-yellow-500" />
                Neutro (7-8)
              </span>
              <span className="flex items-center gap-1">
                <Smile className="h-3 w-3 text-green-500" />
                Promotor (9-10)
              </span>
            </div>
          </div>

          {/* Show selected score with icon */}
          {score !== null && (
            <div className={cn(
              "p-4 rounded-lg border-2 text-center",
              getSentimentColor(score)
            )}>
              {(() => {
                const Icon = getSentimentIcon(score);
                return <Icon className="h-8 w-8 mx-auto mb-2" />;
              })()}
              <p className="font-bold text-2xl">{score}</p>
              <p className="text-sm">
                {score >= 9 ? 'Promotor 🎉' : score >= 7 ? 'Neutro' : 'Detrator ⚠️'}
              </p>
            </div>
          )}

          {/* Feedback */}
          <div className="space-y-2">
            <Label>Feedback (opcional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="O que o cliente comentou?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => saveNPS.mutate()} 
            disabled={score === null || saveNPS.isPending}
          >
            {saveNPS.isPending ? 'Salvando...' : 'Registrar NPS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
