import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, XCircle, Play, Clock, Image, Video, Film, Images, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { ScheduledPost } from '@/hooks/useScheduledPosts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostCardProps {
  post: ScheduledPost;
  compact?: boolean;
  onPreview?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onPublishNow?: () => void;
}

const statusConfig = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: Clock },
  scheduled: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30', icon: Clock },
  publishing: { label: 'Publicando', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Loader2 },
  published: { label: 'Publicado', color: 'bg-green-500/10 text-green-500 border-green-500/30', icon: CheckCircle2 },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const contentTypeIcons = {
  image: Image,
  video: Video,
  reel: Film,
  carousel: Images,
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  compact = false,
  onPreview,
  onEdit,
  onDelete,
  onCancel,
  onPublishNow,
}) => {
  const status = statusConfig[post.status];
  const StatusIcon = status.icon;
  const ContentIcon = contentTypeIcons[post.content_type];
  const canEdit = post.status === 'draft' || post.status === 'scheduled';
  const canPublish = post.status === 'scheduled' || post.status === 'failed';
  const canCancel = post.status === 'scheduled';

  if (compact) {
    return (
      <div 
        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={onPreview}
      >
        {/* Thumbnail */}
        {post.media_urls?.[0] && (
          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
            <img 
              src={post.media_urls[0]} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Client name */}
          {post.client && (
            <p className="text-xs font-medium text-foreground mb-1 truncate">
              {post.client.name}
            </p>
          )}
          
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium">
              {format(new Date(post.scheduled_at), 'HH:mm')}
            </span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>
              {status.label}
            </Badge>
          </div>

          {/* Account names */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.platforms.includes('facebook') && (
              <div className="flex items-center gap-1 text-[10px] text-blue-600">
                <FaFacebook className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{post.facebook_page?.page_name || 'Facebook'}</span>
              </div>
            )}
            {post.platforms.includes('instagram') && (
              <div className="flex items-center gap-1 text-[10px] text-pink-600">
                <FaInstagram className="h-3 w-3" />
                <span className="truncate max-w-[80px]">@{post.instagram_account?.username || 'Instagram'}</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-1">
            {post.caption || 'Sem legenda'}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {canPublish && onPublishNow && (
              <DropdownMenuItem onClick={onPublishNow}>
                <Play className="h-4 w-4 mr-2" />
                Publicar agora
              </DropdownMenuItem>
            )}
            {canCancel && onCancel && (
              <DropdownMenuItem onClick={onCancel}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {/* Media preview */}
          {post.media_urls?.[0] && (
            <div className="w-32 h-32 flex-shrink-0 bg-muted">
              <img 
                src={post.media_urls[0]} 
                alt="" 
                className="w-full h-full object-cover"
              />
              {post.media_urls.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  +{post.media_urls.length - 1}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Status and platforms */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`${status.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {post.platforms.includes('facebook') && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <FaFacebook className="h-3.5 w-3.5" />
                        <span>{post.facebook_page?.page_name}</span>
                      </div>
                    )}
                    {post.platforms.includes('instagram') && (
                      <div className="flex items-center gap-1 text-xs text-pink-600">
                        <FaInstagram className="h-3.5 w-3.5" />
                        <span>@{post.instagram_account?.username}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date and type */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(post.scheduled_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-1">
                    <ContentIcon className="h-3.5 w-3.5" />
                    {post.content_type === 'image' && 'Imagem'}
                    {post.content_type === 'video' && 'Vídeo'}
                    {post.content_type === 'reel' && 'Reel'}
                    {post.content_type === 'carousel' && 'Carrossel'}
                  </div>
                  {post.client && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {post.client.name}
                    </span>
                  )}
                </div>

                {/* Caption */}
                <p className="text-sm text-foreground line-clamp-2">
                  {post.caption || 'Sem legenda'}
                </p>

                {/* Error message */}
                {post.error_message && post.status === 'failed' && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {post.error_message}
                  </p>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canPublish && onPublishNow && (
                    <DropdownMenuItem onClick={onPublishNow}>
                      <Play className="h-4 w-4 mr-2" />
                      Publicar agora
                    </DropdownMenuItem>
                  )}
                  {canCancel && onCancel && (
                    <DropdownMenuItem onClick={onCancel}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar agendamento
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
