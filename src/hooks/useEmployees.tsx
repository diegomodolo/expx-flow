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
      
      // 1. Verificar se o colaborador já existe na empresa atual
      console.log("Verificando colaborador existente para email:", employeeData.email);
      const { data: existingEmployee, error: searchError } = await supabase
        .from('employees')
        .select('id, user_id, email')
        .eq('email', employeeData.email)
        .eq('company_id', activeCompany.company_id)
        .maybeSingle();

      if (searchError) {
        console.error("Erro ao verificar colaborador existente:", searchError);
        // Não falhar aqui, apenas avisar
      }

      if (existingEmployee) {
        console.log("Colaborador já existe:", existingEmployee);
        throw new Error("Este email já está cadastrado como colaborador na empresa");
      }

      console.log("Colaborador não existe na empresa, prosseguindo...");

      let userId: string;
      let isNewUser = true;

      // 2. Verificar se usuário já existe na plataforma (qualquer empresa)
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-user', {
        body: { email: employeeData.email }
      });

      if (checkError) {
        console.warn("Erro ao verificar usuário existente:", checkError);
        // Continue o processo mesmo se a verificação falhar
      }

      if (checkResult?.exists) {
        // Usuário já existe - apenas vincular à empresa
        userId = checkResult.user_id;
        isNewUser = false;

        // Adicionar usuário existente à empresa atual
        const { data: addResult, error: addError } = await supabase.functions.invoke('add-existing-user', {
          body: { 
            userId: userId, 
            companyId: activeCompany.company_id 
          }
        });

        if (addError) {
          console.warn("Erro ao vincular usuário existente:", addError);
          // Continue o processo mesmo se a vinculação falhar
        }

        console.log("Usuário existente vinculado:", addResult);

      } else {
        // Usuário não existe - criar novo com magic link
        const { data: createResult, error: createError } = await supabase.functions.invoke('invite-with-magic-link', {
          body: {
            email: employeeData.email,
            name: employeeData.name,
            role: employeeData.role,
            companyId: activeCompany.company_id,
            companyName: activeCompany.company?.name || 'Nossa Empresa',
            redirectTo: `${window.location.origin}/`
          }
        });

        if (createError) {
          throw new Error(`Erro ao criar novo usuário: ${createError.message}`);
        }

        if (!createResult || !createResult.user_id) {
          throw new Error("Erro ao criar usuário: dados não retornados");
        }

        userId = createResult.user_id;
        isNewUser = true;

        console.log("Novo usuário criado com magic link:", createResult);
      }

      // 3. Tentar criar registro de colaborador com tratamento de erro de duplicata
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

      // Primeiro, tentar verificar se o registro já existe por user_id
      const { data: existingByUserId } = await supabase
        .from('employees')
        .select('id, email')
        .eq('user_id', userId)
        .eq('company_id', activeCompany.company_id)
        .maybeSingle();

      let employee;
      
      if (existingByUserId) {
        // Se já existe por user_id, atualizar os dados
        const { data: updatedEmployee, error: updateError } = await supabase
          .from("employees")
          .update(employeeInsertData)
          .eq("id", existingByUserId.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Erro ao atualizar colaborador existente: ${updateError.message}`);
        }
        
        employee = updatedEmployee;
        console.log("Colaborador atualizado:", employee);
      } else {
        // Tentar inserir novo registro
        const { data: newEmployee, error: employeeError } = await supabase
          .from("employees")
          .insert([employeeInsertData])
          .select()
          .single();

        if (employeeError) {
          // Se erro for de email duplicado, tentar buscar e atualizar
          if (employeeError.message?.includes('employees_email_key')) {
            console.log("Email duplicado detectado, tentando atualizar registro existente...");
            
            const { data: existingByEmail, error: searchEmailError } = await supabase
              .from('employees')
              .select('id')
              .eq('email', employeeData.email)
              .eq('company_id', activeCompany.company_id)
              .maybeSingle();

            if (searchEmailError) {
              console.error("Erro ao buscar por email:", searchEmailError);
              throw new Error(`Erro ao buscar colaborador existente: ${searchEmailError.message}`);
            }

            if (existingByEmail) {
              const { data: updatedEmployee, error: updateError } = await supabase
                .from("employees")
                .update({ ...employeeInsertData, user_id: userId })
                .eq("id", existingByEmail.id)
                .select()
                .single();

              if (updateError) {
                throw new Error(`Erro ao atualizar colaborador: ${updateError.message}`);
              }
              
              employee = updatedEmployee;
            } else {
              throw new Error(`Email duplicado detectado mas não foi possível encontrar o registro para atualizar`);
            }
          } else {
            throw new Error(`Erro ao criar colaborador: ${employeeError.message}`);
          }
        } else {
          employee = newEmployee;
        }
      }

      // 4. Mostrar mensagem de sucesso
      if (isNewUser) {
        toast({
          title: "✨ Novo colaborador criado!",
          description: `${employeeData.name} recebeu um email com magic link para acessar a plataforma. Ele será automaticamente vinculado à sua empresa.`,
        });
      } else {
        toast({
          title: "👥 Colaborador vinculado!",
          description: `${employeeData.name} já tinha conta na plataforma e agora também tem acesso à sua empresa.`,
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