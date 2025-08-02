import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";

type StatusType = "all" | "active" | "paused" | "finished";

const statusConfig = {
  active: { label: "Ativa", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  paused: { label: "Pausada", color: "bg-yellow-100 text-yellow-800", dotColor: "bg-yellow-500" },
  finished: { label: "Finalizada", color: "bg-gray-100 text-gray-800", dotColor: "bg-gray-500" }
};

const Campanhas = () => {
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { campaigns, loading, error, toggleCampaign } = useCampaigns();
  const { toast } = useToast();
  
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.platforms.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalCampaigns = filteredCampaigns.length;
  const itemsPerPage = 8;
  const totalPages = Math.ceil(totalCampaigns / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);

  const handleToggleCampaign = async (campaignId: string, isActive: boolean) => {
    await toggleCampaign(campaignId, isActive);
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive",
      });
    }
  };

  if (error) {
    toast({
      title: "Erro",
      description: error,
      variant: "destructive",
    });
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando campanhas...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-gray-900">Gerenciar Campanhas</h2>
                <Badge variant="secondary" className="px-3 py-1">
                  {totalCampaigns} campanhas
                </Badge>
              </div>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Nova Campanha</span>
              </Button>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={statusFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("all")}
                          className="flex items-center space-x-2"
                        >
                          <span>Todas</span>
                        </Button>
                        <Button
                          variant={statusFilter === "active" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("active")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Ativas</span>
                        </Button>
                        <Button
                          variant={statusFilter === "paused" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("paused")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Pausadas</span>
                        </Button>
                        <Button
                          variant={statusFilter === "finished" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("finished")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span>Finalizadas</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar campanhas..."
                        className="w-64 pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span>Filtros</span>
                    </Button>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Exportar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaigns Table */}
            <Card className="flex-1 flex flex-col">
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campanha
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CTR
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CPC
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversões
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${statusConfig[campaign.status].dotColor}`}></div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                              <div className="text-sm text-gray-500">{campaign.platforms}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={campaign.client?.avatar} alt={campaign.client?.name} />
                              <AvatarFallback>{campaign.client?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm text-gray-900">{campaign.client?.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={statusConfig[campaign.status].color}>
                            {statusConfig[campaign.status].label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {campaign.ctr}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          R$ {campaign.cpc.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          campaign.status === "active" ? "text-green-600" : 
                          campaign.status === "paused" ? "text-yellow-600" : "text-gray-600"
                        }`}>
                          {campaign.conversions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {campaign.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {campaign.status !== "finished" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Switch
                                  checked={campaign.is_active}
                                  onCheckedChange={(checked) => handleToggleCampaign(campaign.id, checked)}
                                  title={campaign.is_active ? "Pausar" : "Ativar"}
                                />
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  title="Relatório"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  title="Mais opções"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-white px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalCampaigns)}</span> de{" "}
                    <span className="font-medium">{totalCampaigns}</span> campanhas
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Anterior</span>
                    </Button>
                    
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-1"
                    >
                      <span>Próximo</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Campanhas;