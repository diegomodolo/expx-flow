import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CalendarDays, Building2, DollarSign, CheckCircle, AlertTriangle, Facebook, Unlink, RefreshCw } from "lucide-react";
import { useFacebookIntegration } from "@/hooks/useFacebookIntegration";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const FacebookIntegrationSettings = () => {
  const { activeCompany } = useCompany();
  const { 
    loading, 
    integration, 
    adAccounts, 
    loadIntegration, 
    connectFacebook, 
    disconnectFacebook,
    refreshAdAccounts 
  } = useFacebookIntegration();

  useEffect(() => {
    if (activeCompany?.company_id) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany?.company_id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Integração Facebook Ads</h2>
          <p className="text-muted-foreground">
            Gerencie sua conexão com o Facebook Ads
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando informações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConnected = integration && integration.is_active;
  const isExpired = integration && new Date(integration.expires_at) < new Date();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Integração Facebook Ads</h2>
        <p className="text-muted-foreground">
          Gerencie sua conexão com o Facebook Ads e visualize informações das contas
        </p>
      </div>

      {/* Card de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Status da Conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? "Conectado ao Facebook Ads com sucesso" 
                  : "Conecte sua conta do Facebook Ads para importar campanhas e métricas"
                }
              </p>
              {isConnected && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    Conectado - {adAccounts.length} conta(s) de anúncios
                  </span>
                  {isExpired && (
                    <Badge variant="destructive" className="text-xs">
                      Token Expirado
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {isConnected ? (
              <Button
                variant="outline"
                onClick={disconnectFacebook}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Unlink className="h-4 w-4" />
                Desconectar
              </Button>
            ) : (
              <Button
                onClick={connectFacebook}
                disabled={loading || !activeCompany}
                className="flex items-center gap-2"
              >
                <Facebook className="h-4 w-4" />
                Conectar ao Facebook Ads
              </Button>
            )}
          </div>

          {isExpired && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Seu token do Facebook expirou. Clique em "Conectar ao Facebook Ads" para renovar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações Detalhadas - só mostra se conectado */}
      {isConnected && (
        <>
          {/* Card de Informações do Token */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Informações do Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Conectado em:
                  </label>
                  <p className="text-sm">
                    {format(new Date(integration.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Expira em:
                  </label>
                  <p className={`text-sm ${isExpired ? "text-destructive" : ""}`}>
                    {format(new Date(integration.expires_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Contas de Anúncios */}
          <Card>
            <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Contas de Anúncios ({adAccounts.length})
              </div>
              {isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshAdAccounts}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar Contas
                </Button>
              )}
            </CardTitle>
            </CardHeader>
            <CardContent>
              {adAccounts.length > 0 ? (
                <div className="space-y-3">
                  {adAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{account.account_name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {account.id}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {account.currency}
                        </Badge>
                        {account.is_active && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Ativa
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta de anúncios encontrada.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};