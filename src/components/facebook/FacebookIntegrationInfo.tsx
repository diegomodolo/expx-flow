import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Building2, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { useFacebookIntegration } from "@/hooks/useFacebookIntegration";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const FacebookIntegrationInfo = () => {
  const { activeCompany } = useCompany();
  const { loading, integration, adAccounts, loadIntegration } = useFacebookIntegration();

  useEffect(() => {
    if (activeCompany?.company_id) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany?.company_id]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informações da Integração Facebook</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando informações...</p>
        </CardContent>
      </Card>
    );
  }

  if (!integration) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informações da Integração Facebook</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma integração ativa encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  const isExpired = new Date(integration.expires_at) < new Date();
  const expiresAt = new Date(integration.expires_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Informações da Integração Facebook
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status da Conexão */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Status da Conexão
          </h4>
          <div className="flex items-center gap-2">
            {integration.is_active && !isExpired ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Ativa
              </Badge>
            ) : (
              <Badge variant="destructive">
                {isExpired ? "Token Expirado" : "Inativa"}
              </Badge>
            )}
            {isExpired && (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </div>
        </div>

        <Separator />

        {/* Informações do Token */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Token de Acesso
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Conectado em:</span>
              <span className="text-sm">
                {format(new Date(integration.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Expira em:</span>
              <span className={`text-sm ${isExpired ? "text-destructive" : ""}`}>
                {format(expiresAt, "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Contas de Anúncios */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Contas de Anúncios ({adAccounts.length})
          </h4>
          {adAccounts.length > 0 ? (
            <div className="space-y-3">
              {adAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
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
        </div>

        {isExpired && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Token Expirado
              </span>
            </div>
            <p className="text-sm text-yellow-700">
              Seu token de acesso do Facebook expirou. Para continuar usando a integração,
              desconecte e conecte novamente sua conta do Facebook Ads.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};