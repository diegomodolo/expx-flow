import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, CheckCircle2, XCircle, Layers, Eye, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InstagramPostPreviewModal } from '../../InstagramPostPreviewModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HistorySectionProps {
  publishedPosts: any[];
  onPostDeleted?: () => void;
}

export function HistorySection({ publishedPosts, onPostDeleted }: HistorySectionProps) {
  const [previewPost, setPreviewPost] = useState<any>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDeleteFromInstagram = async (post: any) => {
    if (!post.instagram_media_id) {
      toast({
        title: 'Erro',
        description: 'Este post não possui ID do Instagram para exclusão.',
        variant: 'destructive',
      });
      return;
    }

    setDeletingPostId(post.id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-instagram-post', {
        body: { postId: post.id, instagramMediaId: post.instagram_media_id }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Erro ao deletar do Instagram');

      toast({
        title: 'Post excluído!',
        description: 'O post foi removido do Instagram com sucesso.',
      });
      
      // Invalidate the posts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config'] });
      onPostDeleted?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingPostId(null);
      setPostToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Postagens
          </CardTitle>
          <CardDescription>
            Últimas postagens publicadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publishedPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma postagem publicada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {publishedPosts.slice(0, 10).map((post: any) => {
                const isCarousel = post.post_type === 'carousel' && post.image_urls && post.image_urls.length > 1;
                const isDeleting = deletingPostId === post.id;
                
                return (
                  <div key={post.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 relative">
                      <img
                        src={post.image_url}
                        alt="Post publicado"
                        className="w-full h-full object-cover"
                      />
                      {isCarousel && (
                        <div className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded flex items-center">
                          <Layers className="w-2.5 h-2.5 mr-0.5" />
                          {post.image_urls.length}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{post.caption.slice(0, 80)}...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Publicado em {format(new Date(post.published_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewPost(post)}
                        title="Ver preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {post.status === 'published' && post.instagram_media_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setPostToDelete(post)}
                          disabled={isDeleting}
                          title="Excluir do Instagram"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {post.status === 'published' ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Publicado
                        </Badge>
                      ) : post.status === 'failed' ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Falhou
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewPost && (
        <InstagramPostPreviewModal
          open={!!previewPost}
          onOpenChange={(open) => !open && setPreviewPost(null)}
          imageUrl={previewPost.image_url}
          caption={previewPost.caption}
          imageUrls={previewPost.image_urls}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post do Instagram?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o post permanentemente do seu perfil do Instagram. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => postToDelete && handleDeleteFromInstagram(postToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
