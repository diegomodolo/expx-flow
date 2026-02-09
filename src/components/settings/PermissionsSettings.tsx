import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployeePermissions, MenuItemType } from "@/hooks/useEmployeePermissions";
import { Search, RotateCcw, Shield, ChevronDown, ChevronRight, Users } from "lucide-react";
import { PermissionGroupsSettings } from "./PermissionGroupsSettings";
import { useToast } from "@/hooks/use-toast";

const MENU_ITEMS: { key: MenuItemType; label: string; description: string; category: string }[] = [
  // Visão Geral
  { key: 'dashboard', label: 'Dashboard', description: 'Página inicial e visão geral', category: 'Visão Geral' },
  { key: 'radar-saude', label: 'Radar de Saúde', description: 'Monitoramento de saúde dos clientes', category: 'Visão Geral' },
  { key: 'rotinas', label: 'Rotinas Diárias', description: 'Checklists e rotinas operacionais', category: 'Visão Geral' },
  // Clientes & Leads
  { key: 'clientes', label: 'Clientes', description: 'Gestão de clientes', category: 'Clientes & Leads' },
  { key: 'editor-funil', label: 'Funis', description: 'Editor e visualização de funis de conversão', category: 'Clientes & Leads' },
  { key: 'lead-intelligence', label: 'Lead Intelligence', description: 'Inteligência e enriquecimento de leads', category: 'Clientes & Leads' },
  // Customer Success
  { key: 'cs-cockpit', label: 'CS Cockpit', description: 'Painel geral de Customer Success', category: 'Customer Success' },
  { key: 'cs-carteira', label: 'CS Carteira', description: 'Carteira de clientes do CS', category: 'Customer Success' },
  { key: 'cs-jornada', label: 'CS Jornada', description: 'Jornada do cliente', category: 'Customer Success' },
  { key: 'cs-acoes', label: 'CS Ações', description: 'Ações de Customer Success', category: 'Customer Success' },
  { key: 'cs-clientes', label: 'CS Clientes', description: 'Lista de clientes CS', category: 'Customer Success' },
  { key: 'cs-tv', label: 'CS TV', description: 'Dashboard TV de Customer Success', category: 'Customer Success' },
  // Conteúdo & Social
  { key: 'agendamento', label: 'Agendamento', description: 'Agendamento de publicações', category: 'Conteúdo & Social' },
  { key: 'automatizadores', label: 'Automatizadores', description: 'Automações de conteúdo', category: 'Conteúdo & Social' },
  { key: 'social-tv', label: 'Dashboard TV Social', description: 'Dashboard TV de redes sociais', category: 'Conteúdo & Social' },
  { key: 'editor-imagens', label: 'Editor de Imagens', description: 'Edição e criação de imagens', category: 'Conteúdo & Social' },
  { key: 'geradores', label: 'Geradores', description: 'Menu de ferramentas de geração', category: 'Conteúdo & Social' },
  { key: 'gerador-campanhas', label: 'Gerador de Campanhas', description: 'Criação de campanhas com IA', category: 'Conteúdo & Social' },
  { key: 'gerador-conteudo', label: 'Gerador de Conteúdo', description: 'Criação de conteúdo com IA', category: 'Conteúdo & Social' },
  { key: 'gerador-criativos', label: 'Gerador de Criativos', description: 'Criação de criativos visuais com IA', category: 'Conteúdo & Social' },
  { key: 'planejador-conteudo', label: 'Planejador de Conteúdo', description: 'Planejamento de conteúdo', category: 'Conteúdo & Social' },
  { key: 'repositorio-criativos', label: 'Repositório de Criativos', description: 'Biblioteca de criativos', category: 'Conteúdo & Social' },
  { key: 'whatsapp', label: 'WhatsApp', description: 'Módulo de notificações WhatsApp', category: 'Conteúdo & Social' },
  // Marketing & Tráfego
  { key: 'automacoes', label: 'Automações', description: 'Automações de campanhas', category: 'Marketing & Tráfego' },
  { key: 'campanhas', label: 'Campanhas', description: 'Gestão de campanhas publicitárias', category: 'Marketing & Tráfego' },
  { key: 'campanhas-unificadas', label: 'Campanhas Unificadas', description: 'Visão unificada de campanhas', category: 'Marketing & Tráfego' },
  { key: 'marketing-tv', label: 'Dashboard TV Marketing', description: 'Dashboard TV de marketing', category: 'Marketing & Tráfego' },
  { key: 'keyword-planner', label: 'Keyword Planner', description: 'Planejador de palavras-chave', category: 'Marketing & Tráfego' },
  { key: 'radar-tv', label: 'Radar TV', description: 'Dashboard TV de radar', category: 'Marketing & Tráfego' },
  { key: 'relatorios-marketing', label: 'Relatórios Marketing', description: 'Relatórios de marketing', category: 'Marketing & Tráfego' },
  // Inteligência Artificial
  { key: 'ia', label: 'IA Chat', description: 'Chat com inteligência artificial', category: 'Inteligência Artificial' },
  { key: 'agentes-ia', label: 'Agentes IA', description: 'Acesso ao menu de Agentes de IA', category: 'Inteligência Artificial' },
  { key: 'editar-agentes', label: 'Editar Agentes', description: 'Criar, editar, duplicar e excluir agentes', category: 'Inteligência Artificial' },
  // Equipe & Sistema
  { key: 'alertas', label: 'Alertas', description: 'Alertas e notificações do sistema', category: 'Equipe & Sistema' },
  { key: 'colaboradores', label: 'Colaboradores', description: 'Gestão de funcionários', category: 'Equipe & Sistema' },
  { key: 'configuracoes', label: 'Configurações', description: 'Configurações do sistema', category: 'Equipe & Sistema' },
  { key: 'relatorios', label: 'Relatórios', description: 'Relatórios e análises gerais', category: 'Equipe & Sistema' },
  { key: 'squad', label: 'Squad', description: 'Gestão de equipes', category: 'Equipe & Sistema' },
  { key: 'tarefas', label: 'Tarefas', description: 'Gerenciamento de tarefas', category: 'Equipe & Sistema' },
  { key: 'tarefas-recorrentes', label: 'Tarefas Recorrentes', description: 'Tarefas repetitivas automáticas', category: 'Equipe & Sistema' },
  { key: 'workspace', label: 'Workspace', description: 'Área de trabalho e anotações', category: 'Equipe & Sistema' },
  // Permissões especiais
  { key: 'ver-quadros-outros', label: 'Ver Quadros de Outros', description: 'Visualizar quadro de tarefas de outros colaboradores', category: 'Especial' },
];

export function PermissionsSettings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
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

  const toggleCardExpanded = (employeeId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

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

  const getPermissionCount = (employeeId: string) => {
    const employee = employeesWithPermissions.find(emp => emp.id === employeeId);
    const enabledCount = employee?.permissions.filter(p => p.is_enabled).length || 0;
    return enabledCount;
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
      <Tabs defaultValue="individual" className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissões de Acesso
            </CardTitle>
            <CardDescription>
              Gerencie permissões individuais ou por grupos
            </CardDescription>
            <TabsList className="mt-4">
              <TabsTrigger value="groups" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Grupos de Permissão
              </TabsTrigger>
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissões Individuais
              </TabsTrigger>
            </TabsList>
          </CardHeader>
        </Card>

        <TabsContent value="groups">
          <PermissionGroupsSettings />
        </TabsContent>

        <TabsContent value="individual">
          <Card>
            <CardContent className="pt-6">
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
              <div className="space-y-4">
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
                  filteredEmployees.map((employee) => {
                    const isExpanded = expandedCards.has(employee.id);
                    const permissionCount = getPermissionCount(employee.id);
                    
                    return (
                      <Collapsible
                        key={employee.id}
                        open={isExpanded}
                        onOpenChange={() => toggleCardExpanded(employee.id)}
                      >
                        <Card className="border border-border">
                          <CollapsibleTrigger asChild>
                            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                  )}
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
                                  <Badge variant="outline" className="ml-2">
                                    {permissionCount} permissões ativas
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetPermissions(employee.id, employee.name);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Resetar
                                </Button>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="space-y-4">
                              {(() => {
                                const categories = [...new Set(MENU_ITEMS.map(item => item.category))];
                                return categories.map(category => {
                                  const categoryItems = MENU_ITEMS.filter(item => item.category === category);
                                  return (
                                    <div key={category} className="col-span-full space-y-3">
                                      <h4 className="text-sm font-semibold text-muted-foreground border-b border-border pb-1 pt-2">{category}</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {categoryItems.map((menuItem) => {
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
                                    </div>
                                  );
                                });
                              })()}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}