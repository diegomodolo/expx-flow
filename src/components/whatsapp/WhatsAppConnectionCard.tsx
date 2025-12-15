import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Phone, Eye, EyeOff, ExternalLink } from "lucide-react";

interface WhatsAppConnectionCardProps {
  config: {
    instance_id: string | null;
    token: string | null;
    client_token: string | null;
    is_connected: boolean;
    connected_phone: string | null;
    last_connection_test: string | null;
  } | null;
  onSave: (data: { instance_id: string; token: string; client_token?: string }) => void;
  onTestConnection: (data: { instance_id: string; token: string; client_token?: string }) => void;
  isSaving: boolean;
  isTesting: boolean;
}

export function WhatsAppConnectionCard({
  config,
  onSave,
  onTestConnection,
  isSaving,
  isTesting,
}: WhatsAppConnectionCardProps) {
  const [instanceId, setInstanceId] = useState(config?.instance_id || "");
  const [token, setToken] = useState(config?.token || "");
  const [clientToken, setClientToken] = useState(config?.client_token || "");
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);

  useEffect(() => {
    if (config) {
      setInstanceId(config.instance_id || "");
      setToken(config.token || "");
      setClientToken(config.client_token || "");
    }
  }, [config]);

  const handleSave = () => {
    onSave({
      instance_id: instanceId,
      token,
      client_token: clientToken || undefined,
    });
  };

  const handleTest = () => {
    onTestConnection({
      instance_id: instanceId,
      token,
      client_token: clientToken || undefined,
    });
  };

  const isConfigured = instanceId && token;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-google-green-100 dark:bg-google-green-600/20 flex items-center justify-center">
              <Phone className="h-5 w-5 text-google-green-600 dark:text-google-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Conexão Z-API</CardTitle>
              <CardDescription>Configure suas credenciais da Z-API</CardDescription>
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
          <Label htmlFor="instance_id">Instance ID *</Label>
          <Input
            id="instance_id"
            placeholder="Ex: 3C987654A1B2C3D4E5F67890"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Encontre no painel Z-API → Suas Instâncias
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Token *</Label>
          <div className="relative">
            <Input
              id="token"
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_token">Client-Token</Label>
          <div className="relative">
            <Input
              id="client_token"
              type={showClientToken ? "text" : "password"}
              placeholder="Token de segurança da conta"
              value={clientToken}
              onChange={(e) => setClientToken(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setShowClientToken(!showClientToken)}
            >
              {showClientToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Encontre em Z-API → Segurança → Account Security Token
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
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
            <a href="https://developer.z-api.io" target="_blank" rel="noopener noreferrer">
              Documentação Z-API
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}