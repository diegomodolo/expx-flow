import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Film, Loader2, Play, X, CheckCircle2, AlertCircle, Video, RefreshCw, ChevronLeft, ChevronRight, Upload, Trash2 } from "lucide-react";
import { useReelsVideoGeneration } from "@/hooks/useReelsVideoGeneration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReelsVideoGeneratorProps {
  postId: string;
  clientId: string;
  companyId: string;
  script: string;
  headline?: string;
  subheadline?: string;
  disabled?: boolean;
  uploadedVideoUrl?: string | null;
  onUploadedVideoChange?: (url: string | null) => void;
}

export function ReelsVideoGenerator({
  postId,
  clientId,
  companyId,
  script,
  headline,
  subheadline,
  disabled = false,
  uploadedVideoUrl,
  onUploadedVideoChange,
}: ReelsVideoGeneratorProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [regeneratingScenes, setRegeneratingScenes] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    state,
    startGeneration,
    cancelGeneration,
    regenerateScenes,
    loadExistingProgress,
    isGenerating,
    isCompleted,
    hasError,
  } = useReelsVideoGeneration();

  // Load existing progress on mount
  useEffect(() => {
    if (postId) {
      loadExistingProgress(postId);
    }
  }, [postId, loadExistingProgress]);

  const handleStartGeneration = async () => {
    setShowConfirmDialog(false);

    if (!script || script.trim().length < 20) {
      toast.error("O roteiro precisa ter pelo menos 20 caracteres");
      return;
    }

    try {
      await startGeneration({
        postId,
        clientId,
        companyId,
        script,
        headline,
        subheadline,
      });
      toast.success("Geração de vídeo iniciada!");
    } catch (error: any) {
      toast.error("Erro ao iniciar geração: " + error.message);
    }
  };

  const handleCancel = async () => {
    await cancelGeneration(postId);
    setRegeneratingScenes([]);
    toast.info("Geração cancelada");
  };

  const handleRegenerateScenes = async (sceneNumbers: number[]) => {
    setRegeneratingScenes(sceneNumbers);
    try {
      await regenerateScenes(postId, sceneNumbers);
      toast.success(`Regenerando ${sceneNumbers.length} cena(s)...`);
    } catch (error: any) {
      toast.error("Erro ao regenerar: " + error.message);
      setRegeneratingScenes([]);
    }
  };

  const handleRegenerateSingleScene = (sceneNumber: number) => {
    handleRegenerateScenes([sceneNumber]);
  };

  const handleRegenerateAllFailed = () => {
    const failedScenes = progress?.scenes?.filter(s => s.status === "error") || [];
    const sceneNumbers = failedScenes.map(s => s.sceneNumber);
    if (sceneNumbers.length > 0) {
      handleRegenerateScenes(sceneNumbers);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error("Por favor, selecione um arquivo de vídeo");
      return;
    }

    // Validate file size (max 1GB)
    if (file.size > 1024 * 1024 * 1024) {
      toast.error("O vídeo deve ter no máximo 1GB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${postId}-${Date.now()}.${fileExt}`;
      const filePath = `reels/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('reels-videos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('reels-videos')
        .getPublicUrl(filePath);

      // Update the post in database
      const { error: updateError } = await supabase
        .from('content_plan_posts')
        .update({ reels_uploaded_video_url: urlData.publicUrl })
        .eq('id', postId);

      if (updateError) throw updateError;

      onUploadedVideoChange?.(urlData.publicUrl);
      toast.success("Vídeo enviado com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar vídeo: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveUploadedVideo = async () => {
    try {
      const { error } = await supabase
        .from('content_plan_posts')
        .update({ reels_uploaded_video_url: null })
        .eq('id', postId);

      if (error) throw error;

      onUploadedVideoChange?.(null);
      toast.success("Vídeo removido");
    } catch (error: any) {
      toast.error("Erro ao remover vídeo: " + error.message);
    }
  };

  const { progress } = state;
  const completedScenes = progress?.scenes?.filter(s => s.status === "completed").length || 0;
  const totalScenes = progress?.totalScenes || 0;
  const progressPercent = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  // If there's an uploaded video, show it instead of generated scenes
  if (uploadedVideoUrl) {
    return (
      <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Video className="w-4 h-4" />
            <span className="text-sm font-medium">Vídeo completo enviado</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveUploadedVideo}
            className="text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remover
          </Button>
        </div>

        <div className="relative aspect-[9/16] max-w-[280px] mx-auto bg-black rounded-xl overflow-hidden shadow-lg">
          <video
            src={uploadedVideoUrl}
            className="w-full h-full object-cover"
            controls
            playsInline
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Este vídeo será exibido no preview para aprovação.
        </p>
      </div>
    );
  }

  // Render completed state with video carousel player
  if (isCompleted && progress?.scenes) {
    const completedVideos = progress.scenes.filter(s => s.videoUrl);

    if (completedVideos.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              {completedVideos.length} cenas geradas!
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => cancelGeneration(postId)}
            className="text-xs"
          >
            Limpar
          </Button>
        </div>

        {/* Reels Video Carousel Player */}
        {completedVideos.length === 1 ? (
          // Single video - show directly
          <div className="relative aspect-[9/16] max-w-[280px] mx-auto bg-black rounded-xl overflow-hidden shadow-lg">
            <video
              src={completedVideos[0].videoUrl!}
              className="w-full h-full object-cover"
              controls
              playsInline
              poster=""
            />
            <Badge className="absolute top-2 left-2 bg-black/60 text-white text-[10px]">
              Cena {completedVideos[0].sceneNumber}
            </Badge>
          </div>
        ) : (
          // Multiple videos - carousel
          <div className="relative max-w-[320px] mx-auto">
            <Carousel className="w-full">
              <CarouselContent>
                {completedVideos.map((scene) => (
                  <CarouselItem key={scene.sceneNumber}>
                    <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-lg">
                      <video
                        src={scene.videoUrl!}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        poster=""
                      />
                      <Badge className="absolute top-2 left-2 bg-black/60 text-white text-[10px]">
                        Cena {scene.sceneNumber} de {completedVideos.length}
                      </Badge>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 -translate-x-1/2 h-8 w-8" />
              <CarouselNext className="right-0 translate-x-1/2 h-8 w-8" />
            </Carousel>
            
            {/* Carousel dots indicator */}
            <div className="flex justify-center gap-1.5 mt-3">
              {completedVideos.map((_, idx) => (
                <div
                  key={idx}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {completedVideos.length > 1 
            ? "Deslize para ver todas as cenas. Você pode baixar e editar no seu editor favorito."
            : "O vídeo está pronto. Você pode baixá-lo e editá-lo no seu editor favorito."}
        </p>

        {/* Upload complete video option - available even with generated scenes */}
        <div className="pt-2 border-t border-green-200 dark:border-green-800">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
            id={`video-upload-${postId}`}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar Vídeo Final Editado
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Envie o vídeo final editado para substituir as cenas geradas (máx. 1GB)
          </p>
        </div>
      </div>
    );
  }

  // Render generating state
  if (isGenerating) {
    return (
      <div className="space-y-3 p-3 bg-primary/5 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {state.status === "analyzing" ? "Analisando roteiro..." : "Gerando vídeos..."}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-7 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Cancelar
          </Button>
        </div>

        {totalScenes > 0 && (
          <>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cenas: {completedScenes}/{totalScenes}</span>
              {state.estimatedTime && <span>{state.estimatedTime}</span>}
            </div>

            {/* Scene status indicators */}
            <div className="flex gap-1 flex-wrap">
              {progress?.scenes?.map((scene) => (
                <Badge
                  key={scene.sceneNumber}
                  variant={
                    scene.status === "completed"
                      ? "default"
                      : scene.status === "generating"
                      ? "secondary"
                      : scene.status === "error"
                      ? "destructive"
                      : "outline"
                  }
                  className="text-[10px] py-0"
                >
                  {scene.status === "generating" && (
                    <Loader2 className="w-2 h-2 mr-1 animate-spin" />
                  )}
                  {scene.status === "completed" && (
                    <CheckCircle2 className="w-2 h-2 mr-1" />
                  )}
                  Cena {scene.sceneNumber}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Render error state
  if (hasError) {
    const errorScenes = progress?.scenes?.filter(s => s.status === "error") || [];
    const completedVideos = progress?.scenes?.filter(s => s.status === "completed" && s.videoUrl) || [];

    return (
      <div className="space-y-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Erro na geração</span>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {progress?.error || "Ocorreu um erro ao gerar os vídeos. Tente novamente."}
        </p>

        {/* Show completed videos if any - using carousel */}
        {completedVideos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-green-600 dark:text-green-400">
              {completedVideos.length} cena(s) gerada(s) com sucesso:
            </p>
            {completedVideos.length === 1 ? (
              <div className="relative aspect-[9/16] max-w-[200px] mx-auto bg-black rounded-lg overflow-hidden">
                <video
                  src={completedVideos[0].videoUrl!}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
                <Badge className="absolute top-1 left-1 text-[10px] bg-black/60">
                  Cena {completedVideos[0].sceneNumber}
                </Badge>
              </div>
            ) : (
              <div className="relative max-w-[220px] mx-auto">
                <Carousel className="w-full">
                  <CarouselContent>
                    {completedVideos.map((scene) => (
                      <CarouselItem key={scene.sceneNumber}>
                        <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
                          <video
                            src={scene.videoUrl!}
                            className="w-full h-full object-cover"
                            controls
                            playsInline
                          />
                          <Badge className="absolute top-1 left-1 text-[10px] bg-black/60">
                            Cena {scene.sceneNumber}
                          </Badge>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-0 -translate-x-1/2 h-7 w-7" />
                  <CarouselNext className="right-0 translate-x-1/2 h-7 w-7" />
                </Carousel>
              </div>
            )}
          </div>
        )}

        {/* Show error details per scene with regenerate buttons */}
        {errorScenes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-destructive">Cenas com erro:</p>
              {errorScenes.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateAllFailed}
                  disabled={regeneratingScenes.length > 0}
                  className="h-6 text-[10px] px-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerar todas
                </Button>
              )}
            </div>
            {errorScenes.map((scene) => (
              <div key={scene.sceneNumber} className="flex items-center justify-between bg-background/50 p-2 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Cena {scene.sceneNumber}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {scene.error || "Erro desconhecido"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateSingleScene(scene.sceneNumber)}
                  disabled={regeneratingScenes.includes(scene.sceneNumber)}
                  className="h-7 text-[10px] px-2 ml-2 shrink-0"
                >
                  {regeneratingScenes.includes(scene.sceneNumber) ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Regenerar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelGeneration(postId)}
          className="w-full text-xs"
        >
          Limpar tudo
        </Button>
      </div>
    );
  }

  // Render idle state - show generate button and upload option
  return (
    <>
      <div className="space-y-2">
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 w-full"
          onClick={() => setShowConfirmDialog(true)}
          disabled={disabled || !script || script.trim().length < 20}
        >
          <Video className="w-4 h-4" />
          Gerar Vídeo do Reels
        </Button>

        {/* Upload complete video option */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
            id={`video-upload-${postId}`}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar Vídeo Completo
              </>
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Gere cenas com IA ou envie seu próprio vídeo (máx. 1GB)
        </p>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              Gerar Vídeo do Reels
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vamos analisar o roteiro e gerar até <strong>5 cenas de vídeo</strong> de 6 segundos cada,
                totalizando aproximadamente <strong>30 segundos</strong> de conteúdo.
              </p>
              <p>
                <strong>Tempo estimado:</strong> 2-3 minutos
              </p>
              <p className="text-xs text-muted-foreground">
                Os vídeos serão gerados sem texto/legendas para você adicionar posteriormente no seu editor preferido.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartGeneration}>
              <Play className="w-4 h-4 mr-1" />
              Iniciar Geração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
