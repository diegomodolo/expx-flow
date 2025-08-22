import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClients, Client } from "@/hooks/useClients";
import { useSectors } from "@/hooks/useSectors";
import { useToast } from "@/hooks/use-toast";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { SyncPeriodDialog, SyncOptions } from "@/components/facebook/SyncPeriodDialog";
import { SyncProgressModal } from "@/components/clients/SyncProgressModal";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { FundingAlert } from "@/components/alerts/FundingAlert";

type StatusType = "all" | "green" | "yellow" | "red";

const statusConfig = {
  green: { label: "Excelente", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  yellow: { label: "Atenção", color: "bg-yellow-100 text-yellow-800", dotColor: "bg-yellow-500" },
  red: { label: "Emergencial", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" }
};

type SortField = 'name' | 'company' | 'status' | 'active_campaigns' | 'avg_cpl' | 'leads_generated' | 'monthly_budget' | 'spend';
type SortDirection = 'asc' | 'desc';

// Função para gerar a explicação do status baseada nas métricas do cliente
const getStatusExplanation = (client: Client): string => {
  const cpa = client.avg_cpl || 0;
  const campaigns = client.active_campaigns || 0;
  const leads = client.leads_generated || 0;
  const budget = client.monthly_budget || 0;

  switch (client.status) {
    case 'green':
      if (cpa <= 50 && leads >= 10 && campaigns > 0) {
        return "Excelente performance: CPA baixo, boa geração de leads e campanhas ativas.";
      } else if (leads >= 20) {
        return "Excelente performance: Alta geração de leads demonstra campanhas eficazes.";
      } else if (cpa <= 30) {
        return "Excelente performance: CPA muito baixo indica otimização eficiente.";
      } else {
        return "Status excelente: Cliente com performance geral satisfatória.";
      }
    
    case 'yellow':
      if (cpa > 50 && cpa <= 100) {
        return "Atenção necessária: CPA moderado - revisar estratégias de otimização.";
      } else if (campaigns === 0) {
        return "Atenção necessária: Nenhuma campanha ativa - considerar reativação.";
      } else if (leads < 5 && campaigns > 0) {
        return "Atenção necessária: Baixa geração de leads com campanhas ativas.";
      } else if (budget > 0 && leads === 0) {
        return "Atenção necessária: Orçamento disponível mas sem conversões.";
      } else {
        return "Atenção necessária: Performance mista - monitoramento recomendado.";
      }
    
    case 'red':
      if (cpa > 100) {
        return "Status crítico: CPA muito alto - intervenção urgente necessária.";
      } else if (campaigns > 0 && leads === 0) {
        return "Status crítico: Campanhas ativas sem geração de leads.";
      } else if (budget > 1000 && (leads < 3 || cpa > 80)) {
        return "Status crítico: Alto investimento com baixo retorno.";
      } else if (campaigns === 0 && budget > 0) {
        return "Status crítico: Orçamento disponível mas sem campanhas ativas.";
      } else {
        return "Status crítico: Performance insatisfatória - ação imediata requerida.";
      }
    
    default:
      return "Status do cliente baseado na análise de métricas de performance.";
  }
};

const Clientes = () => {
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sector: "all",
    budgetRange: "all",
    campaignRange: "all"
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { clients, loading, error, createClient, updateClient, deleteClient, fetchClients } = useClients();
  const { sectors, fetchSectors } = useSectors();
  const { syncCampaigns, syncing, progress, syncAllClients } = useFacebookCampaignSync();
  const { toast } = useToast();
  
  // Usar valor fixo maior para aproveitar melhor a tela
  const itemsPerPage = 12;

  // Memoized handlers to prevent re-renders
  const handleAddClient = () => {
    setDialogMode('create');
    setSelectedClient(null);
    setDialogOpen(true);
  };

  const handleApplyFilters = () => {
    toast({
      title: "Filtros aplicados",
      description: `${filteredAndSortedClients.length} clientes encontrados.`,
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const filteredAndSortedClients = clients.filter(client => {
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSector = filters.sector === "all" || client.sector === filters.sector;
    
    const matchesBudget = filters.budgetRange === "all" || (() => {
      const budget = client.monthly_budget || 0;
      switch (filters.budgetRange) {
        case "0-1000": return budget >= 0 && budget <= 1000;
        case "1000-5000": return budget > 1000 && budget <= 5000;
        case "5000-10000": return budget > 5000 && budget <= 10000;
        case "10000+": return budget > 10000;
        default: return true;
      }
    })();
    
    const matchesCampaigns = filters.campaignRange === "all" || (() => {
      const campaigns = client.active_campaigns || 0;
      switch (filters.campaignRange) {
        case "0": return campaigns === 0;
        case "1-3": return campaigns >= 1 && campaigns <= 3;
        case "4-10": return campaigns >= 4 && campaigns <= 10;
        case "10+": return campaigns > 10;
        default: return true;
      }
    })();
    
    return matchesStatus && matchesSearch && matchesSector && matchesBudget && matchesCampaigns;
  }).sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle status field specially for emergency order
    if (sortField === 'status') {
      const statusOrder = { red: 3, yellow: 2, green: 1 };
      aValue = statusOrder[a.status];
      bValue = statusOrder[b.status];
    }
    
    // Handle spend field (simulated as avg_cpl * active_campaigns)
    if (sortField === 'spend') {
      aValue = a.avg_cpl * a.active_campaigns;
      bValue = b.avg_cpl * b.active_campaigns;
    }

    // Handle null/undefined values
    if (aValue == null) aValue = 0;
    if (bValue == null) bValue = 0;

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const totalClients = filteredAndSortedClients.length;
  const totalPages = Math.ceil(totalClients / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, startIndex + itemsPerPage);
  
  // Reset da página quando os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filters.sector, filters.budgetRange, filters.campaignRange]);

  
  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Empresa", "Setor", "Status", "Campanhas Ativas", "CPL Médio", "Leads Gerados", "Orçamento Mensal", "Gasto Estimado"];
    const csvData = filteredAndSortedClients.map(client => [
      client.name,
      client.email,
      client.company,
      client.sector,
      statusConfig[client.status].label,
      client.active_campaigns,
      `R$ ${client.avg_cpl.toFixed(2)}`,
      client.leads_generated,
      `R$ ${(client.monthly_budget || 0).toFixed(2)}`,
      `R$ ${(client.avg_cpl * client.active_campaigns).toFixed(2)}`
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clientes-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportação concluída",
      description: "Lista de clientes exportada com sucesso!",
    });
  };

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-col h-full space-y-3 sm:space-y-4 p-2 sm:p-4">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando clientes...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciar Clientes</h2>
                <Badge variant="secondary" className="px-3 py-1">
                  {totalClients} clientes
                </Badge>
              </div>
              <Button className="flex items-center space-x-2 w-full sm:w-auto" onClick={handleAddClient}>
                <Plus className="w-4 h-4" />
                <span>Adicionar Cliente</span>
              </Button>
            </div>

            {/* Filters and Search - All in One Line */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                  {/* Status Filters */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={statusFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                      >
                        Todos
                      </Button>
                      <Button
                        variant={statusFilter === "green" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("green")}
                        className="flex items-center space-x-1"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Excelente</span>
                      </Button>
                      <Button
                        variant={statusFilter === "yellow" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("yellow")}
                        className="flex items-center space-x-1"
                      >
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span>Atenção</span>
                      </Button>
                      <Button
                        variant={statusFilter === "red" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("red")}
                        className="flex items-center space-x-1"
                      >
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Emergencial</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Search Input */}
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar clientes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="flex items-center space-x-2" onClick={() => setShowFilters(!showFilters)}>
                      <Filter className="w-4 h-4" />
                      <span>Filtros</span>
                    </Button>
                    <Button variant="outline" className="flex items-center space-x-2" onClick={exportToCSV}>
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex items-center space-x-2" 
                      onClick={() => setSyncDialogOpen(true)}
                      disabled={syncing}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Sincronizar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Filters Card */}
            {showFilters && (
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <h3 className="text-lg font-semibold mb-4">Filtros Avançados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sector-filter">Setor</Label>
                      <Select 
                        value={filters.sector} 
                        onValueChange={(value) => setFilters({ ...filters, sector: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os setores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os setores</SelectItem>
                          {sectors.map((sector) => (
                            <SelectItem key={sector.id} value={sector.name}>
                              {sector.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="budget-filter">Orçamento Mensal</Label>
                      <Select 
                        value={filters.budgetRange} 
                        onValueChange={(value) => setFilters({ ...filters, budgetRange: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as faixas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as faixas</SelectItem>
                          <SelectItem value="0-1000">R$ 0 - R$ 1.000</SelectItem>
                          <SelectItem value="1000-5000">R$ 1.000 - R$ 5.000</SelectItem>
                          <SelectItem value="5000-10000">R$ 5.000 - R$ 10.000</SelectItem>
                          <SelectItem value="10000+">R$ 10.000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="campaigns-filter">Campanhas Ativas</Label>
                      <Select 
                        value={filters.campaignRange} 
                        onValueChange={(value) => setFilters({ ...filters, campaignRange: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer quantidade</SelectItem>
                          <SelectItem value="0">0 campanhas</SelectItem>
                          <SelectItem value="1-3">1-3 campanhas</SelectItem>
                          <SelectItem value="4-10">4-10 campanhas</SelectItem>
                          <SelectItem value="10+">10+ campanhas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setFilters({ sector: "all", budgetRange: "all", campaignRange: "all" });
                        toast({
                          title: "Filtros limpos",
                          description: "Todos os filtros foram removidos.",
                        });
                      }}
                    >
                      Limpar Filtros
                    </Button>
                     <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
                       Aplicar ({filteredAndSortedClients.length})
                     </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clients Table - Desktop */}
            <div className="hidden sm:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full">
                       <thead className="bg-gray-50">
                         <tr>
                           <th 
                             className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('name')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Cliente</span>
                               {getSortIcon('name')}
                             </div>
                           </th>
                           <th 
                             className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('company')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Empresa</span>
                               {getSortIcon('company')}
                             </div>
                           </th>
                           <th 
                             className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('status')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Status</span>
                               {getSortIcon('status')}
                             </div>
                           </th>
                           <th 
                             className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('active_campaigns')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Campanhas</span>
                               {getSortIcon('active_campaigns')}
                             </div>
                           </th>
                           <th 
                             className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('avg_cpl')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>CPL Médio</span>
                               {getSortIcon('avg_cpl')}
                             </div>
                           </th>
                           <th 
                             className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('leads_generated')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Leads</span>
                               {getSortIcon('leads_generated')}
                             </div>
                           </th>
                           <th 
                             className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('monthly_budget')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Orçamento</span>
                               {getSortIcon('monthly_budget')}
                             </div>
                           </th>
                           <th 
                             className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                             onClick={() => handleSort('spend')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Gasto</span>
                               {getSortIcon('spend')}
                             </div>
                           </th>
                           <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                             Ações
                           </th>
                         </tr>
                       </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedClients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3">
                              <div className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full ${statusConfig[client.status].dotColor}`}></div>
                                <Avatar className="w-8 h-8 flex-shrink-0">
                                  <AvatarImage src={client.avatar} alt={client.name} />
                                  <AvatarFallback className="text-xs">{client.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 truncate" title={client.name}>{client.name}</div>
                                  <div className="text-xs text-gray-500 truncate md:hidden">{client.company}</div>
                                  <div className="text-xs text-gray-500 truncate">{client.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="hidden md:table-cell px-3 py-3">
                              <div className="text-sm text-gray-900 truncate">{client.company}</div>
                              <div className="text-xs text-gray-500 truncate">{client.sector}</div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className={`${statusConfig[client.status].color} text-xs cursor-help`}
                                  >
                                    {statusConfig[client.status].label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{getStatusExplanation(client)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {client.active_campaigns}
                              </div>
                            </td>
                            <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                R$ {client.avg_cpl.toFixed(2)}
                              </div>
                            </td>
                             <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap">
                               <div className="text-sm text-gray-900">
                                 {client.leads_generated}
                               </div>
                             </td>
                             <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap">
                               <div className="text-sm text-gray-900">
                                 R$ {(client.monthly_budget || 0).toLocaleString('pt-BR', { 
                                   minimumFractionDigits: 2, 
                                   maximumFractionDigits: 2 
                                 })}
                               </div>
                             </td>
                             <td className="hidden 2xl:table-cell px-3 py-3 whitespace-nowrap">
                               <div className="text-sm text-gray-900">
                                 R$ {(client.avg_cpl * client.active_campaigns).toLocaleString('pt-BR', { 
                                   minimumFractionDigits: 2, 
                                   maximumFractionDigits: 2 
                                 })}
                               </div>
                             </td>
                             <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="w-7 h-7 p-0">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/clientes/${client.id}`}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Ver detalhes
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedClient(client);
                                    setDialogMode('edit');
                                    setDialogOpen(true);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedClient(client);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clients Cards - Mobile */}
            <div className="sm:hidden space-y-3">
              {paginatedClients.map((client) => (
                <Card key={client.id} className="p-3">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className={`w-3 h-3 rounded-full ${statusConfig[client.status].dotColor} flex-shrink-0`}></div>
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate" title={client.name}>
                            {client.name}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {client.email}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/clientes/${client.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedClient(client);
                            setDialogMode('edit');
                            setDialogOpen(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setSelectedClient(client);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Status and Company */}
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig[client.status].color} cursor-help`}
                          >
                            {statusConfig[client.status].label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{getStatusExplanation(client)}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="text-sm text-gray-600 truncate max-w-[150px]" title={client.company}>
                        {client.company}
                      </div>
                    </div>

                     {/* Metrics Grid */}
                     <div className="grid grid-cols-2 gap-3 text-sm">
                       <div>
                         <span className="text-gray-500">Campanhas:</span>
                         <span className="ml-1 font-medium">{client.active_campaigns}</span>
                       </div>
                       <div>
                         <span className="text-gray-500">Leads:</span>
                         <span className="ml-1 font-medium">{client.leads_generated}</span>
                       </div>
                       <div>
                         <span className="text-gray-500">CPL Médio:</span>
                         <span className="ml-1 font-medium">R$ {client.avg_cpl.toFixed(2)}</span>
                       </div>
                       <div>
                         <span className="text-gray-500">Setor:</span>
                         <span className="ml-1 font-medium truncate" title={client.sector}>{client.sector}</span>
                       </div>
                       <div>
                         <span className="text-gray-500">Orçamento:</span>
                         <span className="ml-1 font-medium">R$ {(client.monthly_budget || 0).toLocaleString('pt-BR', { 
                           minimumFractionDigits: 0, 
                           maximumFractionDigits: 0 
                         })}</span>
                       </div>
                       <div>
                         <span className="text-gray-500">Gasto:</span>
                         <span className="ml-1 font-medium">R$ {(client.avg_cpl * client.active_campaigns).toLocaleString('pt-BR', { 
                           minimumFractionDigits: 0, 
                           maximumFractionDigits: 0 
                         })}</span>
                       </div>
                     </div>

                    {/* Additional Info */}
                    {client.monthly_budget > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Orçamento Mensal:</span> R$ {client.monthly_budget.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <Card className="mt-4">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalClients)}</span> de{" "}
                    <span className="font-medium">{totalClients}</span> clientes
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

        <ClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={selectedClient}
          title={dialogMode === 'create' ? 'Adicionar Cliente' : 'Editar Cliente'}
          onSubmit={async (clientData) => {
            if (dialogMode === 'create') {
              await createClient(clientData);
            } else {
              await updateClient(selectedClient!.id, clientData);
            }
          }}
        />

        <DeleteClientDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          client={selectedClient}
          onConfirm={async () => {
            if (selectedClient) {
              await deleteClient(selectedClient.id);
              setDeleteDialogOpen(false);
            }
          }}
        />

        <SyncPeriodDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          onConfirm={syncAllClients}
          syncing={syncing}
          title="Sincronizar Clientes"
        />

        <SyncProgressModal
          open={syncing}
          progress={progress}
        />
      </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default Clientes;