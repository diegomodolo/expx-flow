import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreativeData } from "@/hooks/useCampaignBuilder";
import { cn } from "@/lib/utils";

interface FeedPreviewProps {
  creative: CreativeData;
  clientName?: string;
  clientAvatar?: string;
}

const CTA_LABELS: Record<string, string> = {
  'LEARN_MORE': 'Saiba Mais',
  'SHOP_NOW': 'Comprar Agora',
  'SIGN_UP': 'Cadastre-se',
  'BOOK_NOW': 'Reserve Agora',
  'CONTACT_US': 'Fale Conosco',
  'DOWNLOAD': 'Baixar',
  'GET_QUOTE': 'Obter Cotação',
  'APPLY_NOW': 'Candidatar-se',
  'SUBSCRIBE': 'Assinar',
  'WATCH_MORE': 'Assistir Mais',
  'SEND_MESSAGE': 'Enviar Mensagem',
  'GET_OFFER': 'Obter Oferta',
};

export function FeedPreview({ creative, clientName = "Sua Marca", clientAvatar }: FeedPreviewProps) {
  const [activeTab, setActiveTab] = useState<'instagram' | 'facebook'>('instagram');

  const hasMedia = creative.mediaUrls.length > 0;
  const mediaUrl = hasMedia ? creative.mediaUrls[0] : null;
  const ctaLabel = CTA_LABELS[creative.callToAction] || 'Saiba Mais';

  // Extrair domínio da URL
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'seusite.com.br';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📱 Pré-visualização do Anúncio</CardTitle>
        <p className="text-xs text-muted-foreground">
          Veja como seu anúncio aparecerá nos feeds do Instagram e Facebook
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'instagram' | 'facebook')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="instagram" className="gap-2">
              <InstagramIcon className="w-4 h-4" />
              Instagram
            </TabsTrigger>
            <TabsTrigger value="facebook" className="gap-2">
              <FacebookIcon className="w-4 h-4" />
              Facebook
            </TabsTrigger>
          </TabsList>

          {/* Instagram Feed Preview */}
          <TabsContent value="instagram" className="mt-0">
            <div className="max-w-[320px] mx-auto bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                      {clientAvatar ? (
                        <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-foreground">
                          {clientName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">{clientName}</span>
                    <span className="text-[10px] text-muted-foreground">Patrocinado</span>
                  </div>
                </div>
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </div>

              {/* Media - 3:4 aspect ratio (1080x1440 new Instagram format) */}
              <div className="aspect-[3/4] bg-muted relative">
                {hasMedia ? (
                  creative.type === 'VIDEO' ? (
                    <video
                      src={mediaUrl!}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl!}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-sm">Adicione uma imagem</span>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <div className="px-3 py-2 border-b">
                <button className="w-full bg-primary/10 text-primary text-xs font-semibold py-2 rounded-md hover:bg-primary/20 transition-colors">
                  {ctaLabel}
                </button>
              </div>

              {/* Actions */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Heart className="w-6 h-6 text-foreground cursor-pointer hover:text-red-500 transition-colors" />
                    <MessageCircle className="w-6 h-6 text-foreground cursor-pointer" />
                    <Send className="w-6 h-6 text-foreground cursor-pointer" />
                  </div>
                  <Bookmark className="w-6 h-6 text-foreground cursor-pointer" />
                </div>

                {/* Caption */}
                <div className="space-y-1">
                  <p className="text-xs">
                    <span className="font-semibold text-foreground">{clientName}</span>{' '}
                    <span className="text-foreground">
                      {creative.body || 'Seu texto do anúncio aparecerá aqui...'}
                    </span>
                  </p>
                  {creative.title && (
                    <p className="text-xs font-medium text-foreground">{creative.title}</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Facebook Feed Preview */}
          <TabsContent value="facebook" className="mt-0">
            <div className="max-w-[320px] mx-auto bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                    {clientAvatar ? (
                      <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary-foreground">
                        {clientName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{clientName}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Patrocinado</span>
                      <span>·</span>
                      <span>🌐</span>
                    </div>
                  </div>
                </div>

                {/* Body Text */}
                <p className="text-sm text-foreground">
                  {creative.body || 'Seu texto do anúncio aparecerá aqui...'}
                </p>
              </div>

              {/* Media - 3:4 aspect ratio (1080x1440 new Instagram format) */}
              <div className="aspect-[3/4] bg-muted relative">
                {hasMedia ? (
                  creative.type === 'VIDEO' ? (
                    <video
                      src={mediaUrl!}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl!}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-sm">Adicione uma imagem</span>
                  </div>
                )}
              </div>

              {/* Link Preview */}
              <div className="p-3 bg-muted/50 border-y flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {creative.linkUrl ? getDomain(creative.linkUrl) : 'seusite.com.br'}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {creative.title || 'Título do seu anúncio'}
                  </p>
                  {creative.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {creative.description}
                    </p>
                  )}
                </div>
                <button className="ml-3 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold px-4 py-2 rounded transition-colors whitespace-nowrap">
                  {ctaLabel}
                </button>
              </div>

              {/* Engagement Stats */}
              <div className="px-3 py-2 flex items-center justify-between text-xs text-muted-foreground border-b">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <ThumbsUp className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                      <Heart className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  </div>
                  <span>1,2 mil</span>
                </div>
                <span>48 comentários · 12 compartilhamentos</span>
              </div>

              {/* Actions */}
              <div className="px-3 py-2 grid grid-cols-3 gap-1">
                <button className="flex items-center justify-center gap-2 py-2 hover:bg-muted rounded transition-colors">
                  <ThumbsUp className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Curtir</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 hover:bg-muted rounded transition-colors">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Comentar</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 hover:bg-muted rounded transition-colors">
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Enviar</span>
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Instagram Icon Component
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

// Facebook Icon Component
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
