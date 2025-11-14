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
import { CampaignTableRow } from "@/hooks/useClientDashboard";

interface CampaignsTableProps {
  campaigns: CampaignTableRow[];
}

export const CampaignsTable = ({ campaigns }: CampaignsTableProps) => {
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
    <Card className="p-4 bg-card border-border">
      <h3 className="text-xl font-semibold text-foreground mb-4">Campanhas</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
            {campaigns.map((campaign, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium max-w-xs truncate">
                  {campaign.name}
                </TableCell>
                <TableCell className="text-center">{campaign.ad_sets_count}</TableCell>
                <TableCell className="text-center">{campaign.ads_count}</TableCell>
                <TableCell className="text-right">
                  R$ {campaign.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {campaign.leads}
                </TableCell>
                <TableCell className="text-right">
                  R$ {campaign.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center">{campaign.messages}</TableCell>
                <TableCell className="text-right">
                  R$ {campaign.cpm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(campaign.status)}>
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
