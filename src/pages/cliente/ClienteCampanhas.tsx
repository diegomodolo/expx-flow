import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientContext } from "./ClienteContext";
import { useCompany } from "@/contexts/CompanyContext";
import { ChevronDown, BarChart3, RefreshCw, Plus } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CampaignMetricsModal } from "@/components/campaigns/CampaignMetricsModal";
import { CampaignActionsDropdown } from "@/components/campaigns/CampaignActionsDropdown";
import { CampaignBuilderModal } from "@/components/campaigns/CampaignBuilderModal";
import { BudgetProjectionIndicator } from "@/components/campaigns/BudgetProjectionIndicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useToast } from "@/hooks/use-toast";

export function ClienteCampanhas() {
  const { client, refetchClient } = useClientContext();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const { syncCampaigns, syncing } = useFacebookCampaignSync();
  
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('active');
  const [sortField, setSortField] = useState<'name' | 'cpc' | 'cpa' | 'spend' | 'conversions' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [syncPeriod, setSyncPeriod] = useState<string>(() => {
    return localStorage.getItem('campaignSyncPeriod') || '30';
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const campaigns = client?.campaigns || [];

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns;
    
    if (campaignFilter !== 'all') {
      filtered = campaigns.filter(campaign => {
        if (campaignFilter === 'active') return campaign.status === 'active' || campaign.is_active === true;
        if (campaignFilter === 'paused') return campaign.status === 'paused' || campaign.is_active === false;
        if (campaignFilter === 'finished') return campaign.status === 'finished';
        return true;
      });
    }
    
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [campaigns, campaignFilter, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewMetrics = (campaign: any) => {
    setSelectedCampaign(campaign);
    setMetricsModalOpen(true);
  };

  const handleCampaignClick = (campaignId: string) => {
    // Can be used for campaign selection in future
  };

  const handlePeriodChange = (value: string) => {
    setSyncPeriod(value);
    localStorage.setItem('campaignSyncPeriod', value);
  };

  const handleSyncFromMeta = useCallback(async () => {
    if (!client?.id) {
      toast({
        title: "Erro",
        description: "Cliente não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    
    const periodLabel = syncPeriod === 'lifetime' ? 'máximo' : `${syncPeriod} dias`;
    
    toast({
      title: "Sincronizando do Meta",
      description: `Buscando dados do período: ${periodLabel}. Campanhas excluídas no Meta serão removidas do sistema.`,
    });

    try {
      const jobId = await syncCampaigns(
        client.id, 
        syncPeriod, 
        { campaigns: true, adsets: false, ads: false }, // Only sync campaigns for speed
        false, // not silent
        false  // don't include inactive
      );
      
      if (jobId) {
        // Poll for job completion
        const checkJob = async () => {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: job } = await supabase
            .from('sync_jobs')
            .select('status, error_message')
            .eq('id', jobId)
            .single();
          
          if (job?.status === 'completed') {
            toast({
              title: "✅ Sincronização concluída",
              description: `Dados atualizados do Meta (${periodLabel}). Campanhas excluídas no Meta foram removidas.`,
            });
            refetchClient?.();
            setIsSyncing(false);
          } else if (job?.status === 'error') {
            toast({
              title: "❌ Erro na sincronização",
              description: job.error_message || "Ocorreu um erro ao sincronizar.",
              variant: "destructive",
            });
            setIsSyncing(false);
          } else if (job?.status === 'processing' || job?.status === 'pending') {
            // Still processing, check again in 2 seconds
            setTimeout(checkJob, 2000);
          } else {
            // Unknown status, stop polling
            setIsSyncing(false);
          }
        };
        
        // Start polling after a brief delay
        setTimeout(checkJob, 1500);
      } else {
        setIsSyncing(false);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
      setIsSyncing(false);
    }
  }, [client?.id, syncPeriod, syncCampaigns, refetchClient, toast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Campanhas do Cliente</h3>
          
          {/* Period selector */}
          <Select value={syncPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="lifetime">Máximo</SelectItem>
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncFromMeta}
                  disabled={isSyncing || syncing}
                  className="h-8 gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing || syncing ? 'animate-spin' : ''}`} />
                  {isSyncing || syncing ? 'Sincronizando...' : 'Sincronizar do Meta'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buscar dados diretamente do Meta Ads para o período selecionado. Campanhas excluídas no Meta serão removidas.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova Campanha
          </Button>
          <div className="h-6 w-px bg-border" />
          <Select value={campaignFilter} onValueChange={(value: 'all' | 'active' | 'paused' | 'finished') => setCampaignFilter(value)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
              <SelectItem value="finished">Finalizadas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <BudgetProjectionIndicator 
        campaigns={campaigns} 
        monthlyBudget={client?.monthly_budget} 
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Nome da Campanha</span>
                  {sortField === 'name' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Plataforma
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('cpc')}
              >
                <div className="flex items-center space-x-1">
                  <span>CPC</span>
                  {sortField === 'cpc' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('cpa')}
              >
                <div className="flex items-center space-x-1">
                  <span>CPA</span>
                  {sortField === 'cpa' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('conversions')}
              >
                <div className="flex items-center space-x-1">
                  <span>Conversões</span>
                  {sortField === 'conversions' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Orçamento
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('spend')}
              >
                <div className="flex items-center space-x-1">
                  <span>Investimento</span>
                  {sortField === 'spend' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredAndSortedCampaigns.length > 0 ? (
              filteredAndSortedCampaigns.map((campaign) => (
                <tr 
                  key={campaign.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => handleCampaignClick(campaign.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm font-medium text-card-foreground cursor-help">
                            {campaign.name && campaign.name.length > 50 
                              ? `${campaign.name.substring(0, 50)}...` 
                              : campaign.name}
                          </div>
                        </TooltipTrigger>
                        {campaign.name && campaign.name.length > 50 && (
                          <TooltipContent>
                            <p>{campaign.name}</p>
                          </TooltipContent>
                        )}
                      </UITooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant="outline">{campaign.platforms}</Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={
                      campaign.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400'
                    }>
                      {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                    R$ {campaign.cpc.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                    R$ {campaign.cpa.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-card-foreground">
                    {campaign.conversions}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-card-foreground">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {campaign.daily_budget 
                              ? `R$ ${campaign.daily_budget.toFixed(2)}/dia`
                              : campaign.lifetime_budget
                              ? `R$ ${campaign.lifetime_budget.toFixed(2)}`
                              : '-'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{campaign.daily_budget ? 'Orçamento Diário' : campaign.lifetime_budget ? 'Orçamento Vitalício' : 'Sem orçamento definido'}</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-card-foreground">
                    R$ {campaign.spend.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewMetrics(campaign);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <BarChart3 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver Indicadores</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                      
                      <CampaignActionsDropdown 
                        campaign={{
                          id: campaign.id,
                          client_id: client?.id || '',
                          name: campaign.name,
                          status: campaign.status,
                          facebook_id: campaign.facebook_id,
                          spend: campaign.spend
                        }}
                        onRefresh={() => refetchClient?.()}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  <div>
                    <p className="mb-2">Nenhuma campanha encontrada</p>
                    <p className="text-sm">Clique em "Sincronizar do Meta" para buscar campanhas diretamente do Meta Ads</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CampaignMetricsModal
        campaign={selectedCampaign}
        isOpen={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
      />

      <CampaignBuilderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        clientId={client?.id || ''}
        companyId={activeCompany?.company_id || ''}
        clientName={client?.name || ''}
        onSuccess={() => refetchClient?.()}
      />
    </div>
  );
}
