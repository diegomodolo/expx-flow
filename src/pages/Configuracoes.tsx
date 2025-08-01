import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { UserProfileSettings } from "@/components/settings/UserProfileSettings";
import { Routes, Route } from "react-router-dom";
import { CompanySettings } from "@/components/company/CompanySettings";

const Configuracoes = () => {
  return (
    <DashboardLayout>
      <div className="flex-1 flex">
        <SidebarProvider>
          <div className="flex w-full min-h-screen">
            <SettingsSidebar />
            <main className="flex-1 p-6">
              <Routes>
                <Route index element={
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
                      <p className="text-muted-foreground">
                        Gerencie suas informações pessoais e configurações de conta
                      </p>
                    </div>
                    <UserProfileSettings />
                  </div>
                } />
                <Route path="empresa" element={
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">Empresa</h1>
                      <p className="text-muted-foreground">
                        Gerencie as configurações da sua empresa
                      </p>
                    </div>
                    <CompanySettings />
                  </div>
                } />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;