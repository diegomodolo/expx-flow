import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Phone, Eye, EyeOff, ExternalLink, QrCode } from "lucide-react";
import { UazapiQRCodeModal } from "./UazapiQRCodeModal";

interface UazapiConnectionCardProps {
  config: {
    uazapi_endpoint: string | null;
    uazapi_token: string | null;
    uazapi_session: string | null;
    is_connected: boolean;
    connected_phone: string | null;
    last_connection_test: string | null;
  } | null;
  companyId: string | undefined;
  onSave: (data: { endpoint: string; token: string; session: string }) => void;
  onTestConnection: (data: { endpoint: string; token: string; session: string }) => void;
  isSaving: boolean;
  isTesting: boolean;
}

export function UazapiConnectionCard({
  config,
  companyId,
  onSave,
  onTestConnection,
  isSaving,
  isTesting,
}: UazapiConnectionCardProps) {
  const [endpoint, setEndpoint] = useState(config?.uazapi_endpoint || "");
  const [token, setToken] = useState(config?.uazapi_token || "");
  const [session, setSession] = useState(config?.uazapi_session || "");
  const [showToken, setShowToken] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    if (config) {
      setEndpoint(config.uazapi_endpoint || "");
      setToken(config.uazapi_token || "");
      setSession(config.uazapi_session || "");
    }
  }, [config]);

  const handleSave = () => {
    onSave({
      endpoint,
      token,
      session,
    });
  };

  const handleTest = () => {
    onTestConnection({
      endpoint,
      token,
      session,
    });
  };

  const isConfigured = endpoint && token && session;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Conexão UazapiGO</CardTitle>
                <CardDescription>Configure suas credenciais da UazapiGO</CardDescription>
              </div>
            </div>
            {config?.is_connected ? (
              <Badge className="bg-google-green-100 text-google-green-700 dark:bg-google-green-600/20 dark:text-google-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : isConfigured ? (
              <Badge variant="secondary" className="bg-google-yellow-100 text-google-yellow-700 dark:bg-google-yellow-600/20 dark:text-google-yellow-400">
                <XCircle className="h-3 w-3 mr-1" />
                Desconectado
              </Badge>
            ) : (
              <Badge variant="outline">Não configurado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.connected_phone && (
            <div className="p-3 rounded-lg bg-google-green-50 dark:bg-google-green-600/10 border border-google-green-200 dark:border-google-green-600/30">
              <p className="text-sm text-google-green-700 dark:text-google-green-400">
                <strong>Número conectado:</strong> {config.connected_phone}
              </p>
              {config.last_connection_test && (
                <p className="text-xs text-google-green-600 dark:text-google-green-500 mt-1">
                  Última verificação: {new Date(config.last_connection_test).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="uazapi_endpoint">URL Base (Endpoint) *</Label>
            <Input
              id="uazapi_endpoint"
              placeholder="Ex: https://api.uazapi.com"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              URL base da sua instância UazapiGO
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uazapi_token">Token *</Label>
            <div className="relative">
              <Input
                id="uazapi_token"
                type={showToken ? "text" : "password"}
                placeholder="Seu token de autenticação"
                value={token}
                onChange={(e) => setToken(e.target.value)}
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
              Token encontrado no painel da UazapiGO
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uazapi_session">Session ID *</Label>
            <Input
              id="uazapi_session"
              placeholder="Ex: minha-sessao"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Identificador único da sua sessão
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Button
              onClick={() => setIsQRModalOpen(true)}
              disabled={!isConfigured}
              variant="outline"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Ver QR Code
            </Button>
            <Button
              onClick={handleTest}
              disabled={!isConfigured || isTesting}
              variant="outline"
            >
              {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Testar Conexão
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isConfigured || isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a href="https://docs.uazapi.com" target="_blank" rel="noopener noreferrer">
                Documentação
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <UazapiQRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        endpoint={endpoint}
        token={token}
        session={session}
      />
    </>
  );
}
