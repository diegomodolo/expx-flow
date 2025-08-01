import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

type StatusType = "all" | "green" | "yellow" | "red";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  sector: string;
  status: "green" | "yellow" | "red";
  activeCampaigns: number;
  avgCPL: number;
  lastAccess: string;
  avatar: string;
}

const mockClients: Client[] = [
  {
    id: "1",
    name: "Carlos Eduardo Silva",
    email: "carlos@techsolutions.com",
    company: "TechSolutions Ltda",
    sector: "Tecnologia",
    status: "green",
    activeCampaigns: 3,
    avgCPL: 32.50,
    lastAccess: "Hoje, 14:30",
    avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "2",
    name: "Ana Paula Rodrigues",
    email: "ana@inovaremarketing.com",
    company: "Inovare Marketing",
    sector: "Marketing Digital",
    status: "green",
    activeCampaigns: 5,
    avgCPL: 38.90,
    lastAccess: "Ontem, 16:45",
    avatar: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "3",
    name: "Roberto Santos",
    email: "roberto@beachwear.com",
    company: "BeachWear Co.",
    sector: "Moda Praia",
    status: "yellow",
    activeCampaigns: 2,
    avgCPL: 41.20,
    lastAccess: "2 dias atrás",
    avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "4",
    name: "Fernanda Costa",
    email: "fernanda@fitnessacademy.com",
    company: "Fitness Academy",
    sector: "Academia",
    status: "red",
    activeCampaigns: 1,
    avgCPL: 78.50,
    lastAccess: "5 dias atrás",
    avatar: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "5",
    name: "Lucas Oliveira",
    email: "lucas@autopecas.com",
    company: "AutoPeças Express",
    sector: "Autopeças",
    status: "green",
    activeCampaigns: 4,
    avgCPL: 29.80,
    lastAccess: "Hoje, 09:15",
    avatar: "https://images.unsplash.com/photo-1485833077593-4278bba3f11f?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "6",
    name: "Mariana Ferreira",
    email: "mariana@consultoria.com",
    company: "Consultoria Empresarial",
    sector: "Consultoria",
    status: "yellow",
    activeCampaigns: 2,
    avgCPL: 52.30,
    lastAccess: "1 dia atrás",
    avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "7",
    name: "Pedro Almeida",
    email: "pedro@ecotech.com",
    company: "EcoTech Solutions",
    sector: "Sustentabilidade",
    status: "green",
    activeCampaigns: 3,
    avgCPL: 35.70,
    lastAccess: "Hoje, 11:20",
    avatar: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "8",
    name: "Juliana Mendes",
    email: "juliana@retailmax.com",
    company: "RetailMax",
    sector: "Varejo",
    status: "red",
    activeCampaigns: 1,
    avgCPL: 89.40,
    lastAccess: "1 semana atrás",
    avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=40&h=40&fit=crop&crop=face"
  }
];

const statusConfig = {
  green: { label: "Excelente", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  yellow: { label: "Atenção", color: "bg-yellow-100 text-yellow-800", dotColor: "bg-yellow-500" },
  red: { label: "Crítico", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" }
};

const Clientes = () => {
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const filteredClients = mockClients.filter(client => {
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalClients = filteredClients.length;
  const itemsPerPage = 8;
  const totalPages = Math.ceil(totalClients / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Clientes</h2>
            <Badge variant="secondary" className="px-3 py-1">
              {totalClients} clientes
            </Badge>
          </div>
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Adicionar Cliente</span>
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
                      <span>Todos</span>
                    </Button>
                    <Button
                      variant={statusFilter === "green" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("green")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Verde</span>
                    </Button>
                    <Button
                      variant={statusFilter === "yellow" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("yellow")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Amarelo</span>
                    </Button>
                    <Button
                      variant={statusFilter === "red" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("red")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Vermelho</span>
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar clientes..."
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

        {/* Clients Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campanhas Ativas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPL Médio
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Acesso
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${statusConfig[client.status].dotColor}`}></div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.company}</div>
                      <div className="text-sm text-gray-500">{client.sector}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={statusConfig[client.status].color}>
                        {statusConfig[client.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.activeCampaigns}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      client.status === "green" ? "text-green-600" : 
                      client.status === "yellow" ? "text-yellow-600" : "text-red-600"
                    }`}>
                      R$ {client.avgCPL.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.lastAccess}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0"
                          title="Mais opções"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
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
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalClients)}</span> de{" "}
                <span className="font-medium">{totalClients}</span> clientes
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
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                
                {totalPages > 5 && (
                  <>
                    <span className="px-3 py-2 text-sm text-gray-500">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                
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
      </div>
    </DashboardLayout>
  );
};

export default Clientes;