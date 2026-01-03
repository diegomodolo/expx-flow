import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, Loader2, Sparkles, Copy, Lightbulb, RefreshCw } from "lucide-react";
import { AdPreviewCard, GeneratedAdType } from "@/components/ad-factory/AdPreviewCard";
import { ApprovalDestinationDialogV2 } from "@/components/ad-factory/ApprovalDestinationDialogV2";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  clientId: string;
}

type GenerationType = "clone" | "concept" | "iteration";
type GenerationStatus = "pending" | "approved" | "rejected" | "published";

interface GeneratedAd {
  id: string;
  generation_type: GenerationType;
  status: GenerationStatus;
  quality_score: number | null;
  generated_content: {
    headline?: string;
    body?: string;
    primary_text?: string;
    description?: string;
    call_to_action?: string;
    image_prompt?: string;
    creative_image_url?: string;
    score_breakdown?: {
      visual: number;
      copy: number;
      headline_cta: number;
      conformidade: number;
    };
    score_explanation?: string;
    score_flags?: string[];
  };
  concept_description: string | null;
  generated_at: string;
  reviewed_at: string | null;
}

interface SelectedDestination {
  campaignId: string;
  campaignName: string;
  adSetIds: string[];
}

interface AdConfig {
  destination_url: string;
  primary_text: string;
  headline: string;
  description: string;
  cta: string;
  pixel_id: string;
  url_params: string;
}

const typeConfig: Record<GenerationType, { label: string; icon: React.ReactNode; color: string }> = {
  clone: { label: "Clone", icon: <Copy className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600" },
  concept: { label: "Conceito", icon: <Lightbulb className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-600" },
  iteration: { label: "Iteração", icon: <RefreshCw className="h-4 w-4" />, color: "bg-green-500/10 text-green-600" },
};

const statusFilters = [
  { value: "all", label: "Todos", icon: null },
  { value: "pending", label: "Em Aberto", icon: null },
  { value: "approved", label: "Aprovados", icon: null },
  { value: "rejected", label: "Rejeitados", icon: null },
  { value: "published", label: "Publicados", icon: null },
] as const;

export function FabricaAnunciosGerados({ clientId }: Props) {
  const { activeCompany } = useCompany();
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<GenerationType>("concept");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<GenerationStatus | "all">("pending");

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<GeneratedAd | null>(null);

  const { data: scheduleDefaults } = useQuery({
    queryKey: ["ad-generation-schedule-defaults", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_generation_schedules")
        .select("target_campaign_id, target_adset_id")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) throw error;
      return data as { target_campaign_id: string | null; target_adset_id: string | null } | null;
    },
    enabled: !!clientId,
  });

  const { data: ads, isLoading, refetch } = useQuery({
    queryKey: ['generated-ads', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_generation_queue')
        .select('*')
        .eq('client_id', clientId)
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as GeneratedAd[];
    },
    enabled: !!clientId,
  });

  const handleGenerateAd = async () => {
    if (!activeCompany?.company_id) return;

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Call the real AI generation edge function
      const { data, error } = await supabase.functions.invoke('daily-ad-generator', {
        body: {
          client_id: clientId,
          company_id: activeCompany.company_id,
          user_id: user.id,
          generation_type: selectedType,
          count: 1,
        },
      });

      if (error) {
        // Handle specific error codes
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          toast.error('Limite de requisições atingido. Aguarde alguns segundos e tente novamente.');
          return;
        }
        if (error.message?.includes('402') || error.message?.includes('payment') || error.message?.includes('credits')) {
          toast.error('Créditos insuficientes. Adicione créditos ao seu workspace.');
          return;
        }
        throw error;
      }

      if (data?.generated > 0) {
        toast.success(`Anúncio "${typeConfig[selectedType].label}" gerado com sucesso!`);
      } else {
        const reason = data?.errors?.[0] || 'Verifique se há dados suficientes (concorrentes, temas de pesquisa ou anúncios vencedores).';
        toast.warning(`Não foi possível gerar o anúncio. ${reason}`);
      }

      setDialogOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error generating ad:', error);
      toast.error('Erro ao gerar anúncio: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGenerating(false);
    }
  };

  const openAdDialog = (ad: GeneratedAd) => {
    if (!activeCompany?.company_id) {
      toast.error('Selecione uma empresa ativa primeiro');
      return;
    }

    setSelectedAd(ad);
    setApprovalDialogOpen(true);
  };

  const handleApproveAndPublish = async (destinations: SelectedDestination[], adConfig: AdConfig) => {
    if (!selectedAd || !activeCompany?.company_id) return;

    console.log('[FabricaAnunciosGerados] Publishing ad:', selectedAd.id, 'to destinations:', destinations);

    const { data, error } = await supabase.functions.invoke('publish-approved-ads', {
      body: {
        client_id: clientId,
        company_id: activeCompany.company_id,
        ad_id: selectedAd.id,
        destinations,
        ad_config: adConfig,
      },
    });

    if (error) {
      console.error('[FabricaAnunciosGerados] Publish error:', error);
      throw new Error(error.message);
    }

    if (data && data.success === false && data.error) {
      throw new Error(data.error);
    }

    if (data?.published > 0) {
      toast.success(`Anúncio publicado em ${data.published} destino(s)!`);
      if (data.failed > 0) toast.warning(`${data.failed} destino(s) falharam`);
    } else {
      toast.error('Nenhum anúncio foi publicado');
    }

    await refetch();
    setSelectedAd(null);
    setApprovalDialogOpen(false);
  };

  const handleUpdateStatus = async (adId: string, newStatus: GenerationStatus) => {
    try {
      const { error } = await supabase
        .from('ad_generation_queue')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', adId);

      if (error) throw error;

      toast.success(`Status atualizado!`);
      refetch();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter ads by status
  const filteredAds = (ads || []).filter((ad) => {
    if (filterStatus === "all") return true;
    return ad.status === filterStatus;
  });

  // Convert GeneratedAd to GeneratedAdType for components
  const convertToAdType = (ad: GeneratedAd): GeneratedAdType => ({
    id: ad.id,
    generation_type: ad.generation_type,
    generated_content: {
      headline: ad.generated_content?.headline,
      body: ad.generated_content?.body || ad.generated_content?.primary_text,
      cta: ad.generated_content?.call_to_action,
      image_prompt: ad.generated_content?.image_prompt,
      image_url: ad.generated_content?.creative_image_url,
      score_breakdown: ad.generated_content?.score_breakdown,
      score_explanation: ad.generated_content?.score_explanation,
      score_flags: ad.generated_content?.score_flags,
    },
    status: ad.status,
    quality_score: ad.quality_score,
    generated_at: ad.generated_at,
    concept_description: ad.concept_description || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Anúncios Gerados</h3>
          <p className="text-sm text-muted-foreground">
            {filteredAds.length} de {ads?.length || 0} anúncios
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Gerar Novo Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Novo Anúncio</DialogTitle>
              <DialogDescription>
                Escolha o tipo de anúncio que deseja gerar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Geração</Label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as GenerationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clone">
                      <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Clone (baseado em concorrentes)
                      </div>
                    </SelectItem>
                    <SelectItem value="concept">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Conceito (baseado em pesquisa)
                      </div>
                    </SelectItem>
                    <SelectItem value="iteration">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Iteração (baseado em vencedores)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                {selectedType === 'clone' && (
                  <p>Gera um anúncio inspirado nos anúncios dos concorrentes cadastrados.</p>
                )}
                {selectedType === 'concept' && (
                  <p>Gera um anúncio baseado nos temas de pesquisa e insights de mercado.</p>
                )}
                {selectedType === 'iteration' && (
                  <p>Gera uma variação de um anúncio vencedor existente.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateAd} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Anúncio
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={filterStatus === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {!ads?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum anúncio gerado ainda</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Clique em "Gerar Novo Anúncio" para criar seu primeiro anúncio ou configure a geração automática na aba Geral.
            </p>
          </CardContent>
        </Card>
      ) : filteredAds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum anúncio neste status</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Altere o filtro para ver outros anúncios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredAds.map((ad) => (
            <AdPreviewCard
              key={ad.id}
              ad={convertToAdType(ad)}
              isSelected={false}
              onSelect={() => {}}
              onApprove={() => openAdDialog(ad)}
              onReject={() => handleUpdateStatus(ad.id, 'rejected')}
              onViewDetails={() => openAdDialog(ad)}
              compact
            />
          ))}
        </div>
      )}

      {activeCompany?.company_id && (
        <ApprovalDestinationDialogV2
          open={approvalDialogOpen}
          onOpenChange={(open) => {
            setApprovalDialogOpen(open);
            if (!open) setSelectedAd(null);
          }}
          adId={selectedAd?.id || ''}
          clientId={clientId}
          companyId={activeCompany.company_id}
          defaultCampaignId={scheduleDefaults?.target_campaign_id ?? null}
          defaultAdSetId={scheduleDefaults?.target_adset_id ?? null}
          onApprove={handleApproveAndPublish}
          onStatusChange={() => refetch()}
          ad={selectedAd ? convertToAdType(selectedAd) : null}
          adContent={
            selectedAd
              ? {
                  headline: selectedAd.generated_content?.headline,
                  primary_text: selectedAd.generated_content?.primary_text || selectedAd.generated_content?.body,
                  description: selectedAd.generated_content?.description,
                  image_url: selectedAd.generated_content?.creative_image_url,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
