import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAllCreatives, UnifiedCreative } from "@/hooks/useAllCreatives";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Images, Filter, Eye, Download, Calendar, User, Sparkles, Factory, Check, ChevronsUpDown, Megaphone, FileText, Search, X, LayoutGrid, ChevronLeft, ChevronRight, ImageOff, RefreshCw, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SendToScheduleModal } from "@/components/repositorio-criativos/SendToScheduleModal";
import { SendToPresentationModal } from "@/components/repositorio-criativos/SendToPresentationModal";
import { RegenerateCarouselModal } from "@/components/repositorio-criativos/RegenerateCarouselModal";
import { ImageEditorModal } from "@/components/image-editor/ImageEditorModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

type SourceFilter = 'all' | 'fabrica_criativos' | 'gerador_criativos' | 'fabrica_anuncios' | 'fabrica_carrosseis';
type StatusFilter = 'all' | 'pending' | 'approved' | 'published' | 'rejected' | 'completed' | 'generating';

export default function RepositorioCriativos() {
  const { activeCompany } = useCompany();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const { creatives, allClients, loading, loadingMore, hasMore, loadMore, totalCounts, refetch } = useAllCreatives(selectedClientId || undefined);
  const [selectedCreative, setSelectedCreative] = useState<UnifiedCreative | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showImageEditorModal, setShowImageEditorModal] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Handler to update image in the correct table based on source
  const handleImageEdited = async (newImages: string[]) => {
    if (!selectedCreative || !newImages[0]) return;
    
    const newImageUrl = newImages[0];
    
    try {
      let error = null;
      
      switch (selectedCreative.source) {
        case 'fabrica_criativos':
          const { error: fcError } = await supabase
            .from('creative_generation_queue')
            .update({ image_url: newImageUrl })
            .eq('id', selectedCreative.id);
          error = fcError;
          break;
          
        case 'gerador_criativos':
          const { error: gcError } = await supabase
            .from('visual_creatives')
            .update({ image_url: newImageUrl })
            .eq('id', selectedCreative.id);
          error = gcError;
          break;
          
        case 'fabrica_anuncios':
          // Need to update generated_content JSON
          const { data: adData } = await supabase
            .from('ad_generation_queue')
            .select('generated_content')
            .eq('id', selectedCreative.id)
            .single();
          
          if (adData) {
            const content = adData.generated_content as any || {};
            content.image_url = newImageUrl;
            content.creative_image_url = newImageUrl;
            
            const { error: faError } = await supabase
              .from('ad_generation_queue')
              .update({ generated_content: content })
              .eq('id', selectedCreative.id);
            error = faError;
          }
          break;
          
        case 'fabrica_carrosseis':
          // For carousels, update the current slide's image
          const { data: carouselData } = await supabase
            .from('carousel_generation_queue')
            .select('slides')
            .eq('id', selectedCreative.id)
            .single();
          
          if (carouselData && carouselData.slides) {
            const slides = carouselData.slides as any[];
            if (slides[currentSlideIndex]) {
              slides[currentSlideIndex].image_url = newImageUrl;
              
              const { error: ccError } = await supabase
                .from('carousel_generation_queue')
                .update({ 
                  slides: slides,
                  cover_image_url: currentSlideIndex === 0 ? newImageUrl : undefined
                })
                .eq('id', selectedCreative.id);
              error = ccError;
            }
          }
          break;
      }
      
      if (error) {
        console.error('Error updating image:', error);
        toast.error('Erro ao salvar imagem editada');
        return;
      }
      
      toast.success('Imagem atualizada com sucesso!');
      setShowImageEditorModal(false);
      
      // Update local state
      if (selectedCreative.source === 'fabrica_carrosseis' && selectedCreative.slides) {
        const updatedSlides = [...selectedCreative.slides];
        if (updatedSlides[currentSlideIndex]) {
          updatedSlides[currentSlideIndex] = { ...updatedSlides[currentSlideIndex], image_url: newImageUrl };
        }
        setSelectedCreative({
          ...selectedCreative,
          slides: updatedSlides,
          image_url: currentSlideIndex === 0 ? newImageUrl : selectedCreative.image_url
        });
      } else {
        setSelectedCreative({
          ...selectedCreative,
          image_url: newImageUrl
        });
      }
      
      // Refetch to update list
      refetch?.();
      
    } catch (err) {
      console.error('Error updating image:', err);
      toast.error('Erro ao salvar imagem editada');
    }
  };

  // Reset slide index when selecting a new creative
  const handleSelectCreative = (creative: UnifiedCreative) => {
    setSelectedCreative(creative);
    setCurrentSlideIndex(0);
  };

  // Get all images for carousel navigation
  const getCarouselImages = (creative: UnifiedCreative): string[] => {
    if (creative.source === 'fabrica_carrosseis' && creative.slides && creative.slides.length > 0) {
      return creative.slides
        .map(slide => slide.image_url)
        .filter((url): url is string => !!url);
    }
    // Fallback to single image
    return creative.image_url ? [creative.image_url] : [];
  };

  // Count missing images in carousel
  const getMissingImagesInfo = (creative: UnifiedCreative): { missing: number; total: number } => {
    if (creative.source !== 'fabrica_carrosseis' || !creative.slides) {
      return { missing: 0, total: 0 };
    }
    const total = creative.slides.length;
    const missing = creative.slides.filter(slide => !slide.image_url).length;
    return { missing, total };
  };

  // Refresh creatives after regeneration
  const handleRegenerateComplete = () => {
    // Close modals and reset
    setShowRegenerateModal(false);
    setSelectedCreative(null);
    // The page will reload creatives automatically due to state change
    window.location.reload();
  };

  const handlePrevSlide = () => {
    if (!selectedCreative) return;
    const images = getCarouselImages(selectedCreative);
    setCurrentSlideIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    if (!selectedCreative) return;
    const images = getCarouselImages(selectedCreative);
    setCurrentSlideIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return "Todos os clientes";
    const client = allClients.find(c => c.id === selectedClientId);
    return client?.name || "Todos os clientes";
  }, [selectedClientId, allClients]);

  // Filtrar criativos localmente
  const filteredCreatives = useMemo(() => {
    return creatives.filter(creative => {
      // Filtro por origem/tipo de fábrica
      if (sourceFilter !== 'all' && creative.source !== sourceFilter) {
        return false;
      }
      
      // Filtro por status
      if (statusFilter !== 'all' && creative.status !== statusFilter) {
        return false;
      }
      
      // Filtro por busca textual (legenda, título, tema)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCaption = creative.caption?.toLowerCase().includes(query);
        const matchesTitle = creative.title?.toLowerCase().includes(query);
        const matchesTheme = creative.theme?.toLowerCase().includes(query);
        const matchesClient = creative.client_name?.toLowerCase().includes(query);
        
        if (!matchesCaption && !matchesTitle && !matchesTheme && !matchesClient) {
          return false;
        }
      }
      
      return true;
    });
  }, [creatives, sourceFilter, statusFilter, searchQuery]);

  const hasActiveFilters = sourceFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSourceFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setSelectedClientId('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      approved: { label: "Aprovado", variant: "default" },
      rejected: { label: "Rejeitado", variant: "destructive" },
      completed: { label: "Concluído", variant: "default" },
      generating: { label: "Gerando", variant: "outline" },
      failed: { label: "Falhou", variant: "destructive" },
      error: { label: "Erro", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSourceBadge = (source: 'fabrica_criativos' | 'gerador_criativos' | 'fabrica_anuncios' | 'fabrica_carrosseis') => {
    if (source === 'fabrica_criativos') {
      return (
        <Badge variant="outline" className="gap-1 bg-primary/5">
          <Factory className="h-3 w-3" />
          Fábrica Criativos
        </Badge>
      );
    }
    if (source === 'fabrica_anuncios') {
      return (
        <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/30">
          <Megaphone className="h-3 w-3" />
          Fábrica Anúncios
        </Badge>
      );
    }
    if (source === 'fabrica_carrosseis') {
      return (
        <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-600 border-purple-500/30">
          <LayoutGrid className="h-3 w-3" />
          Fábrica Carrosséis
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 bg-secondary/50">
        <Sparkles className="h-3 w-3" />
        Gerador
      </Badge>
    );
  };

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Images className="h-6 w-6 text-primary" />
              Repositório de Criativos
            </h1>
            <p className="text-muted-foreground mt-1">
              Todos os criativos gerados pela Fábrica de Criativos e Gerador de Criativos
            </p>
          </div>

        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por legenda, título, tema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Client Filter */}
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-[200px] justify-between"
              >
                <User className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">{selectedClientName}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setSelectedClientId("");
                        setComboboxOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClientId === "" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todos os clientes
                    </CommandItem>
                    {allClients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setSelectedClientId(client.id);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClientId === client.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Source Filter */}
          <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as SourceFilter)}>
            <SelectTrigger className="w-[180px]">
              <Factory className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="fabrica_anuncios">Fábrica de Anúncios</SelectItem>
              <SelectItem value="fabrica_criativos">Fábrica de Criativos</SelectItem>
              <SelectItem value="fabrica_carrosseis">Fábrica de Carrosséis</SelectItem>
              <SelectItem value="gerador_criativos">Gerador de Criativos</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="generating">Gerando</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalCounts.total} criativos no total</span>
          <span>•</span>
          <span>{totalCounts.fabricaAnuncios} da Fábrica de Anúncios</span>
          <span>•</span>
          <span>{totalCounts.fabricaCriativos} da Fábrica de Criativos</span>
          <span>•</span>
          <span>{totalCounts.fabricaCarrosseis} da Fábrica de Carrosséis</span>
          <span>•</span>
          <span>{totalCounts.geradorCriativos} do Gerador</span>
          {hasActiveFilters && (
            <>
              <span>•</span>
              <span className="text-primary font-medium">{filteredCreatives.length} filtrados</span>
            </>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[3/4] w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCreatives.length === 0 ? (
          <Card className="p-12 text-center">
            <Images className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhum criativo encontrado</h3>
            <p className="text-muted-foreground mt-1">
              {hasActiveFilters
                ? "Nenhum criativo corresponde aos filtros selecionados."
                : selectedClientId 
                  ? "Este cliente ainda não possui criativos gerados."
                  : "Comece gerando criativos através da Fábrica ou Gerador de Criativos."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                Limpar filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredCreatives.map((creative) => (
              <Card 
                key={`${creative.source}-${creative.id}`} 
                className="overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelectCreative(creative)}
              >
                {/* Image */}
                <div className="aspect-[3/4] relative bg-muted">
                  {creative.image_url ? (
                    <img
                      src={creative.image_url}
                      alt={creative.title || creative.caption || 'Criativo'}
                      className="w-full h-full object-cover"
                    />
                  ) : creative.video_url ? (
                    <video
                      src={creative.video_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                  </div>

                  {/* Source badge */}
                  <div className="absolute top-2 left-2">
                    {getSourceBadge(creative.source)}
                  </div>

                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(creative.status)}
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{creative.client_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(creative.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                  </div>
                  {creative.theme && (
                    <p className="text-xs text-muted-foreground truncate">{creative.theme}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && creatives.length > 0 && hasMore && (
          <div className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={loadMore} 
              disabled={loadingMore}
              className="min-w-[200px]"
            >
              {loadingMore ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedCreative} onOpenChange={() => setSelectedCreative(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedCreative?.title || "Detalhes do Criativo"}
                {selectedCreative && getSourceBadge(selectedCreative.source)}
              </DialogTitle>
            </DialogHeader>

            {selectedCreative && (
              <div className="space-y-4">
                {/* Image/Video with Carousel Navigation */}
                <div className="rounded-lg overflow-hidden bg-muted relative">
                  {(() => {
                    const carouselImages = getCarouselImages(selectedCreative);
                    const isCarousel = carouselImages.length > 1;
                    const currentImage = carouselImages[currentSlideIndex] || selectedCreative.image_url;

                    if (currentImage) {
                      return (
                        <>
                          <img
                            src={currentImage}
                            alt={selectedCreative.title || `Slide ${currentSlideIndex + 1}`}
                            className="w-full max-h-[60vh] object-contain"
                          />
                          
                          {/* Navigation Arrows for Carousel */}
                          {isCarousel && (
                            <>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full opacity-80 hover:opacity-100"
                                onClick={handlePrevSlide}
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full opacity-80 hover:opacity-100"
                                onClick={handleNextSlide}
                              >
                                <ChevronRight className="w-5 h-5" />
                              </Button>
                              
                              {/* Slide Indicators */}
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {carouselImages.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setCurrentSlideIndex(idx)}
                                    className={cn(
                                      "w-2.5 h-2.5 rounded-full transition-colors",
                                      idx === currentSlideIndex ? "bg-white" : "bg-white/50 hover:bg-white/70"
                                    )}
                                  />
                                ))}
                              </div>
                              
                              {/* Slide Counter */}
                              <Badge className="absolute top-3 right-3 bg-black/60">
                                {currentSlideIndex + 1} / {carouselImages.length}
                              </Badge>
                            </>
                          )}
                        </>
                      );
                    } else if (selectedCreative.video_url) {
                      return (
                        <video
                          src={selectedCreative.video_url}
                          controls
                          className="w-full max-h-[60vh]"
                        />
                      );
                    } else {
                      return (
                        <div className="h-48 flex items-center justify-center">
                          <Images className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Thumbnails for Carousel */}
                {(() => {
                  const carouselImages = getCarouselImages(selectedCreative);
                  if (carouselImages.length > 1) {
                    return (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {carouselImages.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentSlideIndex(idx)}
                            className={cn(
                              "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors",
                              idx === currentSlideIndex
                                ? "border-primary"
                                : "border-transparent hover:border-muted-foreground/50"
                            )}
                          >
                            <img
                              src={img}
                              alt={`Slide ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">{selectedCreative.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Data de Criação</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedCreative.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedCreative.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Origem</p>
                    <div className="mt-1">{getSourceBadge(selectedCreative.source)}</div>
                  </div>
                  {selectedCreative.creative_type && (
                    <div>
                      <p className="text-sm font-medium">Tipo</p>
                      <p className="text-sm text-muted-foreground">{selectedCreative.creative_type}</p>
                    </div>
                  )}
                  {selectedCreative.theme && (
                    <div>
                      <p className="text-sm font-medium">Tema</p>
                      <p className="text-sm text-muted-foreground">{selectedCreative.theme}</p>
                    </div>
                  )}
                </div>

                {/* Caption */}
                {selectedCreative.caption && (
                  <div>
                    <p className="text-sm font-medium mb-1">Legenda</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {selectedCreative.caption}
                    </p>
                  </div>
                )}

                {/* Missing Images Warning for Carousels */}
                {(() => {
                  const { missing, total } = getMissingImagesInfo(selectedCreative);
                  if (missing > 0) {
                    return (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                        <div className="flex items-center gap-2">
                          <ImageOff className="h-5 w-5 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium text-orange-600">
                              {missing} de {total} slides sem imagem
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Clique para regenerar as imagens faltantes
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRegenerateModal(true)}
                          className="gap-1 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Regenerar
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Enviar para Agendamento
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPresentationModal(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Enviar para Apresentação
                  </Button>
                  {(() => {
                    // Get current image for edit button
                    const carouselImages = getCarouselImages(selectedCreative);
                    const currentImage = carouselImages.length > 1 
                      ? carouselImages[currentSlideIndex] 
                      : selectedCreative.image_url;
                    
                    if (currentImage && activeCompany?.company_id) {
                      return (
                        <Button 
                          variant="outline" 
                          onClick={() => setShowImageEditorModal(true)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Imagem
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  {selectedCreative.image_url && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownload(
                        selectedCreative.image_url!, 
                        `criativo-${selectedCreative.id}.jpg`
                      )}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Imagem
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setSelectedCreative(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Schedule Modal */}
        {selectedCreative && (
          <SendToScheduleModal
            creative={selectedCreative}
            open={showScheduleModal}
            onOpenChange={setShowScheduleModal}
            onSuccess={() => {
              setShowScheduleModal(false);
            }}
          />
        )}

        {/* Presentation Modal */}
        {selectedCreative && (
          <SendToPresentationModal
            creative={selectedCreative}
            open={showPresentationModal}
            onOpenChange={setShowPresentationModal}
            onSuccess={() => {
              setShowPresentationModal(false);
            }}
          />
        )}

        {/* Regenerate Carousel Images Modal */}
        {selectedCreative && selectedCreative.source === 'fabrica_carrosseis' && (
          <RegenerateCarouselModal
            open={showRegenerateModal}
            onOpenChange={setShowRegenerateModal}
            carouselId={selectedCreative.id}
            missingCount={getMissingImagesInfo(selectedCreative).missing}
            totalSlides={getMissingImagesInfo(selectedCreative).total}
            onComplete={handleRegenerateComplete}
          />
        )}

        {/* Image Editor Modal */}
        {selectedCreative && activeCompany?.company_id && (() => {
          const carouselImages = getCarouselImages(selectedCreative);
          const currentImage = carouselImages.length > 1 
            ? carouselImages[currentSlideIndex] 
            : selectedCreative.image_url;
          
          if (!currentImage) return null;
          
          return (
            <ImageEditorModal
              open={showImageEditorModal}
              onOpenChange={setShowImageEditorModal}
              images={[currentImage]}
              onSave={handleImageEdited}
              clientId={selectedCreative.client_id}
              companyId={activeCompany.company_id}
            />
          );
        })()}
      </div>
    </DashboardLayout>
  );
}