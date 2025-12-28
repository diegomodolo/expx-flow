import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistorySectionProps {
  publishedPosts: any[];
}

export function HistorySection({ publishedPosts }: HistorySectionProps) {
  return (
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
                  <div>
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
  );
}
