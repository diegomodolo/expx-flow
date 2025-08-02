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
import { SyncPeriodDialog } from "@/components/facebook/SyncPeriodDialog";
import { SyncProgressModal } from "@/components/clients/SyncProgressModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  RefreshCw
} from "lucide-react";
import { FundingAlert } from "@/components/alerts/FundingAlert";

type StatusType = "all" | "green" | "yellow" | "red";

const statusConfig = {
  green: { label: "Excelente", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  yellow: { label: "Atenção", color: "bg-yellow-100 text-yellow-800", dotColor: "bg-yellow-500" },
  red: { label: "Emergencial", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" }
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
  const { clients, loading, error, createClient, updateClient, deleteClient, fetchClients } = useClients();
  const { sectors, fetchSectors } = useSectors();
  const { syncCampaigns, syncing, progress, syncAllClients } = useFacebookCampaignSync();
  const { toast } = useToast();

  // Memoized handlers to prevent re-renders
  const handleAddClient = () => {
    setDialogMode('create');
    setSelectedClient(null);
    setDialogOpen(true);
  };

  const handleApplyFilters = () => {
    toast({
      title: "Filtros aplicados",
      description: `${filteredClients.length} clientes encontrados.`,
    });
  };

  const filteredClients = clients.filter(client => {
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
  });

  const totalClients = filteredClients.length;
  const itemsPerPage = 8;
  const totalPages = Math.ceil(totalClients / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  
  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Empresa", "Setor", "Status", "Campanhas Ativas", "CPL Médio", "Leads Gerados"];
    const csvData = filteredClients.map(client => [
      client.name,
      client.email,
      client.company,
      client.sector,
      statusConfig[client.status].label,
      client.active_campaigns,
      `R$ ${client.avg_cpl.toFixed(2)}`,
      client.leads_generated
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
      <div className="flex flex-col h-full space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando clientes...</span>
          </div>
        )}
        
        {!loading && (
          <>
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Clientes</h2>
            <Badge variant="secondary" className="px-3 py-1">
              {totalClients} clientes
            </Badge>
          </div>
          <Button className="flex items-center space-x-2" onClick={handleAddClient}>
            <Plus className="w-4 h-4" />
            <span>Adicionar Cliente</span>
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
                      <span>Todos</span>
                    </Button>
                    <Button
                      variant={statusFilter === "green" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("green")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Excelente</span>
                    </Button>
                    <Button
                      variant={statusFilter === "yellow" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("yellow")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Atenção</span>
                    </Button>
                    <Button
                      variant={statusFilter === "red" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("red")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Emergencial</span>
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar clientes..."
                    className="w-64 pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="flex items-center space-x-2" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2" onClick={exportToCSV}>
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

        {/* Advanced Filters Card */}
        {showFilters && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Filtros Avançados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  variant="outline" 
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
                <Button onClick={handleApplyFilters}>
                  Aplicar ({filteredClients.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clients Table */}
        <Card className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campanhas Ativas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPL Médio
                  </th>
                   <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Leads Gerados
                   </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${statusConfig[client.status].dotColor}`}></div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.company}</div>
                      <div className="text-sm text-gray-500">{client.sector}</div>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="space-y-2">
                         <Badge className={statusConfig[client.status].color}>
                           {statusConfig[client.status].label}
                         </Badge>
                         {client.facebook_ad_accounts && client.facebook_ad_accounts.has_funding_issues && (
                           <FundingAlert
                             accountStatus={client.facebook_ad_accounts.account_status}
                             balance={client.facebook_ad_accounts.balance}
                             disableReason={client.facebook_ad_accounts.disable_reason}
                             hasFundingIssues={client.facebook_ad_accounts.has_funding_issues}
                             accountName={client.facebook_ad_accounts.account_name}
                             className="text-xs"
                           />
                         )}
                       </div>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.active_campaigns}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      client.status === "green" ? "text-green-600" : 
                      client.status === "yellow" ? "text-yellow-600" : "text-red-600"
                    }`}>
                      R$ {client.avg_cpl.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.leads_generated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0"
                          title="Visualizar"
                        >
                          <Link to={`/clientes/${client.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0"
                          title="Editar"
          onClick={() => {
            setDialogMode('edit');
            setSelectedClient(client);
            setDialogOpen(true);
          }}
        >
          <Edit className="w-4 h-4" />
        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0"
                              title="Mais opções"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedClient(client);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalClients)}</span> de{" "}
                <span className="font-medium">{totalClients}</span> clientes
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
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                
                {totalPages > 5 && (
                  <>
                    <span className="px-3 py-2 text-sm text-gray-500">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                
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
        
        {/* Single Client Dialog for all modes */}
        <ClientDialog
          key={`${dialogMode}-${selectedClient?.id || 'new'}`}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedClient(null);
              // Recarrega setores quando dialog é fechado para sincronizar
              fetchSectors();
            }
          }}
          onSubmit={
            dialogMode === 'create' 
              ? createClient 
              : dialogMode === 'edit' && selectedClient
                ? (clientData) => updateClient(selectedClient.id, clientData)
                : () => Promise.resolve(null)
          }
          client={dialogMode === 'create' ? undefined : selectedClient || undefined}
          title={
            dialogMode === 'create' 
              ? "Adicionar Cliente" 
              : dialogMode === 'edit' 
                ? "Editar Cliente" 
                : "Visualizar Cliente"
          }
          readOnly={dialogMode === 'view'}
        />
        
        <DeleteClientDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={deleteClient}
          client={selectedClient}
        />

        {/* Sync Period Dialog for all clients */}
        <SyncPeriodDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          onConfirm={async (period: string) => {
            setSyncDialogOpen(false);
            await syncAllClients(period);
          }}
          syncing={syncing}
          title="Sincronizar Todos os Clientes"
        />

        {/* Sync Progress Modal */}
        <SyncProgressModal
          open={syncing}
          progress={progress}
        />
      </div>
    </DashboardLayout>
  );
};

export default Clientes;