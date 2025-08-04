import { useEffect, useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { PermissionsSettings } from "./PermissionsSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";

export function PermissionsProtectedRoute() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();

  useEffect(() => {
    checkAdminPermissions();
  }, [activeCompany?.company_id, activeCompany?.role]);

  const checkAdminPermissions = async () => {
    try {
      setLoading(true);
      
      console.log('Checking admin permissions for:', { 
        companyId: activeCompany?.company_id, 
        role: activeCompany?.role 
      });
      
      if (!activeCompany?.company_id) {
        console.log('No active company found');
        setIsAdmin(false);
        return;
      }

      // Check role directly from company context first
      const isOwnerOrAdmin = activeCompany.role === 'owner' || activeCompany.role === 'admin';
      
      if (isOwnerOrAdmin) {
        console.log('User is owner/admin from context:', activeCompany.role);
        setIsAdmin(true);
        return;
      }

      // Fallback: verify in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        setIsAdmin(false);
        return;
      }

      console.log('Checking database for user role:', user.id, 'in company:', activeCompany.company_id);

      const { data: member, error } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.company_id)
        .single();

      if (error) {
        console.error('Error checking company member:', error);
        setIsAdmin(false);
        return;
      }

      const isAdminFromDB = member?.role === 'owner' || member?.role === 'admin';
      console.log('Database role check result:', member?.role, 'isAdmin:', isAdminFromDB);
      setIsAdmin(isAdminFromDB);
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões
          </CardTitle>
          <CardDescription>
            Acesso negado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Acesso Restrito
            </h3>
            <p className="text-muted-foreground max-w-md">
              Apenas administradores e proprietários da empresa podem gerenciar 
              as permissões de acesso dos colaboradores.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <PermissionsSettings />;
}