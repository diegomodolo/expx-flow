import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeams, Team } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";
import { SquadDialog } from "@/components/squads/SquadDialog";
import { DeleteSquadDialog } from "@/components/squads/DeleteSquadDialog";
import { 
  Plus, 
  Search, 
  Loader2,
  Edit,
  Users,
  BarChart3,
  Briefcase,
  User,
  Megaphone,
  Palette,
  Code,
  Target,
  Lightbulb,
  HeadphonesIcon
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
  HeadphonesIcon,
};

const Squad = () => {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [performanceFilter, setPerformanceFilter] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<Team | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const { teams, loading, error, createTeam, updateTeam, deleteTeam, fetchTeams } = useTeams();
  const { toast } = useToast();

  // Cálculos para métricas
  const activeTeams = teams.filter(team => team.progress > 0).length;
  const averagePerformance = teams.length > 0 
    ? Math.round(teams.reduce((acc, team) => acc + team.progress, 0) / teams.length)
    : 0;
  const totalProjects = teams.reduce((acc, team) => acc + team.active_tasks, 0);
  const totalMembers = teams.reduce((acc, team) => acc + (team.members?.length || 0), 0);

  // Filtros
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (error) {
    toast({
      title: "Erro",
      description: error,
      variant: "destructive",
    });
  }

  const getPerformanceStatus = (progress: number) => {
    if (progress >= 90) return "high";
    if (progress >= 70) return "medium";
    return "low";
  };

  const getStatusBadge = (progress: number) => {
    const status = getPerformanceStatus(progress);
    const config = {
      high: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700", 
      low: "bg-red-100 text-red-700"
    };
    return config[status];
  };

  const getPerformanceIndicator = (progress: number) => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

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
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="text-primary text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Squads</h1>
                  <p className="text-gray-600">Organize e monitore suas equipes de trabalho</p>
                </div>
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
                <span>Criar Novo Squad</span>
              </Button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{activeTeams}</div>
                      <div className="text-sm text-gray-600">Squads Ativos</div>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="text-green-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{averagePerformance}%</div>
                      <div className="text-sm text-gray-600">Performance Média</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalProjects}</div>
                      <div className="text-sm text-gray-600">Projetos Ativos</div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="text-purple-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalMembers}</div>
                      <div className="text-sm text-gray-600">Total de Membros</div>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <User className="text-orange-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Status:</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="pausa">Em Pausa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Tipo:</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="suporte">Suporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Performance:</label>
                    <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        <SelectItem value="alta">Alta (90%+)</SelectItem>
                        <SelectItem value="media">Média (70-89%)</SelectItem>
                        <SelectItem value="baixa">Baixa (&lt;70%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="text"
                        placeholder="Buscar por nome do squad..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Squads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTeams.map((team) => {
                const IconComponent = iconMap[team.icon] || Code;
                return (
                  <Card key={team.id} className="shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 ${team.icon_bg || 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                            <IconComponent className={`${team.icon_color || 'text-blue-600'} text-xl`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{team.name}</h3>
                            <Badge className="text-xs bg-green-100 text-green-700">Ativo</Badge>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${getPerformanceIndicator(team.progress)}`}></div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Membros:</span>
                          <span className="font-medium text-gray-900">{team.members?.length || 0} pessoas</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Projetos Ativos:</span>
                          <span className="font-medium text-gray-900">{team.active_tasks} projetos</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Performance:</span>
                          <span className={`font-medium ${team.progress >= 90 ? 'text-green-600' : team.progress >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {team.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4 mb-4">
                        <div className="grid grid-cols-3 gap-4 text-center text-xs">
                          <div>
                            <div className="font-semibold text-gray-900">{Math.round(team.active_tasks * 5.2)}</div>
                            <div className="text-gray-600">Tasks/mês</div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{Math.round(team.progress)}%</div>
                            <div className="text-gray-600">No prazo</div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{(team.progress / 20).toFixed(1)}</div>
                            <div className="text-gray-600">Satisfação</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setDialogMode('edit');
                            setSelectedSquad(team);
                            setDialogOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                        >
                          Membros
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Performance Chart Placeholder */}
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-blue-600 text-xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Distribuição de Carga de Trabalho</h3>
                  </div>
                  <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 font-medium">
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-72 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Gráfico de distribuição de tarefas</p>
                    <p className="text-sm text-gray-400">Dados dos squads em tempo real</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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