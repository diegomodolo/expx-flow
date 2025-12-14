import { usePresentationDetails } from "@/hooks/usePresentations";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PresentationPreviewProps {
  presentationId: string;
}

export function PresentationPreview({ presentationId }: PresentationPreviewProps) {
  const { data, isLoading } = usePresentationDetails(presentationId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-video w-full" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="w-20 h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Apresentação não encontrada.</p>
      </Card>
    );
  }

  const creatives = data.creatives || [];
  const totalSlides = 3 + creatives.length; // Cover + Summary + Separator + creatives

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        A apresentação terá aproximadamente <strong>{totalSlides} slides</strong>:
        capa, resumo, separador e {creatives.length} criativos.
      </div>

      {/* Preview iframe */}
      <Card className="overflow-hidden">
        <div 
          className="aspect-video relative flex items-center justify-center"
          style={{ backgroundColor: data.primary_color }}
        >
          <div className="text-center text-white p-8">
            <h1 className="text-4xl font-bold mb-2">{data.clients?.company || data.clients?.name}</h1>
            <p className="text-xl opacity-90">Planejamento de Conteúdo</p>
            <p className="text-lg opacity-75 mt-4">
              {new Date(data.year, data.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </Card>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {/* Cover */}
        <div 
          className="w-24 h-16 rounded flex-shrink-0 flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: data.primary_color }}
        >
          Capa
        </div>

        {/* Summary */}
        <div className="w-24 h-16 rounded flex-shrink-0 flex items-center justify-center bg-muted text-xs">
          Resumo
        </div>

        {/* Separator */}
        <div 
          className="w-24 h-16 rounded flex-shrink-0 flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: data.primary_color }}
        >
          Conteúdos
        </div>

        {/* Creatives */}
        {creatives.map((creative, index) => {
          const firstMedia = creative.creative_media?.[0];
          return (
            <div 
              key={creative.id}
              className="w-24 h-16 rounded flex-shrink-0 overflow-hidden bg-muted relative"
            >
              {firstMedia ? (
                firstMedia.media_type === 'image' ? (
                  <img 
                    src={firstMedia.media_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video 
                    src={firstMedia.media_url} 
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  Post {index + 1}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">
                {creative.creative_type}
              </div>
            </div>
          );
        })}

        {/* Thank you */}
        <div 
          className="w-24 h-16 rounded flex-shrink-0 flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: data.primary_color }}
        >
          Obrigado!
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Clique em "Publicar" para gerar o link público da apresentação que pode ser compartilhado com o cliente.
      </p>
    </div>
  );
}
