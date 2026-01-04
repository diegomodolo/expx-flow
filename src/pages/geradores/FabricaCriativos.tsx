import { Outlet, useLocation, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FabricaCriativosLayout } from "@/components/generators/FabricaCriativosLayout";

export default function FabricaCriativos() {
  const location = useLocation();

  // Se estiver exatamente em /geradores/fabrica-criativos, redireciona para o dashboard
  if (location.pathname === "/geradores/fabrica-criativos") {
    return <Navigate to="/geradores/fabrica-criativos/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <FabricaCriativosLayout>
        <Outlet />
      </FabricaCriativosLayout>
    </DashboardLayout>
  );
}
