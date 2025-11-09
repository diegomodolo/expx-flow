import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientContext } from "./ClienteContext";
import { Loader2, Eye, ChevronDown, BarChart3 } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CampaignMetricsModal } from "@/components/campaigns/CampaignMetricsModal";

export function ClienteCampanhas() {
  const { client, setSelectedCampaignId } = useClientContext();
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('all');
  const [sortField, setSortField] = useState<'name' | 'cpc' | 'cpa' | 'spend' | 'conversions' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);

  const campaigns = client?.campaigns || [];

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns;
    
    if (campaignFilter !== 'all') {
      filtered = campaigns.filter(campaign => {
        if (campaignFilter === 'active') return campaign.status === 'active' || campaign.is_active === true;
        if (campaignFilter === 'paused') return campaign.status === 'paused' || campaign.is_active === false;
        if (campaignFilter === 'finished') return campaign.status === 'finished';
        return true;
      });
    }
    
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [campaigns, campaignFilter, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewMetrics = (campaign: any) => {
    setSelectedCampaign(campaign);
    setMetricsModalOpen(true);
  };

  const handleCampaignClick = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Campanhas do Cliente</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant={campaignFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCampaignFilter('all')}
          >
            Todas
          </Button>
          <Button
            variant={campaignFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCampaignFilter('active')}
          >
            Ativas
          </Button>
          <Button
            variant={campaignFilter === 'paused' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCampaignFilter('paused')}
          >
            Pausadas
          </Button>
          <Button
            variant={campaignFilter === 'finished' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCampaignFilter('finished')}
          >
            Finalizadas
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Nome da Campanha</span>
                  {sortField === 'name' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Plataforma
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('cpc')}
              >
                <div className="flex items-center space-x-1">
                  <span>CPC</span>
                  {sortField === 'cpc' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('cpa')}
              >
                <div className="flex items-center space-x-1">
                  <span>CPA</span>
                  {sortField === 'cpa' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('conversions')}
              >
                <div className="flex items-center space-x-1">
                  <span>Conversões</span>
                  {sortField === 'conversions' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('spend')}
              >
                <div className="flex items-center space-x-1">
                  <span>Investimento</span>
                  {sortField === 'spend' && (
                    <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedCampaigns.length > 0 ? (
              filteredAndSortedCampaigns.map((campaign) => (
                <tr 
                  key={campaign.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleCampaignClick(campaign.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm font-medium text-gray-900 cursor-help">
                            {campaign.name && campaign.name.length > 50 
                              ? `${campaign.name.substring(0, 50)}...` 
                              : campaign.name}
                          </div>
                        </TooltipTrigger>
                        {campaign.name && campaign.name.length > 50 && (
                          <TooltipContent>
                            <p>{campaign.name}</p>
                          </TooltipContent>
                        )}
                      </UITooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant="outline">{campaign.platforms}</Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={
                      campaign.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }>
                      {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    R$ {campaign.cpc.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    R$ {campaign.cpa.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.conversions}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {campaign.spend.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewMetrics(campaign);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <BarChart3 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver Indicadores</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  <div>
                    <p className="mb-2">Nenhuma campanha encontrada</p>
                    <p className="text-sm">As campanhas sincronizadas aparecerão aqui</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CampaignMetricsModal
        campaign={selectedCampaign}
        isOpen={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
      />
    </div>
  );
}
