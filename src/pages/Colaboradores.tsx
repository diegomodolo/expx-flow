import { useState } from "react";
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
  Phone
} from "lucide-react";

const Colaboradores = () => {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [teamFilter, setTeamFilter] = useState("todos");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  
  const { employees, loading, error, createEmployee, updateEmployee, deleteEmployee, fetchEmployees } = useEmployees();
  const { teams } = useTeams();
  const { toast } = useToast();

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
    return matchesStatus && matchesTeam && matchesRole && matchesSearch;
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
    
    // Cores diferentes para cada squad
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
            <span className="ml-2">Carregando colaboradores...</span>
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
                  <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Colaboradores</h1>
                  <p className="text-gray-600">Gerencie a equipe e acompanhe o desempenho dos colaboradores</p>
                </div>
              </div>
              <Button 
                className="flex items-center space-x-2"
                onClick={() => {
                  setDialogMode('create');
                  setSelectedEmployee(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Novo Colaborador</span>
              </Button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalEmployees}</div>
                      <div className="text-sm text-gray-600">Total de Colaboradores</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{activeEmployees}</div>
                      <div className="text-sm text-gray-600">Colaboradores Ativos</div>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserCheck className="text-green-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{newEmployees}</div>
                      <div className="text-sm text-gray-600">Novos Colaboradores</div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="text-purple-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{retentionRate}%</div>
                      <div className="text-sm text-gray-600">Taxa de Retenção</div>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Trophy className="text-orange-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Squad:</label>
                      <Select value={teamFilter} onValueChange={setTeamFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Todos os Squads" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os Squads</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Status:</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32">
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

                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Cargo:</label>
                      <Input
                        placeholder="Filtrar por cargo..."
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="text"
                        placeholder="Buscar colaboradores..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="px-3"
                      >
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        Grid
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="px-3"
                      >
                        <List className="w-4 h-4 mr-2" />
                        Lista
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content based on view mode */}
            {viewMode === 'grid' ? (
              // Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEmployees.map((employee) => {
                  const statusConfig = getStatusBadge(employee.status);
                  const teamConfig = getTeamBadge(employee.team_id);
                  
                  return (
                    <Card key={employee.id} className="shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={employee.avatar} alt={employee.name} />
                            <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <Badge className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="mb-4">
                          <h3 className="font-semibold text-gray-900 mb-1">{employee.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{employee.role}</p>
                          <Badge className={teamConfig.className}>
                            {teamConfig.name}
                          </Badge>
                        </div>

                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <Mail className="w-4 h-4 mr-1" />
                          <span className="truncate">{employee.email}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setDialogMode('view');
                              setSelectedEmployee(employee);
                              setDialogOpen(true);
                            }}
                          >
                            Ver Perfil
                          </Button>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDialogMode('edit');
                                setSelectedEmployee(employee);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
              // List View
              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Squad</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Data de Admissão</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => {
                          const statusConfig = getStatusBadge(employee.status);
                          const teamConfig = getTeamBadge(employee.team_id);
                          
                          return (
                            <TableRow key={employee.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={employee.avatar} alt={employee.name} />
                                    <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-sm">{employee.name}</h4>
                                    <p className="text-xs text-gray-600">{employee.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={teamConfig.className}>
                                  {teamConfig.name}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-700">{employee.role}</span>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusConfig.className}>
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-700">{employee.email}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-700">
                                  {new Date(employee.start_date).toLocaleDateString('pt-BR')}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDialogMode('view');
                                      setSelectedEmployee(employee);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDialogMode('edit');
                                      setSelectedEmployee(employee);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEmployee(employee);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
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
              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum colaborador encontrado</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || statusFilter !== "todos" || teamFilter !== "todos" || roleFilter
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
      </div>
    </DashboardLayout>
  );
};

export default Colaboradores;