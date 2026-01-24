import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, RefreshCw, Eye, DollarSign, Target, TrendingUp, Plus } from "lucide-react";
import { useUnifiedAdGroupsMetrics, Platform } from "@/hooks/useUnifiedAdGroups";
import { useUnifiedCampaigns } from "@/hooks/useUnifiedCampaigns";
import { useClientContext } from "./ClienteContext";
import { useCompany } from "@/contexts/CompanyContext";
import { AdSetMetricsModal } from "@/components/adsets/AdSetMetricsModal";
import { PlatformFilter } from "@/components/campaigns/PlatformFilter";
import { PlatformBadge } from "@/components/campaigns/PlatformBadge";
import { AdSetBuilderModal } from "@/components/campaigns/AdSetBuilderModal";

export function ClienteConjuntos() {
  const { client, selectedCampaignId, setSelectedCampaignId } = useClientContext();
  const { activeCompany } = useCompany();
  
  const [platformFilter, setPlatformFilter] = useState<Platform>('all');
  const [selectedAdSet, setSelectedAdSet] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAdSetModal, setShowAdSetModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Use unified ad groups hook
  const { adGroups, metrics, isLoading, refetch } = useUnifiedAdGroupsMetrics({
    clientId: client.id,
    companyId: activeCompany?.company_id,
    campaignId: selectedCampaignId || undefined,
    platform: platformFilter,
    includeInactive: true,
  });

  // Fetch unified campaigns for the dropdown
  const { data: campaigns = [] } = useUnifiedCampaigns({
    clientId: client.id,
    companyId: activeCompany?.company_id,
    platform: platformFilter,
    includeInactive: true,
  });

  // Filter and sort ad groups
  const filteredAdGroups = useMemo(() => {
    let filtered = adGroups;
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(ag => 
        statusFilter === "active" ? ag.is_active : !ag.is_active
      );
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [adGroups, statusFilter, sortBy, sortOrder]);

  // Count by platform
  const metaCount = adGroups.filter(ag => ag.platform === 'meta').length;
  const googleCount = adGroups.filter(ag => ag.platform === 'google').length;

  const handleViewDetails = (adSet: any) => {
    setSelectedAdSet(adSet);
    setShowModal(true);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getCampaignName = (campaignId: string) => {
    return campaigns.find(c => c.id === campaignId)?.name || "N/A";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando conjuntos de anúncios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              <CardTitle>Conjuntos de Anúncios</CardTitle>
              <Badge variant="secondary">{filteredAdGroups.length}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Platform filter */}
              <PlatformFilter
                value={platformFilter}
                onChange={setPlatformFilter}
                metaCount={metaCount}
                googleCount={googleCount}
              />
              
              {/* Campaign filter */}
              <Select 
                value={selectedCampaignId || "all"} 
                onValueChange={(v) => setSelectedCampaignId(v === "all" ? null : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="paused">Pausados</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh button */}
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>

              {/* New Ad Set button */}
              <Button size="sm" onClick={() => setShowAdSetModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Conjunto
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ad Sets Ativos</p>
                <p className="text-2xl font-bold">{metrics.active}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: {adGroups.filter(ag => ag.platform === 'meta' && ag.is_active).length} | 
                  Google: {adGroups.filter(ag => ag.platform === 'google' && ag.is_active).length}
                </p>
              </div>
              <Target className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Investimento Total</p>
                <p className="text-2xl font-bold">R$ {metrics.totalSpend.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: R$ {metrics.meta.spend.toFixed(0)} | Google: R$ {metrics.google.spend.toFixed(0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CTR Médio</p>
                <p className="text-2xl font-bold">{metrics.avgCTR.toFixed(2)}%</p>
              </div>
              <Eye className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPA Médio</p>
                <p className="text-2xl font-bold">R$ {metrics.avgCPA.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ad Sets Table */}
      <Card>
        <CardContent className="p-6">
          {filteredAdGroups.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum conjunto de anúncios encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedCampaignId 
                  ? "Tente selecionar uma campanha diferente ou limpar os filtros"
                  : "Sincronize suas campanhas para ver os conjuntos de anúncios"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Orçamento</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary" 
                      onClick={() => handleSort("spend")}
                    >
                      Spend {sortBy === "spend" && (sortOrder === "desc" ? "↓" : "↑")}
                    </TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary" 
                      onClick={() => handleSort("ctr")}
                    >
                      CTR {sortBy === "ctr" && (sortOrder === "desc" ? "↓" : "↑")}
                    </TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary" 
                      onClick={() => handleSort("conversions")}
                    >
                      Conversões {sortBy === "conversions" && (sortOrder === "desc" ? "↓" : "↑")}
                    </TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdGroups.map((adGroup) => (
                    <TableRow key={adGroup.id}>
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-primary" 
                        onClick={() => handleViewDetails(adGroup)}
                      >
                        {adGroup.name}
                      </TableCell>
                      <TableCell>
                        <PlatformBadge platform={adGroup.platform} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={adGroup.is_active ? "default" : "secondary"}>
                          {adGroup.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCampaignName(adGroup.campaign_id)}
                      </TableCell>
                      <TableCell>
                        {adGroup.daily_budget && adGroup.daily_budget > 0 && `R$ ${adGroup.daily_budget.toFixed(2)}/dia`}
                        {adGroup.lifetime_budget && adGroup.lifetime_budget > 0 && `R$ ${adGroup.lifetime_budget.toFixed(2)} total`}
                        {(!adGroup.daily_budget || adGroup.daily_budget === 0) && 
                         (!adGroup.lifetime_budget || adGroup.lifetime_budget === 0) && "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {adGroup.spend.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {adGroup.impressions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {adGroup.ctr.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {adGroup.cpc.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {adGroup.conversions}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {adGroup.cpa.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewDetails(adGroup)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Modal */}
      <AdSetMetricsModal
        adSet={selectedAdSet}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedAdSet(null);
        }}
      />

      {/* Ad Set Builder Modal */}
      <AdSetBuilderModal
        isOpen={showAdSetModal}
        onClose={() => setShowAdSetModal(false)}
        clientId={client.id}
        companyId={activeCompany?.company_id || ''}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
