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
  | 'configuracoes';

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
      console.log('No active company_id found:', activeCompany);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching employees for company:', activeCompany.company_id);

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

      console.log('Fetched employees:', employees);

      const employeesWithPerms: EmployeeWithPermissions[] = employees?.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        permissions: emp.employee_permissions || []
      })) || [];

      console.log('Employees with permissions:', employeesWithPerms);
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
      console.log('No active company_id for current user permissions');
      setPermissionsLoading(false);
      return;
    }

    try {
      setPermissionsLoading(true);
      console.log('Buscando permissões para empresa:', activeCompany.id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('Usuário não encontrado');
        setPermissionsLoading(false);
        return;
      }

      console.log('Usuário encontrado:', user.id);

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
      console.log('É proprietário?', userIsOwner, 'Role:', member?.role);
      
      setIsOwner(userIsOwner);

      // Se for proprietário, não precisa verificar permissões específicas
      if (userIsOwner) {
        const allPermissions: MenuItemType[] = ['dashboard', 'clientes', 'campanhas', 'squad', 'tarefas', 'colaboradores', 'relatorios', 'gerador-campanhas', 'configuracoes'];
        setCurrentUserPermissions(allPermissions);
        console.log('Proprietário - definindo todas as permissões:', allPermissions);
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
        console.log('Colaborador não encontrado');
        setPermissionsLoading(false);
        return;
      }

      console.log('Colaborador encontrado:', employee.id);

      // Buscar permissões habilitadas
      const { data: permissions } = await supabase
        .from('employee_permissions')
        .select('menu_item')
        .eq('employee_id', employee.id)
        .eq('is_enabled', true);

      const enabledMenus = permissions?.map(p => p.menu_item as MenuItemType) || [];
      console.log('Permissões do colaborador:', enabledMenus);
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
      // Primeiro buscar o valor atual
      const { data: currentPerm } = await supabase
        .from('employee_permissions')
        .select('is_enabled')
        .eq('employee_id', employeeId)
        .eq('menu_item', menuItem)
        .single();

      // Alternar o valor
      const { error } = await supabase
        .from('employee_permissions')
        .update({ 
          is_enabled: !currentPerm?.is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('menu_item', menuItem);

      if (error) throw error;

      // Atualizar estado local
      setEmployeesWithPermissions(prev => 
        prev.map(emp => {
          if (emp.id === employeeId) {
            return {
              ...emp,
              permissions: emp.permissions.map(perm => 
                perm.menu_item === menuItem 
                  ? { ...perm, is_enabled: !perm.is_enabled }
                  : perm
              )
            };
          }
          return emp;
        })
      );

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
    console.log('hasPermission check:', { 
      menuItem, 
      isOwner, 
      permissionsLoading, 
      activeCompany: activeCompany?.id,
      companyRole: activeCompany?.role
    });
    
    // Check if user is owner directly from company context
    const isOwnerFromContext = activeCompany?.role === 'owner';
    
    // Owners have access to everything - check both sources
    if (isOwner || isOwnerFromContext) {
      console.log(`Owner accessing ${menuItem}: true (isOwner: ${isOwner}, contextRole: ${activeCompany?.role})`);
      return true;
    }
    
    // During loading, only allow dashboard and tarefas for non-owners
    if (permissionsLoading) {
      console.log(`Loading state - allowing basic access for ${menuItem}:`, menuItem === 'dashboard' || menuItem === 'tarefas');
      return menuItem === 'dashboard' || menuItem === 'tarefas';
    }

    // Dashboard e tarefas são sempre acessíveis para todos os colaboradores
    if (menuItem === 'dashboard' || menuItem === 'tarefas') {
      return true;
    }
    
    const hasAccess = currentUserPermissions.includes(menuItem);
    console.log(`Permission for ${menuItem}:`, hasAccess, 'Current permissions:', currentUserPermissions);
    return hasAccess;
  };

  useEffect(() => {
    if (activeCompany?.company_id) {
      console.log('Active company changed, fetching permissions for:', activeCompany.company_id);
      fetchCurrentUserPermissions();
    }
  }, [activeCompany?.company_id]);

  return {
    employeesWithPermissions,
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