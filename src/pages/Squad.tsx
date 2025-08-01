import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTeams, Team } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";
import { SquadDialog } from "@/components/squads/SquadDialog";
import { DeleteSquadDialog } from "@/components/squads/DeleteSquadDialog";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Megaphone,
  Palette,
  Code,
  BarChart3,
  Users,
  Target,
  Briefcase,
  Lightbulb
} from "lucide-react";

type StatusType = "all" | "high" | "medium" | "low";

const iconMap: { [key: string]: React.ComponentType<any> } = {
  Megaphone,
  Palette,
  Code,
  BarChart3,
  Users,
  Target,
  Briefcase,
  Lightbulb,
};

const statusConfig = {
  high: { label: "Alta Performance", color: "bg-green-100 text-green-800", range: "≥ 80%" },
  medium: { label: "Performance Média", color: "bg-yellow-100 text-yellow-800", range: "60-79%" },
  low: { label: "Precisa Atenção", color: "bg-red-100 text-red-800", range: "< 60%" }
};

const Squad = () => {
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<Team | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const { teams, loading, error, createTeam, updateTeam, deleteTeam, fetchTeams } = useTeams();
  const { toast } = useToast();

  const getPerformanceStatus = (progress: number): "high" | "medium" | "low" => {
    if (progress >= 80) return "high";
    if (progress >= 60) return "medium";
    return "low";
  };

  const filteredTeams = teams.filter(team => {
    const teamStatus = getPerformanceStatus(team.progress);
    const matchesStatus = statusFilter === "all" || teamStatus === statusFilter;
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalTeams = filteredTeams.length;
  const itemsPerPage = 6;
  const totalPages = Math.ceil(totalTeams / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTeams = filteredTeams.slice(startIndex, startIndex + itemsPerPage);

  const exportToCSV = () => {
    const headers = ["Nome", "Descrição", "Progresso", "Tarefas Ativas", "Membros", "Status"];
    const csvData = filteredTeams.map(team => [
      team.name,
      team.description,
      `${team.progress}%`,
      team.active_tasks,
      team.members?.length || 0,
      statusConfig[getPerformanceStatus(team.progress)].label
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `squads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportação concluída",
      description: "Lista de squads exportada com sucesso!",
    });
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
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando squads...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-gray-900">Gerenciar Squad</h2>
                <Badge variant="secondary" className="px-3 py-1">
                  {totalTeams} squads
                </Badge>
              </div>
              <Button 
                className="flex items-center space-x-2"
                onClick={() => {
                  setDialogMode('create');
                  setSelectedSquad(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Nova Squad</span>
              </Button>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Performance:</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={statusFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("all")}
                        >
                          Todas
                        </Button>
                        <Button
                          variant={statusFilter === "high" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("high")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Alta</span>
                        </Button>
                        <Button
                          variant={statusFilter === "medium" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("medium")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Média</span>
                        </Button>
                        <Button
                          variant={statusFilter === "low" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("low")}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Baixa</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar squads..."
                        className="w-64 pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" className="flex items-center space-x-2" onClick={() => setShowFilters(!showFilters)}>
                      <Filter className="w-4 h-4" />
                      <span>Filtros</span>
                    </Button>
                    <Button variant="outline" className="flex items-center space-x-2" onClick={exportToCSV}>
                      <Download className="w-4 h-4" />
                      <span>Exportar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Filters Card */}
            {showFilters && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Filtros Avançados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Faixa de Progresso</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as faixas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as faixas</SelectItem>
                          <SelectItem value="80-100">80% - 100%</SelectItem>
                          <SelectItem value="60-79">60% - 79%</SelectItem>
                          <SelectItem value="40-59">40% - 59%</SelectItem>
                          <SelectItem value="0-39">0% - 39%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Número de Tarefas</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer quantidade</SelectItem>
                          <SelectItem value="0">0 tarefas</SelectItem>
                          <SelectItem value="1-5">1-5 tarefas</SelectItem>
                          <SelectItem value="6-15">6-15 tarefas</SelectItem>
                          <SelectItem value="15+">15+ tarefas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Número de Membros</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer quantidade</SelectItem>
                          <SelectItem value="1-2">1-2 membros</SelectItem>
                          <SelectItem value="3-5">3-5 membros</SelectItem>
                          <SelectItem value="6-10">6-10 membros</SelectItem>
                          <SelectItem value="10+">10+ membros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline">
                      Limpar Filtros
                    </Button>
                    <Button>
                      Aplicar ({filteredTeams.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTeams.map((team) => {
                const IconComponent = iconMap[team.icon] || Users;
                const teamStatus = getPerformanceStatus(team.progress);
                return (
                  <Card key={team.id} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{team.name}</h4>
                          <p className="text-sm text-gray-500">{team.description}</p>
                        </div>
                        <div className={`w-12 h-12 ${team.icon_bg} rounded-full flex items-center justify-center`}>
                          <IconComponent className={`w-6 h-6 ${team.icon_color}`} />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex -space-x-2">
                          {team.members?.slice(0, 3).map((member, index) => (
                            <Avatar key={index} className="w-8 h-8 border-2 border-white">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {team.members?.length || 0} membros
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Progresso</span>
                          <span className="text-sm font-medium text-gray-900">{team.progress}%</span>
                        </div>
                        <Progress value={team.progress} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-600">{team.active_tasks} tarefas ativas</span>
                        <Badge className={statusConfig[teamStatus].color}>
                          {statusConfig[teamStatus].label}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-8 h-8 p-0"
                          title="Visualizar"
                          onClick={() => {
                            setDialogMode('view');
                            setSelectedSquad(team);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-8 h-8 p-0"
                          title="Editar"
                          onClick={() => {
                            setDialogMode('edit');
                            setSelectedSquad(team);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0"
                              title="Mais opções"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSquad(team);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalTeams)}</span> de{" "}
                  <span className="font-medium">{totalTeams}</span> squads
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
            )}
          </>
        )}
        
        {/* Dialogs */}
        <SquadDialog
          key={`${dialogMode}-${selectedSquad?.id || 'new'}`}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedSquad(null);
              // Recarrega squads quando dialog é fechado para sincronizar
              fetchTeams();
            }
          }}
          onSubmit={
            dialogMode === 'create' 
              ? createTeam 
              : dialogMode === 'edit' && selectedSquad
                ? (squadData) => updateTeam(selectedSquad.id, squadData)
                : () => Promise.resolve(null)
          }
          squad={dialogMode === 'create' ? undefined : selectedSquad || undefined}
          title={
            dialogMode === 'create' 
              ? "Adicionar Squad" 
              : dialogMode === 'edit' 
                ? "Editar Squad" 
                : "Visualizar Squad"
          }
          readOnly={dialogMode === 'view'}
        />
        
        <DeleteSquadDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={deleteTeam}
          squad={selectedSquad}
        />
      </div>
    </DashboardLayout>
  );
};

export default Squad;