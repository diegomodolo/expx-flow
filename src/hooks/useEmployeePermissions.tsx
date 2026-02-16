import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

export type MenuItemType = 
  | 'dashboard' 
  | 'clientes' 
  | 'campanhas' 
  | 'squad'
  | 'tarefas'
  | 'colaboradores'
  | 'relatorios'
  | 'gerador-campanhas'
  | 'gerador-conteudo'
  | 'gerador-criativos'
  | 'geradores'
  | 'ia'
  | 'configuracoes'
  | 'agentes-ia'
  | 'editar-agentes'
  | 'editor-funil'
  | 'whatsapp'
  | 'ver-quadros-outros'
  | 'radar-saude'
  | 'rotinas'
  | 'lead-intelligence'
  | 'cs-cockpit'
  | 'cs-carteira'
  | 'cs-jornada'
  | 'cs-acoes'
  | 'cs-clientes'
  | 'cs-tv'
  | 'agendamento'
  | 'automatizadores'
  | 'social-tv'
  | 'editor-imagens'
  | 'planejador-conteudo'
  | 'repositorio-criativos'
  | 'alertas'
  | 'tarefas-recorrentes'
  | 'workspace'
  | 'automacoes'
  | 'campanhas-unificadas'
  | 'marketing-tv'
  | 'keyword-planner'
  | 'radar-tv'
  | 'relatorios-marketing'
  | 'skills-ia'
  | 'editar-skills'
  | 'roteiros'
  | 'command-center';

export interface EmployeePermission {
  id: string;
  employee_id: string;
  menu_item: MenuItemType;
  is_enabled: boolean;
}

export interface EmployeeWithPermissions {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: EmployeePermission[];
}

export function useEmployeePermissions() {
  const [employeesWithPermissions, setEmployeesWithPermissions] = useState<EmployeeWithPermissions[]>([]);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<MenuItemType[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  // Buscar todas as permissões dos colaboradores (para administradores)
  const fetchAllEmployeePermissions = async () => {
    // Use company_id instead of id
    if (!activeCompany?.company_id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar colaboradores com suas permissões (LEFT JOIN para incluir colaboradores sem permissões)
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          email,
          role,
          employee_permissions(
            id,
            employee_id,
            menu_item,
            is_enabled
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('status', 'active');

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }

      const employeesWithPerms: EmployeeWithPermissions[] = employees?.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        permissions: emp.employee_permissions || []
      })) || [];
      setEmployeesWithPermissions(employeesWithPerms);
    } catch (err: any) {
      console.error('Erro ao buscar permissões:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Buscar permissões do usuário atual
  const fetchCurrentUserPermissions = async () => {
    if (!activeCompany?.company_id) {
      setPermissionsLoading(false);
      return;
    }

    try {
      setPermissionsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissionsLoading(false);
        return;
      }

      // Verificar se é proprietário da empresa
      const { data: member, error: memberError } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.company_id)
        .single();

      if (memberError) {
        console.error('Erro ao buscar membro da empresa:', memberError);
      }

      const userIsOwner = member?.role === 'owner';
      
      setIsOwner(userIsOwner);

      // Se for proprietário, não precisa verificar permissões específicas
      if (userIsOwner) {
        const allPermissions: MenuItemType[] = [
          'dashboard', 'clientes', 'campanhas', 'squad', 'tarefas', 'colaboradores', 'relatorios',
          'gerador-campanhas', 'gerador-conteudo', 'gerador-criativos', 'geradores', 'ia', 'configuracoes',
          'agentes-ia', 'editar-agentes', 'editor-funil', 'whatsapp', 'ver-quadros-outros',
          'radar-saude', 'rotinas', 'lead-intelligence', 'cs-cockpit', 'cs-carteira', 'cs-jornada',
          'cs-acoes', 'cs-clientes', 'cs-tv', 'agendamento', 'automatizadores', 'social-tv',
          'editor-imagens', 'planejador-conteudo', 'repositorio-criativos', 'alertas', 'tarefas-recorrentes',
          'workspace', 'automacoes', 'campanhas-unificadas', 'marketing-tv', 'keyword-planner', 'radar-tv',
          'relatorios-marketing', 'skills-ia', 'editar-skills', 'roteiros', 'command-center'
        ];
        setCurrentUserPermissions(allPermissions);
        setPermissionsLoading(false);
        return;
      }

      // Buscar colaborador atual
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.company_id)
        .single();

      if (!employee) {
        setPermissionsLoading(false);
        return;
      }

      // Buscar permissões habilitadas (individuais)
      const { data: permissions } = await supabase
        .from('employee_permissions')
        .select('menu_item')
        .eq('employee_id', employee.id)
        .eq('is_enabled', true);

      const individualMenus = permissions?.map(p => p.menu_item as MenuItemType) || [];

      // Buscar permissões de grupos
      const { data: groupMemberships } = await supabase
        .from('permission_group_members')
        .select('group_id')
        .eq('employee_id', employee.id);

      let groupMenus: MenuItemType[] = [];
      if (groupMemberships && groupMemberships.length > 0) {
        const groupIds = groupMemberships.map(gm => gm.group_id);
        const { data: groupItems } = await supabase
          .from('permission_group_items')
          .select('menu_item')
          .in('group_id', groupIds);
        
        groupMenus = groupItems?.map(gi => gi.menu_item as MenuItemType) || [];
      }

      // Merge individual + group permissions (union)
      const enabledMenus = [...new Set([...individualMenus, ...groupMenus])];
      setCurrentUserPermissions(enabledMenus);
    } catch (err: any) {
      console.error('Erro ao buscar permissões do usuário atual:', err);
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Alternar permissão de um colaborador
  const togglePermission = async (employeeId: string, menuItem: MenuItemType) => {
    try {
      console.log('Toggling permission:', { employeeId, menuItem });
      
      // Primeiro buscar o valor atual
      const { data: currentPerm } = await supabase
        .from('employee_permissions')
        .select('is_enabled')
        .eq('employee_id', employeeId)
        .eq('menu_item', menuItem as any)
        .single();

      console.log('Current permission:', currentPerm);

      // Se não existir a permissão, criar primeiro
      if (!currentPerm) {
        const { error: insertError } = await supabase
          .from('employee_permissions')
          .insert({
            employee_id: employeeId,
            company_id: activeCompany?.company_id,
            menu_item: menuItem as any,
            is_enabled: true
          } as any);

        if (insertError) {
          console.error('Error inserting permission:', insertError);
          throw insertError;
        }

        console.log('Permission created and enabled');
        
        // Atualizar estado local
        setEmployeesWithPermissions(prev => 
          prev.map(emp => {
            if (emp.id === employeeId) {
              return {
                ...emp,
                permissions: [...emp.permissions, {
                  id: `new-${employeeId}-${menuItem}`,
                  employee_id: employeeId,
                  menu_item: menuItem,
                  is_enabled: true
                }]
              };
            }
            return emp;
          })
        );
      } else {
        // Alternar o valor existente
        const newValue = !currentPerm.is_enabled;
        console.log('Updating to:', newValue);
        
        const { error } = await supabase
          .from('employee_permissions')
          .update({ 
            is_enabled: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employeeId)
          .eq('menu_item', menuItem as any);

        if (error) {
          console.error('Error updating permission:', error);
          throw error;
        }

        console.log('Permission updated successfully');

        // Atualizar estado local
        setEmployeesWithPermissions(prev => 
          prev.map(emp => {
            if (emp.id === employeeId) {
              return {
                ...emp,
                permissions: emp.permissions.map(perm => 
                  perm.menu_item === menuItem 
                    ? { ...perm, is_enabled: newValue }
                    : perm
                )
              };
            }
            return emp;
          })
        );
      }

      toast({
        title: "Permissão atualizada",
        description: "A permissão foi alterada com sucesso.",
      });
    } catch (err: any) {
      console.error('Erro ao alterar permissão:', err);
      toast({
        title: "Erro",
        description: "Erro ao alterar permissão: " + err.message,
        variant: "destructive",
      });
    }
  };

  // Resetar permissões para o padrão
  const resetToDefaultPermissions = async (employeeId: string) => {
    try {
      // Desabilitar todas as permissões
      await supabase
        .from('employee_permissions')
        .update({ is_enabled: false })
        .eq('employee_id', employeeId);

      // Habilitar apenas dashboard e tarefas
      await supabase
        .from('employee_permissions')
        .update({ is_enabled: true })
        .eq('employee_id', employeeId)
        .in('menu_item', ['dashboard', 'tarefas']);

      await fetchAllEmployeePermissions();

      toast({
        title: "Permissões resetadas",
        description: "As permissões foram resetadas para o padrão.",
      });
    } catch (err: any) {
      console.error('Erro ao resetar permissões:', err);
      toast({
        title: "Erro",
        description: "Erro ao resetar permissões: " + err.message,
        variant: "destructive",
      });
    }
  };

  // Verificar se usuário tem permissão para acessar um menu
  const hasPermission = (menuItem: MenuItemType): boolean => {
    // Check if user is owner directly from company context
    const isOwnerFromContext = activeCompany?.role === 'owner';
    
    // Owners have access to everything - check both sources
    if (isOwner || isOwnerFromContext) {
      return true;
    }
    
    // During loading, only allow dashboard and tarefas for non-owners
    if (permissionsLoading) {
      return menuItem === 'dashboard' || menuItem === 'tarefas';
    }

    // Dashboard e tarefas são sempre acessíveis para todos os colaboradores
    if (menuItem === 'dashboard' || menuItem === 'tarefas') {
      return true;
    }
    
    const hasAccess = currentUserPermissions.includes(menuItem);
    return hasAccess;
  };

  useEffect(() => {
    if (activeCompany?.company_id) {
      fetchCurrentUserPermissions();
    }
  }, [activeCompany?.company_id]);

  return {
    employeesWithPermissions,
    currentUserPermissions,
    isOwner,
    loading,
    permissionsLoading,
    error,
    fetchAllEmployeePermissions,
    fetchCurrentUserPermissions,
    togglePermission,
    resetToDefaultPermissions,
    hasPermission,
  };
}