import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEmployeePermissions, MenuItemType } from "@/hooks/useEmployeePermissions";
import { Search, RotateCcw, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MENU_ITEMS: { key: MenuItemType; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Página inicial e visão geral' },
  { key: 'clientes', label: 'Clientes', description: 'Gestão de clientes' },
  { key: 'campanhas', label: 'Campanhas', description: 'Gestão de campanhas publicitárias' },
  { key: 'squad', label: 'Squad', description: 'Gestão de equipes' },
  { key: 'tarefas', label: 'Tarefas', description: 'Gerenciamento de tarefas' },
  { key: 'colaboradores', label: 'Colaboradores', description: 'Gestão de funcionários' },
  { key: 'relatorios', label: 'Relatórios', description: 'Relatórios e análises' },
  { key: 'gerador-campanhas', label: 'Gerador de Campanhas', description: 'Ferramenta de criação de campanhas' },
  { key: 'gerador-conteudo', label: 'Gerador de Conteúdo', description: 'Ferramenta de criação de conteúdo com IA' },
  { key: 'ia', label: 'IA Chat', description: 'Chat com inteligência artificial' },
  { key: 'configuracoes', label: 'Configurações', description: 'Configurações do sistema' },
];

export function PermissionsSettings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { toast } = useToast();
  
  const {
    employeesWithPermissions,
    loading,
    error,
    fetchAllEmployeePermissions,
    togglePermission,
    resetToDefaultPermissions,
  } = useEmployeePermissions();

  useEffect(() => {
    fetchAllEmployeePermissions();
  }, []);

  const filteredEmployees = employeesWithPermissions.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getUniqueRoles = () => {
    const roles = employeesWithPermissions.map(emp => emp.role);
    return Array.from(new Set(roles));
  };

  const getPermissionValue = (employeeId: string, menuItem: MenuItemType) => {
    const employee = employeesWithPermissions.find(emp => emp.id === employeeId);
    const permission = employee?.permissions.find(p => p.menu_item === menuItem);
    return permission?.is_enabled || false;
  };

  const handleTogglePermission = async (employeeId: string, menuItem: MenuItemType) => {
    await togglePermission(employeeId, menuItem);
  };

  const handleResetPermissions = async (employeeId: string, employeeName: string) => {
    if (confirm(`Tem certeza que deseja resetar as permissões de ${employeeName} para o padrão básico?`)) {
      await resetToDefaultPermissions(employeeId);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões
          </CardTitle>
          <CardDescription>
            Gerencie as permissões de acesso dos colaboradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Erro ao carregar permissões: {error}</p>
            <Button onClick={fetchAllEmployeePermissions} className="mt-4">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões de Acesso
          </CardTitle>
          <CardDescription>
            Gerencie quais seções do sistema cada colaborador pode acessar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {getUniqueRoles().map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de colaboradores */}
          <div className="space-y-6">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm || roleFilter !== "all" 
                    ? "Nenhum colaborador encontrado com os filtros aplicados"
                    : "Nenhum colaborador cadastrado"
                  }
                </p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <Card key={employee.id} className="border border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" alt={employee.name} />
                          <AvatarFallback>
                            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{employee.name}</h3>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                        <Badge variant="secondary">{employee.role}</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPermissions(employee.id, employee.name)}
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Resetar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {MENU_ITEMS.map((menuItem) => {
                        const isEnabled = getPermissionValue(employee.id, menuItem.key);
                        const isDefaultPermission = menuItem.key === 'dashboard' || menuItem.key === 'tarefas';
                        
                        return (
                          <div
                            key={menuItem.key}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isDefaultPermission ? 'bg-muted/30' : ''
                            }`}
                          >
                            <div className="flex-1">
                              <Label
                                htmlFor={`${employee.id}-${menuItem.key}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {menuItem.label}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                {menuItem.description}
                              </p>
                              {isDefaultPermission && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Padrão
                                </Badge>
                              )}
                            </div>
                            <Switch
                              id={`${employee.id}-${menuItem.key}`}
                              checked={isEnabled}
                              onCheckedChange={() => handleTogglePermission(employee.id, menuItem.key)}
                              disabled={isDefaultPermission}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}