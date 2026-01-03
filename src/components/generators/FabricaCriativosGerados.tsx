import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreativeGenerationQueue, CreativeQueueItem } from "@/hooks/useCreativeGenerationQueue";
import { Loader2, Check, X, Eye, Send, Calendar, Sparkles, RefreshCw, Image } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreativeSocialPreviewModal } from "./CreativeSocialPreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

interface Props {
  clientId: string;
}

export function FabricaCriativosGerados({ clientId }: Props) {
  const { creatives, loading, fetchCreatives, updateStatus } = useCreativeGenerationQueue(clientId);
  const { activeCompany } = useCompany();
  const [selectedCreative, setSelectedCreative] = useState<CreativeQueueItem | null>(null);
  const [generating, setGenerating] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'published':
        return <Badge className="bg-blue-500">Publicado</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-500">Agendado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'concept':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pesquisa</Badge>;
      case 'iteration':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Iteração</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleGenerateManual = async () => {
    if (!activeCompany?.company_id) return;

    setGenerating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('daily-creative-generator', {
        body: {
          client_id: clientId,
          company_id: activeCompany.company_id,
          user_id: userData.user?.id,
          count: 1,
        },
      });

      if (response.error) throw response.error;

      toast.success('Criativo gerado com sucesso!');
      fetchCreatives();
    } catch (error: any) {
      console.error('Error generating creative:', error);
      toast.error('Erro ao gerar criativo: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const pendingCreatives = creatives.filter(c => c.status === 'pending');
  const approvedCreatives = creatives.filter(c => c.status === 'approved');
  const publishedCreatives = creatives.filter(c => ['published', 'scheduled'].includes(c.status));

  if (loading) {
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
          <h3 className="text-lg font-semibold">Criativos Gerados</h3>
          <p className="text-sm text-muted-foreground">
            {creatives.length} criativos • {pendingCreatives.length} pendentes • {approvedCreatives.length} aprovados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCreatives}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleGenerateManual} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Gerar Criativo
          </Button>
        </div>
      </div>

      {creatives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum criativo gerado ainda.
              <br />
              Clique em "Gerar Criativo" ou configure a geração automática.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creatives.map((creative) => (
            <Card key={creative.id} className="overflow-hidden">
              {creative.image_url ? (
                <div className="aspect-[3/4] relative">
                  <img
                    src={creative.image_url}
                    alt="Creative preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    {getStatusBadge(creative.status)}
                    {getTypeBadge(creative.generation_type)}
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                  <Image className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              <CardContent className="p-4 space-y-3">
                <p className="text-sm line-clamp-2">
                  {creative.caption || 'Sem legenda'}
                </p>
                
                <p className="text-xs text-muted-foreground">
                  {format(new Date(creative.generated_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCreative(creative)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  
                  {creative.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 hover:text-green-600"
                        onClick={() => updateStatus(creative.id, 'approved')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => updateStatus(creative.id, 'rejected')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCreative && (
        <CreativeSocialPreviewModal
          creative={selectedCreative}
          open={!!selectedCreative}
          onOpenChange={(open) => !open && setSelectedCreative(null)}
          onStatusChange={(status) => {
            updateStatus(selectedCreative.id, status);
            setSelectedCreative(null);
          }}
          onRefresh={fetchCreatives}
        />
      )}
    </div>
  );
}
