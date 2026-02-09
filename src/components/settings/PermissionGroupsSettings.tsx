import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissionGroups } from "@/hooks/usePermissionGroups";
import { useEmployeePermissions, MenuItemType } from "@/hooks/useEmployeePermissions";
import { Plus, Trash2, Users, Shield, ChevronDown, ChevronRight, Pencil, UserPlus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const MENU_ITEMS: { key: MenuItemType; label: string; category: string }[] = [
  { key: 'dashboard', label: 'Dashboard', category: 'Visão Geral' },
  { key: 'radar-saude', label: 'Radar de Saúde', category: 'Visão Geral' },
  { key: 'rotinas', label: 'Rotinas Diárias', category: 'Visão Geral' },
  { key: 'clientes', label: 'Clientes', category: 'Clientes & Leads' },
  { key: 'editor-funil', label: 'Funis', category: 'Clientes & Leads' },
  { key: 'lead-intelligence', label: 'Lead Intelligence', category: 'Clientes & Leads' },
  { key: 'cs-cockpit', label: 'CS Cockpit', category: 'Customer Success' },
  { key: 'cs-carteira', label: 'CS Carteira', category: 'Customer Success' },
  { key: 'cs-jornada', label: 'CS Jornada', category: 'Customer Success' },
  { key: 'cs-acoes', label: 'CS Ações', category: 'Customer Success' },
  { key: 'cs-clientes', label: 'CS Clientes', category: 'Customer Success' },
  { key: 'cs-tv', label: 'CS TV', category: 'Customer Success' },
  { key: 'agendamento', label: 'Agendamento', category: 'Conteúdo & Social' },
  { key: 'automatizadores', label: 'Automatizadores', category: 'Conteúdo & Social' },
  { key: 'social-tv', label: 'Dashboard TV Social', category: 'Conteúdo & Social' },
  { key: 'editor-imagens', label: 'Editor de Imagens', category: 'Conteúdo & Social' },
  { key: 'geradores', label: 'Geradores', category: 'Conteúdo & Social' },
  { key: 'gerador-campanhas', label: 'Gerador de Campanhas', category: 'Conteúdo & Social' },
  { key: 'gerador-conteudo', label: 'Gerador de Conteúdo', category: 'Conteúdo & Social' },
  { key: 'gerador-criativos', label: 'Gerador de Criativos', category: 'Conteúdo & Social' },
  { key: 'planejador-conteudo', label: 'Planejador de Conteúdo', category: 'Conteúdo & Social' },
  { key: 'repositorio-criativos', label: 'Repositório de Criativos', category: 'Conteúdo & Social' },
  { key: 'whatsapp', label: 'WhatsApp', category: 'Conteúdo & Social' },
  { key: 'automacoes', label: 'Automações', category: 'Marketing & Tráfego' },
  { key: 'campanhas', label: 'Campanhas', category: 'Marketing & Tráfego' },
  { key: 'campanhas-unificadas', label: 'Campanhas Unificadas', category: 'Marketing & Tráfego' },
  { key: 'marketing-tv', label: 'Dashboard TV Marketing', category: 'Marketing & Tráfego' },
  { key: 'keyword-planner', label: 'Keyword Planner', category: 'Marketing & Tráfego' },
  { key: 'radar-tv', label: 'Radar TV', category: 'Marketing & Tráfego' },
  { key: 'relatorios-marketing', label: 'Relatórios Marketing', category: 'Marketing & Tráfego' },
  { key: 'ia', label: 'IA Chat', category: 'Inteligência Artificial' },
  { key: 'agentes-ia', label: 'Agentes IA', category: 'Inteligência Artificial' },
  { key: 'editar-agentes', label: 'Editar Agentes', category: 'Inteligência Artificial' },
  { key: 'alertas', label: 'Alertas', category: 'Equipe & Sistema' },
  { key: 'colaboradores', label: 'Colaboradores', category: 'Equipe & Sistema' },
  { key: 'configuracoes', label: 'Configurações', category: 'Equipe & Sistema' },
  { key: 'relatorios', label: 'Relatórios', category: 'Equipe & Sistema' },
  { key: 'squad', label: 'Squad', category: 'Equipe & Sistema' },
  { key: 'tarefas', label: 'Tarefas', category: 'Equipe & Sistema' },
  { key: 'tarefas-recorrentes', label: 'Tarefas Recorrentes', category: 'Equipe & Sistema' },
  { key: 'workspace', label: 'Workspace', category: 'Equipe & Sistema' },
  { key: 'ver-quadros-outros', label: 'Ver Quadros de Outros', category: 'Especial' },
];

export function PermissionGroupsSettings() {
  const { groups, loading, createGroup, updateGroup, deleteGroup, toggleGroupItem, addMember, removeMember } = usePermissionGroups();
  const { employeesWithPermissions, fetchAllEmployeePermissions } = useEmployeePermissions();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  useEffect(() => {
    fetchAllEmployeePermissions();
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createGroup(newName.trim(), newDescription.trim());
    setNewName("");
    setNewDescription("");
    setCreateDialogOpen(false);
  };

  const handleUpdate = async (groupId: string) => {
    if (!newName.trim()) return;
    await updateGroup(groupId, newName.trim(), newDescription.trim());
    setEditingGroup(null);
    setNewName("");
    setNewDescription("");
  };

  const handleDelete = async (groupId: string, groupName: string) => {
    if (confirm(`Tem certeza que deseja excluir o grupo "${groupName}"? Todos os membros serão removidos.`)) {
      await deleteGroup(groupId);
    }
  };

  const handleAddMember = async (groupId: string) => {
    if (!selectedEmployeeId) return;
    await addMember(groupId, selectedEmployeeId);
    setSelectedEmployeeId("");
  };

  const getEmployeeName = (employeeId: string) => {
    return employeesWithPermissions.find(e => e.id === employeeId)?.name || "Desconhecido";
  };

  const getAvailableEmployees = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const memberIds = group?.members.map(m => m.employee_id) || [];
    return employeesWithPermissions.filter(e => !memberIds.includes(e.id));
  };

  const categories = [...new Set(MENU_ITEMS.map(i => i.category))];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Grupos de Permissão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos de Permissão
              </CardTitle>
              <CardDescription>
                Crie grupos com permissões predefinidas e atribua colaboradores a eles
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Grupo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Grupo de Permissão</DialogTitle>
                  <DialogDescription>Defina um nome e descrição para o grupo</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Grupo</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Gestores de Tráfego" />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descreva o propósito deste grupo..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={!newName.trim()}>Criar Grupo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum grupo de permissão criado ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">Crie um grupo para começar a organizar as permissões dos colaboradores.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                const isEditing = editingGroup === group.id;

                return (
                  <Collapsible key={group.id} open={isExpanded} onOpenChange={() => toggleExpanded(group.id)}>
                    <Card className="border border-border">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                              <Shield className="h-8 w-8 text-primary" />
                              <div>
                                <h3 className="font-medium">{group.name}</h3>
                                {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
                              </div>
                              <Badge variant="outline">{group.items.length} permissões</Badge>
                              <Badge variant="secondary">{group.members.length} membros</Badge>
                            </div>
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditingGroup(group.id);
                                setNewName(group.name);
                                setNewDescription(group.description || "");
                              }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(group.id, group.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {/* Edit dialog */}
                          <Dialog open={isEditing} onOpenChange={open => { if (!open) setEditingGroup(null); }}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Grupo</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div><Label>Nome</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                                <div><Label>Descrição</Label><Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} /></div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingGroup(null)}>Cancelar</Button>
                                <Button onClick={() => handleUpdate(group.id)} disabled={!newName.trim()}>Salvar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Tabs defaultValue="permissions" className="w-full">
                            <TabsList className="mb-4">
                              <TabsTrigger value="permissions">Permissões</TabsTrigger>
                              <TabsTrigger value="members">Membros ({group.members.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="permissions">
                              <div className="space-y-4">
                                {categories.map(category => {
                                  const categoryItems = MENU_ITEMS.filter(i => i.category === category);
                                  return (
                                    <div key={category}>
                                      <h4 className="text-sm font-semibold text-muted-foreground border-b border-border pb-1 mb-3">{category}</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {categoryItems.map(item => (
                                          <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                                            <Label htmlFor={`${group.id}-${item.key}`} className="text-sm font-medium cursor-pointer">
                                              {item.label}
                                            </Label>
                                            <Switch
                                              id={`${group.id}-${item.key}`}
                                              checked={group.items.includes(item.key)}
                                              onCheckedChange={() => toggleGroupItem(group.id, item.key)}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </TabsContent>

                            <TabsContent value="members">
                              <div className="space-y-4">
                                {/* Add member */}
                                <div className="flex gap-2">
                                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Selecione um colaborador..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableEmployees(group.id).map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                          {emp.name} ({emp.role})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button onClick={() => handleAddMember(group.id)} disabled={!selectedEmployeeId}
                                    className="flex items-center gap-2"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                    Adicionar
                                  </Button>
                                </div>

                                {/* Members list */}
                                {group.members.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro neste grupo.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {group.members.map(member => {
                                      const emp = employeesWithPermissions.find(e => e.id === member.employee_id);
                                      return (
                                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                              <AvatarFallback className="text-xs">
                                                {(emp?.name || "?").split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <p className="text-sm font-medium">{emp?.name || "Desconhecido"}</p>
                                              <p className="text-xs text-muted-foreground">{emp?.email}</p>
                                            </div>
                                            {emp?.role && <Badge variant="secondary" className="text-xs">{emp.role}</Badge>}
                                          </div>
                                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMember(group.id, member.employee_id)}>
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
