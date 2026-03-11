import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useTeams } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";
import { EmployeeDialog } from "@/components/employees/EmployeeDialog";
import { DeleteEmployeeDialog } from "@/components/employees/DeleteEmployeeDialog";
import { 
  Plus, 
  Search, 
  Loader2,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserPlus,
  Trophy,
  LayoutGrid,
  List,
  Users,
  Mail,
  Phone,
  KeyRound,
  Send,
  Clock,
  Bot
} from "lucide-react";
import { ResetPasswordDialog } from "@/components/employees/ResetPasswordDialog";
import { ResendInviteDialog } from "@/components/employees/ResendInviteDialog";

const Colaboradores = () => {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [teamFilter, setTeamFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState<"humans" | "agents" | "all">("humans");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resendInviteDialogOpen, setResendInviteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  
  const { employees, loading, error, createEmployee, updateEmployee, deleteEmployee, fetchEmployees } = useEmployees();
  const { teams } = useTeams();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cálculos para métricas
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;
  const newEmployees = employees.filter(emp => {
    const startDate = new Date(emp.start_date);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return startDate >= threeMonthsAgo;
  }).length;
  const retentionRate = totalEmployees > 0 ? ((activeEmployees / totalEmployees) * 100).toFixed(1) : "0";

  // Filtros
  const filteredEmployees = employees.filter(employee => {
    const matchesStatus = statusFilter === "todos" || employee.status === statusFilter;
    const matchesTeam = teamFilter === "todos" || employee.team_id === teamFilter;
    const matchesRole = !roleFilter || employee.role.toLowerCase().includes(roleFilter.toLowerCase());
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isAgent = !!employee.ia_agent_id;
    const matchesType = typeFilter === "all" 
      ? true 
      : typeFilter === "agents" 
        ? isAgent 
        : !isAgent;

    return matchesStatus && matchesTeam && matchesRole && matchesSearch && matchesType;
  });

  const getStatusBadge = (status: Employee['status']) => {
    const statusConfig = {
      active: { label: "Ativo", className: "bg-green-100 text-green-700" },
      inactive: { label: "Inativo", className: "bg-red-100 text-red-700" },
      vacation: { label: "Férias", className: "bg-yellow-100 text-yellow-700" }
    };
    return statusConfig[status] || statusConfig.active;
  };

  const getTeamBadge = (teamId?: string) => {
    if (!teamId) return { name: "Sem Squad", className: "bg-gray-100 text-gray-700" };
    
    const team = teams.find(t => t.id === teamId);
    if (!team) return { name: "Squad Desconhecido", className: "bg-gray-100 text-gray-700" };
    
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700", 
      "bg-orange-100 text-orange-700",
      "bg-green-100 text-green-700",
      "bg-indigo-100 text-indigo-700",
      "bg-pink-100 text-pink-700",
      "bg-teal-100 text-teal-700"
    ];
    
    const colorIndex = teams.findIndex(t => t.id === teamId) % colors.length;
    return { name: team.name, className: colors[colorIndex] };
  };

  const getEmployeeAvatar = (employee: Employee) => {
    return employee.profile_avatar_url || employee.avatar;
  };

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-4 sm:space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando colaboradores...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="text-primary text-xl sm:text-2xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Gerenciamento de Colaboradores</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Gerencie a equipe e acompanhe o desempenho dos colaboradores</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-xs sm:text-sm"
                  onClick={() => navigate("/colaboradores/cargas-horarias")}
                >
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Cargas Horárias</span>
                  <span className="sm:hidden">Horários</span>
                </Button>
                <Button 
                  size="sm"
                  className="flex items-center gap-1.5 text-xs sm:text-sm"
                  onClick={() => {
                    setDialogMode('create');
                    setSelectedEmployee(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Novo Colaborador</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              <Card className="shadow-sm border border-border">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{totalEmployees}</div>
                      <div className="text-[10px] sm:text-sm text-muted-foreground truncate">Total</div>
                    </div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Users className="text-blue-600 text-sm sm:text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{activeEmployees}</div>
                      <div className="text-[10px] sm:text-sm text-muted-foreground truncate">Ativos</div>
                    </div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <UserCheck className="text-green-600 text-sm sm:text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{newEmployees}</div>
                      <div className="text-[10px] sm:text-sm text-muted-foreground truncate">Novos</div>
                    </div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <UserPlus className="text-purple-600 text-sm sm:text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{retentionRate}%</div>
                      <div className="text-[10px] sm:text-sm text-muted-foreground truncate">Retenção</div>
                    </div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                      <Trophy className="text-orange-600 text-sm sm:text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border border-border">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col gap-3">
                  {/* First row: type filter + filters */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Tipo:</label>
                      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as unknown)}>
                        <SelectTrigger className="w-28 sm:w-36 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="humans">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              Humanos
                            </span>
                          </SelectItem>
                          <SelectItem value="agents">
                            <span className="flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5" />
                              Agentes IA
                            </span>
                          </SelectItem>
                          <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Squad:</label>
                      <Select value={teamFilter} onValueChange={setTeamFilter}>
                        <SelectTrigger className="w-28 sm:w-40 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="vacation">Férias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Cargo:</label>
                      <Input
                        placeholder="Filtrar..."
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-28 sm:w-40 h-8 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Second row: search + view toggle */}
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar colaboradores..."
                        className="pl-8 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="flex bg-muted rounded-lg p-0.5 shrink-0">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="px-2 sm:px-3 h-7 sm:h-8 text-xs"
                      >
                        <LayoutGrid className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Grid</span>
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="px-2 sm:px-3 h-7 sm:h-8 text-xs"
                      >
                        <List className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Lista</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content based on view mode */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {filteredEmployees.map((employee) => {
                  const statusConfig = getStatusBadge(employee.status);
                  const teamConfig = getTeamBadge(employee.team_id);
                  const isAgent = !!employee.ia_agent_id;
                  
                  return (
                    <Card key={employee.id} className="shadow-sm border border-border hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="relative">
                            <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                              <AvatarImage src={getEmployeeAvatar(employee)} alt={employee.name} />
                              <AvatarFallback className="text-xs sm:text-sm">{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            {isAgent && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                                <Bot className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <Badge className={statusConfig.className + " text-[10px] sm:text-xs"}>
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="mb-3 sm:mb-4 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1 truncate">{employee.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">{employee.role}</p>
                          <Badge className={teamConfig.className + " text-[10px] sm:text-xs"}>
                            {teamConfig.name}
                          </Badge>
                        </div>

                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 min-w-0">
                          <Mail className="w-3.5 h-3.5 mr-1 shrink-0" />
                          <span className="truncate">{employee.email}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-xs sm:text-sm h-7 sm:h-8"
                            onClick={() => {
                              setDialogMode('view');
                              setSelectedEmployee(employee);
                              setDialogOpen(true);
                            }}
                          >
                            Ver Perfil
                          </Button>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                              onClick={() => {
                                setDialogMode('edit');
                                setSelectedEmployee(employee);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 sm:h-8 w-7 sm:w-8 p-0">
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setResendInviteDialogOpen(true);
                                  }}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Reenviar Convite
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setResetPasswordDialogOpen(true);
                                  }}
                                >
                                  <KeyRound className="w-4 h-4 mr-2" />
                                  Gerar Nova Senha
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEmployee(employee);
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="flex-1 flex flex-col shadow-sm border border-border">
                <CardContent className="flex-1 p-3 sm:p-6 overflow-auto">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead className="hidden sm:table-cell">Squad</TableHead>
                          <TableHead className="hidden md:table-cell">Cargo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Email</TableHead>
                          <TableHead className="hidden lg:table-cell">Admissão</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => {
                          const statusConfig = getStatusBadge(employee.status);
                          const teamConfig = getTeamBadge(employee.team_id);
                          const isAgent = !!employee.ia_agent_id;
                          
                          return (
                            <TableRow key={employee.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  <div className="relative shrink-0">
                                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                                      <AvatarImage src={getEmployeeAvatar(employee)} alt={employee.name} />
                                      <AvatarFallback className="text-[10px] sm:text-xs">{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    {isAgent && (
                                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                                        <Bot className="w-2.5 h-2.5 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-medium text-foreground text-xs sm:text-sm truncate">{employee.name}</h4>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate sm:hidden">{employee.role}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge className={teamConfig.className + " text-[10px] sm:text-xs"}>
                                  {teamConfig.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-xs sm:text-sm text-muted-foreground">{employee.role}</span>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusConfig.className + " text-[10px] sm:text-xs"}>
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-xs sm:text-sm text-muted-foreground">{employee.email}</span>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  {new Date(employee.start_date).toLocaleDateString('pt-BR')}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      setDialogMode('view');
                                      setSelectedEmployee(employee);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      setDialogMode('edit');
                                      setSelectedEmployee(employee);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedEmployee(employee);
                                          setResendInviteDialogOpen(true);
                                        }}
                                      >
                                        <Send className="w-4 h-4 mr-2" />
                                        Reenviar Convite
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedEmployee(employee);
                                          setResetPasswordDialogOpen(true);
                                        }}
                                      >
                                        <KeyRound className="w-4 h-4 mr-2" />
                                        Gerar Nova Senha
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedEmployee(employee);
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
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredEmployees.length === 0 && (
              <Card className="shadow-sm border border-border">
                <CardContent className="p-8 sm:p-12 text-center">
                  <Users className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Nenhum colaborador encontrado</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {searchTerm || statusFilter !== "todos" || teamFilter !== "todos" || roleFilter || typeFilter !== "all"
                      ? "Tente ajustar os filtros para encontrar colaboradores."
                      : "Comece adicionando seu primeiro colaborador à equipe."}
                  </p>
                  {!searchTerm && statusFilter === "todos" && teamFilter === "todos" && !roleFilter && (
                    <Button
                      onClick={() => {
                        setDialogMode('create');
                        setSelectedEmployee(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Colaborador
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
        
        {/* Dialogs */}
        <EmployeeDialog
          key={`${dialogMode}-${selectedEmployee?.id || 'new'}`}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedEmployee(null);
              fetchEmployees();
            }
          }}
          onSubmit={
            dialogMode === 'create' 
              ? createEmployee 
              : dialogMode === 'edit' && selectedEmployee
                ? (employeeData) => updateEmployee(selectedEmployee.id, employeeData)
                : () => Promise.resolve(null)
          }
          employee={dialogMode === 'create' ? undefined : selectedEmployee || undefined}
          title={
            dialogMode === 'create' 
              ? "Novo Colaborador" 
              : dialogMode === 'edit' 
                ? "Editar Colaborador" 
                : "Visualizar Colaborador"
          }
          readOnly={dialogMode === 'view'}
        />
        
        <DeleteEmployeeDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={deleteEmployee}
          employee={selectedEmployee}
        />

        <ResetPasswordDialog
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
          employee={selectedEmployee}
        />

        <ResendInviteDialog
          open={resendInviteDialogOpen}
          onOpenChange={setResendInviteDialogOpen}
          employee={selectedEmployee}
        />
      </div>
    </DashboardLayout>
  );
};

export default Colaboradores;
