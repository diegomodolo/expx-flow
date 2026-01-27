import { useState, useEffect } from "react";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { useCompany } from "@/contexts/CompanyContext";
import { WhatsAppProviderTabs } from "./WhatsAppProviderTabs";
import { WhatsAppInstancesList } from "./WhatsAppInstancesList";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Bell } from "lucide-react";
import { Link } from "react-router-dom";

export function WhatsAppSettings() {
  const { activeCompany, loading: isLoadingCompany } = useCompany();
  const {
    config,
    isLoading,
    saveConfig,
    isSavingConfig,
    saveUazapiConfig,
    isSavingUazapiConfig,
    testConnection,
    isTestingConnection,
    testUazapiConnection,
    isTestingUazapiConnection,
  } = useWhatsAppConfig(activeCompany?.company_id);

  const [activeProvider, setActiveProvider] = useState<string>("zapi");

  // Sync with config when loaded
  useEffect(() => {
    if (config?.provider) {
      setActiveProvider(config.provider);
    }
  }, [config?.provider]);

  const handleProviderChange = (provider: string) => {
    setActiveProvider(provider);
  };

  const handleSaveZapi = (data: { instance_id: string; token: string; client_token?: string }) => {
    saveConfig({
      instance_id: data.instance_id,
      token: data.token,
      client_token: data.client_token,
      provider: "zapi",
    });
  };

  const handleSaveUazapiBase = (data: { endpoint: string; token: string; admintoken: string }) => {
    // Save base config (endpoint + token + admintoken)
    saveUazapiConfig({
      endpoint: data.endpoint,
      token: data.token,
      admintoken: data.admintoken,
      session: config?.uazapi_session || "", // Keep existing session if any
    });
  };

  if (isLoadingCompany || isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Integração WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Configure a conexão com Z-API ou UazapiGO para envio de notificações via WhatsApp
        </p>
      </div>

      <WhatsAppProviderTabs
        provider={activeProvider}
        onProviderChange={handleProviderChange}
        config={config}
        companyId={activeCompany?.company_id}
        onSaveZapi={handleSaveZapi}
        onTestZapi={testConnection}
        onSaveUazapi={handleSaveUazapiBase}
        onTestUazapi={testUazapiConnection}
        isSaving={isSavingConfig || isSavingUazapiConfig}
        isTesting={isTestingConnection || isTestingUazapiConnection}
      />

      {/* Instances List - Only show for UazapiGO */}
      {activeProvider === "uazapi" && config?.uazapi_endpoint && config?.uazapi_admintoken && (
        <WhatsAppInstancesList
          companyId={activeCompany?.company_id}
          baseEndpoint={config.uazapi_endpoint}
          baseToken={config.uazapi_admintoken}
        />
      )}

      {/* Link to Notifications Module */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Módulo de Notificações</h3>
                <p className="text-sm text-muted-foreground">
                  Configure gatilhos, mensagens e gerencie contatos para alertas
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/notificacoes/whatsapp">
                Acessar Módulo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
