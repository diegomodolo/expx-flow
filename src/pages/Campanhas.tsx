import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { EditCampaignDialog } from "@/components/campaigns/EditCampaignDialog";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { SyncPeriodDialog } from "@/components/facebook/SyncPeriodDialog";
import { SyncProgressModal } from "@/components/clients/SyncProgressModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  FileText,
  MoreHorizontal,
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
  const [sortColumn, setSortColumn] = useState<'performance' | 'ctr' | 'cpc' | 'conversions' | 'name' | 'client' | 'spend' | 'cpl' | null>('performance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // asc = pior performance primeiro
  
  const { campaigns, loading, error, toggleCampaign, updateCampaign } = useCampaigns();
  const { clients } = useClients();
  const { syncCampaigns, syncing, progress, syncAllClients } = useFacebookCampaignSync();
  const { toast } = useToast();
  
  // Usar valor fixo maior para aproveitar melhor a tela
  const itemsPerPage = 12;
  
  
  // Função para lidar com clique nos cabeçalhos
  const handleSort = (column: 'performance' | 'ctr' | 'cpc' | 'conversions' | 'name' | 'client' | 'spend' | 'cpl') => {
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

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando campanhas...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-gray-900">Gerenciar Campanhas</h2>
                <Badge variant="secondary" className="px-3 py-1">
                  {totalCampaigns} campanhas
                </Badge>
              </div>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Nova Campanha</span>
              </Button>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={statusFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("all")}
                          className="flex items-center space-x-2"
                        >
                          <span>Todas</span>
                        </Button>
                        <Button
                          variant={statusFilter === "active" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("active")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Ativas</span>
                        </Button>
                        <Button
                          variant={statusFilter === "paused" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("paused")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Pausadas</span>
                        </Button>
                        <Button
                          variant={statusFilter === "finished" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("finished")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span>Finalizadas</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Cliente:</span>
                      <Popover open={openClientFilter} onOpenChange={setOpenClientFilter}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openClientFilter}
                            className="w-[200px] justify-between"
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
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar campanhas..."
                        className="w-64 pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span>Filtros</span>
                    </Button>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Exportar</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex items-center space-x-2" 
                      onClick={() => setSyncDialogOpen(true)}
                      disabled={syncing}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      <span>Sincronizar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaigns Table */}
            <Card className="flex-1 flex flex-col">
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Campanha
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('client')}
                      >
                        <div className="flex items-center">
                          Cliente
                          {getSortIcon('client')}
                        </div>
                      </th>
                       <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         Status
                       </th>
                       <th 
                         className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleSort('performance')}
                       >
                         <div className="flex items-center">
                           Performance
                           {getSortIcon('performance')}
                         </div>
                       </th>
                       <th 
                         className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleSort('ctr')}
                       >
                         <div className="flex items-center">
                           CTR
                           {getSortIcon('ctr')}
                         </div>
                       </th>
                       <th 
                         className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleSort('cpc')}
                       >
                         <div className="flex items-center">
                           CPC
                           {getSortIcon('cpc')}
                         </div>
                       </th>
                       <th 
                         className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                         onClick={() => handleSort('conversions')}
                       >
                         <div className="flex items-center">
                           Conversões
                           {getSortIcon('conversions')}
                         </div>
                        </th>
                        <th 
                          className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('spend')}
                        >
                          <div className="flex items-center">
                            Valor Gasto
                            {getSortIcon('spend')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('cpl')}
                        >
                          <div className="flex items-center">
                            CPL
                            {getSortIcon('cpl')}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                     </tr>
                  </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {paginatedCampaigns.map((campaign) => {
                       const performance = evaluateCampaignPerformance(campaign);
                       
                       return (
                         <tr key={campaign.id} className="hover:bg-gray-50 cursor-pointer">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center space-x-3">
                               <div className={`w-3 h-3 rounded-full ${statusConfig[campaign.status].dotColor}`}></div>
                               <div>
                                 <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                                 <div className="text-sm text-gray-500">{campaign.platforms}</div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center space-x-2">
                               <Avatar className="w-8 h-8">
                                 <AvatarImage src={campaign.client?.avatar} alt={campaign.client?.name} />
                                 <AvatarFallback>{campaign.client?.name?.charAt(0)}</AvatarFallback>
                               </Avatar>
                               <div className="text-sm text-gray-900">{campaign.client?.name}</div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <Badge className={statusConfig[campaign.status].color}>
                               {statusConfig[campaign.status].label}
                             </Badge>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center space-x-2">
                               <div className={`w-3 h-3 rounded-full ${performance.dotColor}`}></div>
                               <Badge 
                                 className={performance.color}
                                 title={performance.issues.length > 0 ? `Problemas: ${performance.issues.join(', ')}` : 'Performance dentro do esperado'}
                               >
                                 {performance.label}
                               </Badge>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                             {campaign.ctr}%
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             R$ {campaign.cpc.toFixed(2)}
                           </td>
                           <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                             campaign.status === "active" ? "text-green-600" : 
                             campaign.status === "paused" ? "text-yellow-600" : "text-gray-600"
                           }`}>
                              {campaign.conversions}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              R$ {(campaign.spend || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {campaign.conversions > 0 
                                ? `R$ ${((campaign.spend || 0) / campaign.conversions).toFixed(2)}` 
                                : "R$ 0,00"
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {campaign.period}
                            </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {campaign.status !== "finished" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  title="Editar"
                                  onClick={() => handleEditCampaign(campaign)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Switch
                                  checked={campaign.is_active}
                                  onCheckedChange={(checked) => handleToggleCampaign(campaign.id, checked)}
                                  title={campaign.is_active ? "Pausar" : "Ativar"}
                                />
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  title="Relatório"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  title="Mais opções"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                           </div>
                         </td>
                       </tr>
                       );
                     })}
                   </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-white px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalCampaigns)}</span> de{" "}
                    <span className="font-medium">{totalCampaigns}</span> campanhas
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Anterior</span>
                    </Button>
                    
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      const page = i + 1;
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
                      <span>Próximo</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

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
    </DashboardLayout>
  );
};

export default Campanhas;