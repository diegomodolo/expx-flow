import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Eye, EyeOff, ExternalLink } from "lucide-react";

interface UazapiBaseConfigCardProps {
  config: {
    uazapi_endpoint: string | null;
    uazapi_token: string | null;
    uazapi_admintoken?: string | null;
  } | null;
  companyId: string | undefined;
  onSave: (data: { endpoint: string; token: string; admintoken: string }) => void;
  isSaving: boolean;
}

export function UazapiConnectionCard({
  config,
  companyId,
  onSave,
  isSaving,
}: UazapiBaseConfigCardProps) {
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [admintoken, setAdmintoken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showAdminToken, setShowAdminToken] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sincronizar apenas na carga inicial
  useEffect(() => {
    if (config && !isInitialized) {
      setEndpoint(config.uazapi_endpoint || "");
      setToken(config.uazapi_token || "");
      setAdmintoken(config.uazapi_admintoken || "");
      setIsInitialized(true);
    }
  }, [config, isInitialized]);

  const handleSave = () => {
    onSave({
      endpoint,
      token,
      admintoken,
    });
  };

  const isConfigured = endpoint && admintoken;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Configuração Base UazapiGO</CardTitle>
            <CardDescription>
              URL Base e Admin Token da sua instância UazapiGO (API v2)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label htmlFor="uazapi_admintoken">Admin Token *</Label>
          <div className="relative">
            <Input
              id="uazapi_admintoken"
              type={showAdminToken ? "text" : "password"}
              placeholder="Seu admin token para criar instâncias"
              value={admintoken}
              onChange={(e) => setAdmintoken(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setShowAdminToken(!showAdminToken)}
            >
              {showAdminToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Token administrativo para criar e gerenciar instâncias automaticamente
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="uazapi_token">Token Legado (Opcional)</Label>
          <div className="relative">
            <Input
              id="uazapi_token"
              type={showToken ? "text" : "password"}
              placeholder="Token de autenticação antigo"
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
            Apenas para compatibilidade com instâncias antigas
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!isConfigured || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configuração Base
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
  );
}
