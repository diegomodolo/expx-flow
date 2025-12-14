import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, Calendar, Target, Hash, Image as ImageIcon, Play, Layers, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreativeMedia {
  id: string;
  media_url: string;
  media_type: string;
  order_index: number;
  slide_headline: string | null;
  slide_subheadline: string | null;
}

interface Creative {
  id: string;
  creative_type: string;
  order_index: number;
  scheduled_date: string | null;
  scheduled_time: string | null;
  objective: string | null;
  headline: string | null;
  subheadline: string | null;
  caption: string | null;
  hashtags: string | null;
  script: any;
  creative_media: CreativeMedia[];
}

interface Presentation {
  id: string;
  name: string;
  month: number;
  year: number;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
  client: {
    name: string;
    company: string;
    avatar: string | null;
    instagram_profile_picture: string | null;
    instagram_username: string | null;
  };
  creatives: Creative[];
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  post_unico: "Post Único",
  carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

const CREATIVE_TYPE_ICONS: Record<string, React.ReactNode> = {
  post_unico: <ImageIcon className="w-5 h-5" />,
  carrossel: <Layers className="w-5 h-5" />,
  reels: <Play className="w-5 h-5" />,
  stories: <Layers className="w-5 h-5" />,
};

export default function ApresentacaoPublica() {
  const { token } = useParams<{ token: string }>();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  useEffect(() => {
    async function fetchPresentation() {
      if (!token) {
        setError("Token não fornecido");
        setLoading(false);
        return;
      }

      try {
        // Fetch presentation by public token
        const { data: presentationData, error: presentationError } = await supabase
          .from("content_presentations")
          .select(`
            id,
            name,
            month,
            year,
            primary_color,
            secondary_color,
            status,
            clients!content_presentations_client_id_fkey (
              name,
              company,
              avatar,
              instagram_accounts (
                profile_picture_url,
                username
              )
            )
          `)
          .eq("public_token", token)
          .single();

        if (presentationError || !presentationData) {
          setError("Apresentação não encontrada");
          setLoading(false);
          return;
        }

        // Fetch creatives
        const { data: creativesData, error: creativesError } = await supabase
          .from("presentation_creatives")
          .select(`
            id,
            creative_type,
            order_index,
            scheduled_date,
            scheduled_time,
            objective,
            headline,
            subheadline,
            caption,
            hashtags,
            script,
            creative_media (
              id,
              media_url,
              media_type,
              order_index,
              slide_headline,
              slide_subheadline
            )
          `)
          .eq("presentation_id", presentationData.id)
          .order("order_index", { ascending: true });

        if (creativesError) throw creativesError;

        const client = presentationData.clients as any;

        const instagramAccount = client?.instagram_accounts as any;

        setPresentation({
          ...presentationData,
          client: {
            name: client?.name || "",
            company: client?.company || "",
            avatar: client?.avatar || null,
            instagram_profile_picture: instagramAccount?.profile_picture_url || null,
            instagram_username: instagramAccount?.username || null,
          },
          creatives: (creativesData || []).map((c: any) => ({
            ...c,
            creative_media: c.creative_media?.sort((a: CreativeMedia, b: CreativeMedia) => a.order_index - b.order_index) || [],
          })),
        });

        // Increment view count
        await supabase
          .from("content_presentations")
          .update({ view_count: (presentationData as any).view_count + 1 })
          .eq("id", presentationData.id);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPresentation();
  }, [token]);

  const totalSlides = presentation ? 1 + presentation.creatives.length + 1 : 0; // Cover + creatives + Thank you

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
      setCurrentCarouselIndex(0); // Reset carousel when changing slides
    }
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  // Carousel navigation
  const nextCarouselImage = () => {
    const creativeIndex = currentSlide - 1;
    if (creativeIndex >= 0 && presentation) {
      const creative = presentation.creatives[creativeIndex];
      if (creative && currentCarouselIndex < creative.creative_media.length - 1) {
        setCurrentCarouselIndex(prev => prev + 1);
      }
    }
  };

  const prevCarouselImage = () => {
    if (currentCarouselIndex > 0) {
      setCurrentCarouselIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, totalSlides]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold text-foreground">Apresentação não encontrada</h1>
        <p className="text-muted-foreground">{error || "Esta apresentação não existe ou não está disponível."}</p>
      </div>
    );
  }

  const primaryColor = presentation.primary_color || "#1a73e8";
  const secondaryColor = presentation.secondary_color || "#ea4335";

  const renderSlide = () => {
    // Cover slide
    if (currentSlide === 0) {
      return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center text-white p-12"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          {presentation.client.avatar && (
            <img 
              src={presentation.client.avatar} 
              alt={presentation.client.name} 
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30 mb-8"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            {presentation.name}
          </h1>
          <p className="text-xl md:text-2xl opacity-90 text-center mb-2">
            {presentation.client.name}
          </p>
          <p className="text-lg opacity-75">
            {MONTHS[presentation.month - 1]} de {presentation.year}
          </p>
          <div className="mt-12 text-sm opacity-60">
            {presentation.creatives.length} criativos
          </div>
        </div>
      );
    }

    // Thank you slide (last)
    if (currentSlide === totalSlides - 1) {
      return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center text-white p-12"
          style={{ background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})` }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Obrigado!
          </h1>
          <p className="text-xl opacity-90 text-center">
            {presentation.client.company}
          </p>
        </div>
      );
    }

    // Creative slides
    const creativeIndex = currentSlide - 1;
    const creative = presentation.creatives[creativeIndex];

    if (!creative) return null;

    const isCarousel = creative.creative_type === "carrossel" && creative.creative_media.length > 1;
    const currentMediaIndex = isCarousel ? currentCarouselIndex : 0;
    const currentMedia = creative.creative_media[currentMediaIndex];

    return (
      <div className="w-full h-full bg-background flex overflow-hidden">
        {/* Left side - Instagram Frame */}
        <div className="w-1/2 h-full bg-muted flex items-center justify-center p-2">
          {/* Instagram Post Frame - Larger size */}
          <div className="bg-white rounded-xl shadow-2xl w-full h-[95%] max-w-[500px] overflow-hidden flex flex-col">
            {/* Instagram Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                {presentation.client.instagram_profile_picture ? (
                  <img 
                    src={presentation.client.instagram_profile_picture} 
                    alt={presentation.client.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {presentation.client.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {presentation.client.instagram_username || presentation.client.name.toLowerCase().replace(/\s+/g, '')}
                  </p>
                  <p className="text-xs text-gray-500">Patrocinado</p>
                </div>
              </div>
              <MoreHorizontal className="w-6 h-6 text-gray-600" />
            </div>

            {/* Media Container - flex-1 to fill remaining space */}
            <div className="relative flex-1 bg-gray-100 min-h-0">
              {currentMedia ? (
                currentMedia.media_type === "video" ? (
                  <video 
                    src={currentMedia.media_url} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={currentMedia.media_url} 
                    alt={creative.headline || ""} 
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-gray-300" />
                </div>
              )}

              {/* Carousel navigation inside frame */}
              {isCarousel && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={prevCarouselImage}
                    disabled={currentCarouselIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg w-8 h-8 bg-white/90 hover:bg-white"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={nextCarouselImage}
                    disabled={currentCarouselIndex === creative.creative_media.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg w-8 h-8 bg-white/90 hover:bg-white"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </Button>

                  {/* Carousel dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {creative.creative_media.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentCarouselIndex(i)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          i === currentCarouselIndex ? "bg-blue-500" : "bg-white/70"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Instagram Actions */}
            <div className="px-4 py-3 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <Heart className="w-7 h-7 text-gray-800 cursor-pointer hover:text-gray-500" />
                  <MessageCircle className="w-7 h-7 text-gray-800 cursor-pointer hover:text-gray-500" />
                  <Send className="w-7 h-7 text-gray-800 cursor-pointer hover:text-gray-500" />
                </div>
                <Bookmark className="w-7 h-7 text-gray-800 cursor-pointer hover:text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">1.234 curtidas</p>
              {creative.caption && (
                <p className="text-sm text-gray-800 line-clamp-2">
                  <span className="font-semibold">
                    {presentation.client.instagram_username || presentation.client.name.toLowerCase().replace(/\s+/g, '')}
                  </span>{' '}
                  {creative.caption.substring(0, 100)}{creative.caption.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="w-1/2 h-full p-8 flex flex-col justify-center overflow-auto">
          {/* Type badge */}
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white w-fit mb-6"
            style={{ backgroundColor: primaryColor }}
          >
            {CREATIVE_TYPE_ICONS[creative.creative_type]}
            {CREATIVE_TYPE_LABELS[creative.creative_type] || creative.creative_type}
          </div>

          {/* Headline */}
          {creative.headline && (
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {creative.headline}
            </h2>
          )}

          {/* Subheadline */}
          {creative.subheadline && (
            <p className="text-lg text-muted-foreground mb-6">
              {creative.subheadline}
            </p>
          )}

          {/* Schedule info */}
          {creative.scheduled_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(creative.scheduled_date).toLocaleDateString("pt-BR")}
                {creative.scheduled_time && ` às ${creative.scheduled_time.slice(0, 5)}`}
              </span>
            </div>
          )}

          {/* Objective */}
          {creative.objective && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                <Target className="w-4 h-4" />
                Objetivo
              </div>
              <p className="text-muted-foreground text-sm">{creative.objective}</p>
            </div>
          )}

          {/* Caption */}
          {creative.caption && (
            <div className="mb-4">
              <div className="text-sm font-medium text-foreground mb-1">Legenda</div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                {creative.caption}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {creative.hashtags && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Hash className="w-4 h-4" />
              <span className="line-clamp-1">{creative.hashtags}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Main slide area */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-[92vw] max-w-[1800px] aspect-[16/9] bg-card rounded-xl shadow-2xl overflow-hidden relative">
          {renderSlide()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 p-4 bg-black">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="text-white hover:bg-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentSlide === i 
                  ? "bg-white w-4" 
                  : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="text-white hover:bg-white/10"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Slide counter */}
      <div className="text-center text-white/50 text-sm pb-4">
        {currentSlide + 1} / {totalSlides}
      </div>
    </div>
  );
}
