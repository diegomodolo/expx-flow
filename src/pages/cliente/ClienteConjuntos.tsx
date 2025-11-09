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
import { Layers, RefreshCw, Eye, DollarSign, Target, TrendingUp } from "lucide-react";
import { useAdSets } from "@/hooks/useAdSets";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useClientContext } from "./ClienteContext";
import { AdSetMetricsModal } from "@/components/adsets/AdSetMetricsModal";

export function ClienteConjuntos() {
  const { client, selectedCampaignId, setSelectedCampaignId } = useClientContext();
  const { adSets, loading, refetch } = useAdSets(client.id);
  const { campaigns } = useCampaigns();
  
  const [selectedAdSet, setSelectedAdSet] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filtrar ad sets
  const filteredAdSets = useMemo(() => {
    let filtered = adSets || [];
    
    // Filtro por campanha
    if (selectedCampaignId) {
      filtered = filtered.filter(as => as.campaign_id === selectedCampaignId);
    }
    
    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(as => 
        statusFilter === "active" ? as.is_active : !as.is_active
      );
    }
    
    // Ordenação
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [adSets, selectedCampaignId, statusFilter, sortBy, sortOrder]);

  // Métricas resumidas
  const summary = useMemo(() => {
    const active = filteredAdSets.filter(as => as.is_active).length;
    const totalSpend = filteredAdSets.reduce((sum, as) => sum + (as.spend || 0), 0);
    const totalClicks = filteredAdSets.reduce((sum, as) => sum + (as.clicks || 0), 0);
    const totalImpressions = filteredAdSets.reduce((sum, as) => sum + (as.impressions || 0), 0);
    const totalConversions = filteredAdSets.reduce((sum, as) => sum + (as.conversions || 0), 0);
    
    const avgCTR = totalImpressions > 0 
      ? (totalClicks / totalImpressions) * 100 
      : 0;
    
    const avgCPA = totalConversions > 0
      ? totalSpend / totalConversions
      : 0;
    
    return { active, totalSpend, avgCTR, avgCPA };
  }, [filteredAdSets]);

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

  if (loading) {
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
              <Badge variant="secondary">{filteredAdSets.length}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro por campanha */}
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

              {/* Filtro por status */}
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

              {/* Botão atualizar */}
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ad Sets Ativos</p>
                <p className="text-2xl font-bold">{summary.active}</p>
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
                <p className="text-2xl font-bold">R$ {summary.totalSpend.toFixed(2)}</p>
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
                <p className="text-2xl font-bold">{summary.avgCTR.toFixed(2)}%</p>
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
                <p className="text-2xl font-bold">R$ {summary.avgCPA.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Ad Sets */}
      <Card>
        <CardContent className="p-6">
          {filteredAdSets.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum conjunto de anúncios encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedCampaignId 
                  ? "Tente selecionar uma campanha diferente ou limpar os filtros"
                  : "Sincronize suas campanhas do Facebook para ver os conjuntos de anúncios"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
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
                  {filteredAdSets.map((adSet) => (
                    <TableRow key={adSet.id}>
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-primary" 
                        onClick={() => handleViewDetails(adSet)}
                      >
                        {adSet.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={adSet.is_active ? "default" : "secondary"}>
                          {adSet.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCampaignName(adSet.campaign_id)}
                      </TableCell>
                      <TableCell>
                        {adSet.daily_budget > 0 && `R$ ${adSet.daily_budget.toFixed(2)}/dia`}
                        {adSet.lifetime_budget > 0 && `R$ ${adSet.lifetime_budget.toFixed(2)} total`}
                        {adSet.daily_budget === 0 && adSet.lifetime_budget === 0 && "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {(adSet.spend || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(adSet.impressions || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(adSet.ctr || 0).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {(adSet.cpc || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {adSet.conversions || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {(adSet.cpa || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewDetails(adSet)}
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

      {/* Modal de Métricas */}
      <AdSetMetricsModal
        adSet={selectedAdSet}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedAdSet(null);
        }}
      />
    </div>
  );
}
