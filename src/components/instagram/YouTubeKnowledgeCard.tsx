import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useYouTubeKnowledge } from '@/hooks/useYouTubeKnowledge';
import { 
  Youtube, 
  ChevronDown, 
  Loader2, 
  Plus, 
  Trash2,
  FileText,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface YouTubeKnowledgeCardProps {
  configId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isStandalone?: boolean;
}

export function YouTubeKnowledgeCard({ 
  configId, 
  open,
  onOpenChange,
  isStandalone = false
}: YouTubeKnowledgeCardProps) {
  const [videoUrl, setVideoUrl] = useState('');
  
  const {
    savedVideos,
    selectedCount,
    isLoadingSaved,
    addVideoByUrl,
    isAddingVideo,
    toggleVideo,
    removeVideo,
    isRemovingVideo,
    transcribeVideo,
    isTranscribing
  } = useYouTubeKnowledge(configId);

  const handleAddVideo = async () => {
    if (!videoUrl.trim()) return;
    
    try {
      await addVideoByUrl(videoUrl);
      setVideoUrl('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAddingVideo) {
      handleAddVideo();
    }
  };

  const cardContent = (
    <CardContent className="space-y-4">
      {/* Add Video by URL */}
      <div className="space-y-2">
        <Label htmlFor="video-url">URL do Vídeo do YouTube</Label>
        <div className="flex gap-2">
          <Input
            id="video-url"
            type="text"
            placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={isAddingVideo}
          />
          <Button 
            onClick={handleAddVideo}
            disabled={isAddingVideo || !videoUrl.trim()}
          >
            {isAddingVideo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cole a URL de um vídeo do YouTube. A transcrição será feita automaticamente.
        </p>
      </div>

      {/* Saved Videos */}
      {isLoadingSaved ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : savedVideos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Vídeos na Base de Conhecimento</p>
          <div className="space-y-2">
            {savedVideos.map((video) => (
              <div 
                key={video.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  video.is_selected ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                )}
              >
                <Checkbox
                  checked={video.is_selected}
                  onCheckedChange={(checked) => 
                    toggleVideo({ videoId: video.id, isSelected: !!checked })
                  }
                />
                <img 
                  src={video.thumbnail_url || ''} 
                  alt={video.video_title || ''}
                  className="w-16 h-10 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.video_title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {video.transcription ? (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        Transcrito
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        disabled={isTranscribing}
                        onClick={() => transcribeVideo({ 
                          knowledgeVideoId: video.id, 
                          videoId: video.video_id,
                          videoTitle: video.video_title || ''
                        })}
                      >
                        {isTranscribing ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <FileText className="w-3 h-3 mr-1" />
                        )}
                        Transcrever
                      </Button>
                    )}
                    <a 
                      href={video.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={isRemovingVideo}
                  onClick={() => removeVideo(video.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum vídeo adicionado ainda. Cole a URL de um vídeo do YouTube acima.
        </p>
      )}
    </CardContent>
  );

  if (isStandalone) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Youtube className="w-5 h-5 text-red-500" />
                Vídeos do YouTube
              </CardTitle>
              <CardDescription>
                {selectedCount > 0 ? `${selectedCount} vídeo(s) selecionado(s)` : 'Adicione vídeos como base de conhecimento'}
              </CardDescription>
            </div>
            {selectedCount > 0 && (
              <Badge variant="secondary">
                {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        {cardContent}
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Youtube className="w-5 h-5 text-red-500" />
                  Vídeos do YouTube
                  <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
                </CardTitle>
                <CardDescription>
                  {selectedCount > 0 ? `${selectedCount} vídeo(s) selecionado(s)` : 'Adicione vídeos como base de conhecimento'}
                </CardDescription>
              </div>
              {selectedCount > 0 && (
                <Badge variant="secondary" onClick={(e) => e.stopPropagation()}>
                  {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {cardContent}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
