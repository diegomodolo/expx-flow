import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { CompanySettings } from "@/components/company/CompanySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PlansSettings } from "@/components/settings/PlansSettings";
import { FacebookIntegrationSettings } from "@/components/facebook/FacebookIntegrationSettings";
import { FacebookSyncSettings } from "@/components/facebook/FacebookSyncSettings";
import { GoogleAdsIntegrationCard } from "@/components/google/GoogleAdsIntegrationCard";
import { GoogleAdsSyncSettings } from "@/components/google/GoogleAdsSyncSettings";
import { PermissionsProtectedRoute } from "@/components/settings/PermissionsProtectedRoute";
import { WhatsAppSettings } from "@/components/whatsapp/WhatsAppSettings";
import { ListaCnaeSettings } from "@/components/settings/ListaCnaeSettings";
import { DiscordSettings } from "@/components/discord/DiscordSettings";
import { UsageDefaultsSettings } from "@/components/settings/UsageDefaultsSettings";


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
            <Route path="sincronizacao-facebook" element={<FacebookSyncSettings />} />
            <Route path="integracao-google" element={<GoogleAdsIntegrationCard />} />
            <Route path="sincronizacao-google" element={<GoogleAdsSyncSettings />} />
            <Route path="permissoes" element={<PermissionsProtectedRoute />} />
            <Route path="whatsapp" element={<WhatsAppSettings />} />
            <Route path="listacnae" element={<ListaCnaeSettings />} />
            <Route path="discord" element={<DiscordSettings />} />
            <Route path="padroes-de-uso" element={<UsageDefaultsSettings />} />
          </Routes>
        </SettingsLayout>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;