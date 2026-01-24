import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaignTree, TreeNode } from "@/hooks/useCampaignTree";
import { useClientContext } from "./ClienteContext";
import { TreeGridTable } from "@/components/campaign-editor/TreeGridTable";
import { InspectorPanel } from "@/components/campaign-editor/InspectorPanel";
import { KPISummaryBar } from "@/components/campaign-editor/KPISummaryBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, RefreshCw, CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

export default function CampaignEditorPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { client } = useClientContext();
  const { toast } = useToast();
  const { syncCampaigns, syncing } = useFacebookCampaignSync();

  const { treeData, isLoading, targets, campaign, platform } = useCampaignTree({
    campaignId,
    clientId: client?.id,
    companyId: (client as any)?.company_id,
  });

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [syncPeriod, setSyncPeriod] = useState<string>(() => {
    return localStorage.getItem('campaignEditorSyncPeriod') || '30';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSelectNode = useCallback((node: TreeNode) => {
    setSelectedNode(node);
    setInspectorOpen(true);
  }, []);

  const handlePeriodChange = (value: string) => {
    setSyncPeriod(value);
    localStorage.setItem('campaignEditorSyncPeriod', value);
    // Clear custom date range when selecting a preset
    if (value !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setSyncPeriod('custom');
      localStorage.setItem('campaignEditorSyncPeriod', 'custom');
      setIsCalendarOpen(false);
    }
  };

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-meta-campaign", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-google-campaign", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-meta-adsets", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-meta-ads", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-google-adgroups", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-google-ads", campaignId] });
  }, [queryClient, campaignId]);

  const handleSyncFromMeta = useCallback(async () => {
    if (!client?.id || platform !== "meta") {
      toast({
        title: "Erro",
        description: platform !== "meta" ? "Sincronização disponível apenas para campanhas Meta" : "Cliente não encontrado",
        variant: "destructive",
      });
      return;
    }

    // Get the facebook_id from the campaign
    const campaignFacebookId = (campaign as any)?.facebook_id;
    if (!campaignFacebookId) {
      toast({
        title: "Erro",
        description: "ID do Facebook não encontrado para esta campanha.",
        variant: "destructive",
      });
      return;
    }
    
    // Build period label
    let periodLabel = syncPeriod === 'lifetime' ? 'máximo' : `${syncPeriod} dias`;
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (syncPeriod === 'custom' && customDateRange?.from && customDateRange?.to) {
      startDate = format(customDateRange.from, 'yyyy-MM-dd');
      endDate = format(customDateRange.to, 'yyyy-MM-dd');
      periodLabel = `${format(customDateRange.from, 'dd/MM')} a ${format(customDateRange.to, 'dd/MM')}`;
    }

    toast({
      title: "Sincronizando do Meta",
      description: `Buscando dados da campanha (${periodLabel})...`,
    });

    try {
      // Sync only this specific campaign, its adsets and ads
      const jobId = await syncCampaigns(
        client.id,
        syncPeriod === 'custom' ? '30' : syncPeriod, // Use 30 as fallback for custom
        { 
          campaigns: true, 
          adsets: true, 
          ads: true,
          campaignFacebookId, // Only sync this specific campaign
          startDate,
          endDate
        },
        true, // silent
        false // includeInactive
      );

      if (jobId) {
        let pollCount = 0;
        const maxPolls = 60;

        const checkJob = async () => {
          pollCount++;

          if (pollCount >= maxPolls) {
            toast({
              title: "⚠️ Sincronização demorada",
              description: "Atualize a página para verificar os dados.",
              variant: "destructive",
            });
            setIsSyncing(false);
            invalidateQueries();
            return;
          }

          try {
            const { data: job, error: jobError } = await supabase
              .from('sync_jobs')
              .select('status, error_message')
              .eq('id', jobId)
              .single();

            if (jobError) {
              console.error('Error checking sync job:', jobError);
              setIsSyncing(false);
              invalidateQueries();
              return;
            }

            const status = job?.status?.toLowerCase();

            if (status === 'completed' || status === 'success') {
              toast({
                title: "✅ Sincronização concluída",
                description: `Campanha atualizada (${periodLabel}).`,
              });
              invalidateQueries();
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
                invalidateQueries();
              }
            }
          } catch (pollError) {
            console.error('Poll error:', pollError);
            setIsSyncing(false);
            invalidateQueries();
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
  }, [client?.id, platform, syncPeriod, customDateRange, (campaign as any)?.facebook_id, syncCampaigns, invalidateQueries, toast]);

  // Get period display text
  const getPeriodDisplayText = () => {
    if (syncPeriod === 'custom' && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, 'dd/MM')} - ${format(customDateRange.to, 'dd/MM')}`;
    }
    const labels: Record<string, string> = {
      '1': 'Hoje',
      '3': '3 dias',
      '5': '5 dias',
      '7': '7 dias',
      '14': '14 dias',
      '30': '30 dias',
      '60': '60 dias',
      '90': '90 dias',
      'lifetime': 'Máximo'
    };
    return labels[syncPeriod] || '30 dias';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold truncate max-w-lg">
              {campaign?.name || "Campanha"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Plataforma: {platform === "meta" ? "Meta Ads" : "Google Ads"} •{" "}
              {treeData?.children?.length || 0} conjuntos de anúncios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <Select value={syncPeriod === 'custom' ? 'custom' : syncPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Período">
                {getPeriodDisplayText()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="3">3 dias</SelectItem>
              <SelectItem value="5">5 dias</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="lifetime">Máximo</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date picker */}
          {syncPeriod === 'custom' && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {customDateRange?.from && customDateRange?.to ? (
                    <span className="text-xs">
                      {format(customDateRange.from, 'dd/MM')} - {format(customDateRange.to, 'dd/MM')}
                    </span>
                  ) : (
                    <span className="text-xs">Selecionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={handleCustomDateSelect}
                  numberOfMonths={2}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Sync button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncFromMeta}
            disabled={isSyncing || syncing || platform !== "meta" || (syncPeriod === 'custom' && (!customDateRange?.from || !customDateRange?.to))}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing || syncing ? 'animate-spin' : ''}`} />
            {isSyncing || syncing ? 'Sincronizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <KPISummaryBar campaign={treeData} targets={targets} />

      {/* Tree Grid */}
      <TreeGridTable
        campaign={treeData}
        targets={targets}
        clientId={client?.id || ""}
        onSelectNode={handleSelectNode}
        selectedNodeId={selectedNode?.id || null}
        onRefresh={invalidateQueries}
      />

      {/* Inspector Panel */}
      <InspectorPanel
        node={selectedNode}
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        clientId={client?.id}
        onUpdate={invalidateQueries}
      />
    </div>
  );
}
