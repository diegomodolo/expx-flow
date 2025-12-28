import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface YouTubeKnowledgeCardProps {
  configId: string;
  youtubeChannelUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function YouTubeKnowledgeCard({ 
  configId, 
  youtubeChannelUrl,
  open,
  onOpenChange
}: YouTubeKnowledgeCardProps) {
  const [showChannelVideos, setShowChannelVideos] = useState(false);
  
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

  const handleFetchVideos = async () => {
    if (!youtubeChannelUrl) return;
    setShowChannelVideos(true);
    await fetchChannelVideos(youtubeChannelUrl);
  };

  const handleAddVideo = (video: YouTubeVideo) => {
    addVideo(video);
  };

  const isVideoSaved = (videoId: string) => {
    return savedVideos.some(v => v.video_id === videoId);
  };

  if (!youtubeChannelUrl) {
    return (
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Youtube className="w-5 h-5 text-red-500" />
                  Vídeos do YouTube como Base
                  <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
                </CardTitle>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted/30 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">
                  Configure o canal do YouTube do cliente nas configurações para usar vídeos como base de conhecimento.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
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
                  {selectedCount > 0 ? `${selectedCount} vídeo(s) selecionado(s)` : 'Selecione vídeos para usar como referência'}
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
          <CardContent className="space-y-4">
            {/* Fetch Videos Button */}
            <Button 
              onClick={handleFetchVideos} 
              disabled={isFetchingChannel}
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
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum vídeo adicionado ainda. Busque vídeos do canal para adicionar.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
