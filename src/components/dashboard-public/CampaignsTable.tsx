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
import { FaFacebook, FaGoogle } from "react-icons/fa";

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
        return 'bg-success/10 text-success border-0';
      case 'paused':
        return 'bg-warning/10 text-warning border-0';
      case 'inactive':
        return 'bg-muted text-muted-foreground border-0';
      default:
        return 'bg-primary/10 text-primary border-0';
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
    <Card className="p-4 bg-card border-0 shadow-google-sm rounded-xl animate-fade-in h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-title-md text-foreground">Campanhas</h3>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            onClick={() => setStatusFilter('all')}
            className="h-7 px-3 text-label-sm rounded-full"
          >
            Todas ({campaigns.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'active' ? 'default' : 'ghost'}
            onClick={() => setStatusFilter('active')}
            className="h-7 px-3 text-label-sm rounded-full"
          >
            Ativas ({campaigns.filter(c => c.status.toLowerCase() === 'active').length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'paused' ? 'default' : 'ghost'}
            onClick={() => setStatusFilter('paused')}
            className="h-7 px-3 text-label-sm rounded-full"
          >
            Pausadas ({campaigns.filter(c => c.status.toLowerCase() === 'paused').length})
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="text-label-sm">Nome da Campanha</TableHead>
              <TableHead className="text-center text-label-sm">Conj.</TableHead>
              <TableHead className="text-center text-label-sm">Anúncios</TableHead>
              <TableHead className="text-right text-label-sm">Investimento</TableHead>
              <TableHead className="text-center text-label-sm">Leads</TableHead>
              <TableHead className="text-right text-label-sm">CPL</TableHead>
              <TableHead className="text-center text-label-sm">Mensagens</TableHead>
              <TableHead className="text-right text-label-sm">CPM</TableHead>
              <TableHead className="text-center text-label-sm">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((campaign, index) => (
              <TableRow 
                key={`${index}-${animateKey}`}
                className="animate-fade-in border-b border-border/50 hover:bg-secondary/50 transition-colors"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell className="text-body-sm font-medium max-w-xs truncate">
                  <div className="flex items-center gap-2">
                    {campaign.platform === 'google' ? (
                      <FaGoogle className="h-4 w-4 text-[#4285F4] flex-shrink-0" />
                    ) : (
                      <FaFacebook className="h-4 w-4 text-[#1877F2] flex-shrink-0" />
                    )}
                    <span className="truncate">{campaign.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-body-sm">{campaign.ad_sets_count}</TableCell>
                <TableCell className="text-center text-body-sm">{campaign.ads_count}</TableCell>
                <TableCell className="text-right text-body-sm">
                  R$ {campaign.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center text-title-sm text-foreground">
                  {campaign.leads}
                </TableCell>
                <TableCell className="text-right text-body-sm">
                  R$ {campaign.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center text-body-sm">{campaign.messages}</TableCell>
                <TableCell className="text-right text-body-sm">
                  R$ {campaign.cpm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(campaign.status)} text-label-sm rounded-full px-2 py-0.5`}>
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
