import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useClientContext } from "./ClienteContext";
import { useCompany } from "@/contexts/CompanyContext";
import { RefreshCw, Plus } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CampaignBuilderModal } from "@/components/campaigns/CampaignBuilderModal";
import { BudgetProjectionIndicator } from "@/components/campaigns/BudgetProjectionIndicator";
import { PlatformFilter } from "@/components/campaigns/PlatformFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useGoogleAdsCampaignSync } from "@/hooks/useGoogleAdsCampaignSync";
import { useAllCampaignsTree } from "@/hooks/useAllCampaignsTree";
import { useToast } from "@/hooks/use-toast";
import { MultiCampaignTreeGrid } from "@/components/campaign-editor/MultiCampaignTreeGrid";
import { AggregatedKPISummaryBar } from "@/components/campaign-editor/AggregatedKPISummaryBar";
import { UnifiedCampaignModal } from "@/components/campaign-editor/UnifiedCampaignModal";
import { TreeNode } from "@/hooks/useCampaignTree";

type Platform = "meta" | "google" | "all";

export function ClienteCampanhas() {
  const { client, refetchClient } = useClientContext();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const { syncCampaigns: syncMetaCampaigns, syncing: syncingMeta } = useFacebookCampaignSync();
  const { syncCampaigns: syncGoogleCampaigns, syncing: syncingGoogle } = useGoogleAdsCampaignSync();
  
  const [platformFilter, setPlatformFilter] = useState<Platform>('all');
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'paused' | 'finished' | 'deleted'>('active');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [syncPeriod, setSyncPeriod] = useState<string>(() => {
    return localStorage.getItem('campaignSyncPeriod') || '30';
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal states
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);

  // Use the new unified tree hook
  const { 
    campaigns: allCampaigns, 
    isLoading, 
    totalMetrics, 
    targets,
    refetch: refetchCampaigns,
    invalidateAndRefetch,
  } = useAllCampaignsTree({
    clientId: client?.id,
    companyId: activeCompany?.company_id,
    platform: platformFilter,
    includeInactive: true,
  });

  // Count by platform
  const metaCount = useMemo(() => 
    allCampaigns.filter(c => c.platform === 'meta').length, 
    [allCampaigns]
  );
  const googleCount = useMemo(() => 
    allCampaigns.filter(c => c.platform === 'google').length, 
    [allCampaigns]
  );

  // Convert campaigns to unified format for BudgetProjectionIndicator
  const unifiedCampaignsForProjection = useMemo(() => {
    return allCampaigns.map(campaign => ({
      id: campaign.id,
      platform: campaign.platform,
      status: campaign.status,
      is_active: campaign.status === 'active',
      spend: campaign.metrics.spend,
      daily_budget: campaign.budget?.type === 'daily' ? campaign.budget.amount : null,
      lifetime_budget: campaign.budget?.type === 'lifetime' ? campaign.budget.amount : null,
    }));
  }, [allCampaigns]);

  const handlePeriodChange = (value: string) => {
    setSyncPeriod(value);
    localStorage.setItem('campaignSyncPeriod', value);
  };

  const handleSelectNode = useCallback((node: TreeNode) => {
    setSelectedNode(node);
    setUnifiedModalOpen(true);
  }, []);

  // Find the campaign tree for the selected node
  const selectedCampaignTree = useMemo(() => {
    if (!selectedNode) return null;
    
    // If the selected node IS a campaign, return it directly
    if (selectedNode.type === 'campaign') {
      return selectedNode;
    }
    
    // Otherwise find the parent campaign
    const findCampaign = (nodeId: string): TreeNode | null => {
      for (const campaign of allCampaigns) {
        if (campaign.id === nodeId) return campaign;
        
        const findInChildren = (node: TreeNode): TreeNode | null => {
          if (node.id === nodeId) {
            // Found the node, now find its root campaign
            return campaign;
          }
          for (const child of node.children || []) {
            const found = findInChildren(child);
            if (found) return found;
          }
          return null;
        };
        
        const found = findInChildren(campaign);
        if (found) return found;
      }
      return null;
    };
    
    return findCampaign(selectedNode.id);
  }, [selectedNode, allCampaigns]);

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
        { campaigns: true, adsets: true, ads: true },
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
  }, [client?.id, client?.google_account_id, syncPeriod, syncGoogleCampaigns, refetchClient, refetchCampaigns, toast, activeCompany?.company_id]);

  const handleSyncAll = useCallback(async () => {
    setIsSyncing(true);
    const periodLabel = syncPeriod === 'lifetime' ? 'máximo' : `${syncPeriod} dias`;
    
    toast({
      title: "Sincronizando todas as plataformas",
      description: `Buscando dados do período: ${periodLabel}`,
    });

    const promises = [];
    
    // Sync Meta if has ad account - now syncs campaigns, adsets, AND ads
    if (client?.ad_account_id) {
      promises.push(
        syncMetaCampaigns(client.id, syncPeriod, { campaigns: true, adsets: true, ads: true }, true, false)
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
  }, [client?.id, client?.ad_account_id, client?.google_account_id, syncPeriod, syncMetaCampaigns, syncGoogleCampaigns, refetchClient, refetchCampaigns, toast, activeCompany?.company_id]);

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
          
          {/* Sync button */}
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
          <Select value={campaignFilter} onValueChange={(value: 'all' | 'active' | 'paused' | 'finished' | 'deleted') => setCampaignFilter(value)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
              <SelectItem value="finished">Finalizadas</SelectItem>
              <SelectItem value="deleted">Excluídas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <BudgetProjectionIndicator 
        campaigns={unifiedCampaignsForProjection} 
        monthlyBudget={client?.monthly_budget}
        metaMonthlyBudget={client?.meta_monthly_budget}
        googleMonthlyBudget={client?.google_monthly_budget}
        platformFilter={platformFilter}
      />

      {/* KPI Summary Bar */}
      <AggregatedKPISummaryBar metrics={totalMetrics} targets={targets} />

      {/* Tree Grid Table with all campaigns */}
      <MultiCampaignTreeGrid
        campaigns={allCampaigns}
        targets={targets}
        clientId={client?.id || ''}
        isLoading={isLoading}
        statusFilter={campaignFilter}
        onSelectNode={handleSelectNode}
        selectedNodeId={selectedNode?.id || null}
        onRefresh={refetchCampaigns}
      />

      {/* Unified Campaign Modal for editing any node */}
      <UnifiedCampaignModal
        isOpen={unifiedModalOpen}
        onClose={() => {
          setUnifiedModalOpen(false);
          setSelectedNode(null);
        }}
        campaignTree={selectedCampaignTree}
        initialSelectedNode={selectedNode}
        clientId={client?.id || ''}
        companyId={activeCompany?.company_id}
        onSuccess={async () => {
          await invalidateAndRefetch();
          refetchClient?.();
        }}
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
