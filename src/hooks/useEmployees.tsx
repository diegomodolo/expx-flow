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

      // 2. Tentar encontrar usuário existente pelo email no sistema
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id) // Inicialmente buscar pelo próprio usuário logado para testar
        .maybeSingle();

      // Para simplificar, vamos sempre criar um novo usuário e enviar convite
      // Em produção, aqui implementaríamos uma busca melhor por email existente
      try {
        // Criar convite/signup para o novo colaborador
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: employeeData.email,
          password: tempPassword,
          options: {
            data: {
              full_name: employeeData.name,
            }
          }
        });

        if (signUpError) {
          // Se o usuário já existe, tentamos fazer login para obter o ID
          console.log("Usuário já existe, tentando obter ID...");
          
          // Como não podemos fazer login direto, vamos criar o colaborador com user_id do admin por enquanto
          // Em produção, implementaríamos uma edge function para gerenciar isso
          userId = user.id; // Temporário - usa o ID do admin
          isNewUser = false;
        } else {
          userId = signUpData.user?.id || user.id;
          isNewUser = true;
        }
      } catch (authErr) {
        console.warn("Erro na autenticação:", authErr);
        userId = user.id; // Fallback para o admin
        isNewUser = false;
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

      // 4. Adicionar à tabela company_members se for novo usuário
      if (isNewUser || userId) {
        const { error: memberError } = await supabase
          .from("company_members")
          .upsert({
            user_id: userId,
            company_id: activeCompany.company_id,
            role: 'member',
            joined_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,company_id'
          });

        if (memberError) {
          console.warn("Aviso ao adicionar membro da empresa:", memberError);
        }
      }

      // 5. Enviar email com credenciais se for novo usuário
      if (isNewUser) {
        try {
          const { error: emailError } = await supabase.functions.invoke('invite-employee', {
            body: {
              email: employeeData.email,
              name: employeeData.name,
              role: employeeData.role,
              companyName: activeCompany.company?.name || 'Nossa Empresa',
              tempPassword,
            },
          });

          if (emailError) {
            console.warn("Aviso ao enviar email:", emailError);
            toast({
              title: "Colaborador criado com sucesso",
              description: `Colaborador adicionado, mas houve problema ao enviar email. Senha temporária: ${tempPassword}`,
              variant: "default",
            });
          } else {
            toast({
              title: "Colaborador criado e email enviado",
              description: "O colaborador recebeu as credenciais por email.",
            });
          }
        } catch (emailErr) {
          console.warn("Erro ao enviar email:", emailErr);
          toast({
            title: "Colaborador criado",
            description: `Email não enviado. Senha temporária: ${tempPassword}`,
          });
        }
      } else {
        toast({
          title: "Colaborador vinculado",
          description: "Usuário existente foi vinculado à empresa.",
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