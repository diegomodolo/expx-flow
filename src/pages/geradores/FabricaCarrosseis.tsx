import { Outlet, useLocation, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FabricaCarrosseisLayout } from "@/components/generators/FabricaCarrosseisLayout";

export default function FabricaCarrosseis() {
  const location = useLocation();

  // Se estiver exatamente em /geradores/fabrica-carrosseis, redireciona para o dashboard
  if (location.pathname === "/geradores/fabrica-carrosseis") {
    return <Navigate to="/geradores/fabrica-carrosseis/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <FabricaCarrosseisLayout>
        <Outlet />
      </FabricaCarrosseisLayout>
    </DashboardLayout>
  );
}
