import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { UserProfileSettings } from "@/components/settings/UserProfileSettings";
import { CompanySettings } from "@/components/company/CompanySettings";

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
            <Route index element={<UserProfileSettings />} />
            <Route path="empresa" element={<CompanySettings />} />
            <Route path="notificacoes" element={
              <div className="text-center py-12 text-muted-foreground">
                Configurações de notificações em breve
              </div>
            } />
            <Route path="seguranca" element={
              <div className="text-center py-12 text-muted-foreground">
                Configurações de segurança em breve
              </div>
            } />
            <Route path="planos" element={
              <div className="text-center py-12 text-muted-foreground">
                Gerenciamento de planos em breve
              </div>
            } />
            <Route path="equipe" element={
              <div className="text-center py-12 text-muted-foreground">
                Gerenciamento de equipe em breve
              </div>
            } />
          </Routes>
        </SettingsLayout>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;