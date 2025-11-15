import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGoogleAdsIntegration } from "@/hooks/useGoogleAdsIntegration";
import { Loader2, CheckCircle2, XCircle, RefreshCw, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export function GoogleAdsIntegrationCard() {
  const {
    loading,
    integration,
    adAccounts,
    connectGoogle,
    disconnectGoogle,
    refreshAdAccounts,
  } = useGoogleAdsIntegration();
  
  const { activeCompany } = useCompany();
  const [customerId, setCustomerId] = useState("");
  const [saving, setSaving] = useState(false);

  const saveCustomerId = async () => {
    if (!customerId.trim()) {
      toast.error("Digite um Customer ID válido");
      return;
    }

    if (!activeCompany) {
      toast.error("Nenhuma empresa ativa");
      return;
    }

    if (!integration) {
      toast.error("Integração não encontrada");
      return;
    }

    setSaving(true);
    try {
      // Remover caracteres não numéricos do Customer ID
      const cleanId = customerId.replace(/\D/g, '');
      
      // Criar registro de conta do Google Ads
      const { error } = await supabase
        .from('google_ads_accounts')
        .insert({
          integration_id: integration.id,
          company_id: activeCompany.company_id,
          google_customer_id: cleanId,
          account_name: `Customer ${cleanId}`,
          currency: 'BRL',
          is_active: true,
        });

      if (error) throw error;

      toast.success("Customer ID salvo com sucesso!");
      setCustomerId("");
      refreshAdAccounts();
    } catch (error: any) {
      console.error('Error saving customer ID:', error);
      toast.error(error.message || "Erro ao salvar Customer ID");
    } finally {
      setSaving(false);
    }
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

  const isConnected = integration && integration.is_active;
  const hasAccounts = adAccounts && adAccounts.length > 0;
  const isExpired = integration && new Date(integration.expires_at) < new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4285F4" strokeWidth="2"/>
              </svg>
              Google Ads
            </CardTitle>
            <CardDescription>
              Integração com Google Ads para sincronização de campanhas
            </CardDescription>
          </div>
          {isConnected ? (
            <Badge variant={isExpired ? "destructive" : (hasAccounts ? "default" : "secondary")} className="gap-1">
              {isExpired ? (
                <>
                  <XCircle className="h-3 w-3" />
                  Expirado
                </>
              ) : hasAccounts ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado ({adAccounts.length} conta{adAccounts.length !== 1 ? 's' : ''})
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado - Adicione Customer ID
                </>
              )}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Desconectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta do Google Ads para sincronizar campanhas, grupos de anúncios e anúncios automaticamente.
            </p>
            <Button onClick={connectGoogle} className="w-full">
              Conectar Google Ads
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!hasAccounts && !isExpired && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configure sua conta</AlertTitle>
                <AlertDescription>
                  A integração está ativa! Agora adicione seu Google Ads Customer ID para começar a sincronizar campanhas.
                  Você encontra este ID no canto superior direito da sua conta do Google Ads (formato: XXX-XXX-XXXX).
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Última atualização:</span>
                <span>
                  {formatDistanceToNow(new Date(integration.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contas conectadas:</span>
                <span className="font-medium">{adAccounts.length}</span>
              </div>
            </div>

            {!hasAccounts && (
              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <div>
                  <Label htmlFor="customerId" className="text-sm font-medium">
                    Google Ads Customer ID
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Encontre seu Customer ID no canto superior direito do Google Ads
                  </p>
                </div>
                <Input 
                  id="customerId"
                  placeholder="123-456-7890"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
                <Button 
                  onClick={saveCustomerId} 
                  disabled={saving || !customerId.trim()}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Customer ID"
                  )}
                </Button>
              </div>
            )}

            {adAccounts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Contas Google Ads:</p>
                <div className="space-y-1">
                  {adAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {account.google_customer_id}
                        </p>
                      </div>
                      {account.currency && (
                        <Badge variant="outline">{account.currency}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={refreshAdAccounts}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar Contas
              </Button>
              <Button
                onClick={disconnectGoogle}
                variant="destructive"
                size="sm"
              >
                Desconectar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
