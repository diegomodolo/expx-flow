import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampaignTableRow } from "@/hooks/useClientDashboard";
import { useEffect, useState } from "react";

interface CampaignsTableProps {
  campaigns: CampaignTableRow[];
}

type StatusFilter = 'all' | 'active' | 'paused';

export const CampaignsTable = ({ campaigns }: CampaignsTableProps) => {
  const [animateKey, setAnimateKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [campaigns]);

  const filteredCampaigns = campaigns.filter(campaign => {
    if (statusFilter === 'all') return true;
    return campaign.status.toLowerCase() === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Ativa';
      case 'paused':
        return 'Pausada';
      case 'inactive':
        return 'Inativa';
      default:
        return status;
    }
  };

  return (
    <Card className="p-4 bg-card border-border animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-foreground transition-colors duration-300">Campanhas</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            Todas ({campaigns.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
          >
            Ativas ({campaigns.filter(c => c.status.toLowerCase() === 'active').length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'paused' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('paused')}
          >
            Pausadas ({campaigns.filter(c => c.status.toLowerCase() === 'paused').length})
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="transition-colors duration-300">
              <TableHead>Nome da Campanha</TableHead>
              <TableHead className="text-center">Conj.</TableHead>
              <TableHead className="text-center">Anúncios</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-right">CPL</TableHead>
              <TableHead className="text-center">Mensagens</TableHead>
              <TableHead className="text-right">CPM</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((campaign, index) => (
              <TableRow 
                key={`${index}-${animateKey}`}
                className="animate-fade-in transition-all duration-300 hover:bg-muted/50"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell className="font-medium max-w-xs truncate transition-colors duration-300">
                  {campaign.name}
                </TableCell>
                <TableCell className="text-center transition-all duration-500">{campaign.ad_sets_count}</TableCell>
                <TableCell className="text-center transition-all duration-500">{campaign.ads_count}</TableCell>
                <TableCell className="text-right transition-all duration-500">
                  R$ {campaign.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center font-semibold transition-all duration-500">
                  {campaign.leads}
                </TableCell>
                <TableCell className="text-right transition-all duration-500">
                  R$ {campaign.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center transition-all duration-500">{campaign.messages}</TableCell>
                <TableCell className="text-right transition-all duration-500">
                  R$ {campaign.cpm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${getStatusColor(campaign.status)} transition-all duration-300`}>
                    {getStatusLabel(campaign.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
