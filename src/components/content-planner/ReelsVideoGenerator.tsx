import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Film, Loader2, Play, X, CheckCircle2, AlertCircle, Video } from "lucide-react";
import { useReelsVideoGeneration } from "@/hooks/useReelsVideoGeneration";
import { toast } from "sonner";

interface ReelsVideoGeneratorProps {
  postId: string;
  clientId: string;
  companyId: string;
  script: string;
  headline?: string;
  subheadline?: string;
  disabled?: boolean;
}

export function ReelsVideoGenerator({
  postId,
  clientId,
  companyId,
  script,
  headline,
  subheadline,
  disabled = false,
}: ReelsVideoGeneratorProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const {
    state,
    startGeneration,
    cancelGeneration,
    loadExistingProgress,
    isGenerating,
    isCompleted,
    hasError,
  } = useReelsVideoGeneration();

  // Load existing progress on mount
  useEffect(() => {
    loadExistingProgress(postId);
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
    toast.info("Geração cancelada");
  };

  const { progress } = state;
  const completedScenes = progress?.scenes?.filter(s => s.status === "completed").length || 0;
  const totalScenes = progress?.totalScenes || 0;
  const progressPercent = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  // Render completed state with video previews
  if (isCompleted && progress?.scenes) {
    const completedVideos = progress.scenes.filter(s => s.videoUrl);

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

        <div className="grid grid-cols-2 gap-2">
          {completedVideos.map((scene) => (
            <div
              key={scene.sceneNumber}
              className="relative aspect-[9/16] bg-black rounded overflow-hidden"
            >
              <video
                src={scene.videoUrl!}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
              <Badge className="absolute top-1 left-1 text-[10px]">
                Cena {scene.sceneNumber}
              </Badge>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Os vídeos das cenas estão prontos. Você pode baixá-los e editá-los no seu editor de vídeo favorito.
        </p>
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
    return (
      <div className="space-y-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Erro na geração</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {progress?.error || "Ocorreu um erro ao gerar os vídeos. Tente novamente."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelGeneration(postId)}
          className="w-full text-xs"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Render idle state - show generate button
  return (
    <>
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
