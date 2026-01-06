import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreativeGenerationQueue, CreativeQueueItem } from "@/hooks/useCreativeGenerationQueue";
import { Loader2, Check, X, Eye, Sparkles, RefreshCw, Image, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreativeSocialPreviewModal } from "./CreativeSocialPreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CreativeGenerationModal } from "./CreativeGenerationModal";

interface Props {
  clientId: string;
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'published' | 'all';

export function FabricaCriativosGerados({ clientId }: Props) {
  const { creatives, loading, fetchCreatives, updateStatus } = useCreativeGenerationQueue(clientId);
  const { activeCompany } = useCompany();
  const [selectedCreative, setSelectedCreative] = useState<CreativeQueueItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [showGenerationModal, setShowGenerationModal] = useState(false);

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

  const handleGenerateSingle = async () => {
    if (!activeCompany?.company_id) throw new Error("Empresa não encontrada");

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
    
    fetchCreatives();
  };

  const handleGenerationComplete = () => {
    toast.success('Geração concluída!');
    fetchCreatives();
  };

  // Contadores por status
  const pendingCount = creatives.filter(c => c.status === 'pending').length;
  const approvedCount = creatives.filter(c => c.status === 'approved').length;
  const rejectedCount = creatives.filter(c => c.status === 'rejected').length;
  const publishedCount = creatives.filter(c => ['published', 'scheduled'].includes(c.status)).length;

  // Filtrar criativos pelo status selecionado
  const filteredCreatives = statusFilter === 'all' 
    ? creatives 
    : statusFilter === 'published'
      ? creatives.filter(c => ['published', 'scheduled'].includes(c.status))
      : creatives.filter(c => c.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Criativos Gerados</h3>
          <p className="text-sm text-muted-foreground">
            {creatives.length} criativos • {pendingCount} abertos • {approvedCount} aprovados • {publishedCount} publicados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCreatives}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowGenerationModal(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Criativos
          </Button>
        </div>
      </div>

      {/* Filtros de Status */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <ToggleGroup 
          type="single" 
          value={statusFilter} 
          onValueChange={(value) => value && setStatusFilter(value as StatusFilter)}
          className="justify-start"
        >
          <ToggleGroupItem value="pending" aria-label="Filtrar abertos" className="data-[state=on]:bg-yellow-500/20 data-[state=on]:text-yellow-600">
            Abertos ({pendingCount})
          </ToggleGroupItem>
          <ToggleGroupItem value="approved" aria-label="Filtrar aprovados" className="data-[state=on]:bg-green-500/20 data-[state=on]:text-green-600">
            Aprovados ({approvedCount})
          </ToggleGroupItem>
          <ToggleGroupItem value="rejected" aria-label="Filtrar rejeitados" className="data-[state=on]:bg-red-500/20 data-[state=on]:text-red-600">
            Rejeitados ({rejectedCount})
          </ToggleGroupItem>
          <ToggleGroupItem value="published" aria-label="Filtrar publicados" className="data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600">
            Publicados ({publishedCount})
          </ToggleGroupItem>
          <ToggleGroupItem value="all" aria-label="Ver todos">
            Todos ({creatives.length})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filteredCreatives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {creatives.length === 0 ? (
                <>Nenhum criativo gerado ainda.<br />Clique em "Gerar Criativo" ou configure a geração automática.</>
              ) : (
                <>Nenhum criativo com o status "{statusFilter === 'pending' ? 'Aberto' : statusFilter === 'approved' ? 'Aprovado' : statusFilter === 'rejected' ? 'Rejeitado' : 'Publicado'}".</>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredCreatives.map((creative) => (
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

      <CreativeGenerationModal
        open={showGenerationModal}
        onOpenChange={(open) => {
          setShowGenerationModal(open);
          if (!open) fetchCreatives();
        }}
        onGenerate={handleGenerateSingle}
      />
    </div>
  );
}
