import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { EditCampaignDialog } from "@/components/campaigns/EditCampaignDialog";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { SyncPeriodDialog } from "@/components/facebook/SyncPeriodDialog";
import { SyncProgressModal } from "@/components/clients/SyncProgressModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Eye, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";


type StatusType = "all" | "active" | "paused" | "finished";

const statusConfig = {
  active: { label: "Ativa", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  paused: { label: "Pausada", color: "bg-yellow-100 text-yellow-800", dotColor: "bg-yellow-500" },
  finished: { label: "Finalizada", color: "bg-gray-100 text-gray-800", dotColor: "bg-gray-500" }
};

// Mapeamento dos tipos de campanha para português
const objectiveConfig: { [key: string]: string } = {
  "CONVERSIONS": "Conversões",
  "TRAFFIC": "Tráfego", 
  "BRAND_AWARENESS": "Reconhecimento da Marca",
  "REACH": "Alcance",
  "ENGAGEMENT": "Engajamento",
  "APP_INSTALLS": "Instalações do App",
  "VIDEO_VIEWS": "Visualizações de Vídeo",
  "LEAD_GENERATION": "Geração de Leads",
  "MESSAGES": "Mensagens",
  "CATALOG_SALES": "Vendas do Catálogo",
  "STORE_VISITS": "Visitas à Loja",
  "LINK_CLICKS": "Cliques no Link",
  "POST_ENGAGEMENT": "Engajamento da Publicação",
  "PAGE_LIKES": "Curtidas da Página",
  "EVENT_RESPONSES": "Respostas de Eventos",
  "OUTCOME_TRAFFIC": "Tráfego de Resultados",
  "OUTCOME_ENGAGEMENT": "Engajamento de Resultados",
  "OUTCOME_LEADS": "Leads de Resultados",
  "OUTCOME_SALES": "Vendas de Resultados"
};

// Função para avaliar o desempenho da campanha
const evaluateCampaignPerformance = (campaign: Campaign) => {
  // Se campanha está inativa, considera como neutro
  if (campaign.status !== 'active') {
    return { 
      level: 'neutral' as const, 
      label: 'Pausada',
      color: 'bg-gray-100 text-gray-800',
      dotColor: 'bg-gray-500',
      issues: [] // Adicionar issues array vazio
    };
  }

  // Critérios de avaliação baseados em benchmarks
  const ctrTarget = 1; // 1% mínimo
  const cpcMax = 5; // R$ 5 máximo por clique
  const spendWithoutLeads = 150; // R$ 150 sem conversões é crítico
  
  let score = 0;
  let issues = [];

  // Avaliação de CTR (peso 30%)
  if (campaign.ctr >= ctrTarget * 1.5) score += 30; // Excelente CTR
  else if (campaign.ctr >= ctrTarget) score += 20; // CTR bom
  else if (campaign.ctr >= ctrTarget * 0.5) score += 10; // CTR ruim
  else {
    score += 0; // CTR muito ruim
    issues.push('CTR muito baixo');
  }

  // Avaliação de CPC (peso 25%)
  if (campaign.cpc <= cpcMax * 0.6) score += 25; // CPC excelente
  else if (campaign.cpc <= cpcMax) score += 15; // CPC bom
  else if (campaign.cpc <= cpcMax * 1.5) score += 5; // CPC alto
  else {
    score += 0; // CPC muito alto
    issues.push('CPC muito alto');
  }

  // Avaliação de conversões vs gasto (peso 45%)
  const hasConversions = (campaign.conversions || 0) > 0;
  const spend = campaign.spend || 0;
  
  if (hasConversions) {
    const cpa = spend / campaign.conversions;
    if (cpa <= 100) score += 45; // CPA excelente
    else if (cpa <= 200) score += 30; // CPA bom
    else if (cpa <= 300) score += 15; // CPA alto
    else {
      score += 5; // CPA muito alto
      issues.push('CPA muito alto');
    }
  } else {
    // Sem conversões
    if (spend <= 50) score += 25; // Pouco gasto ainda
    else if (spend <= spendWithoutLeads) score += 10; // Gasto moderado
    else {
      score += 0; // Muito gasto sem resultado
      issues.push('Alto gasto sem leads');
    }
  }

  // Classificação final
  if (score >= 80) {
    return {
      level: 'excellent' as const,
      label: 'Excelente',
      color: 'bg-green-100 text-green-800',
      dotColor: 'bg-green-500',
      issues
    };
  } else if (score >= 50) {
    return {
      level: 'attention' as const,
      label: 'Atenção',
      color: 'bg-yellow-100 text-yellow-800',
      dotColor: 'bg-yellow-500',
      issues
    };
  } else {
    return {
      level: 'emergency' as const,
      label: 'Emergencial',
      color: 'bg-red-100 text-red-800',
      dotColor: 'bg-red-500',
      issues
    };
  }
};

// Função para gerar mensagem do tooltip baseado na performance
const getPerformanceTooltip = (campaign: Campaign) => {
  const performance = evaluateCampaignPerformance(campaign);
  
  if (campaign.status !== 'active') {
    return "Campanha pausada ou finalizada - performance não avaliada";
  }

  let message = "";
  
  switch (performance.level) {
    case 'excellent':
      message = "🎉 Performance excelente! Esta campanha está superando as expectativas com boas métricas de CTR, CPC e conversões.";
      break;
    case 'attention':
      message = "⚠️ Performance necessita atenção. ";
      break;
    case 'emergency':
      message = "🚨 Performance crítica! Esta campanha precisa de otimização urgente. ";
      break;
    default:
      message = "Performance neutra";
  }

  if (performance.issues && performance.issues.length > 0) {
    message += "\n\nProblemas identificados:\n• " + performance.issues.join("\n• ");
  }

  // Adicionar métricas atuais
  message += `\n\nMétricas atuais:
• CTR: ${campaign.ctr ? campaign.ctr.toFixed(2) + '%' : '0%'}
• CPC: R$ ${campaign.cpc?.toFixed(2) || '0,00'}
• Conversões: ${campaign.conversions || 0}
• Valor gasto: R$ ${campaign.spend?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;

  return message;
};

const Campanhas = () => {
  const [statusFilter, setStatusFilter] = useState<StatusType>("active"); // Padrão: apenas campanhas ativas
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [openClientFilter, setOpenClientFilter] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  
  // Estados para ordenação
  const [sortColumn, setSortColumn] = useState<'performance' | 'ctr' | 'cpc' | 'conversions' | 'name' | 'client' | 'spend' | 'cpl' | 'objective' | null>('performance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // asc = pior performance primeiro
  
  const { campaigns, loading, error, toggleCampaign, updateCampaign } = useCampaigns();
  const { clients } = useClients();
  const { syncCampaigns, syncing, progress, syncAllClients } = useFacebookCampaignSync();
  const { toast } = useToast();
  
  // Usar valor fixo maior para aproveitar melhor a tela
  const itemsPerPage = 12;
  
  
  // Função para lidar com clique nos cabeçalhos
  const handleSort = (column: 'performance' | 'ctr' | 'cpc' | 'conversions' | 'name' | 'client' | 'spend' | 'cpl' | 'objective') => {
    if (sortColumn === column) {
      // Se já está ordenando por essa coluna, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nova coluna, sempre começa com ascendente (pior primeiro para performance)
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Função para obter score numérico de performance
  const getPerformanceScore = (campaign: Campaign) => {
    const performance = evaluateCampaignPerformance(campaign);
    
    // Converter level para score numérico (menor score = pior performance)
    switch (performance.level) {
      case 'emergency': return 1;
      case 'attention': return 2;
      case 'excellent': return 3;
      case 'neutral': return 0; // Campanhas pausadas ficam por último
      default: return 0;
    }
  };

  // Filtrar e ordenar campanhas
  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
      const matchesClient = clientFilter === "all" || campaign.client_id === clientFilter;
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.platforms.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesClient && matchesSearch;
    })
    .sort((a, b) => {
      let result = 0;
      
      switch (sortColumn) {
        case 'performance':
          const scoreA = getPerformanceScore(a);
          const scoreB = getPerformanceScore(b);
          result = scoreA - scoreB; // Menor score primeiro (pior performance primeiro quando asc)
          break;
          
        case 'name':
          result = a.name.localeCompare(b.name);
          break;
          
        case 'client':
          const clientA = a.client?.name || '';
          const clientB = b.client?.name || '';
          result = clientA.localeCompare(clientB);
          break;
          
        case 'ctr':
          result = (a.ctr || 0) - (b.ctr || 0);
          break;
          
        case 'cpc':
          result = (a.cpc || 0) - (b.cpc || 0);
          break;
          
        case 'conversions':
          result = (a.conversions || 0) - (b.conversions || 0);
          break;
          
        case 'spend':
          result = (a.spend || 0) - (b.spend || 0);
          break;
          
        case 'cpl':
          const cplA = a.conversions > 0 ? (a.spend || 0) / a.conversions : 0;
          const cplB = b.conversions > 0 ? (b.spend || 0) / b.conversions : 0;
          result = cplA - cplB;
          break;
          
        case 'objective':
          const objectiveA = a.objective || '';
          const objectiveB = b.objective || '';
          result = objectiveA.localeCompare(objectiveB);
          break;
          
        default:
          // Fallback para ordenação por performance (pior primeiro)
          const fallbackScoreA = getPerformanceScore(a);
          const fallbackScoreB = getPerformanceScore(b);
          result = fallbackScoreA - fallbackScoreB;
      }
      
      // Aplicar direção da ordenação
      return sortDirection === 'desc' ? -result : result;
    });

  const totalCampaigns = filteredCampaigns.length;
  const totalPages = Math.ceil(totalCampaigns / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);
  
  // Reset da página quando os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, clientFilter, sortColumn, sortDirection]);

  // Função para renderizar ícone de ordenação
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary" />
      : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
  };

  const handleToggleCampaign = async (campaignId: string, isActive: boolean) => {
    await toggleCampaign(campaignId, isActive);
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive",
      });
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsEditDialogOpen(true);
  };

  const handleSaveCampaign = async (id: string, updates: Partial<Campaign>) => {
    await updateCampaign(id, updates);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingCampaign(null);
  };

  if (error) {
    toast({
      title: "Erro",
      description: error,
      variant: "destructive",
    });
  }

  console.log("Campanhas component rendering", { loading, error, campaigns: campaigns?.length });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-3 sm:space-y-4 p-2 sm:p-4">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando campanhas...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciar Campanhas</h2>
                <Badge variant="secondary" className="px-3 py-1">
                  {totalCampaigns} campanhas
                </Badge>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm text-gray-600">
                  Última sincronização: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs text-gray-500">
                  Período: Últimos 30 dias
                </div>
              </div>
            </div>

            {/* Filters and Search - Single Line Responsive */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                  {/* Status Filters */}
                  <div className="flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700 block mb-2">Status:</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={statusFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                      >
                        Todas
                      </Button>
                      <Button
                        variant={statusFilter === "active" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("active")}
                        className="flex items-center space-x-1"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Ativas</span>
                      </Button>
                      <Button
                        variant={statusFilter === "paused" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("paused")}
                        className="flex items-center space-x-1"
                      >
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span>Pausadas</span>
                      </Button>
                      <Button
                        variant={statusFilter === "finished" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("finished")}
                        className="flex items-center space-x-1"
                      >
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span>Finalizadas</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Client Filter */}
                  <div className="flex-shrink-0 w-full sm:w-auto lg:w-[200px]">
                    <span className="text-sm font-medium text-gray-700 block mb-2">Cliente:</span>
                    <Popover open={openClientFilter} onOpenChange={setOpenClientFilter}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openClientFilter}
                          className="w-full justify-between"
                        >
                          {clientFilter === "all" 
                            ? "Todos os clientes"
                            : clients.find((client) => client.id === clientFilter)?.name || "Cliente não encontrado"
                          }
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0 bg-white z-50">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => {
                                  setClientFilter("all");
                                  setOpenClientFilter(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    clientFilter === "all" ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                Todos os clientes
                              </CommandItem>
                              {clients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.name}
                                  onSelect={() => {
                                    setClientFilter(client.id);
                                    setOpenClientFilter(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      clientFilter === client.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {client.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Search */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700 block mb-2">Buscar:</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar campanhas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                  </div>
                  
                  {/* Sync Button */}
                  <div className="flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700 block mb-2 opacity-0">Ação:</span>
                    <Button variant="outline" onClick={() => setSyncDialogOpen(true)} className="w-full lg:w-auto">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaigns Table - Desktop */}
            <div className="hidden sm:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center">
                              Campanha
                              {getSortIcon('name')}
                            </div>
                          </th>
                          <th 
                            className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('client')}
                          >
                            <div className="flex items-center">
                              Cliente
                              {getSortIcon('client')}
                            </div>
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('performance')}
                          >
                            <div className="flex items-center">
                              Perf.
                              {getSortIcon('performance')}
                            </div>
                          </th>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('conversions')}
                          >
                            <div className="flex items-center">
                              Conv.
                              {getSortIcon('conversions')}
                            </div>
                          </th>
                          <th 
                            className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('ctr')}
                          >
                            <div className="flex items-center">
                              CTR
                              {getSortIcon('ctr')}
                            </div>
                          </th>
                          <th 
                            className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('cpc')}
                          >
                            <div className="flex items-center">
                              CPC
                              {getSortIcon('cpc')}
                            </div>
                          </th>
                          <th 
                            className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('spend')}
                          >
                            <div className="flex items-center">
                              Gasto
                              {getSortIcon('spend')}
                            </div>
                          </th>
                           <th 
                             className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                             onClick={() => handleSort('cpl')}
                           >
                             <div className="flex items-center">
                               CPL
                               {getSortIcon('cpl')}
                             </div>
                            </th>
                           <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                             Ações
                           </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedCampaigns.map((campaign) => {
                          const performance = evaluateCampaignPerformance(campaign);
                          
                          return (
                            <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-3">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0">
                                    <Avatar className="w-7 h-7">
                                      <AvatarImage src="/placeholder.svg" alt="Campaign" />
                                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                        {campaign.name.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div className="ml-3 min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 truncate" title={campaign.name}>
                                      {campaign.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate sm:hidden">
                                      {campaign.client?.name || "Cliente não informado"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-3 py-3">
                                <div className="text-sm text-gray-900 truncate">
                                  {campaign.client?.name || "Cliente não informado"}
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <Badge 
                                  variant="outline" 
                                  className={`${statusConfig[campaign.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800"} text-xs`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full mr-1 ${statusConfig[campaign.status as keyof typeof statusConfig]?.dotColor || "bg-gray-500"}`}></div>
                                  {statusConfig[campaign.status as keyof typeof statusConfig]?.label || campaign.status}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div>
                                        <Badge 
                                          variant="outline" 
                                          className={`${performance.color} text-xs cursor-help`}
                                        >
                                          <div className={`w-1.5 h-1.5 rounded-full mr-1 ${performance.dotColor}`}></div>
                                          {performance.label}
                                        </Badge>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs whitespace-pre-line">
                                      <p>{getPerformanceTooltip(campaign)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-medium">
                                  {campaign.conversions || 0}
                                </div>
                              </td>
                              <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {campaign.ctr ? `${campaign.ctr.toFixed(2)}%` : "0%"}
                                </div>
                              </td>
                              <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  R$ {campaign.cpc?.toFixed(2) || "0,00"}
                                </div>
                              </td>
                              <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  R$ {campaign.spend?.toLocaleString('pt-BR', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  }) || "0,00"}
                                </div>
                              </td>
                               <td className="hidden 2xl:table-cell px-3 py-3 whitespace-nowrap">
                                 <div className="text-sm text-gray-900">
                                   {campaign.conversions > 0 
                                     ? `R$ ${((campaign.spend || 0) / campaign.conversions).toFixed(2)}`
                                  : "R$ 0,00"
                                 }
                                </div>
                                </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-7 h-7 p-0"
                                title="Ver detalhes"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {campaign.status === "finished" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-7 h-7 p-0 ml-1"
                                  title="Ver relatório"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaigns Cards - Mobile */}
            <div className="sm:hidden space-y-3">
              {paginatedCampaigns.map((campaign) => {
                const performance = evaluateCampaignPerformance(campaign);
                
                return (
                  <Card key={campaign.id} className="p-3">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src="/placeholder.svg" alt="Campaign" />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                              {campaign.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 truncate" title={campaign.name}>
                              {campaign.name}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">
                              {campaign.client?.name || "Cliente não informado"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 flex-shrink-0"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Status and Performance */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className={`${statusConfig[campaign.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800"}`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 ${statusConfig[campaign.status as keyof typeof statusConfig]?.dotColor || "bg-gray-500"}`}></div>
                          {statusConfig[campaign.status as keyof typeof statusConfig]?.label || campaign.status}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div>
                                <Badge 
                                  variant="outline" 
                                  className={`${performance.color} cursor-help`}
                                >
                                  <div className={`w-2 h-2 rounded-full mr-2 ${performance.dotColor}`}></div>
                                  {performance.label}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs whitespace-pre-line">
                              <p>{getPerformanceTooltip(campaign)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">CTR:</span>
                          <span className="ml-1 font-medium">{campaign.ctr ? `${campaign.ctr.toFixed(2)}%` : "0%"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Conversões:</span>
                          <span className="ml-1 font-medium">{campaign.conversions || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">CPC:</span>
                          <span className="ml-1 font-medium">R$ {campaign.cpc?.toFixed(2) || "0,00"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">CPL:</span>
                          <span className="ml-1 font-medium">
                            {campaign.conversions > 0 
                              ? `R$ ${((campaign.spend || 0) / campaign.conversions).toFixed(2)}`
                              : "R$ 0,00"
                            }
                          </span>
                        </div>
                      </div>

                      {/* Additional Info (Expandable) */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Valor Gasto:</span> R$ {campaign.spend?.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          }) || "0,00"}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Plataforma:</span> {campaign.platforms}
                        </div>
                        {campaign.objective && (
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Tipo:</span> {objectiveConfig[campaign.objective] || campaign.objective}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            <Card className="mt-4">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalCampaigns)}</span> de{" "}
                    <span className="font-medium">{totalCampaigns}</span> campanhas
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-1"
                    >
                      <span className="hidden sm:inline">Próximo</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <EditCampaignDialog
          campaign={editingCampaign}
          isOpen={isEditDialogOpen}
          onClose={handleCloseEditDialog}
          onSave={handleSaveCampaign}
        />

        <SyncPeriodDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          onConfirm={syncAllClients}
          syncing={syncing}
          title="Sincronizar Campanhas"
        />

        <SyncProgressModal
          open={syncing}
          progress={progress}
        />
      </div>
    </DashboardLayout>
  );
};

export default Campanhas;