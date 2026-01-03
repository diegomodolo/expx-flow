import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, Loader2, Eye, Check, X, Clock, Sparkles, Copy, Lightbulb, RefreshCw } from "lucide-react";
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
    description?: string;
    call_to_action?: string;
    image_prompt?: string;
  };
  concept_description: string | null;
  generated_at: string;
  reviewed_at: string | null;
}

const statusConfig: Record<GenerationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
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
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create a placeholder entry - in a real implementation, this would trigger an AI generation
      const { error } = await supabase
        .from('ad_generation_queue')
        .insert({
          client_id: clientId,
          company_id: activeCompany.company_id,
          user_id: user.id,
          generation_type: selectedType,
          status: 'pending',
          generated_content: {
            headline: `[Aguardando geração - ${typeConfig[selectedType].label}]`,
            body: "O conteúdo será gerado em breve...",
            description: "",
            call_to_action: "Saiba Mais",
          },
          concept_description: selectedType === 'concept' ? 'Gerado manualmente' : null,
        });

      if (error) throw error;

      toast.success(`Anúncio do tipo "${typeConfig[selectedType].label}" adicionado à fila!`);
      setDialogOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error generating ad:', error);
      toast.error('Erro ao gerar anúncio: ' + error.message);
    } finally {
      setGenerating(false);
    }
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
                {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Gerar Anúncio
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => {
            const content = ad.generated_content as GeneratedAd['generated_content'];
            const type = typeConfig[ad.generation_type] || typeConfig.concept;
            const status = statusConfig[ad.status] || statusConfig.pending;

            return (
              <Card key={ad.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAd(ad)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium ${type.color}`}>
                      {type.icon}
                      {type.label}
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-base line-clamp-2 mt-2">
                    {content?.headline || "Sem título"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {format(new Date(ad.generated_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {content?.body || "Sem conteúdo"}
                  </p>
                  {ad.quality_score !== null && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Qualidade:</span>
                      <Badge variant="outline" className="text-xs">
                        {ad.quality_score}%
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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

              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Corpo do Anúncio</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {(selectedAd.generated_content as any)?.body || "—"}
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
                <Button variant="outline" onClick={() => setSelectedAd(null)}>
                  Fechar
                </Button>
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
                      <Button onClick={() => handleUpdateStatus(selectedAd.id, 'approved')}>
                        <Check className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                    </>
                  )}
                  {selectedAd.status === 'approved' && (
                    <Button onClick={() => handleUpdateStatus(selectedAd.id, 'published')}>
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
    </div>
  );
}
