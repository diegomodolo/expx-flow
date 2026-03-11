import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, GripVertical, MessageSquare, Clock } from "lucide-react";

interface FlowStep {
  type: "message" | "delay";
  content?: string;
  seconds?: number;
  delay_seconds?: number;
}

interface FlowData {
  steps: FlowStep[];
}

interface AutomationFlow {
  id: string;
  flow_name: string;
  flow_data: FlowData;
  is_active: boolean;
}

interface Props {
  companyId: string;
  onClose: () => void;
}

export function InstagramFlowEditor({ companyId, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFlowId, setSelectedFlowId] = useState<string>("new");
  const [flowName, setFlowName] = useState("");
  const [steps, setSteps] = useState<FlowStep[]>([
    { type: "message", content: "", delay_seconds: 0 },
  ]);

  const { data: flows } = useQuery({
    queryKey: ["instagram-automation-flows-editor", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instagram_automation_flows")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((f) => ({ ...f, flow_data: f.flow_data as unknown as FlowData })) as AutomationFlow[];
    },
    enabled: !!companyId,
  });

  const loadFlow = (flowId: string) => {
    setSelectedFlowId(flowId);
    if (flowId === "new") {
      setFlowName("");
      setSteps([{ type: "message", content: "", delay_seconds: 0 }]);
      return;
    }
    const flow = flows?.find((f) => f.id === flowId);
    if (flow) {
      setFlowName(flow.flow_name);
      setSteps(flow.flow_data?.steps ?? []);
    }
  };

  const saveFlow = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flowData = { steps } as any;
      if (selectedFlowId === "new") {
        const { error } = await supabase.from("instagram_automation_flows").insert([{
          company_id: companyId,
          flow_name: flowName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          flow_data: flowData as any,
          is_active: true,
        }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("instagram_automation_flows")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ flow_name: flowName, flow_data: flowData as any })
          .eq("id", selectedFlowId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-automation-flows"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-automation-flows-editor"] });
      toast({ title: selectedFlowId === "new" ? "Fluxo criado!" : "Fluxo salvo!" });
      onClose();
    },
    onError: (err: unknown) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("instagram_automation_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-automation-flows"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-automation-flows-editor"] });
      toast({ title: "Fluxo removido" });
      loadFlow("new");
    },
  });

  const addStep = (type: "message" | "delay") => {
    setSteps((prev) => [
      ...prev,
      type === "message" ? { type: "message", content: "", delay_seconds: 0 } : { type: "delay", seconds: 5 },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, partial: Partial<FlowStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));
  };

  const VARIABLES_HINT = "Variáveis: {nome_usuario}, {empresa}";

  return (
    <div className="space-y-5">
      {/* Flow selector */}
      <div className="space-y-1.5">
        <Label>Fluxo</Label>
        <div className="flex gap-2">
          <Select value={selectedFlowId} onValueChange={loadFlow}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione ou crie um fluxo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">+ Novo fluxo</SelectItem>
              {flows?.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.flow_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFlowId !== "new" && (
            <Button aria-label="Excluir" variant="outline" size="icon" onClick={() => deleteFlow.mutate(selectedFlowId)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Flow name */}
      <div className="space-y-1.5">
        <Label>Nome do Fluxo</Label>
        <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Ex: Resposta para orçamento" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <Label className="flex items-center justify-between">
          <span>Passos do Fluxo</span>
          <span className="text-xs text-muted-foreground font-normal">{VARIABLES_HINT}</span>
        </Label>

        {steps.map((step, idx) => (
          <Card key={idx}>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Passo {idx + 1}</span>
                  {step.type === "message" ? (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <MessageSquare className="w-3 h-3" /> Mensagem
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> Delay
                    </span>
                  )}
                </div>
                <Button aria-label="Excluir" variant="ghost" size="icon" onClick={() => removeStep(idx)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {step.type === "message" ? (
                <div className="space-y-2">
                  <Textarea
                    value={step.content ?? ""}
                    onChange={(e) => updateStep(idx, { content: e.target.value })}
                    placeholder="Digite a mensagem que será enviada..."
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Delay após envio (seg):</Label>
                    <Input
                      type="number"
                      min="0"
                      value={step.delay_seconds ?? 0}
                      onChange={(e) => updateStep(idx, { delay_seconds: parseInt(e.target.value) || 0 })}
                      className="w-20 h-7 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Aguardar (segundos):</Label>
                  <Input
                    type="number"
                    min="1"
                    value={step.seconds ?? 5}
                    onChange={(e) => updateStep(idx, { seconds: parseInt(e.target.value) || 1 })}
                    className="w-24 h-7 text-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addStep("message")}>
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Adicionar Mensagem
          </Button>
          <Button variant="outline" size="sm" onClick={() => addStep("delay")}>
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Adicionar Delay
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => saveFlow.mutate()}
          disabled={saveFlow.isPending || !flowName.trim() || steps.length === 0}
        >
          {saveFlow.isPending ? "Salvando..." : "Salvar Fluxo"}
        </Button>
      </div>
    </div>
  );
}
