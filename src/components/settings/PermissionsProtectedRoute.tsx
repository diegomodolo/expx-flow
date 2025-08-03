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
  }, [activeCompany?.id]);

  const checkAdminPermissions = async () => {
    try {
      setLoading(true);
      
      if (!activeCompany?.id) {
        setIsAdmin(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // Verificar se o usuário é admin ou owner da empresa
      const { data: member } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.id)
        .single();

      setIsAdmin(member?.role === 'owner' || member?.role === 'admin');
    } catch (error) {
      console.error('Erro ao verificar permissões de admin:', error);
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