import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Lightbulb, Loader2 } from "lucide-react";
import { useClientContext } from "./ClienteContext";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { useCampaigns } from "@/hooks/useCampaigns";
import { TaskSuggestionsModal } from "@/components/clients/TaskSuggestionsModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ClienteAlertas() {
  const { client } = useClientContext();
  const { alerts, loading, generateAlerts } = useDashboardAlerts();
  const { convertAlertToTask, isCreating } = useTaskAutomation();
  const { campaigns } = useCampaigns();
  const { toast } = useToast();
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [clientSuggestions, setClientSuggestions] = useState<any>(null);

  // Buscar alertas ao montar
  useEffect(() => {
    if (client?.id) {
      generateAlerts(client.id);
    }
  }, [client?.id]);

  // Filtrar alertas apenas deste cliente
  const clientAlerts = alerts.filter(alert => alert.client_id === client?.id);

  // Contadores
  const criticalCount = clientAlerts.filter(a => a.type === 'danger').length;
  const opportunityCount = clientAlerts.filter(a => a.type === 'opportunity').length;

  const handleCreateTask = (alert: any) => {
    convertAlertToTask(alert);
  };

  const handleGenerateSuggestions = async () => {
    if (!client?.id) return;

    setGeneratingSuggestions(true);
    try {
      // Buscar campanhas do cliente
      const clientCampaigns = campaigns.filter(c => c.client_id === client.id);

      const { data, error } = await supabase.functions.invoke('generate-client-suggestions', {
        body: {
          clientData: {
            id: client.id,
            name: client.name,
            company: client.company,
            status: client.status,
          },
          campaigns: clientCampaigns.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            spend: c.spend,
            cpa: c.cpa,
            ctr: c.ctr,
            conversions: c.conversions,
            impressions: c.impressions,
            clicks: c.clicks,
          })),
        },
      });

      if (error) throw error;

      // Preparar dados para o modal
      const modalData = {
        id: client.id,
        name: client.name,
        issues: data.suggestions.map((s: any) => s.description).slice(0, 5),
        problematic_campaigns: clientCampaigns
          .filter(c => c.status === 'active' && (c.cpa > 50 || c.ctr < 1))
          .map(c => c.name)
          .slice(0, 3),
        ai_recommendations: data.suggestions.map((s: any) => s.action).slice(0, 5),
      };

      setClientSuggestions(modalData);
      setShowSuggestionsModal(true);

      toast({
        title: "Sugestões geradas!",
        description: `${data.suggestions.length} sugestões de otimização criadas com IA.`,
      });
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      toast({
        title: "Erro ao gerar sugestões",
        description: "Não foi possível gerar sugestões. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const getBadgeVariant = (type: string) => {
    return type === 'danger' ? 'destructive' : 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alertas & Sugestões</h2>
          <p className="text-muted-foreground">
            Alertas das campanhas e sugestões de otimização para {client?.name}
          </p>
        </div>
        <Button
          onClick={handleGenerateSuggestions}
          disabled={generatingSuggestions}
          className="gap-2"
        >
          {generatingSuggestions ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4" />
              Gerar Sugestões Inteligentes
            </>
          )}
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oportunidades</p>
                <p className="text-2xl font-bold">{opportunityCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{clientAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alertas */}
      {clientAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Tudo certo por aqui! 🎉</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Não há alertas críticos para este cliente no momento. Continue monitorando as campanhas regularmente.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clientAlerts.map((alert) => (
            <Card key={alert.id} className={alert.type === 'danger' ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-green-500'}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      alert.type === 'danger' ? 'bg-destructive/10' : 'bg-green-100'
                    }`}>
                      {alert.type === 'danger' ? (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <Badge variant={getBadgeVariant(alert.type)}>
                          {alert.type === 'danger' ? 'Crítico' : 'Oportunidade'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">Campanha:</span>
                        <span className="text-muted-foreground">{alert.campaign}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-1">
                        <span className="font-medium">{alert.metric}:</span>
                        <span className="text-muted-foreground">{alert.value}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCreateTask(alert)}
                    disabled={isCreating}
                    size="sm"
                  >
                    {isCreating ? 'Criando...' : 'Criar Tarefa'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">💡 Recomendação:</p>
                  <p className="text-sm text-muted-foreground">{alert.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Sugestões */}
      {clientSuggestions && (
        <TaskSuggestionsModal
          isOpen={showSuggestionsModal}
          onClose={() => setShowSuggestionsModal(false)}
          client={clientSuggestions}
        />
      )}
    </div>
  );
}
