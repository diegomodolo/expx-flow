import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppConnectionCard } from "./WhatsAppConnectionCard";
import { UazapiConnectionCard } from "./UazapiConnectionCard";

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
    uazapi_session?: string | null;
  } | null;
  companyId: string | undefined;
  onSaveZapi: (data: { instance_id: string; token: string; client_token?: string }) => void;
  onTestZapi: (data: { instance_id: string; token: string; client_token?: string }) => void;
  onSaveUazapi: (data: { endpoint: string; token: string }) => void;
  onTestUazapi: (data: { endpoint: string; token: string; session: string }) => void;
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
  isSaving,
  isTesting,
}: WhatsAppProviderTabsProps) {
  return (
    <Tabs value={provider} onValueChange={onProviderChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="zapi">Z-API</TabsTrigger>
        <TabsTrigger value="uazapi">UazapiGO</TabsTrigger>
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
    </Tabs>
  );
}
