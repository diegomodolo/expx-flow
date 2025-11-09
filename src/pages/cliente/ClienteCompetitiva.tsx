import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, BarChart3, Loader2 } from "lucide-react";
import { useClientContext } from "./ClienteContext";
import { useCompetitors } from "@/hooks/useCompetitors";
import { CompetitorList } from "@/components/clients/CompetitorList";
import { CompetitorDialog } from "@/components/clients/CompetitorDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAds } from "@/hooks/useAds";

export function ClienteCompetitiva() {
  const { client } = useClientContext();
  const { competitors, competitorAds, loading, refetch } = useCompetitors(client?.id || '');
  const { campaigns } = useCampaigns();
  const { ads } = useAds();
  const [showComparativeAnalysis, setShowComparativeAnalysis] = useState(false);
  const [comparativeAnalysis, setComparativeAnalysis] = useState('');
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);

  const handleGenerateComparativeAnalysis = async () => {
    if (!client?.id || competitors.length === 0) {
      toast.error('Adicione concorrentes antes de gerar análise comparativa');
      return;
    }

    setGeneratingAnalysis(true);
    try {
      // Buscar campanhas e anúncios do cliente
      const clientCampaigns = campaigns.filter(c => c.client_id === client.id);
      const clientAds = ads.filter(ad => clientCampaigns.some(c => c.id === ad.campaign_id));

      // Preparar dados para análise
      const analysisData = {
        clientData: {
          name: client.name,
          company: client.company,
          industry: client.sector,
          campaigns: clientCampaigns.map(c => ({
            name: c.name,
            spend: c.spend,
            conversions: c.conversions,
            cpa: c.cpa,
            ctr: c.ctr,
          })),
          ads: clientAds.map(ad => ({
            title: ad.creative_title,
            body: ad.creative_body,
            cta: ad.call_to_action,
          })),
        },
        competitors: competitors.map(comp => ({
          name: comp.name,
          company: comp.company_name,
          industry: comp.industry,
          website: comp.website_url,
          facebook: comp.facebook_page_name,
          instagram: comp.instagram_handle,
          description: comp.description,
        })),
        competitorAds: competitors.map(comp => ({
          competitor_name: comp.name,
          ads: competitorAds
            .filter(ad => ad.competitor_id === comp.id)
            .map(ad => ({
              platform: ad.platform,
              title: ad.ad_title,
              copy: ad.ad_copy,
              cta: ad.call_to_action,
              type: ad.ad_type,
              performance: ad.estimated_performance,
            })),
        })),
      };

      const { data, error } = await supabase.functions.invoke('analyze-competitor-insights', {
        body: {
          ...analysisData,
          analysisType: 'multi_competitor',
        },
      });

      if (error) throw error;

      setComparativeAnalysis(data.analysis);
      setShowComparativeAnalysis(true);

      toast.success('Análise comparativa gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar análise comparativa:', error);
      toast.error('Erro ao gerar análise comparativa');
    } finally {
      setGeneratingAnalysis(false);
    }
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
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Análise Competitiva
              <Badge variant="secondary">{competitors.length} Concorrentes</Badge>
            </h2>
            <p className="text-muted-foreground">
              Monitore e analise concorrentes de {client?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerateComparativeAnalysis}
            disabled={generatingAnalysis || competitors.length === 0}
            variant="outline"
            className="gap-2"
          >
            {generatingAnalysis ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Análise Comparativa
              </>
            )}
          </Button>
          <CompetitorDialog 
            clientId={client?.id || ''} 
            onCompetitorAdded={refetch}
          />
        </div>
      </div>

      {/* Empty State */}
      {competitors.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum concorrente adicionado</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Adicione concorrentes para monitorar suas estratégias e anúncios, e gerar análises comparativas detalhadas.
              </p>
              <CompetitorDialog 
                clientId={client?.id || ''} 
                onCompetitorAdded={refetch}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Concorrentes</p>
                    <p className="text-2xl font-bold">{competitors.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Anúncios Monitorados</p>
                    <p className="text-2xl font-bold">{competitorAds.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Média Anúncios/Concorrente</p>
                    <p className="text-2xl font-bold">
                      {competitors.length > 0 ? Math.round(competitorAds.length / competitors.length) : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Concorrentes */}
          <CompetitorList
            clientId={client?.id || ''}
            competitors={competitors}
            competitorAds={competitorAds}
            onRefetch={refetch}
          />
        </>
      )}

      {/* Modal de Análise Comparativa */}
      <Dialog open={showComparativeAnalysis} onOpenChange={setShowComparativeAnalysis}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Análise Comparativa: {client?.name} vs Concorrentes
            </DialogTitle>
          </DialogHeader>
          
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap bg-muted/50 p-6 rounded-lg">
              {comparativeAnalysis}
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowComparativeAnalysis(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
