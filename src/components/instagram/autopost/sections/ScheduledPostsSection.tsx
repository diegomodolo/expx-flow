import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calendar, 
  Clock, 
  Image, 
  RefreshCw, 
  Edit, 
  Loader2, 
  Trash2, 
  Send, 
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Scan
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ScheduledPostsSectionProps {
  pendingPosts: any[];
  onGenerateNext: () => void;
  onPublishNow: (postId: string) => void;
  onRegenerate: (postId: string) => void;
  onUpdateCaption: (postId: string, caption: string) => void;
  onDelete: (postId: string) => void;
  onPreview: (post: any) => void;
  onValidateGrammar?: (postId: string) => void;
  isGeneratingNext: boolean;
  isPublishing: boolean;
  isRegenerating: boolean;
  isUpdatingCaption: boolean;
  isDeletingPost: boolean;
  isValidatingGrammar?: boolean;
}

function CarouselImagePreview({ imageUrls, onViewFull }: { imageUrls: string[]; onViewFull: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  return (
    <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0 group">
      <img
        src={imageUrls[currentIndex]}
        alt={`Slide ${currentIndex + 1}`}
        className="w-full h-full object-cover cursor-pointer"
        onClick={onViewFull}
      />
      
      <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
        <Layers className="w-3 h-3" />
        {currentIndex + 1}/{imageUrls.length}
      </div>
      
      {imageUrls.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </>
      )}

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {imageUrls.slice(0, 5).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              idx === currentIndex ? "bg-white" : "bg-white/50"
            )}
          />
        ))}
        {imageUrls.length > 5 && (
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
        )}
      </div>
    </div>
  );
}

export function ScheduledPostsSection({
  pendingPosts,
  onGenerateNext,
  onPublishNow,
  onRegenerate,
  onUpdateCaption,
  onDelete,
  onPreview,
  onValidateGrammar,
  isGeneratingNext,
  isPublishing,
  isRegenerating,
  isUpdatingCaption,
  isDeletingPost,
  isValidatingGrammar,
}: ScheduledPostsSectionProps) {
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Postagens Agendadas
            </CardTitle>
            <CardDescription>
              {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} na fila
            </CardDescription>
          </div>
          <Button onClick={onGenerateNext} disabled={isGeneratingNext}>
            {isGeneratingNext ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Image className="w-4 h-4 mr-2" />
                Gerar Próxima
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendingPosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma postagem agendada. Clique em "Gerar Próxima" para criar.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingPosts.map((post: any, index: number) => {
              const isCarousel = post.post_type === 'carousel' && post.image_urls && post.image_urls.length > 1;
              
              return (
                <div key={post.id} className={`p-4 rounded-lg border ${index === 0 ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
                  <div className="flex gap-4">
                    {isCarousel ? (
                      <CarouselImagePreview 
                        imageUrls={post.image_urls} 
                        onViewFull={() => onPreview(post)}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={post.image_url}
                          alt="Preview do post"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => onPreview(post)}
                        />
                      </div>
                    )}

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={index === 0 ? 'default' : 'secondary'}>
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(post.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </Badge>
                            {isCarousel && (
                              <Badge variant="outline">
                                <Layers className="w-3 h-3 mr-1" />
                                {post.image_urls.length} imagens
                              </Badge>
                            )}
                            
                            {/* Grammar validation status */}
                            <TooltipProvider>
                              {post.grammar_validated && !post.grammar_errors?.length && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Texto OK
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Texto verificado - nenhum erro encontrado</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              
                              {post.grammar_errors && post.grammar_errors.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {post.grammar_errors.length} alerta{post.grammar_errors.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-medium mb-1">Possíveis erros de texto:</p>
                                    <ul className="text-xs space-y-1">
                                      {post.grammar_errors.slice(0, 3).map((err: string, i: number) => (
                                        <li key={i}>• {err}</li>
                                      ))}
                                      {post.grammar_errors.length > 3 && (
                                        <li>... e mais {post.grammar_errors.length - 3}</li>
                                      )}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                          </div>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">Próxima</Badge>
                          )}
                        </div>
                      
                      <p className="text-sm line-clamp-3">{post.caption}</p>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onPreview(post)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onPublishNow(post.id)}
                          disabled={isPublishing}
                        >
                          {isPublishing ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3 mr-1" />
                          )}
                          Publicar Agora
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRegenerate(post.id)}
                          disabled={isRegenerating}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCaptionText(post.caption);
                            setEditingPostId(post.id);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        {onValidateGrammar && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onValidateGrammar(post.id)}
                            disabled={isValidatingGrammar}
                          >
                            {isValidatingGrammar ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Scan className="w-3 h-3 mr-1" />
                            )}
                            Verificar Texto
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(post.id)}
                          disabled={isDeletingPost}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {editingPostId === post.id && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <Textarea
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => {
                          onUpdateCaption(post.id, captionText);
                          setEditingPostId(null);
                        }} disabled={isUpdatingCaption}>
                          {isUpdatingCaption ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPostId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
