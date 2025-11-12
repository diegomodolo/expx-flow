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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Image, 
  RefreshCw, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Grid3x3, 
  List,
  Play,
  Film,
  TrendingUp
} from "lucide-react";
import { useAds } from "@/hooks/useAds";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAdSets } from "@/hooks/useAdSets";
import { useClientContext } from "./ClienteContext";
import { AdCreativeMetricsModal } from "@/components/ads/AdCreativeMetricsModal";

// Função para determinar a prioridade do tipo de criativo
const getCreativeTypePriority = (creativeType?: string): number => {
  if (!creativeType) return 999; // Sem tipo vai pro final
  
  const type = creativeType.toUpperCase();
  
  if (type.includes('IMAGE')) return 1;
  if (type.includes('VIDEO')) return 2;
  // TEXT, CAROUSEL e outros tipos ficam por último
  return 3;
};

export function ClienteCriativos() {
  const { client, selectedCampaignId, setSelectedCampaignId, selectedAdSetId, setSelectedAdSetId } = useClientContext();
  const { ads, loading, refetch } = useAds(client.id);
  const { campaigns } = useCampaigns(client.id);
  const { adSets } = useAdSets(client.id);
  
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<string>("conversions");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filtrar criativos
  const filteredAds = useMemo(() => {
    let filtered = ads || [];
    
    // Filtro por campanha
    if (selectedCampaignId) {
      filtered = filtered.filter(ad => ad.campaign_id === selectedCampaignId);
    }
    
    // Filtro por ad set
    if (selectedAdSetId) {
      filtered = filtered.filter(ad => ad.ad_set_id === selectedAdSetId);
    }
    
    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(ad => 
        statusFilter === "active" ? ad.is_active : !ad.is_active
      );
    }
    
    // Filtro por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter(ad => ad.creative_type?.toUpperCase() === typeFilter);
    }
    
    // Ordenação
    filtered = [...filtered].sort((a, b) => {
      // 1. PRIMEIRA ORDENAÇÃO: Por tipo de criativo (prioridade)
      const priorityA = getCreativeTypePriority(a.creative_type);
      const priorityB = getCreativeTypePriority(b.creative_type);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Sempre ascendente (menor prioridade = primeiro)
      }
      
      // 2. SEGUNDA ORDENAÇÃO: Por métrica selecionada (dentro do mesmo tipo)
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [ads, selectedCampaignId, selectedAdSetId, statusFilter, typeFilter, sortBy, sortOrder]);

  // Ad sets filtrados por campanha (para o dropdown de ad set)
  const availableAdSets = useMemo(() => {
    if (!selectedCampaignId) return adSets || [];
    return (adSets || []).filter(as => as.campaign_id === selectedCampaignId);
  }, [adSets, selectedCampaignId]);

  // Métricas resumidas
  const summary = useMemo(() => {
    const active = filteredAds.filter(ad => ad.is_active).length;
    const totalClicks = filteredAds.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
    const totalImpressions = filteredAds.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
    const totalConversions = filteredAds.reduce((sum, ad) => sum + (ad.conversions || 0), 0);
    const totalReach = filteredAds.reduce((sum, ad) => sum + (ad.reach || 0), 0);
    const totalEngagement = filteredAds.reduce((sum, ad) => 
      sum + (ad.likes || 0) + (ad.comments || 0) + (ad.shares || 0), 0
    );
    
    const avgCTR = totalImpressions > 0 
      ? (totalClicks / totalImpressions) * 100 
      : 0;
    
    const avgEngagement = totalReach > 0
      ? (totalEngagement / totalReach) * 100
      : 0;
    
    return { active, avgCTR, avgEngagement, totalConversions };
  }, [filteredAds]);

  const handleViewDetails = (ad: any) => {
    setSelectedAd(ad);
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

  const getAdSetName = (adSetId: string) => {
    return (adSets || []).find(as => as.id === adSetId)?.name || "N/A";
  };

  const getCreativeIcon = (type?: string) => {
    if (!type) return <Image className="w-4 h-4" />;
    const upperType = type.toUpperCase();
    if (upperType.includes('VIDEO')) return <Play className="w-4 h-4" />;
    if (upperType.includes('CAROUSEL')) return <Film className="w-4 h-4" />;
    return <Image className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando criativos...</p>
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
              <Image className="w-5 h-5" />
              <CardTitle>Criativos</CardTitle>
              <Badge variant="secondary">{filteredAds.length}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Grid/Table */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                <ToggleGroupItem value="grid" aria-label="Visualizar em grade">
                  <Grid3x3 className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Visualizar em tabela">
                  <List className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Filtro por campanha */}
              <Select value={selectedCampaignId || "all"} onValueChange={(v) => {
                setSelectedCampaignId(v === "all" ? null : v);
                setSelectedAdSetId(null); // Reset ad set quando muda campanha
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por ad set */}
              <Select 
                value={selectedAdSetId || "all"} 
                onValueChange={(v) => setSelectedAdSetId(v === "all" ? null : v)}
                disabled={!selectedCampaignId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os ad sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os ad sets</SelectItem>
                  {availableAdSets.map(as => (
                    <SelectItem key={as.id} value={as.id}>{as.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por tipo */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="IMAGE">Imagem</SelectItem>
                  <SelectItem value="VIDEO">Vídeo</SelectItem>
                  <SelectItem value="CAROUSEL">Carrossel</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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
                <p className="text-sm font-medium text-muted-foreground">Criativos Ativos</p>
                <p className="text-2xl font-bold">{summary.active}</p>
              </div>
              <Image className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Engajamento</p>
                <p className="text-2xl font-bold">{summary.avgEngagement.toFixed(2)}%</p>
              </div>
              <Heart className="w-8 h-8 text-primary" />
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
                <p className="text-sm font-medium text-muted-foreground">Conversões Totais</p>
                <p className="text-2xl font-bold">{summary.totalConversions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo: Grid ou Tabela */}
      {filteredAds.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Image className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum criativo encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedCampaignId || selectedAdSetId
                  ? "Tente selecionar filtros diferentes"
                  : "Sincronize suas campanhas do Facebook para ver os criativos"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAds.map((ad) => (
            <Card key={ad.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Preview do Criativo */}
              <div className="relative h-48 bg-muted">
                {ad.image_url ? (
                  <img 
                    src={ad.image_url} 
                    alt={ad.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                ) : ad.video_url ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Play className="w-12 h-12 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Image className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Badges no canto */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge variant={ad.is_active ? "default" : "secondary"}>
                    {ad.is_active ? "Ativo" : "Pausado"}
                  </Badge>
                  {ad.creative_type && (
                    <Badge variant="outline" className="bg-background">
                      <span className="flex items-center gap-1">
                        {getCreativeIcon(ad.creative_type)}
                        {ad.creative_type}
                      </span>
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 line-clamp-2" title={ad.name}>
                  {ad.name}
                </h4>
                
                {/* Texto do criativo */}
                {ad.creative_body && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {ad.creative_body}
                  </p>
                )}

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">CTR</p>
                    <p className="text-sm font-bold">{(ad.ctr || 0).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPC</p>
                    <p className="text-sm font-bold">R$ {(ad.cpc || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversões</p>
                    <p className="text-sm font-bold">{ad.conversions || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Engajamento</p>
                    <p className="text-sm font-bold">
                      {(ad.likes || 0) + (ad.comments || 0) + (ad.shares || 0)}
                    </p>
                  </div>
                </div>

                {/* Engajamento detalhado */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{ad.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{ad.comments || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    <span>{ad.shares || 0}</span>
                  </div>
                  {ad.video_views > 0 && (
                    <div className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      <span>{ad.video_views}</span>
                    </div>
                  )}
                </div>

                {/* Call to Action */}
                {ad.call_to_action && ad.call_to_action !== '{}' && (
                  <Badge variant="outline" className="w-full justify-center mb-3">
                    {ad.call_to_action}
                  </Badge>
                )}

                {/* Botão Ver Detalhes */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleViewDetails(ad)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes Completos
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Ad Set</TableHead>
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
                    <TableHead className="text-right">Engajamento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAds.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <div className="w-16 h-16 bg-muted rounded overflow-hidden">
                          {ad.image_url ? (
                            <img 
                              src={ad.image_url} 
                              alt={ad.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getCreativeIcon(ad.creative_type)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="line-clamp-2" title={ad.name}>{ad.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ad.is_active ? "default" : "secondary"}>
                          {ad.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getCreativeIcon(ad.creative_type)}
                          <span className="text-sm">{ad.creative_type || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCampaignName(ad.campaign_id)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getAdSetName(ad.ad_set_id)}
                      </TableCell>
                      <TableCell className="text-right">{(ad.ctr || 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">R$ {(ad.cpc || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{ad.conversions || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {ad.likes || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {ad.comments || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            {ad.shares || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewDetails(ad)}
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
          </CardContent>
        </Card>
      )}

      {/* Modal de Métricas */}
      <AdCreativeMetricsModal
        ad={selectedAd}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedAd(null);
        }}
      />
    </div>
  );
}
