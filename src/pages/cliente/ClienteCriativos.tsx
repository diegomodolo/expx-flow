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
  TrendingUp,
  FileText
} from "lucide-react";
import { useUnifiedAdsMetrics, Platform } from "@/hooks/useUnifiedAds";
import { useUnifiedCampaigns } from "@/hooks/useUnifiedCampaigns";
import { useUnifiedAdGroups } from "@/hooks/useUnifiedAdGroups";
import { useClientContext } from "./ClienteContext";
import { useCompany } from "@/contexts/CompanyContext";
import { AdCreativeMetricsModal } from "@/components/ads/AdCreativeMetricsModal";
import { PlatformFilter } from "@/components/campaigns/PlatformFilter";
import { PlatformBadge } from "@/components/campaigns/PlatformBadge";

// Function to determine creative type priority
const getCreativeTypePriority = (creativeType?: string): number => {
  if (!creativeType) return 999;
  
  const type = creativeType.toUpperCase();
  
  if (type.includes('IMAGE')) return 1;
  if (type.includes('VIDEO')) return 2;
  return 3;
};

export function ClienteCriativos() {
  const { client, selectedCampaignId, setSelectedCampaignId, selectedAdSetId, setSelectedAdSetId } = useClientContext();
  const { activeCompany } = useCompany();
  
  const [platformFilter, setPlatformFilter] = useState<Platform>('all');
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<string>("conversions");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Use unified ads hook
  const { ads, metrics, isLoading, refetch } = useUnifiedAdsMetrics({
    clientId: client.id,
    companyId: activeCompany?.company_id,
    campaignId: selectedCampaignId || undefined,
    adGroupId: selectedAdSetId || undefined,
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

  // Fetch unified ad groups for the dropdown
  const { data: adGroups = [] } = useUnifiedAdGroups({
    clientId: client.id,
    companyId: activeCompany?.company_id,
    campaignId: selectedCampaignId || undefined,
    platform: platformFilter,
    includeInactive: true,
  });

  // Filter ads
  const filteredAds = useMemo(() => {
    let filtered = ads;
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(ad => 
        statusFilter === "active" ? ad.is_active : !ad.is_active
      );
    }
    
    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(ad => ad.creative_type?.toUpperCase() === typeFilter);
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      // First sort by creative type priority
      const priorityA = getCreativeTypePriority(a.creative_type);
      const priorityB = getCreativeTypePriority(b.creative_type);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then by selected metric
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [ads, statusFilter, typeFilter, sortBy, sortOrder]);

  // Count by platform
  const metaCount = ads.filter(ad => ad.platform === 'meta').length;
  const googleCount = ads.filter(ad => ad.platform === 'google').length;

  // Available ad groups for current campaign
  const availableAdGroups = useMemo(() => {
    if (!selectedCampaignId) return adGroups;
    return adGroups.filter(ag => ag.campaign_id === selectedCampaignId);
  }, [adGroups, selectedCampaignId]);

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

  const getAdGroupName = (adGroupId: string) => {
    return adGroups.find(ag => ag.id === adGroupId)?.name || "N/A";
  };

  const getCreativeIcon = (type?: string, platform?: string) => {
    if (platform === 'google') return <FileText className="w-4 h-4" />;
    if (!type) return <Image className="w-4 h-4" />;
    const upperType = type.toUpperCase();
    if (upperType.includes('VIDEO')) return <Play className="w-4 h-4" />;
    if (upperType.includes('CAROUSEL')) return <Film className="w-4 h-4" />;
    return <Image className="w-4 h-4" />;
  };

  if (isLoading) {
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
              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                <ToggleGroupItem value="grid" aria-label="Visualizar em grade">
                  <Grid3x3 className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Visualizar em tabela">
                  <List className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Platform filter */}
              <PlatformFilter
                value={platformFilter}
                onChange={setPlatformFilter}
                metaCount={metaCount}
                googleCount={googleCount}
              />

              {/* Campaign filter */}
              <Select value={selectedCampaignId || "all"} onValueChange={(v) => {
                setSelectedCampaignId(v === "all" ? null : v);
                setSelectedAdSetId(null);
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

              {/* Ad group filter */}
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
                  {availableAdGroups.map(ag => (
                    <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="IMAGE">Imagem</SelectItem>
                  <SelectItem value="VIDEO">Vídeo</SelectItem>
                  <SelectItem value="CAROUSEL">Carrossel</SelectItem>
                  <SelectItem value="TEXT">Texto</SelectItem>
                </SelectContent>
              </Select>

              {/* Status filter */}
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

              {/* Refresh button */}
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
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
                <p className="text-sm font-medium text-muted-foreground">Criativos Ativos</p>
                <p className="text-2xl font-bold">{metrics.active}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: {ads.filter(ad => ad.platform === 'meta' && ad.is_active).length} | 
                  Google: {ads.filter(ad => ad.platform === 'google' && ad.is_active).length}
                </p>
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
                <p className="text-2xl font-bold">{metrics.avgEngagement.toFixed(2)}%</p>
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
                <p className="text-sm font-medium text-muted-foreground">Conversões Totais</p>
                <p className="text-2xl font-bold">{metrics.totalConversions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: {ads.filter(ad => ad.platform === 'meta').reduce((s, ad) => s + ad.conversions, 0)} | 
                  Google: {ads.filter(ad => ad.platform === 'google').reduce((s, ad) => s + ad.conversions, 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content: Grid or Table */}
      {filteredAds.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Image className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum criativo encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedCampaignId || selectedAdSetId
                  ? "Tente selecionar filtros diferentes"
                  : "Sincronize suas campanhas para ver os criativos"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAds.map((ad) => (
            <Card key={ad.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Creative Preview */}
              <div className="relative h-48 bg-muted">
                {ad.platform === 'google' ? (
                  // Google Ads - Text preview
                  <div className="w-full h-full flex flex-col justify-center p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 line-clamp-2">
                      {ad.creative_title || ad.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {ad.creative_body || ad.creative_description || 'Anúncio de texto do Google Ads'}
                    </p>
                    {ad.link_url && (
                      <p className="text-xs text-green-600 mt-2 truncate">{ad.link_url}</p>
                    )}
                  </div>
                ) : ad.image_url ? (
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
                
                {/* Badges */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <PlatformBadge platform={ad.platform} showIcon={false} />
                  <Badge variant={ad.is_active ? "default" : "secondary"}>
                    {ad.is_active ? "Ativo" : "Pausado"}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 line-clamp-2" title={ad.name}>
                  {ad.name}
                </h4>
                
                {/* Creative text */}
                {ad.creative_body && ad.platform === 'meta' && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {ad.creative_body}
                  </p>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">CTR</p>
                    <p className="text-sm font-bold">{ad.ctr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPC</p>
                    <p className="text-sm font-bold">R$ {ad.cpc.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversões</p>
                    <p className="text-sm font-bold">{ad.conversions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {ad.platform === 'meta' ? 'Engajamento' : 'Cliques'}
                    </p>
                    <p className="text-sm font-bold">
                      {ad.platform === 'meta' 
                        ? (ad.likes || 0) + (ad.comments || 0) + (ad.shares || 0)
                        : ad.clicks}
                    </p>
                  </div>
                </div>

                {/* Engagement details (Meta only) */}
                {ad.platform === 'meta' && (
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
                    {ad.video_views && ad.video_views > 0 && (
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        <span>{ad.video_views}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                {ad.call_to_action && ad.call_to_action !== '{}' && (
                  <Badge variant="outline" className="w-full justify-center mb-3">
                    {ad.call_to_action}
                  </Badge>
                )}

                {/* View Details Button */}
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary" 
                      onClick={() => handleSort("clicks")}
                    >
                      Cliques {sortBy === "clicks" && (sortOrder === "desc" ? "↓" : "↑")}
                    </TableHead>
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
                  {filteredAds.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-primary" 
                        onClick={() => handleViewDetails(ad)}
                      >
                        {ad.name}
                      </TableCell>
                      <TableCell>
                        <PlatformBadge platform={ad.platform} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={ad.is_active ? "default" : "secondary"}>
                          {ad.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getCreativeIcon(ad.creative_type, ad.platform)}
                          {ad.creative_type || (ad.platform === 'google' ? 'TEXT' : 'N/A')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {ad.clicks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {ad.ctr.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {ad.cpc.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {ad.conversions}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {ad.cpa.toFixed(2)}
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

      {/* Metrics Modal */}
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
