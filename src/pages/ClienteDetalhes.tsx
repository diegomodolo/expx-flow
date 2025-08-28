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
  CheckCircle,
  Trash2
} from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useAdSets } from "@/hooks/useAdSets";
import { useAds } from "@/hooks/useAds";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { SyncPeriodDialog, SyncOptions } from "@/components/facebook/SyncPeriodDialog";
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
import { WeeklyReportTab } from "@/components/reports/WeeklyReportTab";
import { PeriodComparisonTab } from "@/components/clients/PeriodComparisonTab";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useClientNotes } from "@/hooks/useClientNotes";

const ClienteDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { client, loading, error, refetch } = useClientDetails(id || "");
  const { adSets, loading: adSetsLoading, refetch: refetchAdSets } = useAdSets(id || "");
  const { ads, loading: adsLoading, refetch: refetchAds } = useAds(id || "");
  const { syncCampaigns, syncing: syncLoading, progress } = useFacebookCampaignSync();
  const { refetch: refetchDashboardData } = useDashboardData();
  const { competitors, competitorAds, generateCompetitiveAnalysis, refetch: refetchCompetitors } = useCompetitors(id);
const { convertAlertToTask } = useTaskAutomation();
const { toast } = useToast();
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

// Hook para anotações
const { notes, profilesByUserId, loading: notesLoading, addNote, deleteNote } = useClientNotes(id || "");
const { user } = useAuth();

// Estado para modal de nova anotação
const [openNoteDialog, setOpenNoteDialog] = useState(false);
const [noteText, setNoteText] = useState<string>("");
const [savingNote, setSavingNote] = useState(false);

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

    try {
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
        console.error('Erro ao gerar sugestões:', error);
        // Fallback to basic suggestions if AI fails
        return generateBasicSuggestions(client.campaigns);
      }

      return data.suggestions || [];

    } catch (error) {
      console.error('Erro na geração de sugestões:', error);
      // Fallback to basic suggestions
      return generateBasicSuggestions(client.campaigns);
    }
  };

  // Função de fallback para sugestões básicas
  const generateBasicSuggestions = (campaigns: any[]) => {
    const suggestions = [];
    const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.is_active === true);

    // 1. Análise de campanhas sem conversões
    const campaignsWithoutConversions = activeCampaigns.filter(c => (c.conversions || 0) === 0 && (c.spend || 0) > 50);
    if (campaignsWithoutConversions.length > 0) {
      suggestions.push({
        id: 'no-conversions',
        type: 'warning',
        category: 'Performance',
        title: 'Campanhas sem conversões detectadas',
        description: `${campaignsWithoutConversions.length} campanha(s) ativa(s) com investimento acima de R$ 50 não estão gerando conversões.`,
        action: 'Revisar segmentação e criativos das campanhas',
        campaigns: campaignsWithoutConversions.map(c => c.name).slice(0, 3),
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        estimatedImpact: 'Potencial de gerar primeiras conversões',
        implementationSteps: [
          'Analisar público-alvo das campanhas',
          'Revisar criativos e copy',
          'Verificar landing page',
          'Ajustar estratégia de bidding'
        ],
        relatedMetrics: ['Conversões', 'CPA', 'CTR']
      });
    }

    // 2. Análise de CPA alto
    const highCpaCampaigns = activeCampaigns.filter(c => (c.cpa || 0) > 100 && (c.conversions || 0) > 0);
    if (highCpaCampaigns.length > 0) {
      suggestions.push({
        id: 'high-cpa',
        type: 'warning',
        category: 'Custo por Aquisição',
        title: 'CPAs elevados identificados',
        description: `${highCpaCampaigns.length} campanha(s) com CPA acima de R$ 100. CPA médio: R$ ${(highCpaCampaigns.reduce((sum, c) => sum + (c.cpa || 0), 0) / highCpaCampaigns.length).toFixed(2)}`,
        action: 'Otimizar segmentação e ajustar orçamentos para reduzir custos',
        campaigns: highCpaCampaigns.map(c => c.name).slice(0, 3),
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        estimatedImpact: 'Redução de 20-40% no CPA',
        implementationSteps: [
          'Analisar audiências com maior CPA',
          'Pausar segmentos ineficientes',
          'Otimizar criativos com baixo CTR',
          'Testar estratégias de bidding'
        ],
        relatedMetrics: ['CPA', 'CTR', 'Quality Score']
      });
    }

    // 3. Oportunidades de escalonamento
    const lowCpaCampaigns = activeCampaigns.filter(c => (c.cpa || 0) > 0 && (c.cpa || 0) < 50 && (c.conversions || 0) >= 5);
    if (lowCpaCampaigns.length > 0) {
      suggestions.push({
        id: 'scale-opportunity',
        type: 'opportunity',
        category: 'Escalonamento',
        title: 'Oportunidade de escalonamento',
        description: `${lowCpaCampaigns.length} campanha(s) com CPA baixo (< R$ 50) e bom volume de conversões podem ser escalonadas.`,
        action: 'Aumentar orçamento das campanhas performantes em 20-30%',
        campaigns: lowCpaCampaigns.map(c => c.name).slice(0, 3),
        priority: 'medium',
        impact: 'high',
        effort: 'low',
        estimatedImpact: 'Aumento de 30-50% no volume',
        implementationSteps: [
          'Identificar campanhas com CPA < R$ 50',
          'Aumentar budget em 20% inicialmente',
          'Monitorar performance por 3 dias',
          'Escalar gradualmente se performance mantém'
        ],
        relatedMetrics: ['Volume', 'ROAS', 'CPA']
      });
    }

    // 4. Análise de horários
    suggestions.push({
      id: 'timing-optimization',
      type: 'optimization',
      category: 'Horários de Veiculação',
      title: 'Otimização de horários de veiculação',
      description: 'Analisar horários de melhor performance pode reduzir custos significativamente.',
      action: 'Implementar dayparting baseado em dados de conversão',
      campaigns: activeCampaigns.slice(0, 3).map(c => c.name),
      priority: 'medium',
      impact: 'medium',
      effort: 'low',
      estimatedImpact: 'Redução de 10-20% no CPA',
      implementationSteps: [
        'Analisar relatório de performance por horário',
        'Identificar janelas de melhor performance',
        'Configurar agendamento de anúncios',
        'Aumentar bids em horários de pico'
      ],
      relatedMetrics: ['CPA por horário', 'CTR por horário']
    });

    // 5. Análise de dispositivos
    suggestions.push({
      id: 'device-optimization',
      type: 'optimization',
      category: 'Segmentação de Dispositivos',
      title: 'Otimização por dispositivo',
      description: 'Mobile representa 80%+ do tráfego no Facebook. Otimize a experiência mobile.',
      action: 'Criar campanhas específicas para mobile com criativos otimizados',
      campaigns: activeCampaigns.slice(0, 2).map(c => c.name),
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      estimatedImpact: 'Melhoria de 15-25% na performance mobile',
      implementationSteps: [
        'Analisar performance mobile vs desktop',
        'Criar criativos mobile-first',
        'Otimizar landing pages para mobile',
        'Ajustar bids por dispositivo'
      ],
      relatedMetrics: ['CTR mobile', 'CPA mobile', 'Mobile conversion rate']
    });

    return suggestions.slice(0, 8); // Limitar a 8 sugestões
  };

  const handleConvertAlertToTask = (alert: any) => {
    setConvertedAlerts(prev => new Set([...prev, alert.id]));
    convertAlertToTask(alert);
  };

  const handleDiscardAlert = (alert: any) => {
    setConvertedAlerts(prev => new Set([...prev, alert.id]));
  };

  // Função para gerar análise completa
  const handleGenerateAnalysis = async () => {
    if (!client || !client.campaigns) return;
    
    setIsGeneratingAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-analysis', {
        body: {
          clientData: {
            name: client.name,
            sector: client.sector,
            product_name: client.product_name,
            monthly_budget: client.monthly_budget,
            leads_generated: client.leads_generated,
            status: client.status,
          },
          campaigns: client.campaigns,
        },
      });

      if (error) {
        console.error('Error generating analysis:', error);
        return;
      }

      setCampaignAnalysis(data.analysis);
    } catch (error) {
      console.error('Error generating analysis:', error);
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  // Função para gerar análise competitiva
  const handleGenerateCompetitiveAnalysis = async () => {
    if (!client || !ads) return;
    
    setIsGeneratingCompetitiveAnalysis(true);
    try {
      const analysis = await generateCompetitiveAnalysis(client, ads);
      setCompetitiveAnalysis(analysis);
    } catch (error) {
      console.error('Error generating competitive analysis:', error);
    } finally {
      setIsGeneratingCompetitiveAnalysis(false);
    }
  };

  // Salvar nova anotação
  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      setSavingNote(true);
      await addNote(noteText.trim());
      toast({ title: 'Anotação adicionada', description: 'Nova anotação foi criada com sucesso.' });
      setOpenNoteDialog(false);
      setNoteText("");
    } catch (e: any) {
      console.error('Erro ao salvar anotação:', e);
      toast({ title: 'Erro ao salvar', description: e?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  // Excluir anotação
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast({ title: 'Anotação excluída', description: 'A anotação foi removida com sucesso.' });
    } catch (e: any) {
      console.error('Erro ao excluir anotação:', e);
      toast({ title: 'Erro ao excluir', description: e?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  // Formatar data/hora em português
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate funnel completeness score
  const funnelCompletenessScore = useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) return 0;

    const activeCampaigns = client.campaigns.filter(c => c.status === 'active' || c.is_active === true);
    if (activeCampaigns.length === 0) return 0;

    // Classify campaigns by funnel stage
    const funnelStages = {
      topo: activeCampaigns.filter(c => {
        const objective = c.objective?.toUpperCase() || '';
        return objective.includes('AWARENESS') || objective.includes('REACH') || 
               objective.includes('BRAND') || objective.includes('VIDEO_VIEWS');
      }),
      meio: activeCampaigns.filter(c => {
        const objective = c.objective?.toUpperCase() || '';
        return objective.includes('TRAFFIC') || objective.includes('ENGAGEMENT') || 
               objective.includes('LEADS') || objective.includes('OUTCOME_LEADS') ||
               objective.includes('MESSAGES') || objective.includes('POST_ENGAGEMENT');
      }),
      fundo: activeCampaigns.filter(c => {
        const objective = c.objective?.toUpperCase() || '';
        return objective.includes('CONVERSIONS') || objective.includes('OFFSITE_CONVERSIONS') ||
               objective.includes('CATALOG_SALES') || objective.includes('OUTCOME_SALES') ||
               objective.includes('APP_INSTALLS');
      }),
      retencao: activeCampaigns.filter(c => {
        const objective = c.objective?.toUpperCase() || '';
        return !objective.includes('AWARENESS') && !objective.includes('REACH') && 
               !objective.includes('BRAND') && !objective.includes('VIDEO_VIEWS') &&
               !objective.includes('TRAFFIC') && !objective.includes('ENGAGEMENT') && 
               !objective.includes('LEADS') && !objective.includes('OUTCOME_LEADS') &&
               !objective.includes('MESSAGES') && !objective.includes('POST_ENGAGEMENT') &&
               !objective.includes('CONVERSIONS') && !objective.includes('OFFSITE_CONVERSIONS') &&
               !objective.includes('CATALOG_SALES') && !objective.includes('OUTCOME_SALES') &&
               !objective.includes('APP_INSTALLS');
      })
    };

    let score = 0;
    const maxScorePerStage = 25; // 25 points per stage (100/4)

    // Calculate score for each stage
    Object.values(funnelStages).forEach(stageCampaigns => {
      if (stageCampaigns.length > 0) {
        // Check if campaigns have conversions/results
        const hasResults = stageCampaigns.some(c => (c.conversions || 0) > 0);
        if (hasResults) {
          score += maxScorePerStage; // Full points if has active campaigns with results
        } else {
          score += maxScorePerStage * 0.5; // Half points if has active campaigns but no results
        }
      }
    });

    return Math.round(score);
  }, [client?.campaigns]);

  // Calculate ad set metrics
  const totalAdSets = adSets?.length || 0;
  const activeAdSets = adSets?.filter(adSet => adSet.status === 'active').length || 0;
  const pausedAdSets = adSets?.filter(adSet => adSet.status === 'paused').length || 0;
  const finishedAdSets = adSets?.filter(adSet => adSet.status === 'archived').length || 0;

  // Calculate ad metrics
  const totalAds = ads?.length || 0;
  const activeAds = ads?.filter(ad => ad.status === 'active').length || 0;
  const pausedAds = ads?.filter(ad => ad.status === 'paused').length || 0;
  const finishedAds = ads?.filter(ad => ad.status === 'archived').length || 0;

  // Data for CPL by Campaign chart (horizontal bar chart)
  const cplByCampaignData = React.useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) {
      return [];
    }

    return client.campaigns
      .filter(campaign => (campaign.cpa || 0) > 0) // Only show campaigns with CPA > 0
      .map(campaign => ({
        name: campaign.name.length > 25 ? campaign.name.substring(0, 25) + '...' : campaign.name,
        fullName: campaign.name,
        cpl: campaign.cpa || 0,
        status: campaign.status,
        conversions: campaign.conversions,
        spend: campaign.spend || 0
      }))
      .sort((a, b) => a.cpl - b.cpl) // Sort by CPL ascending (cheapest first)
      .slice(0, 8); // Show top 8 campaigns
  }, [client?.campaigns]);

  // Data for Investment Distribution chart (pie chart)
  const investmentDistributionData = React.useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) {
      return [];
    }

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#ff0088', '#8800ff'];
    
    return client.campaigns
      .filter(campaign => (campaign.spend || 0) > 0)
      .map((campaign, index) => ({
        name: campaign.name.length > 20 ? campaign.name.substring(0, 20) + '...' : campaign.name,
        fullName: campaign.name,
        value: campaign.spend || 0,
        conversions: campaign.conversions || 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value) // Sort by spend descending
      .slice(0, 6); // Show top 6 campaigns
  }, [client?.campaigns]);

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    if (!client?.campaigns) return [];
    
    let campaigns = [...client.campaigns];
    
    // Filter campaigns
    if (campaignFilter === 'active') {
      campaigns = campaigns.filter(c => c.status === 'active');
    } else if (campaignFilter === 'paused') {
      campaigns = campaigns.filter(c => c.status === 'paused');
    } else if (campaignFilter === 'finished') {
      campaigns = campaigns.filter(c => c.status === 'finished');
    }

    // Sort campaigns
    if (sortField) {
      campaigns = campaigns.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'cpc':
            aValue = a.cpc;
            bValue = b.cpc;
            break;
          case 'cpa':
            aValue = a.cpa;
            bValue = b.cpa;
            break;
          case 'spend':
            aValue = a.spend;
            bValue = b.spend;
            break;
          case 'conversions':
            aValue = a.conversions;
            bValue = b.conversions;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return campaigns;
  }, [client?.campaigns, campaignFilter, sortField, sortDirection]);

  // Filter and sort ad sets
  const filteredAndSortedAdSets = useMemo(() => {
    if (!adSets) return [];
    
    let filtered = [...adSets];
    
    // Filtrar por campanha selecionada
    if (selectedCampaignId) {
      filtered = filtered.filter(adSet => adSet.campaign_id === selectedCampaignId);
    }
    
    // Filter ad sets
    if (adSetFilter === 'active') {
      filtered = filtered.filter(adSet => adSet.status === 'active');
    } else if (adSetFilter === 'paused') {
      filtered = filtered.filter(adSet => adSet.status === 'paused');
    } else if (adSetFilter === 'finished') {
      filtered = filtered.filter(adSet => adSet.status === 'archived');
    }
    
    if (adSetSortField) {
      filtered = filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (adSetSortField) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'budget':
            aValue = a.daily_budget > 0 ? a.daily_budget : a.lifetime_budget;
            bValue = b.daily_budget > 0 ? b.daily_budget : b.lifetime_budget;
            break;
          case 'cpm':
            aValue = a.cpm;
            bValue = b.cpm;
            break;
          case 'ctr':
            aValue = a.ctr;
            bValue = b.ctr;
            break;
          case 'conversions':
            aValue = a.conversions;
            bValue = b.conversions;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return adSetSortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return adSetSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [adSets, adSetFilter, adSetSortField, adSetSortDirection, selectedCampaignId]);

  // Filter and sort ads
  const filteredAndSortedAds = useMemo(() => {
    if (!ads) return [];
    
    let filtered = [...ads];
    
    // Filtrar por conjunto de anúncios selecionado
    if (selectedAdSetId) {
      filtered = filtered.filter(ad => ad.ad_set_id === selectedAdSetId);
    }
    
    // Filter ads
    if (adFilter === 'active') {
      filtered = filtered.filter(ad => ad.status === 'active');
    } else if (adFilter === 'paused') {
      filtered = filtered.filter(ad => ad.status === 'paused');
    } else if (adFilter === 'finished') {
      filtered = filtered.filter(ad => ad.status === 'archived');
    }
    
    if (adSortField) {
      filtered = filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (adSortField) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'type':
            aValue = a.creative_type || '';
            bValue = b.creative_type || '';
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'ctr':
            aValue = a.ctr;
            bValue = b.ctr;
            break;
          case 'cpc':
            aValue = a.cpc;
            bValue = b.cpc;
            break;
          case 'conversions':
            aValue = a.conversions;
            bValue = b.conversions;
            break;
          case 'frequency':
            aValue = a.frequency;
            bValue = b.frequency;
            break;
          case 'quality_ranking':
            aValue = a.quality_ranking || 'UNKNOWN';
            bValue = b.quality_ranking || 'UNKNOWN';
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return adSortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return adSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [ads, adFilter, adSortField, adSortDirection, selectedAdSetId]);

  const handleSort = (field: 'name' | 'cpc' | 'cpa' | 'spend' | 'conversions') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAdSetSort = (field: 'name' | 'status' | 'budget' | 'cpm' | 'ctr' | 'conversions') => {
    if (adSetSortField === field) {
      setAdSetSortDirection(adSetSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAdSetSortField(field);
      setAdSetSortDirection('asc');
    }
  };

  const handleAdSort = (field: 'name' | 'type' | 'status' | 'ctr' | 'cpc' | 'conversions' | 'frequency' | 'quality_ranking') => {
    if (adSortField === field) {
      setAdSortDirection(adSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAdSortField(field);
      setAdSortDirection('asc');
    }
  };

  // Função para formatar rankings
  const formatRanking = (ranking?: string) => {
    if (!ranking || ranking === 'UNKNOWN') return 'N/A';
    
    const translations: { [key: string]: string } = {
      'ABOVE_AVERAGE': 'Acima da Média',
      'AVERAGE': 'Média',
      'BELOW_AVERAGE': 'Abaixo da Média',
      'BELOW_AVERAGE_35': 'Bem Abaixo da Média',
      'BELOW_AVERAGE_20': 'Muito Abaixo da Média',
      'BELOW_AVERAGE_10': 'Extremamente Baixo',
      'HIGH': 'Alto',
      'MEDIUM': 'Médio',
      'LOW': 'Baixo'
    };
    
    return translations[ranking] || ranking;
  };

  // Função para traduzir objetivos de campanha
  const formatCampaignObjective = (objective?: string) => {
    if (!objective) return 'N/A';
    
    const translations: { [key: string]: string } = {
      'REACH': 'Alcance',
      'BRAND_AWARENESS': 'Reconhecimento de Marca',
      'VIDEO_VIEWS': 'Visualizações de Vídeo',
      'LEAD_GENERATION': 'Geração de Leads',
      'CONVERSIONS': 'Conversões',
      'LINK_CLICKS': 'Cliques no Link',
      'TRAFFIC': 'Tráfego',
      'ENGAGEMENT': 'Engajamento',
      'APP_INSTALLS': 'Instalações do App',
      'MESSAGES': 'Mensagens',
      'POST_ENGAGEMENT': 'Engajamento da Publicação',
      'PAGE_LIKES': 'Curtidas da Página',
      'EVENT_RESPONSES': 'Respostas do Evento',
      'STORE_VISITS': 'Visitas à Loja',
      'CATALOG_SALES': 'Vendas do Catálogo',
      'OFFSITE_CONVERSIONS': 'Conversões Fora do Site',
      // Novos objetivos do Facebook API v20+
      'OUTCOME_LEADS': 'Geração de Leads',
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_AWARENESS': 'Reconhecimento de Marca',
      'OUTCOME_SALES': 'Vendas',
      'OUTCOME_ENGAGEMENT': 'Engajamento',
      'OUTCOME_APP_PROMOTION': 'Promoção de App'
    };
    
    return translations[objective] || objective;
  };

  const handleSyncConfirm = async (options: SyncOptions) => {
    if (!id) return;
    
    try {
      await syncCampaigns(id, options.period, {
        campaigns: options.campaigns,
        adsets: options.adsets,
        ads: options.ads
      }); // Use full sync options for client details page
      setSyncDialogOpen(false);
      // Aguarda um pouco e recarrega os dados
      setTimeout(() => {
        refetch();
        refetchAdSets();
        refetchAds();
      }, 1000);
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      setSyncDialogOpen(false);
    }
  };

  const handleViewMetrics = (campaign: any) => {
    setSelectedCampaign(campaign);
    setMetricsModalOpen(true);
  };

  const handleViewAdSetMetrics = (adSet: any) => {
    setSelectedAdSet(adSet);
    setAdSetMetricsModalOpen(true);
  };

  const handleViewAdCreativeMetrics = (ad: any) => {
    setSelectedAd(ad);
    setAdCreativeMetricsModalOpen(true);
  };

  // Funções para navegação entre abas com filtros
  const handleCampaignClick = (campaign: any) => {
    setSelectedCampaignId(campaign.id);
    setSelectedAdSetId(null); // Limpar filtro de ad set
    setActiveTab("adsets");
  };

  const handleAdSetClick = (adSet: any) => {
    setSelectedAdSetId(adSet.id);
    setActiveTab("ads");
  };

  // Função para limpar filtros e voltar à visualização geral
  const clearFilters = () => {
    setSelectedCampaignId(null);
    setSelectedAdSetId(null);
  };

  // Função para obter o nome da campanha selecionada
  const getSelectedCampaignName = () => {
    if (!selectedCampaignId || !client?.campaigns) return null;
    const campaign = client.campaigns.find(c => c.id === selectedCampaignId);
    return campaign?.name || null;
  };

  // Função para obter o nome do conjunto de anúncios selecionado
  const getSelectedAdSetName = () => {
    if (!selectedAdSetId || !adSets) return null;
    const adSet = adSets.find(a => a.id === selectedAdSetId);
    return adSet?.name || null;
  };
  
  
  if (!id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">ID do cliente não fornecido</h2>
            <Link to="/clientes">
              <Button variant="outline">Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Carregando detalhes do cliente...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-red-600">Erro</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link to="/clientes">
              <Button variant="outline">Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Cliente não encontrado</h2>
            <Link to="/clientes">
              <Button variant="outline">Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }


  console.log('Campaign metrics calculation:', {
    totalCampaigns,
    activeCampaigns,
    pausedCampaigns,
    finishedCampaigns,
    campaigns: client?.campaigns || []
  });

  const statusConfig = {
    green: { label: "Excelente", color: "bg-green-100 text-green-800" },
    yellow: { label: "Atenção", color: "bg-yellow-100 text-yellow-800" },
    red: { label: "Crítico", color: "bg-red-100 text-red-800" },
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6 px-2 sm:px-4 lg:px-0 max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link to="/clientes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl lg:text-2xl font-bold">Detalhes do Cliente</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <SyncStatusIndicator 
              lastSyncAt={client.last_sync_at} 
              lastSyncPeriod={client.last_sync_period}
            />
            <Button 
              onClick={() => setSyncDialogOpen(true)}
              disabled={syncLoading}
              className="flex items-center space-x-2 w-full sm:w-auto"
              size="sm"
            >
              {syncLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              <span className="text-sm">{syncLoading ? 'Sincronizando...' : 'Sincronizar Dados'}</span>
            </Button>
          </div>
        </div>

        {/* Client Overview Card */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-6 w-full lg:w-auto">
                <Avatar className="w-16 h-16 lg:w-20 lg:h-20 mx-auto sm:mx-0">
                  <AvatarImage src={client.avatar} />
                  <AvatarFallback className="text-lg">
                    {client.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{client.name}</h2>
                  <p className="text-base lg:text-lg text-gray-600">{client.company}</p>
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2">
                    <Badge className={statusConfig[client.status]?.color}>
                      {statusConfig[client.status]?.label}
                    </Badge>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{client.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 w-full lg:w-auto">
                <Button size="sm" className="flex-1 lg:flex-none">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funding Alert */}
        {client.facebook_ad_accounts && client.facebook_ad_accounts.has_funding_issues && (
          <FundingAlert
            accountStatus={client.facebook_ad_accounts.account_status}
            balance={client.facebook_ad_accounts.balance}
            disableReason={client.facebook_ad_accounts.disable_reason}
            hasFundingIssues={client.facebook_ad_accounts.has_funding_issues}
            accountName={client.facebook_ad_accounts.account_name}
            className="mb-6"
          />
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Funnel Completeness Score Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completude do Funil</p>
                  <p className="text-2xl font-bold text-gray-900">{funnelCompletenessScore}%</p>
                  <div className="flex items-center space-x-1 mt-1">
                    {funnelCompletenessScore >= 80 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500">excelente</span>
                      </>
                    ) : funnelCompletenessScore >= 50 ? (
                      <>
                        <BarChart3 className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-yellow-500">boa</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-500">precisa melhorar</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  funnelCompletenessScore >= 80 ? 'bg-green-100' :
                  funnelCompletenessScore >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <BarChart3 className={`w-6 h-6 ${
                    funnelCompletenessScore >= 80 ? 'text-green-600' :
                    funnelCompletenessScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Leads Gerados</p>
                  <p className="text-2xl font-bold text-gray-900">{totalLeadsGenerated}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">este período</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Campanhas Ativas</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCampaigns}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">esta semana</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Total Investido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {totalInvested.toFixed(2)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-500">este período</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">CPL Médio</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {client.avg_cpl.toFixed(2)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingDown className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">vs mês anterior</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* CPL by Campaign Chart */}
          <Card>
            <CardHeader>
              <CardTitle>CPL por Campanha</CardTitle>
              <p className="text-sm text-gray-600">Custo por Lead de cada campanha ativa</p>
            </CardHeader>
             <CardContent className="p-4 pb-2">
               <div className="h-[28rem]">
                  {cplByCampaignData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart
                       data={cplByCampaignData}
                       margin={{ top: 10, right: 20, left: 30, bottom: -10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{data.fullName}</p>
                                <p className="text-blue-600">CPL: R$ {data.cpl.toFixed(2)}</p>
                                <p className="text-gray-600">Investido: R$ {data.spend.toFixed(2)}</p>
                                <p className="text-gray-600">Conversões: {data.conversions}</p>
                                <p className="text-gray-600">Status: {data.status === 'active' ? 'Ativa' : 'Pausada'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="cpl" 
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p>Nenhum dado disponível</p>
                      <p className="text-sm">Sincronize as campanhas para ver os dados</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Investment Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Investimento</CardTitle>
              <p className="text-sm text-gray-600">Proporção do orçamento por campanha</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {investmentDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={investmentDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {investmentDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Investido']}
                        labelFormatter={(label) => investmentDistributionData.find(d => d.name === label)?.fullName || label}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percentage = ((data.value / totalInvested) * 100).toFixed(1);
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{data.fullName}</p>
                                <p className="text-blue-600">Investido: R$ {data.value.toFixed(2)} ({percentage}%)</p>
                                <p className="text-gray-600">Conversões: {data.conversions}</p>
                                {data.conversions > 0 && (
                                  <p className="text-gray-600">CPL: R$ {(data.value / data.conversions).toFixed(2)}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p>Nenhum dado disponível</p>
                      <p className="text-sm">Sincronize as campanhas para ver os dados</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Legend */}
              {investmentDistributionData.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {investmentDistributionData.map((entry, index) => {
                    const percentage = ((entry.value / totalInvested) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="flex-1 text-gray-700 truncate" title={entry.fullName}>
                          {entry.name}
                        </span>
                        <span className="text-gray-600">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-gray-200 overflow-x-auto">
              <TabsList className="px-4 sm:px-6 min-w-max flex-nowrap">
                <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
                <TabsTrigger value="adsets" className="relative">
                  Conjuntos de Anúncios
                  {selectedCampaignId && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Filtrado
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ads" className="relative">
                  Criativos
                  {selectedAdSetId && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Filtrado
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="funnel">Funil de Conversão</TabsTrigger>
                <TabsTrigger value="alerts" className="relative">
                  Alertas & Sugestões
                  {(dangerAlerts.length + opportunityAlerts.length) > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {dangerAlerts.length + opportunityAlerts.length}
                    </Badge>
                  )}
                </TabsTrigger>
                 <TabsTrigger value="analysis">
                   Análise Completa
                 </TabsTrigger>
                 <TabsTrigger value="competitive" className="relative">
                    Análise Competitiva
                    {competitors.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {competitors.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                   <TabsTrigger value="weekly-report">📊 Relatório Semanal</TabsTrigger>
                   <TabsTrigger value="period-comparison">📈 Comparação de Períodos</TabsTrigger>
                   <TabsTrigger value="contact">Contato & Dados</TabsTrigger>
                <TabsTrigger value="notes">Anotações</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="campaigns" className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Campanhas do Cliente</h4>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={campaignFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('all')}
                  >
                    Todas ({totalCampaigns})
                  </Button>
                  <Button 
                    variant={campaignFilter === 'active' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('active')}
                  >
                    Ativas ({activeCampaigns})
                  </Button>
                  <Button 
                    variant={campaignFilter === 'paused' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('paused')}
                  >
                    Pausadas ({pausedCampaigns})
                  </Button>
                  <Button 
                    variant={campaignFilter === 'finished' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('finished')}
                  >
                    Finalizadas ({finishedCampaigns})
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:mx-0">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Campanha</span>
                            {sortField === 'name' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataformas</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR (%)</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('cpc')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>CPC</span>
                            {sortField === 'cpc' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPA</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('conversions')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Conversões</span>
                            {sortField === 'conversions' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('spend')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Custo Total</span>
                            {sortField === 'spend' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedCampaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge className={
                            campaign.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }>
                            {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                          </Badge>
                         </td>
                         <td className="px-4 py-4 whitespace-nowrap">
                           <Badge variant="outline" className="text-xs">
                             {formatCampaignObjective(campaign.objective)}
                           </Badge>
                         </td>
                         <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                           {campaign.platforms}
                         </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {campaign.ctr.toFixed(2)}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          R$ {campaign.cpc.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                          R$ {campaign.cpa.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaign.conversions}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          R$ {campaign.spend.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCampaignClick(campaign)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Users className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver Conjuntos de Anúncios</p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewMetrics(campaign)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <BarChart3 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver Indicadores</p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="adsets" className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-semibold">Conjuntos de Anúncios</h4>
                  {selectedCampaignId && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-sm">
                        Campanha: {getSelectedCampaignName()}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="text-xs"
                      >
                        Limpar Filtro
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={adSetFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdSetFilter('all')}
                  >
                    Todos ({totalAdSets})
                  </Button>
                  <Button 
                    variant={adSetFilter === 'active' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdSetFilter('active')}
                  >
                    Ativos ({activeAdSets})
                  </Button>
                  <Button 
                    variant={adSetFilter === 'paused' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdSetFilter('paused')}
                  >
                    Pausados ({pausedAdSets})
                  </Button>
                  <Button 
                    variant={adSetFilter === 'finished' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdSetFilter('finished')}
                  >
                    Finalizados ({finishedAdSets})
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:mx-0">
                <table className="w-full min-w-full">
                   <thead className="bg-gray-50">
                     <tr>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSetSort('name')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Nome do Conjunto</span>
                           {adSetSortField === 'name' && (
                             <ChevronDown className={`w-3 h-3 ${adSetSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                         Campanha
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSetSort('status')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Status</span>
                           {adSetSortField === 'status' && (
                             <ChevronDown className={`w-3 h-3 ${adSetSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSetSort('budget')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Orçamento</span>
                           {adSetSortField === 'budget' && (
                             <ChevronDown className={`w-3 h-3 ${adSetSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSetSort('cpm')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>CPM</span>
                           {adSetSortField === 'cpm' && (
                             <ChevronDown className={`w-3 h-3 ${adSetSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSetSort('ctr')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>CTR</span>
                           {adSetSortField === 'ctr' && (
                             <ChevronDown className={`w-3 h-3 ${adSetSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleAdSetSort('conversions')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Conversões</span>
                            {adSetSortField === 'conversions' && (
                              <ChevronDown className={`w-3 h-3 ${adSetSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ações
                        </th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {adSetsLoading ? (
                       <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                           <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                           <p>Carregando conjuntos de anúncios...</p>
                         </td>
                       </tr>
                      ) : filteredAndSortedAdSets.length > 0 ? (
                        filteredAndSortedAdSets.map((adSet) => (
                         <tr key={adSet.id}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-sm font-medium text-gray-900 cursor-help">
                                      {adSet.name && adSet.name.length > 50 
                                        ? `${adSet.name.substring(0, 50)}...` 
                                        : adSet.name}
                                    </div>
                                  </TooltipTrigger>
                                  {adSet.name && adSet.name.length > 50 && (
                                    <TooltipContent>
                                      <p>{adSet.name}</p>
                                    </TooltipContent>
                                  )}
                                </UITooltip>
                              </TooltipProvider>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-sm text-gray-500 cursor-help">
                                      {(() => {
                                        const campaignName = client?.campaigns?.find(c => c.id === adSet.campaign_id)?.name || 'N/A';
                                        return campaignName && campaignName.length > 50 
                                          ? `${campaignName.substring(0, 50)}...` 
                                          : campaignName;
                                      })()}
                                    </div>
                                  </TooltipTrigger>
                                  {(() => {
                                    const campaignName = client?.campaigns?.find(c => c.id === adSet.campaign_id)?.name || 'N/A';
                                    return campaignName && campaignName.length > 50 && (
                                      <TooltipContent>
                                        <p>{campaignName}</p>
                                      </TooltipContent>
                                    );
                                  })()}
                                </UITooltip>
                              </TooltipProvider>
                            </td>
                           <td className="px-4 py-4 whitespace-nowrap">
                             <Badge className={
                               adSet.status === 'active' 
                                 ? 'bg-green-100 text-green-800' 
                                 : 'bg-yellow-100 text-yellow-800'
                             }>
                               {adSet.status === 'active' ? 'Ativo' : 'Pausado'}
                             </Badge>
                           </td>
                           <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                             R$ {adSet.daily_budget > 0 ? adSet.daily_budget.toFixed(2) : adSet.lifetime_budget.toFixed(2)}
                             <span className="text-xs text-gray-500 ml-1">
                               /{adSet.daily_budget > 0 ? 'dia' : 'total'}
                             </span>
                           </td>
                           <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                             R$ {adSet.cpm.toFixed(2)}
                           </td>
                           <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                             {adSet.ctr.toFixed(2)}%
                           </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {adSet.conversions}
                            </td>
                             <td className="px-4 py-4 whitespace-nowrap text-sm">
                               <div className="flex items-center space-x-2">
                                 <TooltipProvider>
                                   <UITooltip>
                                     <TooltipTrigger asChild>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => handleAdSetClick(adSet)}
                                         className="h-8 w-8 p-0"
                                       >
                                         <Megaphone className="w-3 h-3" />
                                       </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>
                                       <p>Ver Criativos</p>
                                     </TooltipContent>
                                   </UITooltip>
                                 </TooltipProvider>
                                 <TooltipProvider>
                                   <UITooltip>
                                     <TooltipTrigger asChild>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => handleViewAdSetMetrics(adSet)}
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
                               </div>
                             </td>
                          </tr>
                       ))
                     ) : (
                       <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                           <div>
                             <p className="mb-2">Nenhum conjunto de anúncios encontrado</p>
                             <p className="text-sm">Os dados dos conjuntos de anúncios aparecerão aqui após a sincronização com o Facebook</p>
                           </div>
                         </td>
                       </tr>
                     )}
                   </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="ads" className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-semibold">Criativos</h4>
                  {selectedAdSetId && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-sm">
                        Conjunto: {getSelectedAdSetName()}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="text-xs"
                      >
                        Limpar Filtro
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={adFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdFilter('all')}
                  >
                    Todos ({totalAds})
                  </Button>
                  <Button 
                    variant={adFilter === 'active' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdFilter('active')}
                  >
                    Ativos ({activeAds})
                  </Button>
                  <Button 
                    variant={adFilter === 'paused' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdFilter('paused')}
                  >
                    Pausados ({pausedAds})
                  </Button>
                  <Button 
                    variant={adFilter === 'finished' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAdFilter('finished')}
                  >
                    Finalizados ({finishedAds})
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:mx-0">
                <table className="w-full min-w-full">
                   <thead className="bg-gray-50">
                     <tr>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSort('name')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Nome do Criativo</span>
                           {adSortField === 'name' && (
                             <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                           Campanha
                         </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSort('type')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Tipo</span>
                           {adSortField === 'type' && (
                             <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSort('status')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Status</span>
                           {adSortField === 'status' && (
                             <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSort('ctr')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>CTR</span>
                           {adSortField === 'ctr' && (
                             <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSort('cpc')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>CPC</span>
                           {adSortField === 'cpc' && (
                             <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                       </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleAdSort('conversions')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Conversões</span>
                           {adSortField === 'conversions' && (
                             <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                           )}
                         </div>
                          </th>
                          <th 
                           className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                           onClick={() => handleAdSort('frequency')}
                         >
                           <div className="flex items-center space-x-1">
                             <span>Frequência</span>
                             {adSortField === 'frequency' && (
                               <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                             )}
                           </div>
                          </th>
                          <th 
                           className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                           onClick={() => handleAdSort('quality_ranking')}
                         >
                           <div className="flex items-center space-x-1">
                             <span>Qualidade</span>
                             {adSortField === 'quality_ranking' && (
                               <ChevronDown className={`w-3 h-3 ${adSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                             )}
                           </div>
                         </th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                           Ações
                         </th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {adsLoading ? (
                        <tr>
                            <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                           <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                           <p>Carregando criativos...</p>
                         </td>
                       </tr>
                      ) : filteredAndSortedAds.length > 0 ? (
                        filteredAndSortedAds.map((ad) => (
                         <tr key={ad.id}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-sm font-medium text-gray-900 cursor-help">
                                      {ad.name && ad.name.length > 50 
                                        ? `${ad.name.substring(0, 50)}...` 
                                        : ad.name}
                                    </div>
                                  </TooltipTrigger>
                                  {ad.name && ad.name.length > 50 && (
                                    <TooltipContent>
                                      <p>{ad.name}</p>
                                    </TooltipContent>
                                  )}
                                </UITooltip>
                              </TooltipProvider>
                            </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-sm text-gray-500 cursor-help">
                                        {(() => {
                                          const adSet = adSets?.find(adSet => adSet.id === ad.ad_set_id);
                                          const campaign = client?.campaigns?.find(campaign => campaign.id === adSet?.campaign_id);
                                          const campaignName = campaign?.name || 'N/A';
                                          return campaignName && campaignName.length > 50 
                                            ? `${campaignName.substring(0, 50)}...` 
                                            : campaignName;
                                        })()}
                                      </div>
                                    </TooltipTrigger>
                                    {(() => {
                                      const adSet = adSets?.find(adSet => adSet.id === ad.ad_set_id);
                                      const campaign = client?.campaigns?.find(campaign => campaign.id === adSet?.campaign_id);
                                      const campaignName = campaign?.name || 'N/A';
                                      return campaignName && campaignName.length > 50 && (
                                        <TooltipContent>
                                          <p>{campaignName}</p>
                                        </TooltipContent>
                                      );
                                    })()}
                                  </UITooltip>
                                </TooltipProvider>
                              </td>
                           <td className="px-4 py-4 whitespace-nowrap">
                             <Badge 
                               variant={ad.creative_type === 'video' ? 'default' : 'secondary'}
                               className="text-xs"
                             >
                               {ad.creative_type || 'N/A'}
                             </Badge>
                           </td>
                           <td className="px-4 py-4 whitespace-nowrap">
                             <Badge className={
                               ad.status === 'active' 
                                 ? 'bg-green-100 text-green-800' 
                                 : 'bg-yellow-100 text-yellow-800'
                             }>
                               {ad.status === 'active' ? 'Ativo' : 'Pausado'}
                             </Badge>
                           </td>
                           <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                             {ad.ctr.toFixed(2)}%
                           </td>
                           <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                             R$ {ad.cpc.toFixed(2)}
                           </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {ad.conversions}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {ad.frequency ? ad.frequency.toFixed(2) : 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                               <Badge 
                                 variant="outline"
                                 className={`text-xs ${
                                   ad.quality_ranking === 'ABOVE_AVERAGE' ? 'border-green-500 text-green-700' :
                                   ad.quality_ranking === 'AVERAGE' ? 'border-blue-500 text-blue-700' :
                                   ad.quality_ranking === 'BELOW_AVERAGE' || ad.quality_ranking?.includes('BELOW_AVERAGE') ? 'border-red-500 text-red-700' :
                                   'border-gray-300 text-gray-600'
                                 }`}
                               >
                                 {formatRanking(ad.quality_ranking)}
                               </Badge>
                             </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewAdCreativeMetrics(ad)}
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
                              </td>
                          </tr>
                       ))
                     ) : (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                           <div>
                             <p className="mb-2">Nenhum criativo encontrado</p>
                             <p className="text-sm">Os dados dos criativos aparecerão aqui após a sincronização com o Facebook</p>
                           </div>
                         </td>
                       </tr>
                     )}
                   </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="funnel" className="p-4 sm:p-6">
              <FunnelAnalysis campaigns={client?.campaigns || []} />
            </TabsContent>

            <TabsContent value="alerts" className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">Alertas & Sugestões do Cliente</h4>
                  <Button
                    onClick={handleAnalyzeCampaigns}
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
                        suggestion.type === 'critical' ? 'border-l-red-600' :
                        suggestion.type === 'warning' ? 'border-l-orange-500' : 
                        suggestion.type === 'optimization' ? 'border-l-blue-500' :
                        'border-l-green-500'
                      } hover:shadow-md transition-shadow`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                {suggestion.type === 'critical' ? (
                                  <AlertTriangle className="w-5 h-5 text-red-600" />
                                ) : suggestion.type === 'warning' ? (
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                ) : suggestion.type === 'optimization' ? (
                                  <Target className="w-5 h-5 text-blue-500" />
                                ) : (
                                  <TrendingUp className="w-5 h-5 text-green-500" />
                                )}
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 text-base">{suggestion.title}</h5>
                                  {suggestion.category && (
                                    <p className="text-xs text-gray-500 mt-1">{suggestion.category}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                    {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                                  </Badge>
                                  {suggestion.impact && (
                                    <Badge variant="outline" className={`text-xs ${
                                      suggestion.impact === 'high' ? 'border-green-500 text-green-700' :
                                      suggestion.impact === 'medium' ? 'border-blue-500 text-blue-700' :
                                      'border-gray-400 text-gray-600'
                                    }`}>
                                      Impacto {suggestion.impact === 'high' ? 'Alto' : suggestion.impact === 'medium' ? 'Médio' : 'Baixo'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{suggestion.description}</p>
                              
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border border-blue-100">
                                <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                                  <Target className="w-4 h-4 text-blue-600" />
                                  Ação recomendada:
                                </p>
                                <p className="text-sm text-gray-700 leading-relaxed">{suggestion.action}</p>
                              </div>

                              {suggestion.estimatedImpact && (
                                <div className="bg-green-50 p-3 rounded-lg mb-3 border border-green-100">
                                  <p className="text-sm font-medium text-green-800 mb-1 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Impacto estimado:
                                  </p>
                                  <p className="text-sm text-green-700">{suggestion.estimatedImpact}</p>
                                </div>
                              )}

                              {suggestion.implementationSteps && suggestion.implementationSteps.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-gray-900 mb-2">Passos de implementação:</p>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {suggestion.implementationSteps.map((step, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-xs bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                                          {index + 1}
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                {suggestion.campaigns && suggestion.campaigns.length > 0 && (
                                  <div>
                                    <p className="font-medium mb-1">Campanhas afetadas:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {suggestion.campaigns.map((campaignName, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {campaignName}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {suggestion.relatedMetrics && suggestion.relatedMetrics.length > 0 && (
                                  <div>
                                    <p className="font-medium mb-1">Métricas relacionadas:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {suggestion.relatedMetrics.map((metric, index) => (
                                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                          {metric}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-6">
                              <Button
                                size="sm"
                                onClick={() => handleConvertAlertToTask({
                                  id: suggestion.id,
                                  type: suggestion.type,
                                  title: suggestion.title,
                                  description: suggestion.description,
                                  action: suggestion.action,
                                  client_id: client?.id,
                                  client_name: client?.name
                                })}
                                disabled={convertedAlerts.has(suggestion.id)}
                                className={convertedAlerts.has(suggestion.id) ? 'bg-green-100 text-green-800 border-green-200' : ''}
                              >
                                {convertedAlerts.has(suggestion.id) ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Criar Tarefa
                                  </>
                                )}
                              </Button>
                              
                              {suggestion.effort && (
                                <div className="text-center">
                                  <p className="text-xs text-gray-500 mb-1">Esforço</p>
                                  <Badge variant="outline" className={`text-xs ${
                                    suggestion.effort === 'low' ? 'border-green-400 text-green-600' :
                                    suggestion.effort === 'medium' ? 'border-yellow-400 text-yellow-600' :
                                    'border-red-400 text-red-600'
                                  }`}>
                                    {suggestion.effort === 'low' ? 'Baixo' : suggestion.effort === 'medium' ? 'Médio' : 'Alto'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Target className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Análise Inteligente de Campanhas
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                      Nossa IA analisará as campanhas deste cliente e fornecerá pelo menos 5 sugestões específicas e acionáveis para otimizar performance.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Análise de Performance</p>
                        <p className="text-xs text-gray-500 mt-1">CPA, CTR, Frequência</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Oportunidades</p>
                        <p className="text-xs text-gray-500 mt-1">Escalonamento e Crescimento</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Segmentação</p>
                        <p className="text-xs text-gray-500 mt-1">Audiências e Dispositivos</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">Análise Completa das Campanhas</h4>
                  <Button
                    onClick={handleGenerateAnalysis}
                    className="flex items-center gap-2"
                    disabled={isGeneratingAnalysis}
                  >
                    <BarChart3 className={`w-4 h-4 ${isGeneratingAnalysis ? 'animate-pulse' : ''}`} />
                    {isGeneratingAnalysis ? 'Gerando Análise...' : 'Gerar Análise com IA'}
                  </Button>
                </div>

                {campaignAnalysis ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="prose prose-gray max-w-none">
                      <div 
                        className="markdown-content"
                        dangerouslySetInnerHTML={{ 
                          __html: campaignAnalysis.replace(/\n/g, '<br/>').replace(/##\s+(.+)/g, '<h2 class="text-xl font-semibold text-gray-900 mt-6 mb-3">$1</h2>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/- (.+)/g, '<li class="ml-4">• $1</li>') 
                        }}
                      />
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle className="w-4 h-4" />
                        <span>Análise gerada por IA especializada em tráfego pago</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🧠</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Análise Estratégica com IA
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-2xl mx-auto">
                      Obtenha uma análise detalhada das campanhas deste cliente feita por nossa IA especializada em tráfego pago. 
                      Receba insights estratégicos, identificação de oportunidades e recomendações baseadas nas melhores práticas do mercado.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-blue-900">Diagnóstico Geral</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-green-900">Estratégias de Escala</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Target className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-purple-900">Ações Prioritárias</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Users className="w-4 h-4 text-orange-600" />
                        </div>
                        <p className="text-sm font-medium text-orange-900">Projeções e Metas</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="competitive" className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-lg font-semibold">Análise Competitiva</h4>
                    <p className="text-sm text-gray-600">Compare seus anúncios com os dos concorrentes e obtenha insights estratégicos</p>
                  </div>
                  <Button 
                    onClick={handleGenerateCompetitiveAnalysis}
                    disabled={isGeneratingCompetitiveAnalysis || competitors.length === 0}
                    className="min-w-[180px]"
                  >
                    {isGeneratingCompetitiveAnalysis ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Gerar Análise
                      </>
                    )}
                  </Button>
                </div>

                {/* Resumo dos concorrentes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{competitors.length}</p>
                          <p className="text-sm text-gray-600">Concorrentes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{competitorAds.length}</p>
                          <p className="text-sm text-gray-600">Anúncios Monitorados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {competitorAds.filter(ad => ad.estimated_performance === 'high').length}
                          </p>
                          <p className="text-sm text-gray-600">Alto Desempenho</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de concorrentes */}
                {competitors.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold">Concorrentes Cadastrados</h4>
                      <CompetitorDialog 
                        clientId={id || ""} 
                        onCompetitorAdded={refetchCompetitors}
                      />
                    </div>
                    <CompetitorList
                      clientId={id || ""}
                      competitors={competitors}
                      competitorAds={competitorAds}
                      onRefetch={refetchCompetitors}
                    />
                  </div>
                )}

                {/* Análise gerada */}
                {competitiveAnalysis ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>Análise Competitiva Completa</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                      <div 
                        className="whitespace-pre-wrap text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: competitiveAnalysis.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                        }} 
                      />
                    </CardContent>
                  </Card>
                ) : competitors.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Nenhum concorrente cadastrado</h3>
                      <p className="text-gray-600 mb-4">
                        Adicione concorrentes para gerar uma análise competitiva estratégica
                      </p>
                      <CompetitorDialog 
                        clientId={id || ""} 
                        onCompetitorAdded={refetchCompetitors}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Análise Competitiva</h3>
                      <p className="text-gray-600 mb-4">
                        Clique em "Gerar Análise" para obter insights estratégicos baseados nos concorrentes cadastrados
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{competitors.length}</p>
                          <p className="text-sm text-gray-600">Concorrentes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{competitorAds.length}</p>
                          <p className="text-sm text-gray-600">Anúncios</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="weekly-report">
              <WeeklyReportTab clientId={id || ""} />
            </TabsContent>
            
            <TabsContent value="period-comparison">
              <PeriodComparisonTab clientId={id || ""} />
            </TabsContent>
            
            <TabsContent value="contact" className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Informações de Contato</h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Email Principal</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Building className="w-5 h-5 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Empresa</p>
                        <p className="text-sm text-gray-600">{client.company}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Setor</p>
                        <p className="text-sm text-gray-600">{client.sector}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Informações do Produto</h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div>
                        <p className="text-sm font-medium">Produto</p>
                        <p className="text-sm text-gray-600">{client.product_name || 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div>
                        <p className="text-sm font-medium">Tom de Voz</p>
                        <p className="text-sm text-gray-600">{client.voice_tone || 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div>
                        <p className="text-sm font-medium">Orçamento Mensal</p>
                        <p className="text-sm text-gray-600">
                          {client.monthly_budget ? `R$ ${client.monthly_budget.toFixed(2)}` : 'Não informado'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Anotações</h4>
                <Button onClick={() => { setNoteText(""); setOpenNoteDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Anotação
                </Button>
              </div>
              
              <div className="space-y-4">
                {notesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Carregando anotações...</span>
                  </div>
                ) : notes.length > 0 ? (
                  notes.map((note) => {
                    const authorName = profilesByUserId[note.user_id]?.full_name || 'Usuário';
                    const isAuthor = note.user_id === user?.id;
                    const authorInitials = authorName.split(' ').map(name => name[0]).join('').toUpperCase();
                    
                    return (
                      <div key={note.id} className="p-4 border border-border rounded-lg bg-card">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={profilesByUserId[note.user_id]?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{authorName}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
                            </div>
                          </div>
                          {isAuthor && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {note.content}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma anotação encontrada</p>
                    <p className="text-sm">Clique em "Nova Anotação" para adicionar</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <Dialog open={openNoteDialog} onOpenChange={setOpenNoteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Anotação</DialogTitle>
                </DialogHeader>
                <div>
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escreva sua anotação sobre o cliente..."
                    className="min-h-[120px]"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNoteDialog(false)} disabled={savingNote}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveNote} disabled={savingNote || !noteText.trim()}>
                    {savingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <TabsContent value="history" className="p-4 sm:p-6">
              <h4 className="text-lg font-semibold mb-4">Histórico de Interações</h4>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="text-sm font-medium">Cliente criado</h5>
                      <span className="text-xs text-gray-500">
                        Criado no sistema
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Cliente {client.name} foi adicionado ao sistema.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Sync Period Dialog */}
        <SyncPeriodDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          onConfirm={handleSyncConfirm}
          syncing={syncLoading}
          title="Sincronizar Campanhas do Cliente"
        />

        {/* Campaign Metrics Modal */}
        <CampaignMetricsModal
          campaign={selectedCampaign}
          isOpen={metricsModalOpen}
          onClose={() => setMetricsModalOpen(false)}
        />

        {/* Ad Set Metrics Modal */}
        <AdSetMetricsModal
          adSet={selectedAdSet}
          isOpen={adSetMetricsModalOpen}
          onClose={() => setAdSetMetricsModalOpen(false)}
        />

        {/* Ad Creative Metrics Modal */}
        <AdCreativeMetricsModal
          ad={selectedAd}
          isOpen={adCreativeMetricsModalOpen}
          onClose={() => setAdCreativeMetricsModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
};

export default ClienteDetalhes;