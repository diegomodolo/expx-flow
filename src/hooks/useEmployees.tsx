import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  team_id?: string;
  status: 'active' | 'inactive' | 'vacation';
  start_date: string;
  skills?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
  // Relacionamento com team
  team?: {
    id: string;
    name: string;
  };
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchEmployees = async () => {
    if (!user || !activeCompany) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          team:teams(id, name)
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees((data || []) as Employee[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar colaboradores");
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: Omit<Employee, "id" | "created_at" | "updated_at" | "team">) => {
    if (!user || !activeCompany) {
      setError("Usuário não autenticado ou empresa não selecionada");
      return null;
    }

    try {
      setError(null);
      
      // Verificar se o usuário tem permissões para criar colaboradores
      const { data: userRole, error: roleError } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.company_id)
        .single();

      if (roleError || !userRole || !['owner', 'admin'].includes(userRole.role)) {
        throw new Error("Você não tem permissão para criar colaboradores. Apenas owners e admins podem realizar esta ação.");
      }
      
      // Gerar senha temporária
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      
      // 1. Verificar se o usuário já existe através de uma busca na tabela employees
      const { data: existingEmployee, error: searchError } = await supabase
        .from('employees')
        .select('id, user_id')
        .eq('email', employeeData.email)
        .eq('company_id', activeCompany.company_id)
        .maybeSingle();

      if (searchError) {
        throw new Error(`Erro ao verificar colaborador existente: ${searchError.message}`);
      }

      if (existingEmployee) {
        throw new Error("Este email já está cadastrado como colaborador na empresa");
      }

      let userId: string;
      let isNewUser = true;

      // 2. Verificar se usuário já existe através da edge function
      try {
        const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-user', {
          body: { email: employeeData.email }
        });

        if (checkError) {
          console.log("Erro ao verificar usuário:", checkError);
        }

        if (checkResult && checkResult.exists) {
          userId = checkResult.user_id;
          isNewUser = false;
        } else {
          // Criar novo usuário usando edge function para não afetar sessão atual
          const { data: createResult, error: createError } = await supabase.functions.invoke('create-employee-user', {
            body: {
              email: employeeData.email,
              name: employeeData.name,
              password: tempPassword,
              companyId: activeCompany.company_id,
              companyName: activeCompany.company?.name || 'Nossa Empresa'
            }
          });

          if (createError) {
            throw new Error(`Erro ao criar usuário: ${createError.message}`);
          }

          if (!createResult || !createResult.user_id) {
            throw new Error("Erro ao criar usuário: dados não retornados");
          }

          userId = createResult.user_id;
          isNewUser = true;
        }
      } catch (authErr) {
        console.warn("Erro na criação de usuário:", authErr);
        throw new Error("Erro ao processar criação de usuário");
      }

      // 3. Criar registro de colaborador com company_id correto
      const employeeInsertData = {
        name: employeeData.name,
        email: employeeData.email,
        phone: employeeData.phone,
        role: employeeData.role,
        team_id: employeeData.team_id === "sem-squad" ? null : employeeData.team_id,
        status: employeeData.status,
        start_date: employeeData.start_date,
        skills: employeeData.skills,
        avatar: employeeData.avatar,
        user_id: userId,
        company_id: activeCompany.company_id,
      };

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .insert([employeeInsertData])
        .select()
        .single();

      if (employeeError) {
        throw new Error(`Erro ao criar colaborador: ${employeeError.message}`);
      }

      // 4. Criar registro de colaborador (user_id já foi criado pela edge function)
      // Não precisa adicionar à company_members pois a edge function já fez isso

      // 5. Mostrar mensagem de sucesso
      if (isNewUser) {
        toast({
          title: "Colaborador criado com sucesso",
          description: "O novo colaborador foi criado e recebeu as credenciais por email.",
        });
      } else {
        toast({
          title: "Colaborador vinculado",
          description: "Usuário existente foi vinculado à empresa como colaborador.",
        });
      }

      await fetchEmployees();
      return employee;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar colaborador";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchEmployees(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar colaborador");
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchEmployees(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar colaborador");
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user, activeCompany]);

  return {
    employees,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
}