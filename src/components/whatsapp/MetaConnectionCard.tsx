import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Eye, EyeOff, ExternalLink, Copy, Check, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface MetaConnectionCardProps {
  config: {
    meta_phone_number_id?: string | null;
    meta_access_token?: string | null;
    meta_business_account_id?: string | null;
    meta_app_id?: string | null;
    meta_webhook_verify_token?: string | null;
  } | null;
  companyId: string | undefined;
  onSave: (data: {
    phone_number_id: string;
    access_token: string;
    business_account_id: string;
    app_id: string;
    webhook_verify_token: string;
  }) => void;
  onTest: () => void;
  isSaving: boolean;
  isTesting: boolean;
}

export function MetaConnectionCard({
  config,
  companyId,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: MetaConnectionCardProps) {
  const { toast } = useToast();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [appId, setAppId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate webhook URL
  const webhookUrl = `https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/meta-whatsapp-webhook`;

  // Initialize form with config data
  useEffect(() => {
    if (config && !isInitialized) {
      setPhoneNumberId(config.meta_phone_number_id || "");
      setAccessToken(config.meta_access_token || "");
      setBusinessAccountId(config.meta_business_account_id || "");
      setAppId(config.meta_app_id || "");
      setVerifyToken(config.meta_webhook_verify_token || generateVerifyToken());
      setIsInitialized(true);
    } else if (!config && !isInitialized) {
      setVerifyToken(generateVerifyToken());
      setIsInitialized(true);
    }
  }, [config, isInitialized]);

  const generateVerifyToken = () => {
    return crypto.randomUUID().replace(/-/g, "").substring(0, 32);
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: "URL copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave({
      phone_number_id: phoneNumberId,
      access_token: accessToken,
      business_account_id: businessAccountId,
      app_id: appId,
      webhook_verify_token: verifyToken,
    });
  };

  const isConfigured = phoneNumberId && accessToken && businessAccountId;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Meta Cloud API (Oficial)</CardTitle>
            <CardDescription>
              API oficial do WhatsApp Business Platform da Meta
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para usar a API oficial, você precisa de uma conta no{" "}
            <a
              href="https://developers.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Meta for Developers
            </a>{" "}
            com um app configurado para WhatsApp Business.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="meta_app_id">App ID</Label>
          <Input
            id="meta_app_id"
            placeholder="Seu App ID do Meta for Developers"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            ID do seu aplicativo (Settings → Basic → App ID)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta_business_account_id">WhatsApp Business Account ID *</Label>
          <Input
            id="meta_business_account_id"
            placeholder="ID da sua conta Business"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Encontre em: WhatsApp → API Setup → WhatsApp Business Account ID
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta_phone_number_id">Phone Number ID *</Label>
          <Input
            id="meta_phone_number_id"
            placeholder="ID do número de telefone"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            ID do número cadastrado (WhatsApp → API Setup → Phone Number ID)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta_access_token">Access Token Permanente *</Label>
          <div className="relative">
            <Input
              id="meta_access_token"
              type={showToken ? "text" : "password"}
              placeholder="Token de acesso permanente"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Gere um token permanente em: Business Settings → System Users → Generate Token
          </p>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-3">Configuração do Webhook</h4>

          <div className="space-y-2">
            <Label>Callback URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="bg-muted" />
              <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole esta URL na configuração do webhook no Meta for Developers
            </p>
          </div>

          <div className="space-y-2 mt-3">
            <Label htmlFor="verify_token">Verify Token</Label>
            <div className="flex gap-2">
              <Input
                id="verify_token"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(verifyToken);
                  toast({ title: "Token copiado!" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use este token ao configurar o webhook no Meta. Salve antes de configurar!
            </p>
          </div>

          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <p className="font-medium">Campos de assinatura do Webhook:</p>
            <p className="text-muted-foreground">• messages</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={!isConfigured || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configuração
          </Button>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={!isConfigured || isTesting}
          >
            {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Testar Conexão
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentação
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
