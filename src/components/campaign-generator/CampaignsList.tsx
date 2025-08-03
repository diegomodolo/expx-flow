import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Calendar, User, Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGeneratedCampaigns } from "@/hooks/useGeneratedCampaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CampaignsListProps {
  onNewCampaign: () => void;
  onViewCampaign: (campaignId: string) => void;
}

export function CampaignsList({ onNewCampaign, onViewCampaign }: CampaignsListProps) {
  const { campaigns, loading } = useGeneratedCampaigns();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    funnelStage: "all",
    campaignType: "all",
    client: "all"
  });

  if (loading) {
    return (
      <div className="flex flex-col h-full space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      campaign.title.toLowerCase().includes(searchLower) ||
      campaign.clients?.name.toLowerCase().includes(searchLower) ||
      campaign.clients?.company.toLowerCase().includes(searchLower) ||
      campaign.campaign_type.toLowerCase().includes(searchLower) ||
      campaign.funnel_stage.toLowerCase().includes(searchLower)
    );

    const matchesFunnel = filters.funnelStage === "all" || campaign.funnel_stage === filters.funnelStage;
    const matchesType = filters.campaignType === "all" || campaign.campaign_type === filters.campaignType;
    const matchesClient = filters.client === "all" || campaign.clients?.company === filters.client;

    return matchesSearch && matchesFunnel && matchesType && matchesClient;
  });

  const getFunnelStageLabel = (stage: string) => {
    const labels = {
      topo: "Topo",
      meio: "Meio", 
      fundo: "Fundo",
      retencao: "Retenção"
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels = {
      awareness: "Reconhecimento",
      traffic: "Tráfego",
      leads: "Leads",
      conversions: "Conversões",
      remarketing: "Remarketing",
      retention: "Retenção"
    };
    return labels[type as keyof typeof labels] || type;
  };

  const exportToCSV = () => {
    const headers = ["Título", "Cliente", "Empresa", "Funil", "Tipo", "Data"];
    const csvData = filteredCampaigns.map(campaign => [
      campaign.title,
      campaign.clients?.name || 'N/A',
      campaign.clients?.company || 'N/A',
      getFunnelStageLabel(campaign.funnel_stage),
      getCampaignTypeLabel(campaign.campaign_type),
      format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `campanhas-geradas-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueClients = [...new Set(campaigns.map(c => c.clients?.company).filter(Boolean))];

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col h-full space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Campanhas Geradas</h2>
            <Badge variant="secondary" className="px-3 py-1 mt-2">
              0 campanhas
            </Badge>
          </div>
          <Button onClick={onNewCampaign} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nova Campanha</span>
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha gerada ainda</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando sua primeira estratégia de campanha inteligente
            </p>
            <Button onClick={onNewCampaign} size="lg" className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Gerar Primeira Campanha
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 sm:space-y-4 p-2 sm:p-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Campanhas Geradas</h2>
          <Badge variant="secondary" className="px-3 py-1">
            {filteredCampaigns.length} campanhas
          </Badge>
        </div>
        <Button className="flex items-center space-x-2 w-full sm:w-auto" onClick={onNewCampaign}>
          <Plus className="w-4 h-4" />
          <span>Nova Campanha</span>
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search Input */}
            <div className="flex-1 min-w-0">
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
                <Label htmlFor="funnel-filter">Etapa do Funil</Label>
                <Select 
                  value={filters.funnelStage} 
                  onValueChange={(value) => setFilters({ ...filters, funnelStage: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as etapas</SelectItem>
                    <SelectItem value="topo">Topo</SelectItem>
                    <SelectItem value="meio">Meio</SelectItem>
                    <SelectItem value="fundo">Fundo</SelectItem>
                    <SelectItem value="retencao">Retenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type-filter">Tipo de Campanha</Label>
                <Select 
                  value={filters.campaignType} 
                  onValueChange={(value) => setFilters({ ...filters, campaignType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="awareness">Reconhecimento</SelectItem>
                    <SelectItem value="traffic">Tráfego</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="conversions">Conversões</SelectItem>
                    <SelectItem value="remarketing">Remarketing</SelectItem>
                    <SelectItem value="retention">Retenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-filter">Cliente</Label>
                <Select 
                  value={filters.client} 
                  onValueChange={(value) => setFilters({ ...filters, client: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {uniqueClients.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => setFilters({ funnelStage: "all", campaignType: "all", client: "all" })}
              >
                Limpar Filtros
              </Button>
              <Button className="w-full sm:w-auto">
                Aplicar ({filteredCampaigns.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns Table - Desktop */}
      <div className="hidden sm:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campanha
                    </th>
                    <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Funil
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {campaign.title}
                            </p>
                            <p className="text-sm text-gray-500 truncate sm:hidden">
                              {campaign.clients?.company}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {campaign.clients?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {campaign.clients?.company}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <Badge variant="secondary">
                          {getFunnelStageLabel(campaign.funnel_stage)}
                        </Badge>
                      </td>
                      <td className="px-3 py-4">
                        <Badge variant="outline">
                          {getCampaignTypeLabel(campaign.campaign_type)}
                        </Badge>
                      </td>
                      <td className="hidden lg:table-cell px-3 py-4 text-sm text-gray-500">
                        {format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewCampaign(campaign.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Cards - Mobile */}
      <div className="sm:hidden space-y-4">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {campaign.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {campaign.clients?.company}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewCampaign(campaign.id)}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getFunnelStageLabel(campaign.funnel_stage)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getCampaignTypeLabel(campaign.campaign_type)}
                </Badge>
              </div>
              
              <p className="text-xs text-gray-500">
                {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}