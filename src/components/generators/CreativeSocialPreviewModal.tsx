import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreativeQueueItem } from "@/hooks/useCreativeGenerationQueue";
import { Check, X, Send, Calendar, FileText, Instagram, Facebook, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SendToPresentationModal } from "./SendToPresentationModal";
import { ScheduleCreativeModal } from "./ScheduleCreativeModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  creative: CreativeQueueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: string) => void;
  onRefresh: () => void;
}

export function CreativeSocialPreviewModal({ creative, open, onOpenChange, onStatusChange, onRefresh }: Props) {
  const [showSendToPresentation, setShowSendToPresentation] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handlePublishNow = async () => {
    setPublishing(true);
    try {
      // Get client data for Facebook/Instagram accounts
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('facebook_page_id, instagram_account_id')
        .eq('id', creative.client_id)
        .single();

      if (clientError || !client) {
        throw new Error('Cliente não encontrado');
      }

      if (!client.facebook_page_id && !client.instagram_account_id) {
        throw new Error('Configure uma conta do Facebook ou Instagram no cliente');
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const platform = client.instagram_account_id ? 'instagram' : 'facebook';

      // Create scheduled post for immediate publish
      const { data: post, error: postError } = await supabase
        .from('scheduled_posts')
        .insert({
          client_id: creative.client_id,
          company_id: creative.company_id,
          caption: creative.caption || '',
          media_urls: creative.image_url ? [creative.image_url] : [],
          content_type: 'image',
          platforms: [platform],
          scheduled_at: new Date().toISOString(),
          status: 'scheduled',
          created_by: userData.user.id,
          facebook_page_id: client.facebook_page_id,
          instagram_account_id: client.instagram_account_id,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Call publish function
      const { error: publishError } = await supabase.functions.invoke('publish-scheduled-post', {
        body: { postId: post.id },
      });

      if (publishError) throw publishError;

      // Update creative status
      await supabase
        .from('creative_generation_queue')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          scheduled_post_id: post.id,
        })
        .eq('id', creative.id);

      toast.success('Criativo publicado com sucesso!');
      onRefresh();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error publishing:', error);
      toast.error('Erro ao publicar: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Criativo</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="instagram" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </TabsTrigger>
            </TabsList>

            <TabsContent value="instagram" className="mt-4">
              <div className="max-w-sm mx-auto border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                {/* Instagram Header */}
                <div className="flex items-center gap-3 p-3 border-b">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                  <span className="font-semibold text-sm">marca_oficial</span>
                </div>
                
                {/* Image */}
                {creative.image_url ? (
                  <img
                    src={creative.image_url}
                    alt="Preview"
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">Sem imagem</span>
                  </div>
                )}
                
                {/* Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex gap-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  
                  <p className="text-sm">
                    <span className="font-semibold">marca_oficial</span>{' '}
                    {creative.caption}
                  </p>
                  
                  {creative.hashtags && (
                    <p className="text-sm text-blue-500">{creative.hashtags}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="facebook" className="mt-4">
              <div className="max-w-md mx-auto border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                {/* Facebook Header */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500" />
                  <div>
                    <p className="font-semibold text-sm">Página Oficial</p>
                    <p className="text-xs text-muted-foreground">Agora</p>
                  </div>
                </div>
                
                {/* Content */}
                <div className="px-3 pb-3">
                  <p className="text-sm">{creative.caption}</p>
                  {creative.hashtags && (
                    <p className="text-sm text-blue-500 mt-1">{creative.hashtags}</p>
                  )}
                </div>
                
                {/* Image */}
                {creative.image_url && (
                  <img
                    src={creative.image_url}
                    alt="Preview"
                    className="w-full"
                  />
                )}
                
                {/* Reactions */}
                <div className="p-3 border-t flex justify-between text-muted-foreground text-sm">
                  <span>👍 Curtir</span>
                  <span>💬 Comentar</span>
                  <span>↗️ Compartilhar</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Info */}
          <div className="mt-4 p-4 rounded-lg bg-muted space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{creative.creative_type}</Badge>
              <Badge variant="outline">{creative.generation_type === 'concept' ? 'Pesquisa' : 'Iteração'}</Badge>
              {creative.theme && <Badge variant="secondary">{creative.theme}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Gerado em {format(new Date(creative.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-3">
            {/* Ações principais para status pending */}
            {creative.status === 'pending' && (
              <>
                <div className="flex gap-2">
                  <Button onClick={() => onStatusChange('approved')} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button variant="destructive" onClick={() => onStatusChange('rejected')} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePublishNow} disabled={publishing} className="flex-1">
                    {publishing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Publicar Agora
                  </Button>
                  <Button variant="outline" onClick={() => setShowSchedule(true)} className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendar
                  </Button>
                  <Button variant="outline" onClick={() => setShowSendToPresentation(true)} className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    Apresentação
                  </Button>
                </div>
              </>
            )}
            
            {/* Ações para status approved */}
            {creative.status === 'approved' && (
              <div className="flex gap-2">
                <Button onClick={handlePublishNow} disabled={publishing} className="flex-1">
                  {publishing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publicar Agora
                </Button>
                <Button variant="outline" onClick={() => setShowSchedule(true)} className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar
                </Button>
                <Button variant="outline" onClick={() => setShowSendToPresentation(true)} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Apresentação
                </Button>
              </div>
            )}

            {/* Status info para rejected/published */}
            {creative.status === 'rejected' && (
              <div className="flex items-center justify-center p-4 bg-red-500/10 rounded-lg">
                <Badge variant="destructive" className="text-base px-4 py-2">
                  <X className="h-4 w-4 mr-2" />
                  Criativo Rejeitado
                </Badge>
              </div>
            )}

            {(creative.status === 'published' || creative.status === 'scheduled') && (
              <div className="flex items-center justify-center p-4 bg-blue-500/10 rounded-lg">
                <Badge className="bg-blue-500 text-base px-4 py-2">
                  <Check className="h-4 w-4 mr-2" />
                  {creative.status === 'published' ? 'Criativo Publicado' : 'Criativo Agendado'}
                </Badge>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SendToPresentationModal
        creative={creative}
        open={showSendToPresentation}
        onOpenChange={setShowSendToPresentation}
        onSuccess={() => {
          onRefresh();
          onOpenChange(false);
        }}
      />

      <ScheduleCreativeModal
        creative={creative}
        open={showSchedule}
        onOpenChange={setShowSchedule}
        onSuccess={() => {
          onRefresh();
          onOpenChange(false);
        }}
      />
    </>
  );
}
