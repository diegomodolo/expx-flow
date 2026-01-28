import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/hooks/useTeams";

export interface Employee {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  team_id?: string;
  start_date: string;
  skills?: string;
  avatar?: string;
  profile_avatar_url?: string;
  created_at: string;
  updated_at: string;
  team?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  team_id?: string;
  start_date: string;
  skills?: string;
  avatar?: string;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchEmployees = async () => {
    if (!user || !activeCompany) {
      setEmployees([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar employees primeiro
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(`
          *,
          team:teams!employees_team_id_fkey (
            id,
            name,
            color
          )
        `)
        .eq("company_id", activeCompany.company_id)
        .order("name");

      if (employeesError) throw employeesError;

      // Se não há employees, retornar array vazio
      if (!employeesData || employeesData.length === 0) {
        setEmployees([]);
        return;
      }

      // Buscar profiles dos user_ids dos employees
      const userIds = employeesData.map(emp => emp.user_id);
      console.log("Buscando profiles para user_ids:", userIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, avatar_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.warn("Error fetching profiles:", profilesError);
      }

      console.log("Profiles encontrados:", profilesData?.length || 0, "de", userIds.length, "esperados");
      console.log("Profiles data:", profilesData);

      // Verificar se todos os user_ids foram encontrados e fazer fallback se necessário
      let allProfiles = profilesData || [];
      const foundUserIds = allProfiles.map(p => p.user_id);
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));

      if (missingUserIds.length > 0) {
        console.log("User_ids não encontrados no batch, buscando individualmente:", missingUserIds);
        
        // Buscar profiles faltantes individualmente
        const missingProfilesPromises = missingUserIds.map(async (userId) => {
          const { data } = await supabase
            .from("profiles")
            .select("user_id, avatar_url")
            .eq("user_id", userId)
            .maybeSingle();
          return data;
        });

        const missingProfiles = await Promise.all(missingProfilesPromises);
        const validMissingProfiles = missingProfiles.filter(Boolean);
        allProfiles = [...allProfiles, ...validMissingProfiles];
        console.log("Profiles encontrados após fallback:", allProfiles.length);
      }

      // Mapear os dados combinando employees com profiles
      const mappedData = employeesData.map((employee: any) => {
        const profile = allProfiles.find(p => p.user_id === employee.user_id);
        const result = {
          ...employee,
          profile_avatar_url: profile?.avatar_url || null
        };
        
        if (employee.name === "Jaysson") {
          console.log("Debug Jaysson - user_id:", employee.user_id, "profile encontrado:", !!profile, "avatar_url:", profile?.avatar_url);
        }
        
        return result;
      });

      setEmployees(mappedData);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: CreateEmployeeData) => {
    if (!user || !activeCompany) {
      setError("Usuário não autenticado ou empresa não selecionada");
      return null;
    }

    try {
      setLoading(true);
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
      const { data: existingEmployeeInCompany, error: companySearchError } = await supabase
        .from('employees')
        .select('id, user_id, email, company_id')
        .eq('email', employeeData.email)
        .eq('company_id', activeCompany.company_id)
        .maybeSingle();

      if (companySearchError) {
        console.error("Erro ao verificar colaborador na empresa:", companySearchError);
        throw new Error(`Erro ao verificar colaborador: ${companySearchError.message}`);
      }

      if (existingEmployeeInCompany) {
        console.log("Colaborador já existe nesta empresa:", existingEmployeeInCompany);
        throw new Error("Este email já está cadastrado como colaborador nesta empresa");
      }

      console.log("Colaborador não existe nesta empresa, prosseguindo...");

      let userId: string;
      let isNewUser = true;
      let shouldSendWelcome = false;

      // 2. Verificar se usuário já existe na plataforma (qualquer empresa)
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-user', {
        body: { email: employeeData.email }
      });

      if (checkError) {
        console.warn("Erro ao verificar usuário existente:", checkError);
        // Se falhar verificação, assume que é novo usuário
        isNewUser = true;
      }

      if (checkResult?.exists && !checkError) {
        // CASO B: Usuário já existe - apenas vincular à empresa
        userId = checkResult.user_id;
        isNewUser = false;
        shouldSendWelcome = false;

        console.log("Usuário já existe na plataforma, vinculando à empresa:", userId);

        // Verificar se já é membro da empresa
        const { data: existingMember } = await supabase
          .from('company_members')
          .select('id')
          .eq('user_id', userId)
          .eq('company_id', activeCompany.company_id)
          .maybeSingle();

        if (!existingMember) {
          // Adicionar como membro da empresa
          const { error: memberError } = await supabase
            .from('company_members')
            .insert([{
              user_id: userId,
              company_id: activeCompany.company_id,
              role: 'member',
              joined_at: new Date().toISOString()
            }]);

          if (memberError) {
            console.warn("Erro ao adicionar como membro da empresa:", memberError);
          }
        }

        // Enviar notificação de nova empresa (não bloquear o processo se falhar)
        try {
          await supabase.functions.invoke('notify-user-new-company', {
            body: {
              email: employeeData.email,
              userName: employeeData.name,
              companyName: activeCompany.company?.name || 'Nova Empresa'
            }
          });
          console.log("Notificação de nova empresa enviada");
        } catch (notifyError) {
          console.warn("Erro ao enviar notificação de nova empresa:", notifyError);
        }

      } else {
        // CASO A: Usuário não existe - criar novo com magic link
        console.log("Usuário não existe, criando novo com magic link");
        
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
        shouldSendWelcome = true;

        console.log("Novo usuário criado com magic link:", createResult);
      }

      // 3. Criar registro de colaborador na empresa
      const employeeInsertData = {
        name: employeeData.name,
        email: employeeData.email,
        phone: employeeData.phone || null,
        role: employeeData.role,
        team_id: employeeData.team_id === "sem-squad" || !employeeData.team_id ? null : employeeData.team_id,
        status: employeeData.status,
        start_date: employeeData.start_date,
        skills: employeeData.skills || null,
        avatar: employeeData.avatar || null,
        user_id: userId,
        company_id: activeCompany.company_id,
      };

      console.log("Criando registro de colaborador:", employeeInsertData);

      const { data: newEmployee, error: employeeError } = await supabase
        .from("employees")
        .insert([employeeInsertData])
        .select(`
          *,
          team:teams (
            id,
            name,
            color
          )
        `)
        .single();

      if (employeeError) {
        throw new Error(`Erro ao criar registro de colaborador: ${employeeError.message}`);
      }

      console.log("Colaborador criado com sucesso:", newEmployee);

      // Atualizar lista de colaboradores
      await fetchEmployees();

      return newEmployee;

    } catch (error: any) {
      console.error("Error creating employee:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    if (!user || !activeCompany) {
      setError("Usuário não autenticado ou empresa não selecionada");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário tem permissões para atualizar colaboradores
      const { data: userRole, error: roleError } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.company_id)
        .single();

      if (roleError || !userRole || !['owner', 'admin'].includes(userRole.role)) {
        throw new Error("Você não tem permissão para atualizar colaboradores. Apenas owners e admins podem realizar esta ação.");
      }

      const { data, error } = await supabase
        .from("employees")
        .update({
          ...updates,
          team_id: !updates.team_id || updates.team_id === "sem-squad" || updates.team_id === "" ? null : updates.team_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", activeCompany.company_id) // Garantir que só atualize na empresa atual
        .select(`
          *,
          team:teams (
            id,
            name,
            color
          )
        `)
        .single();

      if (error) throw error;

      // Atualizar lista de colaboradores
      await fetchEmployees();

      return data;
    } catch (error: any) {
      console.error("Error updating employee:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!user || !activeCompany) {
      setError("Usuário não autenticado ou empresa não selecionada");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário tem permissões para deletar colaboradores
      const { data: userRole, error: roleError } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.company_id)
        .single();

      if (roleError || !userRole || !['owner', 'admin'].includes(userRole.role)) {
        throw new Error("Você não tem permissão para excluir colaboradores. Apenas owners e admins podem realizar esta ação.");
      }

      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id)
        .eq("company_id", activeCompany.company_id); // Garantir que só delete na empresa atual

      if (error) throw error;

      // Atualizar lista de colaboradores
      await fetchEmployees();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeCompany) {
      fetchEmployees();
    }
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
};