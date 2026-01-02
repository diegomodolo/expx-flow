import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, TrendingUp, DollarSign, MousePointerClick, BarChart3, RefreshCw, Sparkles } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useAdWinners } from '@/hooks/useAdWinners';

export default function AnunciosVencedores() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { clients, loading: clientsLoading } = useClients();
  const { winners, isLoading, analyzeWinners, isAnalyzing } = useAdWinners(selectedClientId);

  const handleAnalyze = async () => {
    await analyzeWinners();
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Anúncios Vencedores
            </h1>
            <p className="text-muted-foreground mt-1">
              Identifique automaticamente os anúncios com melhor performance
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuração da Análise</CardTitle>
            <CardDescription>Selecione o cliente e execute a análise de vencedores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <Select
                  value={selectedClientId || ''}
                  onValueChange={setSelectedClientId}
                  disabled={clientsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!selectedClientId || isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Analisar Vencedores
                  </>
                )}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Critérios de análise:</strong> Mínimo R$50 de gasto, 3 dias ativos, 5 conversões. 
              Vencedores são identificados pelo CPA no top 25% ou CTR no top 25%.
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : winners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum vencedor identificado</h3>
              <p className="text-muted-foreground">
                {selectedClientId 
                  ? 'Execute a análise para identificar os anúncios vencedores'
                  : 'Selecione um cliente para começar'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {winners.map((winner) => (
              <Card key={winner.id} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <Badge variant="default" className="bg-yellow-500 text-yellow-950 gap-1">
                    <Trophy className="h-3 w-3" />
                    Vencedor
                  </Badge>
                </div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-base pr-20 line-clamp-2">{winner.ad_name}</CardTitle>
                  <CardDescription className="text-xs">
                    {winner.days_running} dias ativos
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {winner.winner_reason && (
                    <div className="flex items-start gap-2 text-sm bg-yellow-500/10 p-2 rounded-lg">
                      <Sparkles className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-yellow-700 dark:text-yellow-400">{winner.winner_reason}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Gasto</p>
                        <p className="font-medium">{formatCurrency(winner.spend)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Conversões</p>
                        <p className="font-medium">{winner.conversions || 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">CTR</p>
                        <p className="font-medium">{formatPercent(winner.ctr)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">CPA</p>
                        <p className="font-medium">{formatCurrency(winner.cpa)}</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full gap-2 mt-2">
                    <Sparkles className="h-4 w-4" />
                    Criar Iteração
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
