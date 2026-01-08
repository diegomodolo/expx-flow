import { useEmployeePermissions, MenuItemType } from "@/hooks/useEmployeePermissions";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShieldX } from "lucide-react";

interface PermissionProtectedRouteProps {
  children: ReactNode;
  requiredPermission: MenuItemType;
}

export function PermissionProtectedRoute({ children, requiredPermission }: PermissionProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, permissionsLoading, isOwner } = useEmployeePermissions();

  // Wait for auth to load
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Wait for permissions to load
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Owners have full access
  if (isOwner) {
    return <>{children}</>;
  }

  // Check permission
  if (!hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <ShieldX className="h-16 w-16 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Acesso Negado
          </h1>
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para acessar esta página. Entre em contato com o administrador da sua empresa para solicitar acesso.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
