import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Loader2, Check, X, Eye, BookOpen, Users, Sparkles, LayoutGrid, Wand2, RefreshCw, Clock, CheckCircle, XCircle, Send } from "lucide-react";
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
  position?: number;
  slide_number?: number;
  type?: string;
  headline?: string;
  body?: string;
  body_text?: string;
  image_url?: string;
  [key: string]: any;
}

interface Carousel {
  id: string;
  carousel_type: string;
  slides: Slide[];
  caption: string | null;
  hashtags?: string | null;
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

const statusFilters = [
  { value: 'all', label: 'Todos', icon: Layers },
  { value: 'pending', label: 'Pendentes', icon: Clock },
  { value: 'approved', label: 'Aprovados', icon: CheckCircle },
  { value: 'rejected', label: 'Rejeitados', icon: XCircle },
  { value: 'published', label: 'Publicados', icon: Send },
];

export function FabricaCarrosseisGerados({ clientId }: Props) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { isGenerating, generateCarousels } = useCarouselGeneration();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const handleGenerate = async (type?: "tutorial" | "comparison" | "behind_scenes" | "curated_list") => {
    if (!activeCompany?.company_id || !userId) {
      toast.error('Erro: usuário não autenticado');
      return;
    }

    const result = await generateCarousels({
      clientId,
      companyId: activeCompany.company_id,
      userId,
      carouselType: type,
      count: 1,
    });

    if (result.success && result.generated > 0) {
      toast.success(`${result.generated} carrossel(s) gerado(s)!`);
      queryClient.invalidateQueries({ queryKey: ['carousel-client-queue'] });
    }
  };

  const { data: carousels, isLoading } = useQuery({
    queryKey: ['carousel-client-queue', clientId, activeCompany?.company_id, statusFilter],
    queryFn: async () => {
      if (!activeCompany?.company_id || !clientId) return [];

      let query = supabase
        .from('carousel_generation_queue')
        .select('id, carousel_type, slides, caption, hashtags, cta_text, theme, status, generated_at, client_id')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .order('generated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

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

  const handlePublishNow = () => {
    toast.info('Funcionalidade de publicação será implementada em breve');
  };

  const handleSchedule = () => {
    toast.info('Funcionalidade de agendamento será implementada em breve');
  };

  const handleSendToPresentation = () => {
    toast.info('Funcionalidade de envio para apresentação será implementada em breve');
  };

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

  return (
    <>
      {/* Header with Filters and Generate Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="font-medium">Carrosséis Gerados</h3>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Status Filters */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-5 w-full">
              {statusFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <TabsTrigger 
                    key={filter.value} 
                    value={filter.value}
                    className="text-xs px-2"
                  >
                    <Icon className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{filter.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Generate Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isGenerating} size="sm">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Gerar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        </div>
      </div>

      {/* Empty State */}
      {(!carousels || carousels.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
              {statusFilter === 'all' ? 'Nenhum carrossel gerado' : `Nenhum carrossel ${statusFilters.find(f => f.value === statusFilter)?.label.toLowerCase()}`}
            </h3>
            <p className="text-muted-foreground text-center mt-2 mb-4">
              {statusFilter === 'all' 
                ? 'Clique no botão "Gerar" para criar seu primeiro carrossel'
                : 'Altere o filtro para ver outros carrosséis'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Carousels Grid - 3:4 Aspect Ratio */}
      {carousels && carousels.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {carousels.map((carousel) => {
            const TypeIcon = typeIcons[carousel.carousel_type] || Layers;
            const firstSlide = carousel.slides[0];
            
            return (
              <Card key={carousel.id} className="overflow-hidden group">
                <div 
                  className="aspect-[3/4] bg-muted relative cursor-pointer"
                  onClick={() => setSelectedCarousel(carousel)}
                >
                  {firstSlide?.image_url ? (
                    <img 
                      src={firstSlide.image_url} 
                      alt="Capa do carrossel"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5 p-4">
                      <Layers className="h-10 w-10 text-violet-500/50 mb-2" />
                      {firstSlide?.headline && (
                        <p className="text-xs text-center font-medium line-clamp-3">
                          {firstSlide.headline}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Type Badge */}
                  <Badge className={`absolute top-2 left-2 text-xs ${typeColors[carousel.carousel_type]}`}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {typeLabels[carousel.carousel_type]}
                  </Badge>
                  
                  {/* Slides Count */}
                  <Badge className="absolute top-2 right-2 bg-background/80 text-xs">
                    {carousel.slides.length} slides
                  </Badge>

                  {/* Status Badge */}
                  <div className="absolute bottom-2 left-2 right-2">
                    {carousel.status === 'pending' && (
                      <Badge className="w-full justify-center bg-yellow-100 text-yellow-700 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                    {carousel.status === 'approved' && (
                      <Badge className="w-full justify-center bg-green-100 text-green-700 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aprovado
                      </Badge>
                    )}
                    {carousel.status === 'rejected' && (
                      <Badge className="w-full justify-center bg-red-100 text-red-700 text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejeitado
                      </Badge>
                    )}
                    {carousel.status === 'published' && (
                      <Badge className="w-full justify-center bg-blue-100 text-blue-700 text-xs">
                        <Send className="h-3 w-3 mr-1" />
                        Publicado
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Quick Actions (Only for pending) */}
                {carousel.status === 'pending' && (
                  <CardContent className="p-2">
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus.mutate({ id: carousel.id, status: 'rejected' });
                        }}
                        disabled={updateStatus.isPending}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Rejeitar
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm" 
                        className="flex-1 h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus.mutate({ id: carousel.id, status: 'approved' });
                        }}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Aprovar
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
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
          onPublishNow={handlePublishNow}
          onSchedule={handleSchedule}
          onSendToPresentation={handleSendToPresentation}
        />
      )}
    </>
  );
}
