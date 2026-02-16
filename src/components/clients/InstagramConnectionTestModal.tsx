import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Instagram, CheckCircle, XCircle, ExternalLink, Image as ImageIcon, AlertTriangle, RefreshCw } from "lucide-react";
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

interface Diagnostics {
  source?: string;
  hasLinkedPage?: boolean;
  suggestion?: string;
  tokenSource?: string;
  errorCode?: number;
  errorType?: string;
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
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [tokenSource, setTokenSource] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setMedia([]);
    setDiagnostics(null);
    setTokenSource(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-instagram-media", {
        body: { clientId, instagramId, limit: 12 },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) {
        setDiagnostics(data?.diagnostics || null);
        throw new Error(data?.error || "Erro ao buscar mídia do Instagram");
      }

      setMedia(data.media || []);
      setTokenSource(data.tokenSource || null);
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
      setDiagnostics(null);
      setTokenSource(null);
    }
    onOpenChange(value);
  };

  const isBmNoPageError = diagnostics?.source === 'business_manager' && diagnostics?.hasLinkedPage === false;

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

                {isBmNoPageError && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-left space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-600">Conta via Business Manager sem página vinculada</p>
                        <p className="text-muted-foreground mt-1">
                          Esta conta Instagram foi importada via Business Manager, mas não está vinculada a nenhuma Página do Facebook no sistema.
                        </p>
                        <p className="text-muted-foreground mt-2 font-medium">Para resolver:</p>
                        <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
                          <li>Vá em <strong>Configurações → Facebook Ads</strong></li>
                          <li>Clique em <strong>"Atualizar Páginas"</strong> para sincronizar as páginas do Business Manager</li>
                          <li>Teste a conexão novamente</li>
                        </ol>
                        <p className="text-muted-foreground mt-2 text-xs">
                          Se o problema persistir, verifique no Business Manager do Facebook se esta conta Instagram está atribuída a uma Página.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isBmNoPageError && error.includes("permission") && (
                  <p className="text-sm text-amber-600 mt-2 bg-amber-500/10 p-3 rounded-lg">
                    ⚠️ O token do Facebook não possui permissão para acessar o Instagram. 
                    Vá em <strong>Configurações → Facebook Ads</strong>, desconecte e reconecte 
                    garantindo que as permissões do Instagram sejam concedidas.
                  </p>
                )}

                {diagnostics?.errorCode && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Código do erro: {diagnostics.errorCode} ({diagnostics.errorType || 'unknown'})
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={testConnection} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
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
                {tokenSource && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Token: {tokenSource}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {tested && !error && media.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    Conexão funcionando — {media.length} posts encontrados
                  </span>
                </div>
                {tokenSource && (
                  <Badge variant="outline" className="text-xs">
                    {tokenSource}
                  </Badge>
                )}
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
