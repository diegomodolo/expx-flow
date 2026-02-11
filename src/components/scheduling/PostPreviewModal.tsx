import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Image, Video, Film, Images, AlertCircle, CheckCircle2, Loader2, XCircle, Calendar, User, Edit } from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { ScheduledPost } from '@/hooks/useScheduledPosts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostPreviewModalProps {
  open: boolean;
  onClose: () => void;
  post: ScheduledPost | null;
  onEdit?: () => void;
}

const statusConfig = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: Clock },
  scheduled: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30', icon: Clock },
  publishing: { label: 'Publicando', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Loader2 },
  published: { label: 'Publicado', color: 'bg-green-500/10 text-green-500 border-green-500/30', icon: CheckCircle2 },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const contentTypeLabels = {
  image: 'Imagem',
  video: 'Vídeo',
  reel: 'Reel',
  carousel: 'Carrossel',
};

const contentTypeIcons = {
  image: Image,
  video: Video,
  reel: Film,
  carousel: Images,
};

export const PostPreviewModal: React.FC<PostPreviewModalProps> = ({
  open,
  onClose,
  post,
  onEdit,
}) => {
  if (!post) return null;

  const status = statusConfig[post.status];
  const StatusIcon = status.icon;
  const ContentIcon = contentTypeIcons[post.content_type];
  const canEdit = post.status === 'draft' || post.status === 'scheduled';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Preview do Post</DialogTitle>
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Status and Info */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ContentIcon className="h-4 w-4" />
                {contentTypeLabels[post.content_type]}
              </div>

              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.scheduled_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>

            {/* Platforms */}
            <div className="flex items-center gap-4">
              {post.platforms.includes('facebook') && (
                <div className="flex items-center gap-2 p-2 rounded-lg border bg-blue-500/5 border-blue-500/20">
                  <FaFacebook className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">{post.facebook_page?.page_name || 'Facebook'}</span>
                </div>
              )}
              {post.platforms.includes('instagram') && (
                <div className="flex items-center gap-2 p-2 rounded-lg border bg-pink-500/5 border-pink-500/20">
                  <FaInstagram className="h-5 w-5 text-pink-600" />
                  <span className="text-sm font-medium">@{post.instagram_account?.username || 'Instagram'}</span>
                </div>
              )}
            </div>

            {/* Client */}
            {post.client && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{post.client.name}</span>
              </div>
            )}

            {/* Media Gallery */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Mídia</p>
                {post.media_urls.length === 1 ? (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    {post.content_type === 'video' || post.content_type === 'reel' ? (
                      <video 
                        src={post.media_urls[0]} 
                        controls 
                        className="w-full max-h-[400px] object-contain"
                      />
                    ) : (
                      <img 
                        src={post.media_urls[0]} 
                        alt="Post media" 
                        className="w-full max-h-[400px] object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {post.media_urls.map((url, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={url} 
                          alt={`Media ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collaborators */}
            {(post as any).collaborators?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Colaboradores (Collab)</p>
                <div className="flex flex-wrap gap-2">
                  {(post as any).collaborators.map((collab: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      @{collab}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Caption */}
            <div>
              <p className="text-sm font-medium mb-2">Legenda</p>
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm whitespace-pre-wrap">
                  {post.caption || <span className="text-muted-foreground italic">Sem legenda</span>}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {post.error_message && post.status === 'failed' && (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Erro na publicação</span>
                </div>
                <p className="text-sm text-destructive/80">{post.error_message}</p>
              </div>
            )}

            {/* Published IDs */}
            {post.status === 'published' && post.facebook_post_id && (
              <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium text-sm">Publicado com sucesso</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Post ID: {post.facebook_post_id}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
