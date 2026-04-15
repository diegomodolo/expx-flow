import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Instagram,
  Facebook,
  Loader2,
  Send,
  AlertCircle,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Slide {
  position?: number;
  slide_number?: number;
  image_url?: string;
  headline?: string;
  body_text?: string;
  body?: string;
  [key: string]: unknown;
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
  onCaptionChange?: (caption: string, hashtags: string) => void;
  instagramUsername?: string | null;
}

interface ClientAccounts {
  facebook_page_id: string | null;
  instagram_account_id: string | null;
  facebook_page?: { page_name: string } | null;
  instagram_account?: { username: string } | null;
}

interface SlideForMockup {
  image_url?: string;
  [key: string]: unknown;
}

function InstagramMockup({
  slides,
  currentSlide,
  onNavigate,
  username,
  caption,
  hashtags,
}: {
  slides: SlideForMockup[];
  currentSlide: number;
  onNavigate: (i: number) => void;
  username: string;
  caption: string;
  hashtags: string;
}) {
  const total = slides.length;
  const imgUrl = slides[currentSlide]?.image_url ?? null;
  const captionPreview = [caption, hashtags].filter(Boolean).join("\n\n");
  const truncated =
    captionPreview.length > 80
      ? captionPreview.slice(0, 80) + "..."
      : captionPreview;

  return (
    <div
      className="rounded-[2rem] border-2 border-zinc-700 bg-black overflow-hidden"
      style={{ width: 340 }}
    >
      {/* Status bar decorativa */}
      <div className="h-5 bg-black flex items-center justify-between px-5">
        <span className="text-white text-[9px]">9:41</span>
        <span className="text-white text-[9px]">● ● ●</span>
      </div>

      {/* Header Instagram */}
      <div className="bg-white flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-black">{username}</span>
        </div>
        <span className="text-black text-lg leading-none">···</span>
      </div>

      {/* Área da imagem */}
      <div
        className="relative bg-black"
        style={{ aspectRatio: "4/5", width: 340 }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={`Slide ${currentSlide + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-10 h-10 text-zinc-600" />
          </div>
        )}

        {/* Seta esquerda */}
        {currentSlide > 0 && (
          <button
            onClick={() => onNavigate(currentSlide - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs"
          >
            ‹
          </button>
        )}

        {/* Seta direita */}
        {currentSlide < total - 1 && (
          <button
            onClick={() => onNavigate(currentSlide + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs"
          >
            ›
          </button>
        )}

        {/* Dots de navegação */}
        {total > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentSlide ? "bg-blue-400" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ações decorativas */}
      <div className="bg-white px-3 py-2 flex items-center gap-3">
        <span className="text-black text-base">♡</span>
        <span className="text-black text-base">💬</span>
        <span className="text-black text-base">✈</span>
        <span className="text-black text-base ml-auto">🔖</span>
      </div>

      {/* Caption preview */}
      <div className="bg-white px-3 pb-3">
        <p className="text-[11px] text-black leading-snug">
          <span className="font-semibold">{username}</span>{" "}
          {truncated || (
            <span className="text-zinc-400 italic">sem legenda</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function PublishCarouselModal({
  carousel,
  open,
  onOpenChange,
  onSuccess,
  onCaptionChange,
  instagramUsername,
}: Props) {
  const [publishing, setPublishing] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [clientAccounts, setClientAccounts] = useState<ClientAccounts | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [caption, setCaption] = useState(carousel.caption ?? "");
  const [hashtags, setHashtags] = useState(carousel.hashtags ?? "");

  useEffect(() => {
    if (open) {
      fetchClientAccounts();
    }
  }, [open, carousel.client_id]);

  const fetchClientAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          facebook_page_id,
          instagram_account_id,
          facebook_page:facebook_pages(page_name),
          instagram_account:instagram_accounts(username)
        `,
        )
        .eq("id", carousel.client_id)
        .single();

      if (error) throw error;

      setClientAccounts(data as unknown as ClientAccounts);

      // Pre-select available platforms
      const platforms: string[] = [];
      if (data?.instagram_account_id) platforms.push("instagram");
      if (data?.facebook_page_id) platforms.push("facebook");
      setSelectedPlatforms(platforms);
    } catch (error: unknown) {
      console.error("Error fetching client accounts:", error);
      toast.error("Erro ao carregar contas do cliente");
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Selecione pelo menos uma plataforma");
      return;
    }

    setPublishing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Get all image URLs from slides
      const mediaUrls = carousel.slides
        .filter((slide) => slide.image_url)
        .map((slide) => slide.image_url as string);

      if (mediaUrls.length === 0) {
        throw new Error("O carrossel não possui imagens para publicar");
      }

      // Build caption with hashtags
      let fullCaption = caption || "";
      if (hashtags) {
        fullCaption = fullCaption ? `${fullCaption}\n\n${hashtags}` : hashtags;
      }

      // Get company_id from the carousel
      const { data: carouselData } = await supabase
        .from("carousel_generation_queue")
        .select("company_id")
        .eq("id", carousel.id)
        .single();

      // Create scheduled post for immediate publish
      const { data: post, error: postError } = await supabase
        .from("scheduled_posts")
        .insert({
          client_id: carousel.client_id,
          company_id: carouselData?.company_id || carousel.company_id,
          caption: fullCaption,
          media_urls: mediaUrls,
          content_type: "carousel",
          platforms: selectedPlatforms,
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
          created_by: userData.user.id,
          facebook_page_id: selectedPlatforms.includes("facebook")
            ? clientAccounts?.facebook_page_id
            : null,
          instagram_account_id: selectedPlatforms.includes("instagram")
            ? clientAccounts?.instagram_account_id
            : null,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Call publish function
      const { data: publishResult, error: publishError } =
        await supabase.functions.invoke("publish-scheduled-post", {
          body: { postId: post.id },
        });

      if (publishError) throw publishError;

      // Check results
      const results = publishResult?.results || {};
      const errors: string[] = [];
      const successes: string[] = [];

      if (selectedPlatforms.includes("instagram")) {
        if (results.instagram?.success) {
          successes.push("Instagram");
        } else if (results.instagram?.error) {
          errors.push(`Instagram: ${results.instagram.error}`);
        }
      }

      if (selectedPlatforms.includes("facebook")) {
        if (results.facebook?.success) {
          successes.push("Facebook");
        } else if (results.facebook?.error) {
          errors.push(`Facebook: ${results.facebook.error}`);
        }
      }

      if (successes.length > 0) {
        toast.success(`Carrossel publicado em: ${successes.join(", ")}`);
        onSuccess();
        onOpenChange(false);
      } else if (errors.length > 0) {
        toast.error(`Erros: ${errors.join("; ")}`);
      } else {
        toast.error(
          "Nenhuma plataforma retornou resultado. Verifique os logs.",
        );
      }
    } catch (error: unknown) {
      console.error("Error publishing carousel:", error);
      toast.error("Erro ao publicar: " + (error as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const hasInstagram = !!clientAccounts?.instagram_account_id;
  const hasFacebook = !!clientAccounts?.facebook_page_id;
  const hasAnyAccount = hasInstagram || hasFacebook;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
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
              Este cliente não possui contas do Instagram ou Facebook
              configuradas. Configure as contas na aba de configurações do
              cliente.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex gap-6">
            {/* Coluna esquerda — mockup Instagram */}
            <div className="flex-shrink-0">
              <InstagramMockup
                slides={carousel.slides}
                currentSlide={currentSlide}
                onNavigate={setCurrentSlide}
                username={
                  instagramUsername ??
                  (
                    clientAccounts?.instagram_account as unknown as {
                      username: string;
                    } | null
                  )?.username ??
                  "instagram"
                }
                caption={caption}
                hashtags={hashtags}
              />
            </div>

            {/* Coluna direita — controles */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Legenda */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Legenda</Label>
                <Textarea
                  value={caption}
                  onChange={(e) => {
                    setCaption(e.target.value);
                    onCaptionChange?.(e.target.value, hashtags);
                  }}
                  className="min-h-[100px] text-sm resize-none"
                  placeholder="Legenda do post..."
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Hashtags</Label>
                <Textarea
                  value={hashtags}
                  onChange={(e) => {
                    setHashtags(e.target.value);
                    onCaptionChange?.(caption, e.target.value);
                  }}
                  className="min-h-[60px] text-sm resize-none"
                  placeholder="#marketing #carrossel..."
                />
              </div>

              {/* Seleção de plataformas */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Publicar em:</Label>

                {hasInstagram && (
                  <div
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedPlatforms.includes("instagram")
                        ? "border-pink-500 bg-pink-500/10"
                        : "border-border hover:border-pink-300"
                    }`}
                    onClick={() => togglePlatform("instagram")}
                  >
                    <Checkbox
                      id="instagram"
                      checked={selectedPlatforms.includes("instagram")}
                      onCheckedChange={() => togglePlatform("instagram")}
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
                        <Instagram className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Instagram</p>
                        <p className="text-xs text-muted-foreground">
                          @
                          {(
                            clientAccounts?.instagram_account as unknown as {
                              username: string;
                            } | null
                          )?.username ?? "conta"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {hasFacebook && (
                  <div
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedPlatforms.includes("facebook")
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-border hover:border-blue-300"
                    }`}
                    onClick={() => togglePlatform("facebook")}
                  >
                    <Checkbox
                      id="facebook"
                      checked={selectedPlatforms.includes("facebook")}
                      onCheckedChange={() => togglePlatform("facebook")}
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-blue-600">
                        <Facebook className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Facebook</p>
                        <p className="text-xs text-muted-foreground">
                          {(
                            clientAccounts?.facebook_page as unknown as {
                              page_name: string;
                            } | null
                          )?.page_name ?? "Página"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão publicar */}
              <Button
                onClick={handlePublish}
                disabled={publishing || selectedPlatforms.length === 0}
                className="w-full mt-auto"
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
                    Publicar em {selectedPlatforms.length} plataforma
                    {selectedPlatforms.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
