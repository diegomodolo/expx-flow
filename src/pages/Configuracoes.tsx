import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { UserProfileSettings } from "@/components/settings/UserProfileSettings";
import { CompanySettings } from "@/components/company/CompanySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PlansSettings } from "@/components/settings/PlansSettings";
import { FacebookIntegrationCard } from "@/components/facebook/FacebookIntegrationCard";
// import { FacebookIntegrationInfo } from "@/components/facebook/FacebookIntegrationInfo";

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
            <Route index element={
              <div className="space-y-6">
                <UserProfileSettings />
                <FacebookIntegrationCard />
              </div>
            } />
            <Route path="empresa" element={<CompanySettings />} />
            <Route path="notificacoes" element={<NotificationSettings />} />
            <Route path="seguranca" element={<SecuritySettings />} />
            <Route path="planos" element={<PlansSettings />} />
          </Routes>
        </SettingsLayout>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;