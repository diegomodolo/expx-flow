import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Instagram, CheckCircle, XCircle, ExternalLink, Heart, MessageCircle, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface InstagramConnectionTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  instagramId: string;
  instagramUsername: string;
}

interface MediaItem {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

export function InstagramConnectionTestModal({
  open,
  onOpenChange,
  clientId,
  instagramId,
  instagramUsername,
}: InstagramConnectionTestModalProps) {
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tested, setTested] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setMedia([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-instagram-media", {
        body: { clientId, instagramId, limit: 12 },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar mídia do Instagram");

      setMedia(data.media || []);
      setTested(true);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
      setTested(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setMedia([]);
      setError(null);
      setTested(false);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-600" />
            Testar Conexão - @{instagramUsername}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!tested && (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para verificar se a conexão com o Instagram está funcionando
                e visualizar os posts recentes.
              </p>
              <Button onClick={testConnection} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>
            </div>
          )}

          {tested && error && (
            <div className="text-center py-6 space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="font-medium text-destructive">Falha na Conexão</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={testConnection} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Tentar Novamente
              </Button>
            </div>
          )}

          {tested && !error && media.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="font-medium text-green-600">Conexão OK</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  A conexão está funcionando, mas nenhum post foi encontrado.
                </p>
              </div>
            </div>
          )}

          {tested && !error && media.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  Conexão funcionando — {media.length} posts encontrados
                </span>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-3 gap-2">
                  {media.map((item) => (
                    <a
                      key={item.id}
                      href={item.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      {item.media_url || item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url || item.media_url}
                          alt={item.caption?.substring(0, 50) || "Instagram post"}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex items-center gap-3 text-white text-xs">
                          <Badge variant="secondary" className="text-xs">
                            {item.media_type === "VIDEO" ? "Vídeo" : item.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem"}
                          </Badge>
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end">
                <Button variant="outline" onClick={testConnection} disabled={loading} size="sm">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Atualizar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
