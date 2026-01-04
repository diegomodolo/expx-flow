import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Instagram, Facebook, Loader2, Send, AlertCircle, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Slide {
  position?: number;
  slide_number?: number;
  image_url?: string;
  headline?: string;
  body_text?: string;
  body?: string;
  [key: string]: any;
}

interface Carousel {
  id: string;
  carousel_type: string;
  slides: Slide[];
  caption: string | null;
  hashtags?: string | null;
  cta_text: string | null;
  theme: string | null;
  status: string;
  client_id: string;
  company_id?: string;
}

interface Props {
  carousel: Carousel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ClientAccounts {
  facebook_page_id: string | null;
  instagram_account_id: string | null;
  facebook_page?: { page_name: string } | null;
  instagram_account?: { username: string } | null;
}

export function PublishCarouselModal({ carousel, open, onOpenChange, onSuccess }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [clientAccounts, setClientAccounts] = useState<ClientAccounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchClientAccounts();
    }
  }, [open, carousel.client_id]);

  const fetchClientAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          facebook_page_id,
          instagram_account_id,
          facebook_page:facebook_pages(page_name),
          instagram_account:instagram_accounts(username)
        `)
        .eq('id', carousel.client_id)
        .single();

      if (error) throw error;
      
      setClientAccounts(data as unknown as ClientAccounts);
      
      // Pre-select available platforms
      const platforms: string[] = [];
      if (data?.instagram_account_id) platforms.push('instagram');
      if (data?.facebook_page_id) platforms.push('facebook');
      setSelectedPlatforms(platforms);
    } catch (error: any) {
      console.error('Error fetching client accounts:', error);
      toast.error('Erro ao carregar contas do cliente');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Selecione pelo menos uma plataforma');
      return;
    }

    setPublishing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Get all image URLs from slides
      const mediaUrls = carousel.slides
        .filter(slide => slide.image_url)
        .map(slide => slide.image_url as string);

      if (mediaUrls.length === 0) {
        throw new Error('O carrossel não possui imagens para publicar');
      }

      // Build caption with hashtags
      let fullCaption = carousel.caption || '';
      if (carousel.hashtags) {
        fullCaption = fullCaption ? `${fullCaption}\n\n${carousel.hashtags}` : carousel.hashtags;
      }

      // Get company_id from the carousel
      const { data: carouselData } = await supabase
        .from('carousel_generation_queue')
        .select('company_id')
        .eq('id', carousel.id)
        .single();

      // Create scheduled post for immediate publish
      const { data: post, error: postError } = await supabase
        .from('scheduled_posts')
        .insert({
          client_id: carousel.client_id,
          company_id: carouselData?.company_id || carousel.company_id,
          caption: fullCaption,
          media_urls: mediaUrls,
          content_type: 'carousel',
          platforms: selectedPlatforms,
          scheduled_at: new Date().toISOString(),
          status: 'scheduled',
          created_by: userData.user.id,
          facebook_page_id: selectedPlatforms.includes('facebook') ? clientAccounts?.facebook_page_id : null,
          instagram_account_id: selectedPlatforms.includes('instagram') ? clientAccounts?.instagram_account_id : null,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Call publish function
      const { data: publishResult, error: publishError } = await supabase.functions.invoke('publish-scheduled-post', {
        body: { postId: post.id },
      });

      if (publishError) throw publishError;

      // Check results
      const results = publishResult?.results || {};
      const errors: string[] = [];
      const successes: string[] = [];

      if (selectedPlatforms.includes('instagram')) {
        if (results.instagram?.success) {
          successes.push('Instagram');
        } else if (results.instagram?.error) {
          errors.push(`Instagram: ${results.instagram.error}`);
        }
      }

      if (selectedPlatforms.includes('facebook')) {
        if (results.facebook?.success) {
          successes.push('Facebook');
        } else if (results.facebook?.error) {
          errors.push(`Facebook: ${results.facebook.error}`);
        }
      }

      // Update carousel status
      await supabase
        .from('carousel_generation_queue')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', carousel.id);

      if (successes.length > 0) {
        toast.success(`Carrossel publicado em: ${successes.join(', ')}`);
      }
      
      if (errors.length > 0) {
        toast.error(`Erros: ${errors.join('; ')}`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error publishing carousel:', error);
      toast.error('Erro ao publicar: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  const hasInstagram = !!clientAccounts?.instagram_account_id;
  const hasFacebook = !!clientAccounts?.facebook_page_id;
  const hasAnyAccount = hasInstagram || hasFacebook;

  // Get first slide image for preview
  const previewImage = carousel.slides.find(s => s.image_url)?.image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Publicar Carrossel
          </DialogTitle>
          <DialogDescription>
            Selecione em quais plataformas você deseja publicar este carrossel
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !hasAnyAccount ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este cliente não possui contas do Instagram ou Facebook configuradas.
              Configure as contas na aba de configurações do cliente.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Preview do carrossel */}
            <div className="relative aspect-square max-h-48 mx-auto overflow-hidden rounded-lg bg-muted">
              {previewImage ? (
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {/* Slide count badge */}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {carousel.slides.length} slides
              </div>
            </div>

            {/* Seleção de plataformas */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Publicar em:</Label>
              
              {hasInstagram && (
                <div 
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedPlatforms.includes('instagram') 
                      ? 'border-pink-500 bg-pink-500/10' 
                      : 'border-border hover:border-pink-300'
                  }`}
                  onClick={() => togglePlatform('instagram')}
                >
                  <Checkbox 
                    id="instagram" 
                    checked={selectedPlatforms.includes('instagram')}
                    onCheckedChange={() => togglePlatform('instagram')}
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Instagram</p>
                      <p className="text-sm text-muted-foreground">
                        @{(clientAccounts?.instagram_account as any)?.username || 'conta'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {hasFacebook && (
                <div 
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedPlatforms.includes('facebook') 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-border hover:border-blue-300'
                  }`}
                  onClick={() => togglePlatform('facebook')}
                >
                  <Checkbox 
                    id="facebook" 
                    checked={selectedPlatforms.includes('facebook')}
                    onCheckedChange={() => togglePlatform('facebook')}
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-full bg-blue-600">
                      <Facebook className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Facebook</p>
                      <p className="text-sm text-muted-foreground">
                        {(clientAccounts?.facebook_page as any)?.page_name || 'Página'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de publicar */}
            <Button 
              onClick={handlePublish} 
              disabled={publishing || selectedPlatforms.length === 0}
              className="w-full"
              size="lg"
            >
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publicar em {selectedPlatforms.length} plataforma{selectedPlatforms.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
