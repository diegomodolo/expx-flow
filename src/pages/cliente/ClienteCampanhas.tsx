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
import { PlatformFilter } from "@/components/campaigns/PlatformFilter";
import { PlatformBadge } from "@/components/campaigns/PlatformBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useGoogleAdsCampaignSync } from "@/hooks/useGoogleAdsCampaignSync";
import { useUnifiedCampaigns, Platform } from "@/hooks/useUnifiedCampaigns";
import { useToast } from "@/hooks/use-toast";

export function ClienteCampanhas() {
  const { client, refetchClient } = useClientContext();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const { syncCampaigns: syncMetaCampaigns, syncing: syncingMeta } = useFacebookCampaignSync();
  const { syncCampaigns: syncGoogleCampaigns, syncing: syncingGoogle } = useGoogleAdsCampaignSync();
  
  const [platformFilter, setPlatformFilter] = useState<Platform>('all');
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

  // Use unified campaigns hook
  const { data: unifiedCampaigns = [], isLoading, refetch: refetchCampaigns } = useUnifiedCampaigns({
    clientId: client?.id,
    companyId: activeCompany?.company_id,
    platform: platformFilter,
    includeInactive: true,
  });

  // Count by platform
  const metaCount = useMemo(() => 
    unifiedCampaigns.filter(c => c.platform === 'meta').length, 
    [unifiedCampaigns]
  );
  const googleCount = useMemo(() => 
    unifiedCampaigns.filter(c => c.platform === 'google').length, 
    [unifiedCampaigns]
  );

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = unifiedCampaigns;
    
    if (campaignFilter !== 'all') {
      filtered = filtered.filter(campaign => {
        if (campaignFilter === 'active') return campaign.status === 'active' || campaign.is_active === true;
        if (campaignFilter === 'paused') return campaign.status === 'paused' || campaign.is_active === false;
        if (campaignFilter === 'finished') return campaign.status === 'finished';
        return true;
      });
    }
    
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortField as keyof typeof a];
        let bVal = b[sortField as keyof typeof b];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [unifiedCampaigns, campaignFilter, sortField, sortDirection]);

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
      description: `Buscando dados do período: ${periodLabel}`,
    });

    try {
      const jobId = await syncMetaCampaigns(
        client.id, 
        syncPeriod, 
        { campaigns: true, adsets: false, ads: false },
        false,
        false
      );
      
      if (jobId) {
        let pollCount = 0;
        const maxPolls = 60;
        
        const checkJob = async () => {
          pollCount++;
          
          if (pollCount >= maxPolls) {
            toast({
              title: "⚠️ Sincronização demorada",
              description: "Atualize a página para verificar.",
              variant: "destructive",
            });
            setIsSyncing(false);
            refetchCampaigns();
            refetchClient?.();
            return;
          }
          
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: job, error: jobError } = await supabase
              .from('sync_jobs')
              .select('status, error_message')
              .eq('id', jobId)
              .single();
            
            if (jobError) {
              console.error('Error checking sync job:', jobError);
              setIsSyncing(false);
              refetchCampaigns();
              refetchClient?.();
              return;
            }
            
            const status = job?.status?.toLowerCase();
            
            if (status === 'completed' || status === 'success') {
              toast({
                title: "✅ Sincronização concluída",
                description: `Dados atualizados do Meta (${periodLabel}).`,
              });
              refetchCampaigns();
              refetchClient?.();
              setIsSyncing(false);
            } else if (status === 'error' || status === 'failed') {
              toast({
                title: "❌ Erro na sincronização",
                description: job?.error_message || "Ocorreu um erro ao sincronizar.",
                variant: "destructive",
              });
              setIsSyncing(false);
            } else if (status === 'processing' || status === 'pending') {
              setTimeout(checkJob, 2000);
            } else {
              if (pollCount < 5) {
                setTimeout(checkJob, 2000);
              } else {
                setIsSyncing(false);
                refetchCampaigns();
                refetchClient?.();
              }
            }
          } catch (pollError) {
            console.error('Poll error:', pollError);
            setIsSyncing(false);
            refetchCampaigns();
            refetchClient?.();
          }
        };
        
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
  }, [client?.id, syncPeriod, syncMetaCampaigns, refetchClient, refetchCampaigns, toast]);

  const handleSyncFromGoogle = useCallback(async () => {
    if (!client?.id) {
      toast({
        title: "Erro",
        description: "Cliente não encontrado",
        variant: "destructive",
      });
      return;
    }

    if (!client?.google_account_id) {
      toast({
        title: "Conta Google não configurada",
        description: "Este cliente não possui conta Google Ads vinculada.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    
    const periodLabel = syncPeriod === 'lifetime' ? 'máximo' : `${syncPeriod} dias`;
    
    toast({
      title: "Sincronizando do Google Ads",
      description: `Buscando dados do período: ${periodLabel}`,
    });

    try {
      await syncGoogleCampaigns({
        clientId: client.id,
        companyId: activeCompany?.company_id || '',
        period: syncPeriod,
      });
      toast({
        title: "✅ Sincronização concluída",
        description: `Dados atualizados do Google Ads (${periodLabel}).`,
      });
      refetchCampaigns();
      refetchClient?.();
    } catch (error: any) {
      console.error('Google sync error:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Não foi possível sincronizar os dados do Google.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [client?.id, client?.google_account_id, syncPeriod, syncGoogleCampaigns, refetchClient, refetchCampaigns, toast]);

  const handleSyncAll = useCallback(async () => {
    setIsSyncing(true);
    const periodLabel = syncPeriod === 'lifetime' ? 'máximo' : `${syncPeriod} dias`;
    
    toast({
      title: "Sincronizando todas as plataformas",
      description: `Buscando dados do período: ${periodLabel}`,
    });

    const promises = [];
    
    // Sync Meta if has ad account
    if (client?.ad_account_id) {
      promises.push(
        syncMetaCampaigns(client.id, syncPeriod, { campaigns: true, adsets: false, ads: false }, true, false)
          .catch(err => console.error('Meta sync error:', err))
      );
    }
    
    // Sync Google if has google account
    if (client?.google_account_id) {
      promises.push(
        syncGoogleCampaigns({
          clientId: client.id,
          companyId: activeCompany?.company_id || '',
          period: syncPeriod,
          silent: true,
        }).catch(err => console.error('Google sync error:', err))
      );
    }

    await Promise.all(promises);
    
    toast({
      title: "✅ Sincronização concluída",
      description: `Dados atualizados de todas as plataformas (${periodLabel}).`,
    });
    
    refetchCampaigns();
    refetchClient?.();
    setIsSyncing(false);
  }, [client?.id, client?.ad_account_id, client?.google_account_id, syncPeriod, syncMetaCampaigns, syncGoogleCampaigns, refetchClient, refetchCampaigns, toast]);

  // Get budget from campaign (Meta uses daily_budget/lifetime_budget, need to adapt for google)
  const getCampaignBudget = (campaign: any) => {
    if (campaign.daily_budget) {
      return `R$ ${campaign.daily_budget.toFixed(2)}/dia`;
    }
    if (campaign.lifetime_budget) {
      return `R$ ${campaign.lifetime_budget.toFixed(2)}`;
    }
    return '-';
  };

  const getBudgetTooltip = (campaign: any) => {
    if (campaign.daily_budget) return 'Orçamento Diário';
    if (campaign.lifetime_budget) return 'Orçamento Vitalício';
    return 'Sem orçamento definido';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
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
          
          {/* Sync button with dropdown for platform selection */}
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAll}
                  disabled={isSyncing || syncingMeta || syncingGoogle || isLoading}
                  className="h-8 gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing || syncingMeta || syncingGoogle ? 'animate-spin' : ''}`} />
                  {isSyncing || syncingMeta || syncingGoogle ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar campanhas de todas as plataformas configuradas</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformFilter
            value={platformFilter}
            onChange={setPlatformFilter}
            metaCount={metaCount}
            googleCount={googleCount}
          />
          
          <div className="h-6 w-px bg-border" />
          
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova Campanha
          </Button>
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
        campaigns={unifiedCampaigns} 
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
                  <span>Conv.</span>
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
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>Carregando campanhas...</p>
                </td>
              </tr>
            ) : filteredAndSortedCampaigns.length > 0 ? (
              filteredAndSortedCampaigns.map((campaign) => (
                <tr 
                  key={campaign.id}
                  className="hover:bg-muted/30 cursor-pointer"
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
                    <PlatformBadge platform={campaign.platform} />
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                    R$ {campaign.cpa?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-card-foreground">
                    {campaign.conversions}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-card-foreground">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {getCampaignBudget(campaign)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getBudgetTooltip(campaign)}</p>
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
                      
                      {/* Only show actions dropdown for Meta campaigns */}
                      {campaign.platform === 'meta' && (
                        <CampaignActionsDropdown 
                          campaign={{
                            id: campaign.id,
                            client_id: client?.id || '',
                            name: campaign.name,
                            status: campaign.status as 'active' | 'paused' | 'finished',
                            facebook_id: (campaign as any).facebook_id,
                            spend: campaign.spend
                          }}
                          onRefresh={() => {
                            refetchCampaigns();
                            refetchClient?.();
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  <div>
                    <p className="mb-2">Nenhuma campanha encontrada</p>
                    <p className="text-sm">Clique em "Sincronizar" para buscar campanhas do Meta Ads e Google Ads</p>
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
        onSuccess={() => {
          refetchCampaigns();
          refetchClient?.();
        }}
      />
    </div>
  );
}
