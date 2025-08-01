import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Company {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  email?: string;
  phone?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  joined_at: string;
  company?: Company;
}

export const useCompanies = () => {
  const [companies, setCompanies] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserCompanies = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("company_members")
        .select(`
          *,
          company:companies (*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      setCompanies(data || []);
    } catch (error: any) {
      console.error("Error fetching companies:", error);
      setError(error.message);
      toast({
        title: "Erro ao carregar empresas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: {
    name: string;
    slug?: string;
    logo?: string;
  }) => {
    if (!user?.id) throw new Error("User not authenticated");

    try {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          ...companyData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Empresa criada!",
        description: `${companyData.name} foi criada com sucesso.`,
      });

      // Refresh the companies list
      await fetchUserCompanies();
      
      return data;
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast({
        title: "Erro ao criar empresa",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Empresa atualizada!",
        description: "As informações da empresa foram atualizadas.",
      });

      await fetchUserCompanies();
      return data;
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchUserCompanies();
  }, [user?.id]);

  return {
    companies,
    loading,
    error,
    fetchUserCompanies,
    createCompany,
    updateCompany,
  };
};