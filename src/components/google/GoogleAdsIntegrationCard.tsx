import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Unlink, CheckCircle, Plus, Info } from "lucide-react";
import { useGoogleAdsIntegration } from "@/hooks/useGoogleAdsIntegration";
import { useCompany } from "@/contexts/CompanyContext";
import { useClients } from "@/hooks/useClients";
import { useEffect, useState } from "react";

export function GoogleAdsIntegrationCard() {
  const { activeCompany } = useCompany();
  const { clients } = useClients();
  const [newCustomerId, setNewCustomerId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  
  const {
    loading,
    integration,
    adAccounts,
    connectGoogle,
    loadIntegration,
    disconnectGoogle,
    addCustomerId,
  } = useGoogleAdsIntegration();

  useEffect(() => {
    if (activeCompany?.company_id) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany?.company_id]);

  const isConnected = integration && integration.is_active;
  const isExpired = integration && new Date(integration.expires_at) < new Date();

  const handleAddCustomerId = async () => {
    if (!newCustomerId.trim()) return;
    await addCustomerId(newCustomerId.trim(), selectedClientId || undefined);
    setNewCustomerId("");
    setSelectedClientId("");
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

        {isConnected && adAccounts.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Adicione seu Customer ID</AlertTitle>
            <AlertDescription>
              Para sincronizar suas campanhas, adicione o Customer ID da sua conta do Google Ads.
              Você pode encontrá-lo no canto superior direito do painel do Google Ads (formato: 123-456-7890).
            </AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <div className="space-y-3">
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <h4 className="text-sm font-medium">Adicionar Nova Conta</h4>
              
              <div className="space-y-2">
                <Label htmlFor="customer-id">Customer ID do Google Ads</Label>
                <Input
                  id="customer-id"
                  placeholder="123-456-7890"
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCustomerId.trim()) {
                      handleAddCustomerId();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Encontre no canto superior direito do Google Ads (formato: 123-456-7890)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-select">Cliente Associado (Opcional)</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger id="client-select">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (associar depois)</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Associe esta conta a um cliente específico para sincronização automática
                </p>
              </div>

              <Button 
                onClick={handleAddCustomerId}
                disabled={!newCustomerId.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Conta
              </Button>
            </div>

            {adAccounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Contas Conectadas ({adAccounts.length}):</h4>
                <div className="space-y-1">
                  {adAccounts.map((account) => {
                    const associatedClient = account.client_id 
                      ? clients.find(c => c.id === account.client_id)
                      : null;
                    return (
                      <div key={account.id} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{account.account_name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>ID: {account.google_customer_id}</span>
                            {associatedClient && (
                              <>
                                <span>•</span>
                                <span className="text-primary">Cliente: {associatedClient.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">{account.currency}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {isExpired && (
          <Alert variant="destructive">
            <AlertTitle>Token Expirado</AlertTitle>
            <AlertDescription>
              Seu token do Google Ads expirou. Clique em "Desconectar" e conecte novamente para renovar.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
