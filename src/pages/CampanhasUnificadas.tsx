import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/contexts/CompanyContext";
import { useUnifiedCampaigns, useUnifiedMetrics, Platform } from "@/hooks/useUnifiedCampaigns";
import { PlatformFilter } from "@/components/campaigns/PlatformFilter";
import { PlatformBadge } from "@/components/campaigns/PlatformBadge";
import { PlatformComparisonChart } from "@/components/campaigns/PlatformComparisonChart";
import { UnifiedMetricsCards } from "@/components/dashboard/UnifiedMetricsCards";
import { Search, Eye, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CampanhasUnificadas() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [platform, setPlatform] = useState<Platform>('all');
  const [searchTerm, setSearchTerm] = useState("");

  const { data: campaigns, isLoading } = useUnifiedCampaigns({
    companyId: activeCompany?.id,
    platform,
  });

  const { metrics, isLoading: metricsLoading } = useUnifiedMetrics({
    companyId: activeCompany?.id,
    platform: 'all',
  });

  const filteredCampaigns = campaigns?.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const metaCount = campaigns?.filter((c) => c.platform === 'meta').length || 0;
  const googleCount = campaigns?.filter((c) => c.platform === 'google').length || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Campanhas Unificadas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie campanhas do Meta Ads e Google Ads em um só lugar
          </p>
        </div>

        <UnifiedMetricsCards metrics={metrics} isLoading={metricsLoading} />

        {metrics.meta.campaigns > 0 && metrics.google.campaigns > 0 && (
          <PlatformComparisonChart meta={metrics.meta} google={metrics.google} />
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Todas as Campanhas</CardTitle>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <PlatformFilter
                  value={platform}
                  onChange={setPlatform}
                  metaCount={metaCount}
                  googleCount={googleCount}
                />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full md:w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Campanha</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Investimento</TableHead>
                      <TableHead className="text-right">Impressões</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Conversões</TableHead>
                      <TableHead className="text-right">CPA</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={`${campaign.platform}-${campaign.id}`}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <PlatformBadge platform={campaign.platform} />
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              campaign.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {campaign.is_active ? 'Ativa' : 'Pausada'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.spend)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.impressions)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.clicks)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.conversions)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.cpa)}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.ctr.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const path = campaign.platform === 'meta'
                                ? `/campanhas/${campaign.id}`
                                : `/campanhas-google/${campaign.id}`;
                              navigate(path);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Nenhuma campanha encontrada com esse termo de busca'
                    : 'Nenhuma campanha disponível'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
