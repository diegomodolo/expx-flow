import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Calendar, Send, Loader2 } from "lucide-react";

interface ContentPlan {
  id: string;
  name: string;
  month: number;
  year: number;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string | null;
  onSend: (planId: string) => Promise<void>;
}

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function SendToContentPlanModal({
  open,
  onOpenChange,
  clientId,
  onSend,
}: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["content-plans-open", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("content_plans")
        .select("id, name, month, year, status")
        .eq("client_id", clientId)
        .eq("status", "rascunho")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentPlan[];
    },
    enabled: open && !!clientId,
  });

  const hasPlans = useMemo(() => (plans?.length ?? 0) > 0, [plans]);

  const handleConfirm = async () => {
    if (!selectedPlanId) return;
    setSending(true);
    try {
      await onSend(selectedPlanId);
      toast.success("Carrossel enviado para o planejamento!");
      onOpenChange(false);
      setSelectedPlanId(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao enviar para planejamento");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para Planejamento de Conteúdo</DialogTitle>
        </DialogHeader>

        {!clientId ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Este carrossel não está vinculado a um cliente. Defina o cliente no
            editor antes de enviar.
          </div>
        ) : isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasPlans ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum planejamento em aberto (status &ldquo;rascunho&rdquo;)
            encontrado para este cliente.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {plans!.map((p) => {
              const selected = selectedPlanId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selected
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {MONTHS[p.month - 1]} / {p.year}
                    </div>
                  </div>
                  {selected && (
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedPlanId || sending}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
