import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Calendar, User, Search, Filter, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGeneratedCampaigns } from "@/hooks/useGeneratedCampaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface CampaignsListProps {
  onNewCampaign: () => void;
  onViewCampaign: (campaignId: string) => void;
}

export function CampaignsList({ onNewCampaign, onViewCampaign }: CampaignsListProps) {
  const { campaigns, loading } = useGeneratedCampaigns();
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="flex flex-col h-full space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-18" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const searchLower = searchTerm.toLowerCase();
    return (
      campaign.title.toLowerCase().includes(searchLower) ||
      campaign.clients?.name.toLowerCase().includes(searchLower) ||
      campaign.clients?.company.toLowerCase().includes(searchLower) ||
      campaign.campaign_type.toLowerCase().includes(searchLower) ||
      campaign.funnel_stage.toLowerCase().includes(searchLower)
    );
  });

  const getFunnelStageLabel = (stage: string) => {
    const labels = {
      topo: "Topo",
      meio: "Meio", 
      fundo: "Fundo",
      retencao: "Retenção"
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels = {
      awareness: "Reconhecimento",
      traffic: "Tráfego",
      leads: "Leads",
      conversions: "Conversões",
      remarketing: "Remarketing",
      retention: "Retenção"
    };
    return labels[type as keyof typeof labels] || type;
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

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col h-full space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Campanhas Geradas</h2>
            <Badge variant="secondary" className="px-3 py-1 mt-2">
              0 campanhas
            </Badge>
          </div>
          <Button onClick={onNewCampaign} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nova Campanha</span>
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha gerada ainda</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando sua primeira estratégia de campanha inteligente
            </p>
            <Button onClick={onNewCampaign} size="lg" className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Gerar Primeira Campanha
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Campanhas Geradas</h2>
          <Badge variant="secondary" className="px-3 py-1">
            {filteredCampaigns.length} campanhas
          </Badge>
        </div>
        <Button className="flex items-center space-x-2 w-full sm:w-auto" onClick={onNewCampaign}>
          <Plus className="w-4 h-4" />
          <span>Nova Campanha</span>
        </Button>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search Input */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex items-center space-x-2" onClick={exportToCSV}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Grid */}
      <div className="grid gap-4 flex-1">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-lg">{campaign.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">
                      {getFunnelStageLabel(campaign.funnel_stage)}
                    </Badge>
                    <Badge variant="outline">
                      {getCampaignTypeLabel(campaign.campaign_type)}
                    </Badge>
                    {campaign.clients && (
                      <Badge variant="default">
                        {campaign.clients.company}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {campaign.clients?.name || 'Cliente não encontrado'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => onViewCampaign(campaign.id)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}