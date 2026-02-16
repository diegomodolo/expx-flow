import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Filter, ChevronRight, Megaphone, Target, Users, Zap, ShoppingBag, RotateCcw, Heart, TrendingUp, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGeneratedCampaigns } from "@/hooks/useGeneratedCampaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CampaignsListProps {
  onNewCampaign: () => void;
  onViewCampaign: (campaignId: string) => void;
}

const FUNNEL_ICONS: Record<string, React.ElementType> = {
  topo: TrendingUp,
  meio: Users,
  fundo: Target,
  retencao: Heart,
};

const CAMPAIGN_TYPE_INFO: Record<string, { icon: React.ElementType; color: string }> = {
  awareness: { icon: Zap, color: "text-blue-600" },
  traffic: { icon: Target, color: "text-orange-600" },
  leads: { icon: Users, color: "text-green-600" },
  conversions: { icon: ShoppingBag, color: "text-purple-600" },
  remarketing: { icon: RotateCcw, color: "text-red-600" },
  retention: { icon: Heart, color: "text-pink-600" },
};

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="bg-card rounded-xl p-4 shadow-google-sm">
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="bg-card rounded-xl shadow-google-sm divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
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
    const labels: Record<string, string> = {
      topo: "Topo",
      meio: "Meio", 
      fundo: "Fundo",
      retencao: "Retenção"
    };
    return labels[stage] || stage;
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      awareness: "Awareness",
      traffic: "Tráfego",
      leads: "Leads",
      conversions: "Conversões",
      remarketing: "Remarketing",
      retention: "Retenção"
    };
    return labels[type] || type;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-foreground tracking-tight">Campanhas Geradas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie suas estratégias de campanha</p>
          </div>
          <Button onClick={onNewCampaign} className="gap-2 rounded-full px-6 shadow-google-sm">
            <Plus className="w-4 h-4" />
            <span>Nova Campanha</span>
          </Button>
        </div>

        {/* Empty State */}
        <div className="bg-card rounded-xl shadow-google-sm flex items-center justify-center min-h-[400px]">
          <div className="text-center py-12 px-4 max-w-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma campanha ainda</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Crie sua primeira estratégia de campanha com inteligência artificial
            </p>
            <Button onClick={onNewCampaign} className="gap-2 rounded-full px-6">
              <Plus className="w-4 h-4" />
              Criar Campanha
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-foreground tracking-tight">Campanhas Geradas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campanha' : 'campanhas'}
          </p>
        </div>
        <Button onClick={onNewCampaign} className="gap-2 rounded-full px-6 shadow-google-sm w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span>Nova Campanha</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-xl shadow-google-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar campanhas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-full border-0 bg-muted/50 focus-visible:ring-1"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2 rounded-full h-11"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 rounded-full h-11"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Etapa do Funil</Label>
                <Select 
                  value={filters.funnelStage} 
                  onValueChange={(value) => setFilters({ ...filters, funnelStage: value })}
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="topo">Topo</SelectItem>
                    <SelectItem value="meio">Meio</SelectItem>
                    <SelectItem value="fundo">Fundo</SelectItem>
                    <SelectItem value="retencao">Retenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo de Campanha</Label>
                <Select 
                  value={filters.campaignType} 
                  onValueChange={(value) => setFilters({ ...filters, campaignType: value })}
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="awareness">Awareness</SelectItem>
                    <SelectItem value="traffic">Tráfego</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="conversions">Conversões</SelectItem>
                    <SelectItem value="remarketing">Remarketing</SelectItem>
                    <SelectItem value="retention">Retenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cliente</Label>
                <SearchableClientSelect
                  clients={uniqueClients.filter(Boolean).map(c => ({ id: c!, name: c! }))}
                  value={filters.client}
                  onValueChange={(value) => setFilters({ ...filters, client: value })}
                  allLabel="Todos"
                  placeholder="Todos"
                  triggerClassName="h-10 rounded-lg"
                />
              </div>
            </div>
            
            {(filters.funnelStage !== "all" || filters.campaignType !== "all" || filters.client !== "all") && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtros ativos:</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 text-xs text-primary hover:text-primary"
                  onClick={() => setFilters({ funnelStage: "all", campaignType: "all", client: "all" })}
                >
                  Limpar todos
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaigns List - Google Style */}
      <div className="bg-card rounded-xl shadow-google-sm overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-5">Campanha</div>
          <div className="col-span-2">Funil</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Data</div>
          <div className="col-span-1"></div>
        </div>

        {/* Campaign Items */}
        <div className="divide-y divide-border">
          {filteredCampaigns.map((campaign) => {
            const FunnelIcon = FUNNEL_ICONS[campaign.funnel_stage] || Target;
            const typeInfo = CAMPAIGN_TYPE_INFO[campaign.campaign_type] || { icon: Megaphone, color: "text-muted-foreground" };
            const TypeIcon = typeInfo.icon;

            return (
              <div 
                key={campaign.id} 
                className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onViewCampaign(campaign.id)}
              >
                {/* Client Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={campaign.clients?.avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {campaign.clients?.name?.substring(0, 2).toUpperCase() || 'CA'}
                  </AvatarFallback>
                </Avatar>

                {/* Campaign Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {campaign.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {campaign.clients?.name} • {campaign.clients?.company}
                  </p>
                </div>

                {/* Funnel Stage - Desktop */}
                <div className="hidden md:flex items-center gap-2 w-24">
                  <FunnelIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {getFunnelStageLabel(campaign.funnel_stage)}
                  </span>
                </div>

                {/* Campaign Type - Desktop */}
                <div className="hidden md:flex items-center gap-2 w-28">
                  <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                  <span className="text-sm text-muted-foreground">
                    {getCampaignTypeLabel(campaign.campaign_type)}
                  </span>
                </div>

                {/* Date - Desktop */}
                <div className="hidden md:block w-24 text-sm text-muted-foreground">
                  {format(new Date(campaign.created_at), "dd MMM yyyy", { locale: ptBR })}
                </div>

                {/* Mobile Badges */}
                <div className="flex md:hidden flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {getFunnelStageLabel(campaign.funnel_stage)}
                  </Badge>
                </div>

                {/* Arrow / Actions */}
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewCampaign(campaign.id)}>
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV()}>
                        Exportar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty filtered state */}
        {filteredCampaigns.length === 0 && campaigns.length > 0 && (
          <div className="py-12 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma campanha encontrada</p>
            <Button 
              variant="link" 
              className="text-sm mt-2"
              onClick={() => {
                setSearchTerm("");
                setFilters({ funnelStage: "all", campaignType: "all", client: "all" });
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
