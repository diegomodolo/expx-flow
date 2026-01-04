import { Outlet, useLocation, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FabricaAnunciosLayout } from "@/components/generators/FabricaAnunciosLayout";

export default function FabricaAnuncios() {
  const location = useLocation();

  // Se estiver exatamente em /geradores/fabrica-anuncios, redireciona para o dashboard
  if (location.pathname === "/geradores/fabrica-anuncios") {
    return <Navigate to="/geradores/fabrica-anuncios/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <FabricaAnunciosLayout>
        <Outlet />
      </FabricaAnunciosLayout>
    </DashboardLayout>
  );
}
