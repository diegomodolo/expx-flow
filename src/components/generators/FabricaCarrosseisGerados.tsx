import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Loader2, Check, X, Eye, BookOpen, Users, Sparkles, LayoutGrid, Wand2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CarouselPreviewModal } from "./CarouselPreviewModal";
import { useCarouselGeneration } from "@/hooks/useCarouselGeneration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Slide {
  position: number;
  type: string;
  headline?: string;
  body?: string;
  image_url?: string;
  [key: string]: any;
}

interface Carousel {
  id: string;
  carousel_type: string;
  slides: Slide[];
  caption: string | null;
  cta_text: string | null;
  theme: string | null;
  status: string;
  generated_at: string;
  client_id: string;
  clients?: { name: string } | null;
}

interface Props {
  clientId: string;
}

const typeIcons: Record<string, typeof BookOpen> = {
  tutorial: BookOpen,
  comparison: Users,
  behind_scenes: Sparkles,
  curated_list: LayoutGrid,
};

const typeLabels: Record<string, string> = {
  tutorial: "Tutorial/Hack",
  comparison: "Nós vs. Eles",
  behind_scenes: "Bastidores",
  curated_list: "Curadoria",
};

const typeColors: Record<string, string> = {
  tutorial: "bg-blue-100 text-blue-700",
  comparison: "bg-orange-100 text-orange-700",
  behind_scenes: "bg-purple-100 text-purple-700",
  curated_list: "bg-green-100 text-green-700",
};

export function FabricaCarrosseisGerados({ clientId }: Props) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const { isGenerating, generateCarousels } = useCarouselGeneration();

  const handleGenerate = async (type?: "tutorial" | "comparison" | "behind_scenes" | "curated_list") => {
    if (!activeCompany?.company_id) return;

    const result = await generateCarousels({
      clientId,
      companyId: activeCompany.company_id,
      carouselType: type,
      count: 1,
    });

    if (result.success && result.generated > 0) {
      toast.success(`${result.generated} carrossel(s) gerado(s)!`);
      queryClient.invalidateQueries({ queryKey: ['carousel-client-queue'] });
    }
  };

  const { data: carousels, isLoading } = useQuery({
    queryKey: ['carousel-client-queue', clientId, activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id || !clientId) return [];

      const { data, error } = await supabase
        .from('carousel_generation_queue')
        .select('id, carousel_type, slides, caption, cta_text, theme, status, generated_at, client_id')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .in('status', ['pending', 'approved'])
        .order('generated_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        slides: (item.slides as unknown as Slide[]) || [],
        clients: null
      })) as Carousel[];
    },
    enabled: !!activeCompany?.company_id && !!clientId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('carousel_generation_queue')
        .update({ 
          status, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['carousel-client-queue'] });
      toast.success(status === 'approved' ? 'Carrossel aprovado!' : 'Carrossel rejeitado');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!carousels || carousels.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum carrossel gerado</h3>
          <p className="text-muted-foreground text-center mt-2 mb-4">
            Clique no botão abaixo para gerar seu primeiro carrossel
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Gerar Carrossel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => handleGenerate()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Automático
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerate('tutorial')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Tutorial/Hack
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerate('comparison')}>
                <Users className="h-4 w-4 mr-2" />
                Nós vs. Eles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerate('behind_scenes')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Bastidores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerate('curated_list')}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Curadoria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Carrosséis Gerados</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Gerar Carrossel
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleGenerate()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Automático (baseado em config)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleGenerate('tutorial')}>
              <BookOpen className="h-4 w-4 mr-2" />
              Tutorial/Hack
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleGenerate('comparison')}>
              <Users className="h-4 w-4 mr-2" />
              Nós vs. Eles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleGenerate('behind_scenes')}>
              <Sparkles className="h-4 w-4 mr-2" />
              Bastidores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleGenerate('curated_list')}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Curadoria
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {carousels.map((carousel) => {
          const TypeIcon = typeIcons[carousel.carousel_type] || Layers;
          const firstSlide = carousel.slides[0];
          
          return (
            <Card key={carousel.id} className="overflow-hidden">
              <div 
                className="aspect-square bg-muted relative cursor-pointer group"
                onClick={() => setSelectedCarousel(carousel)}
              >
                {firstSlide?.image_url ? (
                  <img 
                    src={firstSlide.image_url} 
                    alt="Capa do carrossel"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5">
                    <Layers className="h-16 w-16 text-violet-500/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white" />
                </div>
                <Badge className={`absolute top-2 left-2 ${typeColors[carousel.carousel_type]}`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeLabels[carousel.carousel_type]}
                </Badge>
                <Badge className="absolute top-2 right-2 bg-background/80">
                  {carousel.slides.length} slides
                </Badge>
              </div>
              
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {firstSlide?.headline || carousel.theme || 'Sem título'}
                </p>
                
                {carousel.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => updateStatus.mutate({ id: carousel.id, status: 'rejected' })}
                      disabled={updateStatus.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => updateStatus.mutate({ id: carousel.id, status: 'approved' })}
                      disabled={updateStatus.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                  </div>
                )}
                {carousel.status === 'approved' && (
                  <Badge className="w-full justify-center bg-green-100 text-green-700">
                    Aprovado
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedCarousel && (
        <CarouselPreviewModal
          carousel={selectedCarousel}
          open={!!selectedCarousel}
          onOpenChange={(open) => !open && setSelectedCarousel(null)}
          onApprove={selectedCarousel.status === 'pending' ? () => {
            updateStatus.mutate({ id: selectedCarousel.id, status: 'approved' });
            setSelectedCarousel(null);
          } : undefined}
          onReject={selectedCarousel.status === 'pending' ? () => {
            updateStatus.mutate({ id: selectedCarousel.id, status: 'rejected' });
            setSelectedCarousel(null);
          } : undefined}
        />
      )}
    </>
  );
}
