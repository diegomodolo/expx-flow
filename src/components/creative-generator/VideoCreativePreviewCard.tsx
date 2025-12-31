import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  Save, 
  Calendar,
  Loader2,
  AlertCircle,
  Video,
  Volume2,
  VolumeX
} from 'lucide-react';

interface VideoCreativePreviewCardProps {
  videoUrl?: string | null;
  status: 'idle' | 'generating' | 'completed' | 'error';
  progress?: number;
  error?: string | null;
  theme?: string;
  typeName?: string;
  duration?: number;
  aspectRatio?: string;
  onRegenerate?: () => void;
  onDownload?: () => void;
  onSave?: () => void;
  onSchedule?: () => void;
  isRegenerating?: boolean;
}

export function VideoCreativePreviewCard({
  videoUrl,
  status,
  progress = 0,
  error,
  theme,
  typeName = 'Vídeo',
  duration = 5,
  aspectRatio = '9:16',
  onRegenerate,
  onDownload,
  onSave,
  onSchedule,
  isRegenerating = false,
}: VideoCreativePreviewCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      onDownload?.();
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Determinar dimensões baseado no aspect ratio
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-w-[280px]';
      case '16:9':
        return 'aspect-video max-w-full';
      case '1:1':
        return 'aspect-square max-w-[320px]';
      default:
        return 'aspect-[9/16] max-w-[280px]';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <Badge variant="secondary">{typeName}</Badge>
            {duration && (
              <Badge variant="outline">{duration}s</Badge>
            )}
          </div>
          {status === 'completed' && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              Concluído
            </Badge>
          )}
          {status === 'generating' && (
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Gerando
            </Badge>
          )}
          {status === 'error' && (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Erro
            </Badge>
          )}
        </div>

        {/* Video Preview / Progress */}
        <div className={`relative mx-auto bg-muted rounded-lg overflow-hidden ${getAspectRatioClass()}`}>
          {status === 'generating' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground text-center mb-3">
                Gerando vídeo com IA...
              </p>
              <Progress value={progress} className="w-full max-w-[200px]" />
              <p className="text-xs text-muted-foreground mt-2">
                {progress}% concluído
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <AlertCircle className="w-8 h-8 text-destructive mb-4" />
              <p className="text-sm text-destructive text-center">
                {error || 'Erro na geração'}
              </p>
              {onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerate}
                  className="mt-4"
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Tentar novamente
                </Button>
              )}
            </div>
          )}

          {status === 'completed' && videoUrl && (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                muted={isMuted}
                loop
                playsInline
                onEnded={handleVideoEnded}
                onClick={handlePlayPause}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={handleMuteToggle}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Play button overlay when not playing */}
              {!isPlaying && (
                <button
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                  onClick={handlePlayPause}
                >
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary ml-1" />
                  </div>
                </button>
              )}
            </>
          )}

          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <Video className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Clique em "Gerar Vídeo" para iniciar
              </p>
            </div>
          )}
        </div>

        {/* Theme */}
        {theme && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {theme}
          </p>
        )}

        {/* Actions */}
        {status === 'completed' && videoUrl && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-1" />
              Baixar
            </Button>
            
            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            )}
            
            {onSchedule && (
              <Button
                variant="default"
                size="sm"
                onClick={onSchedule}
                className="flex-1"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Agendar
              </Button>
            )}
            
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
