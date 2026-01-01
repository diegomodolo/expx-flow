import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Unlink, CheckCircle, AlertTriangle, RefreshCw, Calendar, Clock } from "lucide-react";
import { useGoogleAdsIntegration } from "@/hooks/useGoogleAdsIntegration";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GoogleAdsIntegrationCard() {
  const { activeCompany } = useCompany();
  
  const {
    loading,
    integration,
    adAccounts,
    connectGoogle,
    loadIntegration,
    disconnectGoogle,
    refreshAdAccounts,
    refreshToken,
  } = useGoogleAdsIntegration();

  useEffect(() => {
    if (activeCompany?.company_id) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany?.company_id]);

  const isConnected = integration && integration.is_active;
  const isExpired = integration && new Date(integration.expires_at) < new Date();
  // Token será renovado automaticamente, mas mostramos aviso se expirado há mais de 7 dias (refresh_token pode ter expirado)
  const isLongExpired = integration && (new Date().getTime() - new Date(integration.expires_at).getTime()) > 7 * 24 * 60 * 60 * 1000;
  
  const handleRefreshAccounts = async () => {
    if (!activeCompany?.company_id) return;
    await refreshAdAccounts();
  };

  const handleRefreshToken = async () => {
    await refreshToken();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4285F4" strokeWidth="2"/>
          </svg>
          Google Ads Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta do Google Ads para importar campanhas e métricas
            </p>
            {isConnected && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">
                  Conectado - {adAccounts.length} conta(s) de anúncios
                </span>
                {isExpired && !isLongExpired && (
                  <Badge variant="secondary" className="text-xs">
                    Token será renovado automaticamente
                  </Badge>
                )}
                {isLongExpired && (
                  <Badge variant="destructive" className="text-xs">
                    Reconexão necessária
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {isConnected ? (
            <Button
              variant="outline"
              onClick={disconnectGoogle}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Unlink className="h-4 w-4" />
              Desconectar
            </Button>
          ) : (
            <Button
              onClick={connectGoogle}
              disabled={loading || !activeCompany}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              </svg>
              Conectar ao Google Ads
            </Button>
          )}
        </div>

        {isConnected && integration && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-semibold">Informações da Integração</h4>
            
            {integration.user_email && (
              <div className="flex items-start gap-2 pb-2 border-b">
                <div className="h-4 w-4 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Conta conectada</p>
                  <p className="font-medium text-sm">{integration.user_email}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Conectado em</p>
                  <p className="font-medium">
                    {format(new Date(integration.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Token expira em</p>
                  <p className="font-medium">
                    {format(new Date(integration.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Badge variant={isLongExpired ? "destructive" : "secondary"} className="text-xs">
                {isLongExpired ? "Reconexão necessária" : isExpired ? "Renovação automática ativa" : "Token Válido"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {adAccounts.length} conta(s) encontrada(s)
              </Badge>
              {isExpired && !isLongExpired && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshToken}
                  disabled={loading}
                  className="ml-auto text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Renovar Token Agora
                </Button>
              )}
            </div>
          </div>
        )}

        {isLongExpired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Reconexão Necessária</AlertTitle>
            <AlertDescription>
              Sua conexão com o Google Ads expirou há mais de 7 dias. O refresh token pode ter expirado. 
              Por favor, desconecte e reconecte sua conta.
            </AlertDescription>
          </Alert>
        )}

        {isExpired && !isLongExpired && (
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Renovação Automática</AlertTitle>
            <AlertDescription>
              O token de acesso expirou, mas será renovado automaticamente na próxima sincronização. 
              Você também pode clicar em "Renovar Token Agora" para renovar manualmente.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && adAccounts.length === 0 && !isLongExpired && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nenhuma conta encontrada</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Não foram encontradas contas do Google Ads acessíveis com esta conta do Google.</p>
              <p className="text-xs">Possíveis motivos:</p>
              <ul className="text-xs list-disc list-inside space-y-1 ml-2">
                <li>Você fez login com uma conta sem acesso ao Google Ads</li>
                <li>A conta MCC não possui sub-contas configuradas</li>
                <li>Houve um erro ao buscar as contas</li>
              </ul>
              <Button 
                onClick={handleRefreshAccounts} 
                variant="outline" 
                size="sm"
                disabled={loading}
                className="mt-2"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Tentar Recarregar Contas
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConnected && adAccounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Contas do Google Ads Disponíveis:</h4>
            <p className="text-xs text-muted-foreground">
              Para associar uma conta a um cliente específico, vá até o cadastro do cliente e selecione a conta desejada no campo "Conta Google Ads".
            </p>
            <div className="space-y-1">
              {adAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{account.account_name}</span>
                      {account.is_manager && (
                        <Badge variant="outline" className="text-xs">
                          MCC
                        </Badge>
                      )}
                      {account.status === 'CANCELLED' && (
                        <Badge variant="destructive" className="text-xs">
                          Cancelada
                        </Badge>
                      )}
                      {account.status === 'SUSPENDED' && (
                        <Badge variant="destructive" className="text-xs">
                          Suspensa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>ID: {account.google_customer_id}</span>
                      <span>•</span>
                      <span>Fuso: {account.time_zone}</span>
                      {account.parent_customer_id && (
                        <>
                          <span>•</span>
                          <span>MCC Pai: {account.parent_customer_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">{account.currency}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
