import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

  const fetchEmployees = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          team:teams(id, name)
        `)
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
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("employees")
        .insert([{
          ...employeeData,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchEmployees(); // Refresh the list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar colaborador");
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
  }, [user]);

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