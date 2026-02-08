import { useState, useEffect } from "react";
import { useYouTubeSlides, YouTubeSlide } from "@/hooks/useYouTubeSlides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Presentation,
  Sparkles,
  Images,
  Settings,
  RefreshCw,
  AlertCircle,
  FileUp,
  ExternalLink,
} from "lucide-react";
import { SlideCarousel } from "./SlideCarousel";
import { SlideStructureEditor } from "./SlideStructureEditor";
import { ImageEditorModal } from "@/components/image-editor/ImageEditorModal";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SlidesSectionProps {
  scriptId: string;
  scriptContent: string;
  scriptTitle: string;
  clientId: string;
  companyId: string;
  thumbnailUrl?: string | null;
  onGenerateThumbnailFirst?: () => Promise<string | null>;
}

export function SlidesSection({
  scriptId,
  scriptContent,
  scriptTitle,
  clientId,
  companyId,
  thumbnailUrl,
  onGenerateThumbnailFirst,
}: SlidesSectionProps) {
  const {
    slides,
    loading,
    generatingStructure,
    generatingImages,
    generatingThumbnailFirst,
    exportingToGoogleSlides,
    hasSlides,
    allImagesGenerated,
    pendingImages,
    slidesWithImages,
    fetchSlides,
    generateStructure,
    updateSlide,
    generateSlideImage,
    generateAllImages,
    deleteSlide,
    reorderSlides,
    exportToGoogleSlides,
  } = useYouTubeSlides(scriptId);

  const [numberOfSlides, setNumberOfSlides] = useState(10);
  const [activeTab, setActiveTab] = useState<"carousel" | "editor">("carousel");
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [slideToEdit, setSlideToEdit] = useState<YouTubeSlide | null>(null);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleGenerateStructure = async () => {
    await generateStructure(scriptContent, scriptTitle, numberOfSlides);
  };

  const handleEditSlide = (slide: YouTubeSlide) => {
    if (slide.image_url) {
      setSlideToEdit(slide);
      setShowImageEditor(true);
    }
  };

  const handleRegenerateImage = async (slideId: string) => {
    await generateSlideImage(slideId, companyId, thumbnailUrl);
  };

  const handleGenerateAllImages = async () => {
    await generateAllImages(companyId, thumbnailUrl, onGenerateThumbnailFirst);
  };

  const handleImageEditorSave = async (newImages: string[]) => {
    if (slideToEdit && newImages.length > 0) {
      await updateSlide(slideToEdit.id, { image_url: newImages[0] });
    }
    setShowImageEditor(false);
    setSlideToEdit(null);
  };

  const handleExportToGoogleSlides = async () => {
    const url = await exportToGoogleSlides(scriptTitle);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const completedCount = slides.filter(s => s.status === "completed").length;
  const generatingCount = generatingImages.size;
  const isGenerating = generatingCount > 0 || generatingThumbnailFirst;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              Slides da Apresentação
            </CardTitle>
            {hasSlides && (
              <Badge variant="outline">
                {completedCount}/{slides.length} prontos
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!hasSlides && (
              <div className="flex items-center gap-2">
                <Label htmlFor="numSlides" className="text-sm text-muted-foreground">
                  Qtd:
                </Label>
                <Input
                  id="numSlides"
                  type="number"
                  value={numberOfSlides}
                  onChange={(e) => setNumberOfSlides(parseInt(e.target.value) || 10)}
                  min={3}
                  max={20}
                  className="w-16 h-8"
                />
              </div>
            )}

            {hasSlides && pendingImages > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAllImages}
                disabled={isGenerating}
              >
                {generatingThumbnailFirst ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Gerando thumb...
                  </>
                ) : generatingCount > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Gerando {generatingCount}...
                  </>
                ) : (
                  <>
                    <Images className="h-4 w-4 mr-1" />
                    Gerar {pendingImages} imagens
                  </>
                )}
              </Button>
            )}

            {hasSlides && slidesWithImages > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportToGoogleSlides}
                disabled={exportingToGoogleSlides || isGenerating}
                className="gap-1"
              >
                {exportingToGoogleSlides ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" />
                    Google Slides
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}

            <Button
              variant={hasSlides ? "outline" : "default"}
              size="sm"
              onClick={handleGenerateStructure}
              disabled={generatingStructure || !scriptContent}
            >
              {generatingStructure ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  {hasSlides ? (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  {hasSlides ? "Regerar" : "Gerar Slides"}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasSlides ? (
          <div className="text-center py-8">
            <Presentation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              Nenhum slide gerado ainda
            </p>
            <p className="text-sm text-muted-foreground">
              Clique em "Gerar Slides" para criar a estrutura da apresentação baseada no roteiro
            </p>
          </div>
        ) : (
          <>
            {/* Info about thumbnail reference */}
            {!thumbnailUrl && pendingImages > 0 && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma thumbnail gerada ainda. Ao gerar as imagens, uma thumbnail será criada primeiro 
                  para definir o estilo visual de todos os slides.
                </AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="carousel" className="flex items-center gap-1">
                  <Images className="h-4 w-4" />
                  Visualizar
                </TabsTrigger>
                <TabsTrigger value="editor" className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Editar Estrutura
                </TabsTrigger>
              </TabsList>

              <TabsContent value="carousel">
                <SlideCarousel
                  slides={slides}
                  generatingImages={generatingImages}
                  onEditSlide={handleEditSlide}
                  onRegenerateImage={handleRegenerateImage}
                />
              </TabsContent>

              <TabsContent value="editor">
                <SlideStructureEditor
                  slides={slides}
                  onUpdateSlide={updateSlide}
                  onDeleteSlide={deleteSlide}
                  onReorderSlide={reorderSlides}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>

      {/* Image Editor Modal */}
      {showImageEditor && slideToEdit?.image_url && (
        <ImageEditorModal
          open={showImageEditor}
          onOpenChange={(open) => {
            setShowImageEditor(open);
            if (!open) setSlideToEdit(null);
          }}
          images={[slideToEdit.image_url]}
          onSave={handleImageEditorSave}
          clientId={clientId}
          companyId={companyId}
        />
      )}
    </Card>
  );
}
