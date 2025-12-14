import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Instagram, Heart, MessageCircle, ExternalLink, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  thumbnail_url: string;
  caption: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  media_type?: string;
}

interface InstagramFeedPreviewProps {
  posts: Post[];
  username: string;
  profilePicture?: string;
  followersCount: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('pt-BR');
}

export function InstagramFeedPreview({ 
  posts, 
  username, 
  profilePicture,
  followersCount 
}: InstagramFeedPreviewProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-card border-0 shadow-google-sm rounded-xl overflow-hidden">
        {/* Feed Header - simula o perfil do Instagram */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-pink-500/30">
              <AvatarImage src={profilePicture} alt={username} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                {username?.charAt(0)?.toUpperCase() || 'I'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                <span className="text-title-sm text-foreground font-medium">Feed do Instagram</span>
              </div>
              <p className="text-body-sm text-muted-foreground">
                @{username} • {formatNumber(followersCount)} seguidores
              </p>
            </div>
          </div>
        </div>

        {/* Grid de posts - simula o feed */}
        <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-border/30">
          {posts.slice(0, 9).map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="relative aspect-square bg-muted overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
            >
              {post.thumbnail_url ? (
                <img 
                  src={post.thumbnail_url} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Instagram className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              {/* Overlay com métricas no hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-white">
                  <Heart className="h-4 w-4 fill-white" />
                  <span className="text-label-sm font-medium">{formatNumber(post.like_count)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white">
                  <MessageCircle className="h-4 w-4 fill-white" />
                  <span className="text-label-sm font-medium">{formatNumber(post.comments_count)}</span>
                </div>
              </div>

              {/* Indicador de vídeo */}
              {post.media_type === 'VIDEO' && (
                <div className="absolute top-2 right-2">
                  <Play className="h-4 w-4 text-white drop-shadow-lg fill-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer com contagem */}
        <div className="p-3 border-t border-border/50 text-center">
          <span className="text-label-sm text-muted-foreground">
            Mostrando {Math.min(9, posts.length)} de {posts.length} posts recentes
          </span>
        </div>
      </Card>

      {/* Modal de Preview do Post */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Imagem do post */}
            <div className="md:w-1/2 bg-black flex items-center justify-center min-h-[300px]">
              {selectedPost?.thumbnail_url ? (
                <img 
                  src={selectedPost.thumbnail_url} 
                  alt="" 
                  className="w-full h-full object-contain max-h-[500px]"
                />
              ) : (
                <Instagram className="h-12 w-12 text-muted-foreground" />
              )}
            </div>

            {/* Detalhes do post */}
            <div className="md:w-1/2 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profilePicture} alt={username} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white text-sm">
                    {username?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-title-sm text-foreground font-medium">@{username}</span>
              </div>

              {/* Caption */}
              <div className="flex-1 p-4 overflow-y-auto max-h-[300px]">
                <p className="text-body-sm text-foreground whitespace-pre-wrap">
                  {selectedPost?.caption || 'Sem legenda'}
                </p>
              </div>

              {/* Métricas e ações */}
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <Heart className="h-5 w-5 text-destructive" />
                    <span className="text-title-sm">{formatNumber(selectedPost?.like_count || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span className="text-title-sm">{formatNumber(selectedPost?.comments_count || 0)}</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(selectedPost?.permalink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no Instagram
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
