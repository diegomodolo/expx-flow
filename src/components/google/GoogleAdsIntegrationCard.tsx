import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Unlink, CheckCircle } from "lucide-react";
import { useGoogleAdsIntegration } from "@/hooks/useGoogleAdsIntegration";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect } from "react";

export function GoogleAdsIntegrationCard() {
  const { activeCompany } = useCompany();
  const {
    loading,
    integration,
    adAccounts,
    connectGoogle,
    loadIntegration,
    disconnectGoogle,
  } = useGoogleAdsIntegration();

  useEffect(() => {
    if (activeCompany?.company_id) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany?.company_id]);

  const isConnected = integration && integration.is_active;
  const isExpired = integration && new Date(integration.expires_at) < new Date();

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

        {isConnected && adAccounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Contas de Anúncios Conectadas:</h4>
            <div className="space-y-1">
              {adAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm">{account.account_name}</span>
                  <Badge variant="secondary">{account.currency}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {isExpired && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Seu token do Google Ads expirou. Clique em "Conectar ao Google Ads" para renovar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
