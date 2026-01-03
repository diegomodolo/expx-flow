import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, Loader2, Check, X, Clock, Sparkles, Copy, Lightbulb, RefreshCw, Trash2 } from "lucide-react";
import { AdPreviewCard } from "@/components/ad-factory/AdPreviewCard";
import { ApprovalDestinationDialogV2 } from "@/components/ad-factory/ApprovalDestinationDialogV2";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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

const statusConfig: Record<
  GenerationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pending: { label: "Pendente", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  approved: { label: "Aprovado", variant: "default", icon: <Check className="h-3 w-3" /> },
  rejected: { label: "Rejeitado", variant: "destructive", icon: <X className="h-3 w-3" /> },
  published: { label: "Publicado", variant: "outline", icon: <Sparkles className="h-3 w-3" /> },
};

const typeConfig: Record<GenerationType, { label: string; icon: React.ReactNode; color: string }> = {
  clone: { label: "Clone", icon: <Copy className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600" },
  concept: { label: "Conceito", icon: <Lightbulb className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-600" },
  iteration: { label: "Iteração", icon: <RefreshCw className="h-4 w-4" />, color: "bg-green-500/10 text-green-600" },
};

export function FabricaAnunciosGerados({ clientId }: Props) {
  const { activeCompany } = useCompany();
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<GenerationType>("concept");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<GeneratedAd | null>(null);

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [adToPublish, setAdToPublish] = useState<GeneratedAd | null>(null);

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

  const openApprovalDialog = (ad: GeneratedAd) => {
    if (!activeCompany?.company_id) {
      toast.error('Selecione uma empresa ativa primeiro');
      return;
    }

    setSelectedAd(null); // avoid stacking dialogs
    setAdToPublish(ad);
    setApprovalDialogOpen(true);
  };

  const handleApproveAndPublish = async (destinations: SelectedDestination[], adConfig: AdConfig) => {
    if (!adToPublish || !activeCompany?.company_id) return;

    console.log('[FabricaAnunciosGerados] Publishing ad:', adToPublish.id, 'to destinations:', destinations);

    const { data, error } = await supabase.functions.invoke('publish-approved-ads', {
      body: {
        client_id: clientId,
        company_id: activeCompany.company_id,
        ad_id: adToPublish.id,
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
    setAdToPublish(null);
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

      toast.success(`Status atualizado para "${statusConfig[newStatus].label}"`);
      refetch();
      setSelectedAd(null);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteAd = async (adId: string) => {
    try {
      const { error } = await supabase
        .from('ad_generation_queue')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      toast.success('Anúncio excluído com sucesso');
      refetch();
      setSelectedAd(null);
    } catch (error: any) {
      console.error('Error deleting ad:', error);
      toast.error('Erro ao excluir anúncio');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Anúncios Gerados</h3>
          <p className="text-sm text-muted-foreground">
            {ads?.length || 0} anúncios gerados pela fábrica
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <div
              key={ad.id}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                // Prevent the card "open details" click when user is clicking action buttons/checkboxes
                if (target.closest('button') || target.closest('[role="checkbox"]')) return;
                setSelectedAd(ad);
              }}
              className="cursor-pointer"
            >
              <AdPreviewCard
                ad={{
                  id: ad.id,
                  generation_type: ad.generation_type,
                  generated_content: {
                    headline: (ad.generated_content as any)?.headline,
                    body: (ad.generated_content as any)?.body || (ad.generated_content as any)?.primary_text,
                    cta: (ad.generated_content as any)?.call_to_action,
                    image_prompt: (ad.generated_content as any)?.image_prompt,
                    image_url: (ad.generated_content as any)?.creative_image_url,
                  },
                  status: ad.status,
                  quality_score: ad.quality_score,
                  generated_at: ad.generated_at,
                  concept_description: ad.concept_description || undefined,
                }}
                isSelected={false}
                onSelect={() => {}}
                onApprove={() => openApprovalDialog(ad)}
                onReject={() => handleUpdateStatus(ad.id, 'rejected')}
              />
            </div>
          ))}
        </div>
      )}

      {/* Ad Detail Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={(open) => !open && setSelectedAd(null)}>
        <DialogContent className="max-w-2xl">
          {selectedAd && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium ${typeConfig[selectedAd.generation_type]?.color}`}>
                    {typeConfig[selectedAd.generation_type]?.icon}
                    {typeConfig[selectedAd.generation_type]?.label}
                  </div>
                  <Badge variant={statusConfig[selectedAd.status]?.variant}>
                    {statusConfig[selectedAd.status]?.label}
                  </Badge>
                </div>
                <DialogTitle className="mt-2">
                  {(selectedAd.generated_content as any)?.headline || "Sem título"}
                </DialogTitle>
                <DialogDescription>
                  Gerado em {format(new Date(selectedAd.generated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[500px]">
                <div className="space-y-4 py-4">
                  {/* Creative Image */}
                  {(selectedAd.generated_content as any)?.creative_image_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Criativo</Label>
                      <div className="mt-2 rounded-lg overflow-hidden border">
                        <img 
                          src={(selectedAd.generated_content as any)?.creative_image_url} 
                          alt="Criativo do anúncio"
                          className="w-full h-auto max-h-64 object-contain bg-muted"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">Corpo do Anúncio</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {(selectedAd.generated_content as any)?.body || (selectedAd.generated_content as any)?.primary_text || "—"}
                    </p>
                  </div>

                  {(selectedAd.generated_content as any)?.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Descrição</Label>
                      <p className="mt-1 text-sm">
                        {(selectedAd.generated_content as any)?.description}
                      </p>
                    </div>
                  )}

                  {(selectedAd.generated_content as any)?.call_to_action && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Call to Action</Label>
                      <Badge variant="outline" className="mt-1">
                        {(selectedAd.generated_content as any)?.call_to_action}
                      </Badge>
                    </div>
                  )}

                  {selectedAd.quality_score !== null && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Score de Qualidade</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${selectedAd.quality_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedAd.quality_score}%</span>
                      </div>
                    </div>
                  )}

                  {selectedAd.concept_description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Conceito</Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedAd.concept_description}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O anúncio será permanentemente excluído.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteAd(selectedAd.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="flex gap-2">
                  {selectedAd.status === 'pending' && (
                    <>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleUpdateStatus(selectedAd.id, 'rejected')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Rejeitar
                      </Button>
                      <Button onClick={() => openApprovalDialog(selectedAd)}>
                        <Check className="h-4 w-4 mr-2" />
                        Aprovar e Publicar
                      </Button>
                    </>
                  )}
                  {selectedAd.status === 'approved' && (
                    <Button onClick={() => openApprovalDialog(selectedAd)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Publicar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ApprovalDestinationDialogV2
        open={approvalDialogOpen}
        onOpenChange={(open) => {
          setApprovalDialogOpen(open);
          if (!open) setAdToPublish(null);
        }}
        adId={adToPublish?.id || ''}
        clientId={clientId}
        companyId={activeCompany?.company_id || ''}
        defaultCampaignId={scheduleDefaults?.target_campaign_id ?? null}
        defaultAdSetId={scheduleDefaults?.target_adset_id ?? null}
        onApprove={handleApproveAndPublish}
        adContent={
          adToPublish
            ? {
                headline: (adToPublish.generated_content as any)?.headline,
                primary_text: (adToPublish.generated_content as any)?.primary_text || (adToPublish.generated_content as any)?.body,
                description: (adToPublish.generated_content as any)?.description,
                image_url: (adToPublish.generated_content as any)?.creative_image_url,
              }
            : undefined
        }
      />
    </div>
  );
}
