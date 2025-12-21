import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { 
  Database, 
  Key, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Coins,
  AlertTriangle
} from "lucide-react";

export const ListaCnaeSettings = () => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  
  const companyId = activeCompany?.company_id;

  // Fetch current credits/status
  const { data: creditsData, isLoading: isLoadingCredits, refetch: refetchCredits } = useQuery({
    queryKey: ['listacnae-credits', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Não autenticado");
      }

      const response = await supabase.functions.invoke('listacnae-integration/credits', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: { company_id: companyId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    enabled: !!companyId,
    refetchOnWindowFocus: false,
  });

  // Save token mutation
  const saveTokenMutation = useMutation({
    mutationFn: async (newToken: string) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Não autenticado");
      }

      const response = await supabase.functions.invoke('listacnae-integration/save-token', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: { 
          company_id: companyId,
          token: newToken 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['listacnae-credits'] });
      if (data.valid) {
        toast.success("Token salvo e validado com sucesso!");
      } else {
        toast.warning(data.message || "Token salvo, mas não pôde ser validado");
      }
      setToken("");
      setShowToken(false);
    },
    onError: (error) => {
      toast.error("Erro ao salvar token: " + error.message);
    }
  });

  const handleSaveToken = () => {
    if (!token.trim()) {
      toast.error("Digite o token da API");
      return;
    }
    saveTokenMutation.mutate(token);
  };

  const isConfigured = creditsData?.configured === true;
  const hasToken = creditsData?.hasToken === true;
  const credits = creditsData?.credits;
  
  // Debug log to understand credits structure
  console.log("Credits data:", creditsData);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Integração ListaCNAE
                {isConfigured && (
                  <Badge variant="outline" className="ml-2 border-green-500 text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configurado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Conecte-se à API da ListaCNAE para importar empresas diretamente para seus segmentos de leads
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                A ListaCNAE oferece acesso a milhões de empresas brasileiras com dados atualizados 
                diretamente da Receita Federal. Com esta integração você pode:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Buscar empresas por CNAE, localização, porte e outros filtros</li>
                <li>Importar empresas diretamente para segmentos de leads</li>
                <li>Enriquecer dados de leads existentes com informações do CNPJ</li>
              </ul>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://listacnae.com.br/docApi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Documentação
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credits Card */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Créditos Disponíveis
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => refetchCredits()}
                disabled={isLoadingCredits}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingCredits ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCredits ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : credits !== null && credits !== undefined ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">
                    {typeof credits === 'number' 
                      ? credits.toLocaleString('pt-BR') 
                      : '0'}
                  </span>
                  <span className="text-muted-foreground">créditos</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cada empresa capturada consome 1 crédito. Consultas de CNAEs e Municípios são gratuitas.
                </p>
                {typeof credits === 'number' && credits < 100 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Créditos baixos! Considere recarregar para continuar importando empresas.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <XCircle className="h-4 w-4" />
                Não foi possível carregar os créditos. Verifique se o token está correto.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Token Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            {isConfigured ? "Atualizar Token" : "Configurar Token"}
          </CardTitle>
          <CardDescription>
            {isConfigured 
              ? "Atualize o token da API se necessário" 
              : "Configure seu token de acesso da API ListaCNAE"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você precisa de uma conta na ListaCNAE para obter um token de API.{" "}
                <a 
                  href="https://listacnae.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Criar conta
                </a>
              </AlertDescription>
            </Alert>
          )}

          {hasToken && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Token já configurado</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Um token já está salvo. Insira um novo token abaixo apenas se quiser substituí-lo.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="token">
              {hasToken ? "Novo Token (opcional)" : "Token da API"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                placeholder={hasToken ? "Cole um novo token para substituir..." : "Cole seu token aqui..."}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O token é armazenado de forma segura e usado apenas para comunicação com a API
            </p>
          </div>

          <Button 
            onClick={handleSaveToken}
            disabled={!token.trim() || saveTokenMutation.isPending}
            className="w-full"
          >
            {saveTokenMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isConfigured ? "Atualizar Token" : "Salvar Token"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  1
                </div>
                <h4 className="font-medium">Configure o Token</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Obtenha seu token na ListaCNAE e configure aqui
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  2
                </div>
                <h4 className="font-medium">Crie um Segmento</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Vá em Lead Intelligence e crie um novo segmento via ListaCNAE
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  3
                </div>
                <h4 className="font-medium">Defina os Filtros</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Escolha CNAEs, estados, portes e importe diretamente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
