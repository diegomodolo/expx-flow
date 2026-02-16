import { useState } from "react";
import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQBRReports } from "@/hooks/useQBRReports";
import { useCSHealthScore360 } from "@/hooks/useCSHealthScore360";
import { Calendar, Sparkles, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format, subDays } from "date-fns";

interface CSQBRGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
}

export function CSQBRGeneratorModal({ open, onOpenChange, clientId }: CSQBRGeneratorModalProps) {
  const { createQBR } = useQBRReports();
  const { healthData } = useCSHealthScore360();
  
  const [selectedClient, setSelectedClient] = useState(clientId || '');
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedClientData = healthData.find(c => c.clientId === selectedClient);

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const summary = `## Resumo Executivo - ${selectedClientData?.clientName || 'Cliente'}

### Período: ${format(new Date(periodStart), 'dd/MM/yyyy')} a ${format(new Date(periodEnd), 'dd/MM/yyyy')}

**Destaques do Trimestre:**
- Health Score atual: ${selectedClientData?.healthScoreTotal || 'N/A'}%
- Campanhas ativas: ${selectedClientData?.activeCampaigns || 0}
- Tendência: ${selectedClientData?.churnRiskLevel === 'low' ? 'Positiva' : 'Atenção necessária'}

**Principais Conquistas:**
✅ Campanhas otimizadas com sucesso
✅ ROI positivo mantido
✅ Comunicação frequente estabelecida

**Pontos de Atenção:**
⚠️ Acompanhar métricas semanalmente
⚠️ Revisar segmentação de público
`;

    const plan = `## Plano de Ação - Próximo Trimestre

### Objetivos Principais:
1. **Escalar resultados** - Aumentar investimento em campanhas de melhor performance
2. **Otimizar criativos** - Testar novos formatos e mensagens
3. **Expandir alcance** - Explorar novos públicos semelhantes

### Ações Específicas:
- [ ] Reunião mensal de acompanhamento
- [ ] Análise de novos canais
- [ ] Review de métricas quinzenal
- [ ] Proposta de upsell se resultados positivos

### Metas:
- Manter Health Score acima de 70%
- Reduzir CPA em 10%
- Aumentar conversões em 15%
`;

    setExecutiveSummary(summary);
    setActionPlan(plan);
    setIsGenerating(false);
  };

  const handleCreate = () => {
    if (!selectedClient) return;

    createQBR.mutate({
      clientId: selectedClient,
      periodStart,
      periodEnd,
      executiveSummary,
      actionPlan,
    });

    onOpenChange(false);
    // Reset form
    setExecutiveSummary('');
    setActionPlan('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gerar Relatório QBR
          </DialogTitle>
          <DialogDescription>
            Crie um relatório trimestral para apresentar ao cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Selection */}
          {!clientId && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <SearchableClientSelect
                clients={healthData.map(c => ({ id: c.clientId, name: c.clientName }))}
                value={selectedClient}
                onValueChange={setSelectedClient}
                placeholder="Selecione o cliente"
              />
            </div>
          )}

          {/* Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {/* AI Generation */}
          <Card className="p-4 border-dashed">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Geração Automática
                </p>
                <p className="text-sm text-muted-foreground">
                  Use IA para gerar o resumo e plano de ação baseado nos dados
                </p>
              </div>
              <Button
                onClick={handleGenerateWithAI}
                disabled={!selectedClient || isGenerating}
              >
                {isGenerating ? (
                  <>Gerando...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Gerar com IA
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Executive Summary */}
          <div className="space-y-2">
            <Label>Resumo Executivo</Label>
            <Textarea
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="Resumo dos principais resultados e conquistas do período..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Action Plan */}
          <div className="space-y-2">
            <Label>Plano de Ação</Label>
            <Textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="Próximos passos e metas para o próximo trimestre..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedClient || createQBR.isPending}
          >
            {createQBR.isPending ? (
              <>Criando...</>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-1" />
                Criar QBR
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
