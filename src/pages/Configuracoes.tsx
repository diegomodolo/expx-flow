import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { CompanySettings } from "@/components/company/CompanySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PlansSettings } from "@/components/settings/PlansSettings";

import { FacebookIntegrationSettings } from "@/components/facebook/FacebookIntegrationSettings";
import { PlannerSettings } from "@/components/planner/PlannerSettings";
import { PermissionsProtectedRoute } from "@/components/settings/PermissionsProtectedRoute";

const Configuracoes = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações da sua empresa e conta
          </p>
        </div>
        
        <SettingsLayout>
          <Routes>
            <Route index element={<CompanySettings />} />
            <Route path="empresa" element={<CompanySettings />} />
            <Route path="notificacoes" element={<NotificationSettings />} />
            <Route path="planos" element={<PlansSettings />} />
            <Route path="facebook" element={<FacebookIntegrationSettings />} />
            <Route path="planner" element={<PlannerSettings />} />
            <Route path="permissoes" element={<PermissionsProtectedRoute />} />
          </Routes>
        </SettingsLayout>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;