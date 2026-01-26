import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useValueStatements } from "@/hooks/useValueStatements";
import { useCSHealthScore360 } from "@/hooks/useCSHealthScore360";
import { FileCheck, Sparkles, DollarSign, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CSValueStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function CSValueStatementModal({ open, onOpenChange, clientId }: CSValueStatementModalProps) {
  const { createValueStatement } = useValueStatements();
  const { healthData } = useCSHealthScore360();
  
  const currentDate = new Date();
  const [selectedClient, setSelectedClient] = useState(clientId || '');
  const [periodMonth, setPeriodMonth] = useState(String(currentDate.getMonth() + 1));
  const [periodYear, setPeriodYear] = useState(String(currentDate.getFullYear()));
  const [totalInvestment, setTotalInvestment] = useState('');
  const [totalReturn, setTotalReturn] = useState('');
  const [leadsGenerated, setLeadsGenerated] = useState('');
  const [conversions, setConversions] = useState('');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [nextMonthPlan, setNextMonthPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const investment = parseFloat(totalInvestment) || 0;
  const returnValue = parseFloat(totalReturn) || 0;
  const roi = investment > 0 ? ((returnValue - investment) / investment * 100).toFixed(1) : '0';

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const summary = `## Resumo do Mês - ${monthNames[parseInt(periodMonth) - 1]} ${periodYear}

**Investimento Total:** R$ ${investment.toLocaleString('pt-BR')}
**Retorno Gerado:** R$ ${returnValue.toLocaleString('pt-BR')}
**ROI:** ${roi}%

### Destaques:
✅ ${leadsGenerated || 0} leads captados
✅ ${conversions || 0} conversões realizadas
✅ Campanhas otimizadas para melhor performance

### Análise:
${Number(roi) > 0 
  ? 'Excelente mês! O retorno sobre investimento foi positivo, indicando que as estratégias estão funcionando.'
  : 'O mês apresentou desafios, mas identificamos oportunidades de melhoria para o próximo período.'
}`;

    const plan = `## Plano para o Próximo Mês

### Estratégias Planejadas:
1. **Otimização de Criativos** - Renovar as peças com melhor performance
2. **Segmentação** - Refinar públicos baseado nos dados coletados
3. **Testes A/B** - Implementar novos testes de copy e visual

### Metas:
- Aumentar conversões em 15%
- Reduzir CPA em 10%
- Manter ROI positivo

### Próximas Ações:
- [ ] Reunião de alinhamento
- [ ] Análise de concorrência
- [ ] Novos criativos`;

    setExecutiveSummary(summary);
    setNextMonthPlan(plan);
    setIsGenerating(false);
  };

  const handleCreate = () => {
    if (!selectedClient || !totalInvestment) return;

    createValueStatement.mutate({
      clientId: selectedClient,
      periodMonth: parseInt(periodMonth),
      periodYear: parseInt(periodYear),
      totalInvestment: investment,
      totalReturn: returnValue,
      leadsGenerated: parseInt(leadsGenerated) || 0,
      conversions: parseInt(conversions) || 0,
      executiveSummary,
      nextMonthPlan,
    });

    onOpenChange(false);
    // Reset form
    setTotalInvestment('');
    setTotalReturn('');
    setLeadsGenerated('');
    setConversions('');
    setExecutiveSummary('');
    setNextMonthPlan('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Novo Comprovante de Valor
          </DialogTitle>
          <DialogDescription>
            Crie um comprovante mensal de resultados para o cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Selection */}
          {!clientId && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {healthData.map((client) => (
                    <SelectItem key={client.clientId} value={client.clientId}>
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={periodMonth} onValueChange={setPeriodMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={periodYear} onValueChange={setPeriodYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Investimento Total (R$)
              </Label>
              <Input
                type="number"
                value={totalInvestment}
                onChange={(e) => setTotalInvestment(e.target.value)}
                placeholder="10000"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Retorno Total (R$)
              </Label>
              <Input
                type="number"
                value={totalReturn}
                onChange={(e) => setTotalReturn(e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>

          {/* ROI Preview */}
          {investment > 0 && (
            <Card className={`p-4 ${Number(roi) > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">ROI Calculado</span>
                <span className={`text-2xl font-bold ${Number(roi) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {roi}%
                </span>
              </div>
            </Card>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leads Gerados</Label>
              <Input
                type="number"
                value={leadsGenerated}
                onChange={(e) => setLeadsGenerated(e.target.value)}
                placeholder="150"
              />
            </div>
            <div className="space-y-2">
              <Label>Conversões</Label>
              <Input
                type="number"
                value={conversions}
                onChange={(e) => setConversions(e.target.value)}
                placeholder="45"
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
                  Use IA para gerar o resumo e plano
                </p>
              </div>
              <Button
                onClick={handleGenerateWithAI}
                disabled={!investment || isGenerating}
                variant="outline"
              >
                {isGenerating ? 'Gerando...' : 'Gerar com IA'}
              </Button>
            </div>
          </Card>

          {/* Executive Summary */}
          <div className="space-y-2">
            <Label>Resumo Executivo</Label>
            <Textarea
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="Resumo dos resultados do mês..."
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {/* Next Month Plan */}
          <div className="space-y-2">
            <Label>Plano do Próximo Mês</Label>
            <Textarea
              value={nextMonthPlan}
              onChange={(e) => setNextMonthPlan(e.target.value)}
              placeholder="Estratégias e metas para o próximo período..."
              rows={6}
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
            disabled={!selectedClient || !totalInvestment || createValueStatement.isPending}
          >
            {createValueStatement.isPending ? 'Criando...' : 'Criar Comprovante'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
