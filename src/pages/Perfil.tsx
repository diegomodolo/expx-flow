import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileLayout } from "@/components/profile/ProfileLayout";
import { UserProfileSettings } from "@/components/settings/UserProfileSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";

const Perfil = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e configurações de segurança
          </p>
        </div>
        
        <ProfileLayout>
          <Routes>
            <Route index element={<UserProfileSettings />} />
            <Route path="seguranca" element={<SecuritySettings />} />
          </Routes>
        </ProfileLayout>
      </div>
    </DashboardLayout>
  );
};

export default Perfil;