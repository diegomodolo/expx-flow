import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Edit, 
  MoreHorizontal,
  Phone,
  Mail,
  Building,
  User,
  MapPin,
  Globe,
  Plus,
  Eye,
  TrendingUp,
  TrendingDown,
  Megaphone,
  Play,
  Pause,
  DollarSign,
  Loader2,
  ChevronDown,
  Target,
  Users,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useAdSets } from "@/hooks/useAdSets";
import { useAds } from "@/hooks/useAds";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { SyncPeriodDialog } from "@/components/facebook/SyncPeriodDialog";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CampaignMetricsModal } from "@/components/campaigns/CampaignMetricsModal";
import { SyncStatusIndicator } from "@/components/clients/SyncStatusIndicator";
import { AdSetMetricsModal } from "@/components/adsets/AdSetMetricsModal";
import { AdCreativeMetricsModal } from "@/components/ads/AdCreativeMetricsModal";
import { FunnelAnalysis } from "@/components/funnel/FunnelAnalysis";
import { FundingAlert } from "@/components/alerts/FundingAlert";
import { AccountBalanceCard } from "@/components/clients/AccountBalanceCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { useCompetitors } from "@/hooks/useCompetitors";
import { CompetitorDialog } from "@/components/clients/CompetitorDialog";
import { CompetitorList } from "@/components/clients/CompetitorList";
import { supabase } from "@/integrations/supabase/client";

const ClienteDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { client, loading, error, refetch } = useClientDetails(id || "");
  const { adSets, loading: adSetsLoading, refetch: refetchAdSets } = useAdSets(id || "");
  const { ads, loading: adsLoading, refetch: refetchAds } = useAds(id || "");
  const { syncCampaigns, syncing: syncLoading, progress } = useFacebookCampaignSync();
  const { refetch: refetchDashboardData } = useDashboardData();
  const { competitors, competitorAds, generateCompetitiveAnalysis, refetch: refetchCompetitors } = useCompetitors(id);
  const { convertAlertToTask } = useTaskAutomation();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('all');
  const [adSetFilter, setAdSetFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('all');
  const [adFilter, setAdFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('all');
  const [sortField, setSortField] = useState<'name' | 'cpc' | 'cpa' | 'spend' | 'conversions' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [adSetSortField, setAdSetSortField] = useState<'name' | 'status' | 'budget' | 'cpm' | 'ctr' | 'conversions' | null>(null);
  const [adSetSortDirection, setAdSetSortDirection] = useState<'asc' | 'desc'>('asc');
  const [adSortField, setAdSortField] = useState<'name' | 'type' | 'status' | 'ctr' | 'cpc' | 'conversions' | 'frequency' | 'quality_ranking' | null>(null);
  const [adSortDirection, setAdSortDirection] = useState<'asc' | 'desc'>('asc');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [selectedAdSet, setSelectedAdSet] = useState(null);
  const [adSetMetricsModalOpen, setAdSetMetricsModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [adCreativeMetricsModalOpen, setAdCreativeMetricsModalOpen] = useState(false);
  
  // Estados para filtros de navegação entre abas
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  
  // Estados para alertas específicos do cliente
  const [convertedAlerts, setConvertedAlerts] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Estados para análise completa
  const [campaignAnalysis, setCampaignAnalysis] = useState<string | null>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  
  // Estados para análise competitiva
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<string | null>(null);
  const [isGeneratingCompetitiveAnalysis, setIsGeneratingCompetitiveAnalysis] = useState(false);

  // Calculate campaign metrics (with safe access) - MOVED TO TOP
  const totalCampaigns = client?.campaigns?.length || 0;
  const activeCampaigns = client?.campaigns?.filter(c => c.status === 'active' || c.is_active === true).length || 0;
  const pausedCampaigns = client?.campaigns?.filter(c => c.status === 'paused' || c.is_active === false).length || 0;
  const finishedCampaigns = client?.campaigns?.filter(c => c.status === 'finished').length || 0;
  const totalLeadsGenerated = client?.leads_generated || 0;
  const totalInvested = client?.campaigns?.reduce((total, campaign) => total + (campaign.spend || 0), 0) || 0;

  // Alertas removidos - agora são gerados apenas na página de tarefas quando solicitado
  const dangerAlerts: any[] = [];
  const opportunityAlerts: any[] = [];

  // Estados para sugestões
  const [campaignSuggestions, setCampaignSuggestions] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Funções para manipular alertas
  const handleAnalyzeCampaigns = async () => {
    if (!client?.campaigns) return;
    
    setIsAnalyzing(true);
    try {
      setConvertedAlerts(new Set());
      
      // Analisar campanhas e gerar sugestões sempre
      const suggestions = await generateCampaignSuggestions();
      setCampaignSuggestions(suggestions);
      
      await refetchDashboardData(client?.id);
    } catch (error) {
      console.error('Error analyzing campaigns:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Função para gerar sugestões baseadas nas campanhas
  const generateCampaignSuggestions = async () => {
    if (!client?.campaigns) return [];

    setLoadingRecommendations(true);
    try {
      console.log('Gerando recomendações por campanha para:', client.name);
      
      // Prepare client data for AI analysis
      const clientData = {
        id: client.id,
        name: client.name,
        sector: client.sector,
        product_name: client.product_name,
        monthly_budget: client.monthly_budget,
        leads_generated: client.leads_generated,
        status: client.status,
        objectives: client.objectives,
        preferred_platforms: client.preferred_platforms,
        target_audience: client.target_audience,
        voice_tone: client.voice_tone
      };

      // Prepare campaigns data
      const campaignsData = client.campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        spend: campaign.spend || 0,
        conversions: campaign.conversions || 0,
        cpa: campaign.cpa || 0,
        cpc: campaign.cpc || 0,
        ctr: campaign.ctr || 0,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        reach: campaign.reach || 0,
        frequency: campaign.frequency || 0,
        period: campaign.created_at || new Date().toISOString(),
        platforms: campaign.platforms
      }));

      // Call AI suggestions function
      const { data, error } = await supabase.functions.invoke('generate-client-suggestions', {
        body: {
          clientData,
          campaigns: campaignsData
        }
      });

      if (error) {
        console.error('Erro ao gerar recomendações:', error);
        return [];
      }

      console.log(`Recomendações geradas: ${data.suggestions.length}`);
      return data.suggestions || [];

    } catch (error) {
      console.error('Erro na geração de recomendações:', error);
      return [];
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleConvertAlertToTask = (alert: any) => {
    setConvertedAlerts(prev => new Set([...prev, alert.id]));
    convertAlertToTask(alert);
  };

  const handleDiscardAlert = (alert: any) => {
    setConvertedAlerts(prev => new Set([...prev, alert.id]));
  };

  // Early returns for loading and error states
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Link to="/clientes">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Clientes
            </Button>
          </Link>
          <div className="text-center py-16">
            <p className="text-red-600">Erro ao carregar cliente: {error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/clientes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={client.avatar} alt={client.name} />
                <AvatarFallback>
                  {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-sm text-gray-600">{client.company}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" className="flex-1 lg:flex-none">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Client Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Campanhas Ativas</p>
                  <p className="text-xl font-semibold">{activeCampaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-xl font-semibold">{totalLeadsGenerated}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Investido</p>
                  <p className="text-xl font-semibold">R$ {totalInvested.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Campanhas</p>
                  <p className="text-xl font-semibold">{totalCampaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
              <TabsTrigger value="alerts">Alertas e Sugestões</TabsTrigger>
              <TabsTrigger value="funnel">Funil</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="p-4 sm:p-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Informações do Cliente</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Empresa</p>
                        <p className="font-medium">{client.company}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Setor</p>
                        <p className="font-medium">{client.sector}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Orçamento Mensal</p>
                        <p className="font-medium">R$ {client.monthly_budget || 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Website</p>
                        <p className="font-medium">{client.website_url || 'Não informado'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge variant={client.status === 'green' ? 'default' : 'destructive'}>
                          {client.status === 'green' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="campaigns" className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold">Campanhas</h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Campanha
                    </Button>
                  </div>
                </div>

                {client.campaigns && client.campaigns.length > 0 ? (
                  <div className="space-y-4">
                    {client.campaigns.map((campaign) => (
                      <Card key={campaign.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                            <p className="text-sm text-gray-600">{campaign.platforms}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">CPA</p>
                              <p className="font-semibold">R$ {campaign.cpa?.toFixed(2) || '0,00'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">CTR</p>
                              <p className="font-semibold">{campaign.ctr?.toFixed(2) || '0,00'}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Conversões</p>
                              <p className="font-semibold">{campaign.conversions || 0}</p>
                            </div>
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma campanha encontrada</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Alertas e Sugestões</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Recomendações inteligentes baseadas na performance das suas campanhas
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleAnalyzeCampaigns}
                    className="flex items-center gap-2"
                    disabled={isAnalyzing}
                  >
                    <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analisando...' : 'Buscar Sugestões'}
                  </Button>
                </div>

                {loadingRecommendations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Gerando recomendações...</span>
                  </div>
                ) : campaignSuggestions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Grouping recommendations by campaign */}
                    {(() => {
                      const groupedRecommendations = campaignSuggestions.reduce((groups, recommendation) => {
                        const key = recommendation.campaignId || 'new_campaigns';
                        if (!groups[key]) {
                          groups[key] = [];
                        }
                        groups[key].push(recommendation);
                        return groups;
                      }, {});

                      return Object.entries(groupedRecommendations).map(([campaignId, recommendations]: [string, any[]]) => {
                        const isNewCampaign = campaignId === 'new_campaigns';
                        const campaignName = isNewCampaign 
                          ? 'Oportunidades de Novas Campanhas' 
                          : recommendations[0]?.campaignName || 'Campanha';
                        
                        return (
                          <div key={campaignId} className="border rounded-lg p-6 bg-white shadow-sm">
                            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                              {isNewCampaign ? (
                                <Plus className="w-6 h-6 text-purple-600" />
                              ) : (
                                <Megaphone className="w-6 h-6 text-blue-600" />
                              )}
                              <h3 className="text-lg font-semibold text-gray-900">{campaignName}</h3>
                              <Badge variant="outline" className="text-xs">
                                {recommendations.length} recomendação{recommendations.length !== 1 ? 'ões' : ''}
                              </Badge>
                            </div>
                            
                            <div className="space-y-4">
                              {recommendations.map((recommendation: any) => (
                                <Card key={recommendation.id} className={`border-l-4 ${
                                  recommendation.type === 'alert' ? 'border-l-red-500 bg-red-50/30' :
                                  recommendation.type === 'suggestion' ? 'border-l-blue-500 bg-blue-50/30' : 
                                  recommendation.type === 'opportunity' ? 'border-l-green-500 bg-green-50/30' :
                                  'border-l-purple-500 bg-purple-50/30'
                                } hover:shadow-md transition-all duration-200`}>
                                  <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        {/* Header with icon and title */}
                                        <div className="flex items-center gap-3 mb-3">
                                          {recommendation.type === 'alert' ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full">
                                              <AlertTriangle className="w-4 h-4 text-red-600" />
                                              <span className="text-xs font-medium text-red-700">ALERTA</span>
                                            </div>
                                          ) : recommendation.type === 'suggestion' ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                                              <Target className="w-4 h-4 text-blue-600" />
                                              <span className="text-xs font-medium text-blue-700">SUGESTÃO</span>
                                            </div>
                                          ) : recommendation.type === 'opportunity' ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                                              <TrendingUp className="w-4 h-4 text-green-600" />
                                              <span className="text-xs font-medium text-green-700">OPORTUNIDADE</span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                                              <Plus className="w-4 h-4 text-purple-600" />
                                              <span className="text-xs font-medium text-purple-700">NOVA CAMPANHA</span>
                                            </div>
                                          )}
                                          
                                          <div className="flex gap-2">
                                            <Badge variant={recommendation.priority === 'high' ? 'destructive' : recommendation.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                              {recommendation.priority === 'high' ? 'Alta' : recommendation.priority === 'medium' ? 'Média' : 'Baixa'}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        <h5 className="font-semibold text-gray-900 text-base mb-2">{recommendation.title}</h5>
                                        <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
                                        
                                        {/* Justification */}
                                        <div className="bg-gray-50 p-3 rounded-lg mb-3 border border-gray-200">
                                          <p className="text-sm font-medium text-gray-900 mb-1">💡 Justificativa:</p>
                                          <p className="text-sm text-gray-700">{recommendation.justification}</p>
                                        </div>

                                        {/* Expected Impact */}
                                        <div className="bg-green-50 p-3 rounded-lg mb-3 border border-green-200">
                                          <p className="text-sm font-medium text-green-800 mb-1 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            Impacto Esperado ({recommendation.expectedMetric}):
                                          </p>
                                          <p className="text-sm text-green-700 font-medium">{recommendation.impact}</p>
                                        </div>

                                        {/* Action Steps */}
                                        {recommendation.actionSteps && recommendation.actionSteps.length > 0 && (
                                          <div className="mb-4">
                                            <p className="text-sm font-medium text-gray-900 mb-2">📋 Próximos Passos:</p>
                                            <ul className="text-sm text-gray-600 space-y-2">
                                              {recommendation.actionSteps.map((step, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                  <span className="text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                                                    {index + 1}
                                                  </span>
                                                  <span className="leading-relaxed">{step}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                                          <Button 
                                            size="sm" 
                                            className="bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleConvertAlertToTask({
                                              ...recommendation,
                                              related_campaign_id: recommendation.campaignId,
                                              alert_description: `${recommendation.justification}\n\nImpacto esperado: ${recommendation.impact}`
                                            })}
                                          >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Criar Tarefa
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleDiscardAlert(recommendation)}
                                          >
                                            Dispensar
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Clique em "Buscar Sugestões" para analisar suas campanhas</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="funnel" className="p-4 sm:p-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Análise do Funil</h3>
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Análise do funil em desenvolvimento</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClienteDetalhes;