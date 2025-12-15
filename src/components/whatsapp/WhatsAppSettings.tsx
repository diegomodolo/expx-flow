import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { useCompany } from "@/contexts/CompanyContext";
import { WhatsAppConnectionCard } from "./WhatsAppConnectionCard";
import { WhatsAppPreferencesCard } from "./WhatsAppPreferencesCard";
import { WhatsAppRecipientsList } from "./WhatsAppRecipientsList";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function WhatsAppSettings() {
  const { activeCompany, loading: isLoadingCompany } = useCompany();
  const {
    config,
    preferences,
    recipients,
    isLoading,
    saveConfig,
    isSavingConfig,
    testConnection,
    isTestingConnection,
    savePreferences,
    isSavingPreferences,
    addRecipient,
    isAddingRecipient,
    deleteRecipient,
    sendTestMessage,
    isSendingTestMessage,
  } = useWhatsAppConfig(activeCompany?.company_id);

  if (isLoadingCompany || isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = config?.is_connected ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">WhatsApp (Z-API)</h2>
        <p className="text-sm text-muted-foreground">
          Configure a integração com WhatsApp para receber alertas e relatórios
        </p>
      </div>

      <WhatsAppConnectionCard
        config={config}
        onSave={saveConfig}
        onTestConnection={testConnection}
        isSaving={isSavingConfig}
        isTesting={isTestingConnection}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <WhatsAppPreferencesCard
          preferences={preferences}
          onSave={savePreferences}
          isSaving={isSavingPreferences}
          isConnected={isConnected}
        />

        <WhatsAppRecipientsList
          recipients={recipients}
          onAdd={addRecipient}
          onUpdate={() => {}}
          onDelete={deleteRecipient}
          onSendTest={sendTestMessage}
          isAdding={isAddingRecipient}
          isSendingTest={isSendingTestMessage}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}