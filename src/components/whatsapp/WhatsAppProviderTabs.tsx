import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppConnectionCard } from "./WhatsAppConnectionCard";
import { UazapiConnectionCard } from "./UazapiConnectionCard";
import { MetaConnectionCard } from "./MetaConnectionCard";

interface WhatsAppProviderTabsProps {
  provider: string;
  onProviderChange: (provider: string) => void;
  config: {
    instance_id: string | null;
    token: string | null;
    client_token: string | null;
    is_connected: boolean;
    connected_phone: string | null;
    last_connection_test: string | null;
    uazapi_endpoint?: string | null;
    uazapi_token?: string | null;
    uazapi_admintoken?: string | null;
    uazapi_session?: string | null;
    meta_phone_number_id?: string | null;
    meta_access_token?: string | null;
    meta_business_account_id?: string | null;
    meta_app_id?: string | null;
    meta_webhook_verify_token?: string | null;
  } | null;
  companyId: string | undefined;
  onSaveZapi: (data: { instance_id: string; token: string; client_token?: string }) => void;
  onTestZapi: (data: { instance_id: string; token: string; client_token?: string }) => void;
  onSaveUazapi: (data: { endpoint: string; token: string; admintoken: string }) => void;
  onTestUazapi: (data: { endpoint: string; token: string; session: string }) => void;
  onSaveMeta: (data: {
    phone_number_id: string;
    access_token: string;
    business_account_id: string;
    app_id: string;
    webhook_verify_token: string;
  }) => void;
  onTestMeta: () => void;
  isSaving: boolean;
  isTesting: boolean;
}

export function WhatsAppProviderTabs({
  provider,
  onProviderChange,
  config,
  companyId,
  onSaveZapi,
  onTestZapi,
  onSaveUazapi,
  onTestUazapi,
  onSaveMeta,
  onTestMeta,
  isSaving,
  isTesting,
}: WhatsAppProviderTabsProps) {
  return (
    <Tabs value={provider} onValueChange={onProviderChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="zapi">Z-API</TabsTrigger>
        <TabsTrigger value="uazapi">UazapiGO</TabsTrigger>
        <TabsTrigger value="meta">Meta Cloud API</TabsTrigger>
      </TabsList>
      
      <TabsContent value="zapi" className="mt-4">
        <WhatsAppConnectionCard
          config={config}
          onSave={onSaveZapi}
          onTestConnection={onTestZapi}
          isSaving={isSaving}
          isTesting={isTesting}
        />
      </TabsContent>
      
      <TabsContent value="uazapi" className="mt-4">
        <UazapiConnectionCard
          config={{
            uazapi_endpoint: config?.uazapi_endpoint || null,
            uazapi_token: config?.uazapi_token || null,
          }}
          companyId={companyId}
          onSave={onSaveUazapi}
          isSaving={isSaving}
        />
      </TabsContent>

      <TabsContent value="meta" className="mt-4">
        <MetaConnectionCard
          config={{
            meta_phone_number_id: config?.meta_phone_number_id,
            meta_access_token: config?.meta_access_token,
            meta_business_account_id: config?.meta_business_account_id,
            meta_app_id: config?.meta_app_id,
            meta_webhook_verify_token: config?.meta_webhook_verify_token,
          }}
          companyId={companyId}
          onSave={onSaveMeta}
          onTest={onTestMeta}
          isSaving={isSaving}
          isTesting={isTesting}
        />
      </TabsContent>
    </Tabs>
  );
}
