import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, BarChart3, Users, Target, TrendingUp, Eye, Calendar, DollarSign, RefreshCw, AlertTriangle, Plus, Download } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useTasks } from "@/hooks/useTasks";
import { useTeams } from "@/hooks/useTeams";
import { useAdSets } from "@/hooks/useAdSets";
import { useAds } from "@/hooks/useAds";
import { useToast } from "@/hooks/use-toast";
import { CampaignMetricsModal } from "@/components/campaigns/CampaignMetricsModal";

// Interface local para compatibilidade
interface CampaignForModal {
  id: string;
  name: string;
  status: string;
  spend: number;
  cpa: number;
  ctr: number;
  cpc: number;
  conversions: number;
  impressions?: number;
  clicks?: number;
  reach?: number;
  frequency?: number;
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  created_at: string;
}

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaigns, loading } = useCampaigns();
  const { createTask } = useTasks();
  const { teams } = useTeams();
  const { adSets, loading: adSetsLoading, refetch: refetchAdSets } = useAdSets();
  const { ads, loading: adsLoading, refetch: refetchAds } = useAds();
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [campaignSuggestions, setCampaignSuggestions] = useState<any[]>([]);
  const { toast } = useToast();
  
  const campaign = campaigns.find(c => c.id === id);

  // Filtrar ad sets e ads desta campanha
  const campaignAdSets = adSets.filter(adSet => adSet.campaign_id === id);
  const campaignAds = ads.filter(ad => ad.campaign_id === id);

  // Função para analisar a campanha e gerar sugestões
  const handleAnalyzeCampaign = async () => {
    if (!campaign) return;
    
    setIsAnalyzing(true);
    try {
      // Simular análise (aqui você pode fazer uma chamada real para uma API ou função)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const suggestions: any[] = [];
      
      // 1. Análise de CTR
      if (campaign.ctr && campaign.ctr < 1.5) {
        suggestions.push({
          id: 'low-ctr',
          type: 'warning',
          title: 'CTR Baixo Detectado',
          description: `O CTR da campanha está em ${campaign.ctr?.toFixed(2)}%, abaixo da média de mercado (2-3%).`,
          action: 'Revise os criativos, teste novos textos de anúncio e ajuste o público-alvo para melhorar a relevância.',
          priority: 'high'
        });
      }

      // 2. Análise de CPC
      if (campaign.cpc && campaign.cpc > 3) {
        suggestions.push({
          id: 'high-cpc',
          type: 'warning',
          title: 'CPC Elevado',
          description: `O CPC atual é R$ ${campaign.cpc?.toFixed(2)}, acima do recomendado para este tipo de campanha.`,
          action: 'Otimize as palavras-chave, ajuste a estratégia de lance e revise a qualidade dos anúncios.',
          priority: 'high'
        });
      }

      // 3. Análise de conversões
      if (campaign.conversions && campaign.conversions < 10) {
        suggestions.push({
          id: 'low-conversions',
          type: 'warning',
          title: 'Baixo Volume de Conversões',
          description: `A campanha possui apenas ${campaign.conversions} conversões. É necessário aumentar o volume.`,
          action: 'Aumente o orçamento, expanda o público-alvo ou otimize a página de destino.',
          priority: 'medium'
        });
      }

      // 4. Oportunidades de escalonamento
      if (campaign.ctr && campaign.ctr > 3 && campaign.cpc && campaign.cpc < 2.5) {
        suggestions.push({
          id: 'scale-opportunity',
          type: 'opportunity',
          title: 'Oportunidade de Escalonamento',
          description: 'A campanha está performando muito bem com CTR alto e CPC baixo.',
          action: 'Considere aumentar o orçamento diário para maximizar os resultados desta campanha de alta performance.',
          priority: 'high'
        });
      }

      // 5. Análise de CPA
      if (campaign.cpa && campaign.cpa > 100) {
        suggestions.push({
          id: 'high-cpa',
          type: 'warning',
          title: 'CPA Alto Detectado',
          description: `O CPA atual é R$ ${campaign.cpa?.toFixed(2)}, que pode estar impactando o ROI.`,
          action: 'Revise a estratégia de direcionamento, otimize a jornada do usuário e teste novos públicos.',
          priority: 'high'
        });
      }

      // 6. Sugestões gerais se a campanha está bem
      if (suggestions.filter(s => s.type === 'warning').length === 0) {
        suggestions.push({
          id: 'general-optimization',
          type: 'opportunity',
          title: 'Oportunidades de Otimização',
          description: 'A campanha está funcionando bem! Aqui estão algumas melhorias que podem ser aplicadas.',
          action: 'Teste novos criativos, explore públicos semelhantes e considere expandir para outras plataformas.',
          priority: 'low'
        });
      }

      setCampaignSuggestions(suggestions);
    } catch (error) {
      console.error('Erro ao analisar campanha:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Função para sincronizar dados da campanha
  const handleSyncCampaign = async () => {
    if (!campaign) return;
    
    setIsSyncing(true);
    try {
      toast({
        title: "Sincronização iniciada",
        description: "Sincronizando conjuntos de anúncios e criativos da campanha...",
      });

      // Aqui você pode implementar a chamada para sincronizar especificamente esta campanha
      // Por exemplo, chamar uma edge function que sincronize apenas esta campanha
      
      // Simular sincronização por enquanto
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Recarregar os dados após a sincronização
      await refetchAdSets();
      await refetchAds();
      
      toast({
        title: "Sincronização concluída!",
        description: "Os dados da campanha foram atualizados com sucesso.",
      });
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Função para criar tarefa baseada na sugestão
  const handleCreateTask = async (suggestion: any) => {
    try {
      if (!campaign) return;
      
      // Pegar o primeiro time disponível ou criar uma tarefa sem time específico
      const defaultTeam = teams.length > 0 ? teams[0] : null;
      
      if (!defaultTeam) {
        toast({
          title: "Erro ao criar tarefa",
          description: "Nenhuma equipe encontrada. Crie uma equipe primeiro nas configurações.",
          variant: "destructive",
        });
        return;
      }

      // Calcular deadline baseado na prioridade
      const now = new Date();
      const deadline = new Date();
      if (suggestion.priority === 'high') {
        deadline.setDate(now.getDate() + 2); // 2 dias para alta prioridade
      } else if (suggestion.priority === 'medium') {
        deadline.setDate(now.getDate() + 5); // 5 dias para média prioridade
      } else {
        deadline.setDate(now.getDate() + 10); // 10 dias para baixa prioridade
      }

      const taskData = {
        title: suggestion.title,
        description: `${suggestion.description}\n\nAção recomendada: ${suggestion.action}`,
        team_id: defaultTeam.id,
        responsible_name: "Não atribuído",
        responsible_avatar: "",
        status: "todo" as const,
        priority: suggestion.priority as "high" | "medium" | "low",
        deadline: deadline.toISOString().split('T')[0], // Format: YYYY-MM-DD
        progress: 0,
        origin: "automation" as const,
        related_campaign_id: campaign.id,
        related_client_id: campaign.client_id,
      };

      await createTask(taskData);
      
      // O toast de sucesso é exibido automaticamente pelo hook useTasks
      
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast({
        title: "Erro ao criar tarefa",
        description: "Não foi possível criar a tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "ativa":
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "pausada":
      case "paused":
        return "bg-amber-100 text-amber-800";
      case "finalizada":
      case "finished":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getPerformanceLevel = (ctr: number, cpc: number) => {
    if (ctr >= 3 && cpc <= 2) return { level: "Excelente", color: "text-emerald-600" };
    if (ctr >= 2 && cpc <= 3) return { level: "Bom", color: "text-blue-600" };
    if (ctr >= 1.5 && cpc <= 4) return { level: "Regular", color: "text-amber-600" };
    return { level: "Crítico", color: "text-red-600" };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-2xl font-bold text-muted-foreground mb-4">Campanha não encontrada</h2>
          <Button onClick={() => navigate("/campanhas")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Campanhas
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const performance = getPerformanceLevel(campaign.ctr || 0, campaign.cpc || 0);
  const conversionRate = campaign.conversions && campaign.clicks 
    ? ((campaign.conversions / campaign.clicks) * 100).toFixed(2)
    : "0.00";

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/campanhas")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
            <p className="text-muted-foreground">{campaign.client?.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMetricsModal(true)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Métricas Detalhadas
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSyncCampaign}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Status e Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                campaign.status?.toLowerCase() === "ativa" ? "bg-emerald-500" : 
                campaign.status?.toLowerCase() === "pausada" ? "bg-amber-500" : "bg-slate-500"
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                <p className={`text-lg font-semibold ${performance.color}`}>
                  {performance.level}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CTR</p>
                <p className="text-lg font-semibold text-foreground">
                  {campaign.ctr?.toFixed(2)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversões</p>
                <p className="text-lg font-semibold text-foreground">
                  {campaign.conversions || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Investimento e Resultados</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Investimento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {campaign.spend?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPC Médio</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {campaign.cpc?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CPA</p>
                <p className="text-xl font-semibold text-foreground">
                  R$ {campaign.cpa?.toFixed(2) || '0,00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-xl font-semibold text-foreground">
                  {conversionRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Alcance e Engajamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Impressões</p>
                <p className="text-2xl font-bold text-foreground">
                  {campaign.impressions?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliques</p>
                <p className="text-2xl font-bold text-foreground">
                  {campaign.clicks?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Alcance</p>
                <p className="text-xl font-semibold text-foreground">
                  {campaign.reach?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frequência</p>
                <p className="text-xl font-semibold text-foreground">
                  {campaign.frequency?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progresso da Campanha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Progresso da Campanha</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Data de Início: {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString('pt-BR') : 'N/A'}</span>
              <span>Status: {campaign.status}</span>
            </div>
            <Progress value={75} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>75% concluída</span>
              <span>Estimativa de conclusão: 30 dias</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para seções adicionais */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Insights & Recomendações</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alertas & Sugestões
            {campaignSuggestions.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {campaignSuggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="adsets">
            Conjuntos de Anúncios
            <Badge variant="secondary" className="ml-2 text-xs">
              {campaignAdSets.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ads">
            Criativos
            <Badge variant="secondary" className="ml-2 text-xs">
              {campaignAds.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Insights e Recomendações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Oportunidade de Melhoria</h4>
                  <p className="text-blue-800">
                    {campaign.ctr && campaign.ctr < 2 
                      ? "O CTR está abaixo da média. Considere testar novos criativos ou ajustar o público-alvo."
                      : "O CTR está em bom nível. Continue monitorando e testando variações."}
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">📈 Performance</h4>
                  <p className="text-green-800">
                    {campaign.conversions && campaign.conversions > 50 
                      ? "Excelente número de conversões! A campanha está performando bem."
                      : "Considere otimizar para aumentar o número de conversões."}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2">⚠️ Atenção</h4>
                  <p className="text-amber-800">
                    {campaign.cpc && campaign.cpc > 3 
                      ? "CPC está elevado. Revise as palavras-chave e configurações de lance."
                      : "CPC está em nível adequado. Continue monitorando."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Alertas & Sugestões da Campanha</h4>
              <Button
                onClick={handleAnalyzeCampaign}
                className="flex items-center gap-2"
                disabled={isAnalyzing}
              >
                <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analisando...' : 'Buscar Sugestões'}
              </Button>
            </div>

            {campaignSuggestions.length > 0 ? (
              <div className="space-y-4">
                {campaignSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className={`border-l-4 ${
                    suggestion.type === 'warning' ? 'border-l-red-500' : 'border-l-blue-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {suggestion.type === 'warning' ? (
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Target className="w-5 h-5 text-blue-500" />
                            )}
                            <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                            <Badge variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'default' : 'secondary'}>
                              {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                          <div className="bg-gray-50 p-3 rounded-lg mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-1">Ação recomendada:</p>
                            <p className="text-sm text-gray-700">{suggestion.action}</p>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleCreateTask(suggestion)}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Criar Tarefa
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Análise da Campanha
                </h3>
                <p className="text-gray-500 mb-6 max-w-2xl mx-auto">
                  Clique em "Buscar Sugestões" para obter uma análise detalhada desta campanha com insights estratégicos e recomendações de otimização.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900">Identificação de Problemas</p>
                    <p className="text-xs text-blue-700">CTR baixo, CPC alto, etc.</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-900">Oportunidades</p>
                    <p className="text-xs text-green-700">Escalonamento e melhorias</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-purple-900">Ações Estratégicas</p>
                    <p className="text-xs text-purple-700">Próximos passos recomendados</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="adsets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conjuntos de Anúncios da Campanha</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncCampaign}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {adSetsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Carregando conjuntos de anúncios...</p>
                </div>
              ) : campaignAdSets.length > 0 ? (
                <div className="space-y-4">
                  {campaignAdSets.map((adSet) => (
                    <Card key={adSet.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{adSet.name}</h4>
                          <Badge 
                            variant={adSet.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={adSet.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {adSet.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Orçamento Diário</p>
                            <p className="font-medium">R$ {adSet.daily_budget?.toFixed(2) || '0,00'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Investimento</p>
                            <p className="font-medium">R$ {adSet.spend?.toFixed(2) || '0,00'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">CTR</p>
                            <p className="font-medium">{adSet.ctr?.toFixed(2) || '0,00'}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">CPC</p>
                            <p className="font-medium">R$ {adSet.cpc?.toFixed(2) || '0,00'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Impressões</p>
                            <p className="font-medium">{adSet.impressions?.toLocaleString('pt-BR') || '0'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Cliques</p>
                            <p className="font-medium">{adSet.clicks?.toLocaleString('pt-BR') || '0'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Conversões</p>
                            <p className="font-medium">{adSet.conversions || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">CPA</p>
                            <p className="font-medium">R$ {adSet.cpa?.toFixed(2) || '0,00'}</p>
                          </div>
                        </div>

                        {adSet.targeting && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-gray-500 text-sm mb-1">Segmentação:</p>
                            <p className="text-sm text-gray-700">{adSet.targeting}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <div className="text-center">
                    <p className="text-gray-500 mb-1">Nenhum conjunto de anúncios encontrado para esta campanha.</p>
                    <p className="text-sm text-gray-400">Os dados aparecerão aqui após a sincronização com o Facebook.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleSyncCampaign}
                    disabled={isSyncing}
                    className="mt-4"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Criativos da Campanha</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncCampaign}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {adsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Carregando criativos...</p>
                </div>
              ) : campaignAds.length > 0 ? (
                <div className="space-y-4">
                  {campaignAds.map((ad) => (
                    <Card key={ad.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{ad.name}</h4>
                            <p className="text-sm text-gray-600">{ad.creative_type}</p>
                          </div>
                          <Badge 
                            variant={ad.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={ad.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {ad.status}
                          </Badge>
                        </div>

                        {(ad.creative_title || ad.creative_body) && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            {ad.creative_title && (
                              <h5 className="font-medium text-gray-900 mb-1">{ad.creative_title}</h5>
                            )}
                            {ad.creative_body && (
                              <p className="text-sm text-gray-700">{ad.creative_body}</p>
                            )}
                            {ad.call_to_action && (
                              <p className="text-xs text-gray-500 mt-2">CTA: {ad.call_to_action}</p>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Investimento</p>
                            <p className="font-medium">R$ {ad.spend?.toFixed(2) || '0,00'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">CTR</p>
                            <p className="font-medium">{ad.ctr?.toFixed(2) || '0,00'}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">CPC</p>
                            <p className="font-medium">R$ {ad.cpc?.toFixed(2) || '0,00'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Conversões</p>
                            <p className="font-medium">{ad.conversions || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Impressões</p>
                            <p className="font-medium">{ad.impressions?.toLocaleString('pt-BR') || '0'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Cliques</p>
                            <p className="font-medium">{ad.clicks?.toLocaleString('pt-BR') || '0'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Curtidas</p>
                            <p className="font-medium">{ad.likes || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Comentários</p>
                            <p className="font-medium">{ad.comments || 0}</p>
                          </div>
                        </div>

                        {(ad.image_url || ad.video_url) && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-gray-500 text-sm mb-2">Mídia:</p>
                            <div className="flex gap-2">
                              {ad.image_url && (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <img 
                                    src={ad.image_url} 
                                    alt="Creative" 
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <Eye className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              {ad.video_url && (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <BarChart3 className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <div className="text-center">
                    <p className="text-gray-500 mb-1">Nenhum criativo encontrado para esta campanha.</p>
                    <p className="text-sm text-gray-400">Os dados aparecerão aqui após a sincronização com o Facebook.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleSyncCampaign}
                    disabled={isSyncing}
                    className="mt-4"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Métricas */}
      {showMetricsModal && campaign && (
        <CampaignMetricsModal
          campaign={{
            ...campaign,
            created_at: campaign.created_at || new Date().toISOString()
          }}
          isOpen={showMetricsModal}
          onClose={() => setShowMetricsModal(false)}
        />
      )}
    </DashboardLayout>
  );
}