import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useYouTubeKnowledge, YouTubeVideo } from '@/hooks/useYouTubeKnowledge';
import { 
  Youtube, 
  ChevronDown, 
  RefreshCw, 
  Loader2, 
  Plus, 
  Trash2,
  FileText,
  ExternalLink,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface YouTubeKnowledgeCardProps {
  configId: string;
  youtubeChannelUrl?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdateYouTubeUrl?: (url: string) => void;
  isUpdating?: boolean;
  isStandalone?: boolean;
}

export function YouTubeKnowledgeCard({ 
  configId, 
  youtubeChannelUrl,
  open,
  onOpenChange,
  onUpdateYouTubeUrl,
  isUpdating,
  isStandalone = false
}: YouTubeKnowledgeCardProps) {
  const [showChannelVideos, setShowChannelVideos] = useState(false);
  const [localUrl, setLocalUrl] = useState(youtubeChannelUrl || '');
  const [hasChanges, setHasChanges] = useState(false);
  
  const {
    savedVideos,
    selectedCount,
    isLoadingSaved,
    fetchChannelVideos,
    isFetchingChannel,
    channelVideos,
    addVideo,
    isAddingVideo,
    toggleVideo,
    removeVideo,
    isRemovingVideo,
    transcribeVideo,
    isTranscribing
  } = useYouTubeKnowledge(configId, youtubeChannelUrl);

  const handleUrlChange = (value: string) => {
    setLocalUrl(value);
    setHasChanges(value !== (youtubeChannelUrl || ''));
  };

  const handleSaveUrl = () => {
    if (onUpdateYouTubeUrl) {
      onUpdateYouTubeUrl(localUrl);
      setHasChanges(false);
    }
  };

  const handleFetchVideos = async () => {
    const urlToFetch = localUrl || youtubeChannelUrl;
    if (!urlToFetch) return;
    setShowChannelVideos(true);
    await fetchChannelVideos(urlToFetch);
  };

  const handleAddVideo = (video: YouTubeVideo) => {
    addVideo(video);
  };

  const isVideoSaved = (videoId: string) => {
    return savedVideos.some(v => v.video_id === videoId);
  };

  const effectiveUrl = localUrl || youtubeChannelUrl;

  const cardContent = (
    <CardContent className="space-y-4">
      {/* YouTube Channel URL Input */}
      <div className="space-y-2">
        <Label htmlFor="youtube-url">URL do Canal do YouTube</Label>
        <div className="flex gap-2">
          <Input
            id="youtube-url"
            type="text"
            placeholder="https://www.youtube.com/@canal ou https://www.youtube.com/channel/UC..."
            value={localUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="flex-1"
          />
          {hasChanges && (
            <Button 
              onClick={handleSaveUrl} 
              disabled={isUpdating}
              size="sm"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Cole a URL do canal do YouTube para buscar vídeos como base de conhecimento.
        </p>
      </div>

      {/* Fetch Videos Button */}
      <Button 
        onClick={handleFetchVideos} 
        disabled={isFetchingChannel || !effectiveUrl}
        variant="outline"
        className="w-full"
      >
        {isFetchingChannel ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Buscando vídeos...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Buscar Vídeos do Canal
          </>
        )}
      </Button>

      {/* Channel Videos to Add */}
      {showChannelVideos && channelVideos && channelVideos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Vídeos disponíveis no canal ({channelVideos.length})
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
            {channelVideos.slice(0, 15).map((video) => (
              <div 
                key={video.videoId}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
              >
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-20 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(video.publishedAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isVideoSaved(video.videoId) ? "secondary" : "default"}
                  disabled={isVideoSaved(video.videoId) || isAddingVideo}
                  onClick={() => handleAddVideo(video)}
                >
                  {isVideoSaved(video.videoId) ? 'Adicionado' : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
      ) : effectiveUrl ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum vídeo adicionado ainda. Busque vídeos do canal para adicionar.
        </p>
      ) : null}
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
                Vídeos do YouTube como Base
              </CardTitle>
              <CardDescription>
                {selectedCount > 0 ? `${selectedCount} vídeo(s) selecionado(s)` : 'Configure o canal e selecione vídeos'}
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
                  Vídeos do YouTube como Base
                  <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
                </CardTitle>
                <CardDescription>
                  {selectedCount > 0 ? `${selectedCount} vídeo(s) selecionado(s)` : 'Configure o canal e selecione vídeos'}
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
