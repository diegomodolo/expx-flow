import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Instagram SVG icon
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// Facebook SVG icon
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface VideoCreativePreviewCardProps {
  videoUrl?: string | null;
  status: 'idle' | 'generating' | 'completed' | 'error';
  progress?: number;
  error?: string | null;
  theme?: string;
  typeName?: string;
  clientName?: string;
  clientAvatar?: string;
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
  clientName = 'Cliente',
  clientAvatar,
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
  const [activeTab, setActiveTab] = useState("instagram");

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
        return 'aspect-[9/16]';
      case '16:9':
        return 'aspect-video';
      case '1:1':
        return 'aspect-square';
      case '3:4':
        return 'aspect-[3/4]';
      default:
        return 'aspect-[9/16]';
    }
  };

  // Renderizar conteúdo do vídeo baseado no estado
  const renderVideoContent = () => {
    if (status === 'generating') {
      return (
        <div className={`relative bg-muted ${getAspectRatioClass()} flex flex-col items-center justify-center p-4`}>
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground text-center mb-3">
            Gerando vídeo com IA...
          </p>
          <Progress value={progress} className="w-full max-w-[200px]" />
          <p className="text-xs text-muted-foreground mt-2">
            {progress}% concluído
          </p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className={`relative bg-muted ${getAspectRatioClass()} flex flex-col items-center justify-center p-4`}>
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
      );
    }

    if (status === 'completed' && videoUrl) {
      return (
        <div className={`relative bg-muted ${getAspectRatioClass()}`}>
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
        </div>
      );
    }

    // Status idle
    return (
      <div className={`relative bg-muted ${getAspectRatioClass()} flex flex-col items-center justify-center p-4`}>
        <Video className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Clique em "Gerar" para iniciar
        </p>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      {/* Header com Avatar do Cliente */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={clientAvatar} />
            <AvatarFallback className="text-xs">
              {clientName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{clientName}</p>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Video className="w-2.5 h-2.5 mr-1" />
                {typeName}
              </Badge>
              {duration && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {duration}s
                </Badge>
              )}
            </div>
          </div>
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

      {/* Tabs para Instagram/Facebook mockup - sempre mostra o mockup */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="instagram" className="flex-1 gap-1.5">
            <InstagramIcon />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex-1 gap-1.5">
            <FacebookIcon />
            Facebook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instagram" className="mt-0">
          {renderVideoContent()}
        </TabsContent>

        <TabsContent value="facebook" className="mt-0">
          {renderVideoContent()}
        </TabsContent>
      </Tabs>

      {/* Theme */}
      {theme && (
        <div className="px-3 py-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {theme}
          </p>
        </div>
      )}

      {/* Actions */}
      {status === 'completed' && videoUrl && (
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="w-full"
            >
              <Download className="w-3 h-3 mr-1" />
              Baixar
            </Button>
            
            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="w-full"
              >
                <Save className="w-3 h-3 mr-1" />
                Salvar
              </Button>
            )}
            
            {onSchedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSchedule}
                className="w-full"
              >
                <Calendar className="w-3 h-3 mr-1" />
                Agendar
              </Button>
            )}
            
            {onRegenerate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="w-full"
              >
                {isRegenerating ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Regenerar
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
