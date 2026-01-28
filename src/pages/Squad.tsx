import { useState, useEffect } from "react";
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
import { SquadMembersDialog } from "@/components/squads/SquadMembersDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  HeadphonesIcon,
  Crown,
  MessageSquare
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
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
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
    const matchesStatus = statusFilter === "todos" || team.progress > 0; // Simplificado para agora
    const matchesType = typeFilter === "todos" || true; // Simplificado para agora  
    const matchesPerformance = performanceFilter === "todas" || true; // Simplificado para agora
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesPerformance && matchesSearch;
  });

  // Handle error with useEffect to prevent infinite renders
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const getPerformanceStatus = (progress: number) => {
    if (progress >= 90) return "high";
    if (progress >= 70) return "medium";
    return "low";
  };

  const getStatusBadge = (progress: number) => {
    const status = getPerformanceStatus(progress);
    const config = {
      high: "bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400",
      medium: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400", 
      low: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
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
      <div className="flex flex-col h-full space-y-6">
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
                  <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Squads</h1>
                  <p className="text-muted-foreground">Organize e monitore suas equipes de trabalho</p>
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
              <Card className="shadow-sm border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{activeTeams}</div>
                      <div className="text-sm text-muted-foreground">Squads Ativos</div>
                    </div>
                    <div className="w-12 h-12 bg-green-500/10 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Users className="text-green-600 dark:text-green-400 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{averagePerformance}%</div>
                      <div className="text-sm text-muted-foreground">Performance Média</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-blue-600 dark:text-blue-400 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{totalProjects}</div>
                      <div className="text-sm text-muted-foreground">Projetos Ativos</div>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Briefcase className="text-purple-600 dark:text-purple-400 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{totalMembers}</div>
                      <div className="text-sm text-muted-foreground">Total de Membros</div>
                    </div>
                    <div className="w-12 h-12 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <User className="text-orange-600 dark:text-orange-400 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-muted-foreground">Status:</label>
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
                    <label className="text-sm font-medium text-muted-foreground">Tipo:</label>
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
                    <label className="text-sm font-medium text-muted-foreground">Performance:</label>
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
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                  <Card key={team.id} className="shadow-sm border hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 ${team.icon_bg || 'bg-blue-500/10 dark:bg-blue-500/20'} rounded-lg flex items-center justify-center`}>
                            <IconComponent className={`${team.icon_color || 'text-blue-600 dark:text-blue-400'} text-xl`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{team.name}</h3>
                            <Badge className="text-xs bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-0">Ativo</Badge>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${getPerformanceIndicator(team.progress)}`}></div>
                      </div>

                      {/* Leader and WhatsApp Responsible */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Crown className="h-3.5 w-3.5 text-yellow-500" />
                            Líder:
                          </span>
                          {team.leader ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={team.leader.avatar || undefined} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                  {team.leader.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground text-xs truncate max-w-[100px]">
                                {team.leader.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não definido</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                            CS WhatsApp:
                          </span>
                          {team.whatsapp_responsible ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={team.whatsapp_responsible.avatar || undefined} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                  {team.whatsapp_responsible.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground text-xs truncate max-w-[100px]">
                                {team.whatsapp_responsible.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não definido</span>
                          )}
                        </div>
                      </div>

                      {/* Members preview */}
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="text-muted-foreground">Membros:</span>
                        <div className="flex items-center gap-1">
                          {team.members && team.members.length > 0 ? (
                            <>
                              <div className="flex -space-x-2">
                                {team.members.slice(0, 4).map((member) => (
                                  <Tooltip key={member.id}>
                                    <TooltipTrigger asChild>
                                      <Avatar className="h-6 w-6 border-2 border-background">
                                        <AvatarImage src={member.avatar || undefined} />
                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                          {member.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {member.name}
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                              {team.members.length > 4 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  +{team.members.length - 4}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nenhum membro</span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border pt-4 mb-4">
                        <div className="grid grid-cols-3 gap-4 text-center text-xs">
                          <div>
                            <div className="font-semibold text-foreground">{team.members?.length || 0}</div>
                            <div className="text-muted-foreground">Membros</div>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{team.active_tasks}</div>
                            <div className="text-muted-foreground">Projetos</div>
                          </div>
                          <div>
                            <div className={`font-semibold ${team.progress >= 90 ? 'text-green-600 dark:text-green-400' : team.progress >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                              {team.progress}%
                            </div>
                            <div className="text-muted-foreground">Performance</div>
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
                          onClick={() => {
                            setSelectedSquad(team);
                            setMembersDialogOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Membros
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Performance Chart Placeholder */}
            <Card className="shadow-sm border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-blue-600 dark:text-blue-400 text-xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Distribuição de Carga de Trabalho</h3>
                  </div>
                  <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 font-medium">
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-72 bg-muted/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Gráfico de distribuição de tarefas</p>
                    <p className="text-sm text-muted-foreground/70">Dados dos squads em tempo real</p>
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

        {selectedSquad && (
          <SquadMembersDialog
            open={membersDialogOpen}
            onOpenChange={(open) => {
              setMembersDialogOpen(open);
              if (!open) {
                setSelectedSquad(null);
              }
            }}
            squad={selectedSquad}
            onUpdate={fetchTeams}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Squad;