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
    if (!activeCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar colaboradores com suas permissões
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          email,
          role,
          employee_permissions!inner(
            id,
            employee_id,
            menu_item,
            is_enabled
          )
        `)
        .eq('company_id', activeCompany.id)
        .eq('status', 'active');

      if (employeesError) throw employeesError;

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
    if (!activeCompany?.id) {
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
        .eq('company_id', activeCompany.id)
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
        .eq('company_id', activeCompany.id)
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
    // Durante o loading, permitir acesso se for owner ou se for dashboard/tarefas
    if (permissionsLoading) {
      // Se já sabemos que é owner, libera tudo
      if (isOwner) {
        return true;
      }
      // Para outros usuários, libera apenas dashboard e tarefas durante loading
      return menuItem === 'dashboard' || menuItem === 'tarefas';
    }

    // Proprietário da empresa sempre tem acesso a tudo
    if (isOwner) {
      console.log(`Proprietário acessando ${menuItem}: true`);
      return true;
    }

    // Dashboard e tarefas são sempre acessíveis para todos os colaboradores
    if (menuItem === 'dashboard' || menuItem === 'tarefas') {
      return true;
    }
    
    const hasAccess = currentUserPermissions.includes(menuItem);
    console.log(`Permissão para ${menuItem}:`, hasAccess, 'Permissões atuais:', currentUserPermissions);
    return hasAccess;
  };

  useEffect(() => {
    if (activeCompany?.id) {
      fetchCurrentUserPermissions();
    }
  }, [activeCompany?.id]);

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