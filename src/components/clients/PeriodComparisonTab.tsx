import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, TrendingDown, Minus, Plus, Loader2, Trash2, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePeriodComparisons, type PeriodComparison, type ComparisonMetrics } from "@/hooks/usePeriodComparisons";
import { useCompany } from "@/contexts/CompanyContext";
import { ComparisonResults } from "./ComparisonResults";

interface PeriodComparisonTabProps {
  clientId: string;
}

export function PeriodComparisonTab({ clientId }: PeriodComparisonTabProps) {
  const [comparisonName, setComparisonName] = useState("");
  const [period1Start, setPeriod1Start] = useState("");
  const [period1End, setPeriod1End] = useState("");
  const [period2Start, setPeriod2Start] = useState("");
  const [period2End, setPeriod2End] = useState("");
  const [selectedComparison, setSelectedComparison] = useState<string | null>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  
  const { activeCompany } = useCompany();
  const {
    comparisons,
    loading,
    createComparison,
    syncComparison,
    getComparisonMetrics,
    deleteComparison,
  } = usePeriodComparisons(clientId);

  const handleCreateComparison = async () => {
    if (!comparisonName || !period1Start || !period1End || !period2Start || !period2End || !activeCompany) {
      return;
    }

    const comparison = await createComparison({
      comparisonName,
      period1Start,
      period1End,
      period1Label: `${format(new Date(period1Start), 'dd/MM', { locale: ptBR })} - ${format(new Date(period1End), 'dd/MM/yyyy', { locale: ptBR })}`,
      period2Start,
      period2End,  
      period2Label: `${format(new Date(period2Start), 'dd/MM', { locale: ptBR })} - ${format(new Date(period2End), 'dd/MM/yyyy', { locale: ptBR })}`,
      companyId: activeCompany.company_id,
    });

    if (comparison) {
      // Clear form
      setComparisonName("");
      setPeriod1Start("");
      setPeriod1End("");
      setPeriod2Start("");
      setPeriod2End("");
      
      // Auto-sync the new comparison
      await syncComparison(comparison.id);
    }
  };

  const getStatusBadge = (comparison: PeriodComparison) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      syncing: { label: "Sincronizando", variant: "default" as const },
      completed: { label: "Concluído", variant: "outline" as const },
      error: { label: "Erro", variant: "destructive" as const },
    };

    return statusConfig[comparison.status] || statusConfig.pending;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Nova Comparação de Períodos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="comparison-name">Nome da Comparação</Label>
            <Input
              id="comparison-name"
              placeholder="Ex: Comparação Q1 vs Q2 2024"
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-600">
                  Período 1
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="period1-start" className="text-xs">Data Inicial</Label>
                  <Input
                    id="period1-start"
                    type="date"
                    value={period1Start}
                    onChange={(e) => setPeriod1Start(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="period1-end" className="text-xs">Data Final</Label>
                  <Input
                    id="period1-end"
                    type="date"
                    value={period1End}
                    onChange={(e) => setPeriod1End(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-600">
                  Período 2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="period2-start" className="text-xs">Data Inicial</Label>
                  <Input
                    id="period2-start"
                    type="date"
                    value={period2Start}
                    onChange={(e) => setPeriod2Start(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="period2-end" className="text-xs">Data Final</Label>
                  <Input
                    id="period2-end"
                    type="date"
                    value={period2End}
                    onChange={(e) => setPeriod2End(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button 
            onClick={handleCreateComparison}
            disabled={!comparisonName || !period1Start || !period1End || !period2Start || !period2End || loading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar e Sincronizar Comparação
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comparações</CardTitle>
        </CardHeader>
        <CardContent>
          {comparisons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma comparação encontrada</p>
              <p className="text-sm">Crie sua primeira comparação de períodos acima</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comparisons.map((comparison) => {
                const status = getStatusBadge(comparison);
                
                return (
                  <Card key={comparison.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{comparison.comparison_name}</h4>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {comparison.period_1_label} vs {comparison.period_2_label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criado em {format(new Date(comparison.created_at), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {comparison.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedComparison(comparison.id);
                                setIsComparisonModalOpen(true);
                              }}
                            >
                              Ver Resultados
                            </Button>
                          )}
                          
                          {comparison.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncComparison(comparison.id)}
                            >
                              <Loader2 className="h-4 w-4 mr-2" />
                              Sincronizar
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteComparison(comparison.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {comparison.status === 'syncing' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Sincronizando dados...</span>
                            <span>{comparison.sync_progress}%</span>
                          </div>
                          <Progress value={comparison.sync_progress} className="h-2" />
                        </div>
                      )}
                      
                      {comparison.status === 'error' && comparison.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {comparison.error_message}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedComparison && (
        <ComparisonResults 
          comparisonId={selectedComparison}
          isOpen={isComparisonModalOpen}
          onClose={() => {
            setSelectedComparison(null);
            setIsComparisonModalOpen(false);
          }}
          getComparisonMetrics={getComparisonMetrics}
        />
      )}
    </div>
  );
}