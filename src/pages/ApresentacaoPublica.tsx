import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, Calendar, Target, Hash, Image as ImageIcon, Play, Layers, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ParticipantsForm } from "@/components/presentation/ParticipantsForm";
import { ApprovalButtons } from "@/components/presentation/ApprovalButtons";
import { RejectionModal } from "@/components/presentation/RejectionModal";
import { MeetingSummarySlide } from "@/components/presentation/MeetingSummarySlide";

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
    presentation_logo: string | null;
    presentation_bg_image: string | null;
    presentation_overlay_color: string | null;
    presentation_overlay_opacity: number | null;
  };
  creatives: Creative[];
}

interface Participant {
  name: string;
  role: string;
  email: string;
}

interface CreativeApproval {
  creativeId: string;
  headline: string | null;
  creativeType: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
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

  // Meeting state
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date>(new Date());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [approvals, setApprovals] = useState<CreativeApproval[]>([]);
  const [meetingCompleted, setMeetingCompleted] = useState(false);

  // UI state
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isSavingApproval, setIsSavingApproval] = useState(false);
  const [isFinalizingMeeting, setIsFinalizingMeeting] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [currentRejectionCreativeId, setCurrentRejectionCreativeId] = useState<string | null>(null);

  // Ref for debounced slide save
  const saveSlideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save current slide to database (debounced)
  const saveCurrentSlideToDb = useCallback(async (slideIndex: number, currentMeetingId: string | null) => {
    if (!currentMeetingId) return;
    
    try {
      await supabase
        .from("presentation_meetings")
        .update({ current_slide: slideIndex })
        .eq("id", currentMeetingId);
    } catch (err) {
      console.error("Error saving slide position:", err);
    }
  }, []);

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
              presentation_logo,
              presentation_bg_image,
              presentation_overlay_color,
              presentation_overlay_opacity,
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

        const creatives = (creativesData || []).map((c: any) => ({
          ...c,
          creative_media: c.creative_media?.sort((a: CreativeMedia, b: CreativeMedia) => a.order_index - b.order_index) || [],
        }));

        const presentationObj: Presentation = {
          ...presentationData,
          client: {
            name: client?.name || "",
            company: client?.company || "",
            avatar: client?.avatar || null,
            instagram_profile_picture: instagramAccount?.profile_picture_url || null,
            instagram_username: instagramAccount?.username || null,
            presentation_logo: client?.presentation_logo || null,
            presentation_bg_image: client?.presentation_bg_image || null,
            presentation_overlay_color: client?.presentation_overlay_color || null,
            presentation_overlay_opacity: client?.presentation_overlay_opacity ?? null,
          },
          creatives,
        };

        setPresentation(presentationObj);

        // Check for existing in_progress meeting
        const { data: existingMeeting, error: meetingError } = await supabase
          .from("presentation_meetings")
          .select("*")
          .eq("presentation_id", presentationData.id)
          .eq("status", "in_progress")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingMeeting && !meetingError) {
          // Restore session from existing meeting
          setMeetingId(existingMeeting.id);
          setMeetingDate(new Date(existingMeeting.meeting_date));
          setMeetingStarted(true);
          setCurrentSlide(existingMeeting.current_slide || 2);

          // Load participants
          const { data: participantsData } = await supabase
            .from("presentation_meeting_participants")
            .select("name, role, email")
            .eq("meeting_id", existingMeeting.id);

          if (participantsData) {
            setParticipants(participantsData);
          }

          // Load approvals
          const { data: approvalsData } = await supabase
            .from("presentation_creative_approvals")
            .select("creative_id, status, rejection_reason")
            .eq("meeting_id", existingMeeting.id);

          if (approvalsData) {
            setApprovals(creatives.map((c: Creative) => {
              const approval = approvalsData.find(a => a.creative_id === c.id);
              return {
                creativeId: c.id,
                headline: c.headline,
                creativeType: c.creative_type,
                status: (approval?.status as "pending" | "approved" | "rejected") || "pending",
                rejectionReason: approval?.rejection_reason || null,
              };
            }));
          }

          toast.info("Sessão anterior restaurada");
        } else {
          // Initialize fresh approvals state
          setApprovals(creatives.map((c: Creative) => ({
            creativeId: c.id,
            headline: c.headline,
            creativeType: c.creative_type,
            status: "pending" as const,
            rejectionReason: null,
          })));
        }

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

  // Slide calculation: Cover + Participants + Creatives + Summary
  const totalSlides = presentation ? 1 + 1 + presentation.creatives.length + 1 : 0;

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      // Only allow advancing past participants slide if meeting started
      if (index > 1 && !meetingStarted) {
        return;
      }
      setCurrentSlide(index);
      setCurrentCarouselIndex(0);

      // Debounce save to database
      if (meetingId && index >= 2) {
        if (saveSlideTimeoutRef.current) {
          clearTimeout(saveSlideTimeoutRef.current);
        }
        saveSlideTimeoutRef.current = setTimeout(() => {
          saveCurrentSlideToDb(index, meetingId);
        }, 500);
      }
    }
  }, [totalSlides, meetingStarted, meetingId, saveCurrentSlideToDb]);

  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  const nextCarouselImage = () => {
    const creativeIndex = currentSlide - 2; // Adjusted for new slide order
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
      // Don't handle navigation if user is typing in an input/textarea or modal is open
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || 
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isTyping || rejectionModalOpen) {
        return;
      }

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
  }, [nextSlide, prevSlide, rejectionModalOpen]);

  // Meeting functions
  const handleAddParticipant = (participant: Participant) => {
    setParticipants(prev => [...prev, participant]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartPresentation = async () => {
    if (!presentation || participants.length === 0) return;

    setIsCreatingMeeting(true);
    try {
      // Cancel any existing in_progress meetings for this presentation
      await supabase
        .from("presentation_meetings")
        .update({ status: "cancelled" })
        .eq("presentation_id", presentation.id)
        .eq("status", "in_progress");

      // Create new meeting record
      const { data: meetingData, error: meetingError } = await supabase
        .from("presentation_meetings")
        .insert({
          presentation_id: presentation.id,
          meeting_date: new Date().toISOString(),
          status: "in_progress",
          current_slide: 2, // Start at first creative
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Add participants
      const participantsToInsert = participants.map(p => ({
        meeting_id: meetingData.id,
        name: p.name,
        role: p.role,
        email: p.email,
      }));

      const { error: participantsError } = await supabase
        .from("presentation_meeting_participants")
        .insert(participantsToInsert);

      if (participantsError) throw participantsError;

      // Create approval records for each creative
      const approvalsToInsert = presentation.creatives.map(c => ({
        meeting_id: meetingData.id,
        creative_id: c.id,
        status: "pending",
      }));

      const { error: approvalsError } = await supabase
        .from("presentation_creative_approvals")
        .insert(approvalsToInsert);

      if (approvalsError) throw approvalsError;

      setMeetingId(meetingData.id);
      setMeetingDate(new Date(meetingData.meeting_date));
      setMeetingStarted(true);
      
      // Go directly to first creative slide (index 2)
      setCurrentSlide(2);

      toast.success("Reunião iniciada!");
    } catch (err: any) {
      console.error("Error starting meeting:", err);
      toast.error("Erro ao iniciar reunião");
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleApprove = async (creativeId: string) => {
    if (!meetingId) return;

    setIsSavingApproval(true);
    try {
      const { error } = await supabase
        .from("presentation_creative_approvals")
        .update({ 
          status: "approved", 
          approved_at: new Date().toISOString(),
          rejection_reason: null 
        })
        .eq("meeting_id", meetingId)
        .eq("creative_id", creativeId);

      if (error) throw error;

      setApprovals(prev => prev.map(a => 
        a.creativeId === creativeId 
          ? { ...a, status: "approved" as const, rejectionReason: null }
          : a
      ));

      toast.success("Criativo aprovado!");
    } catch (err: any) {
      console.error("Error approving:", err);
      toast.error("Erro ao aprovar criativo");
    } finally {
      setIsSavingApproval(false);
    }
  };

  const handleRejectClick = (creativeId: string) => {
    setCurrentRejectionCreativeId(creativeId);
    setRejectionModalOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!meetingId || !currentRejectionCreativeId) return;

    setIsSavingApproval(true);
    try {
      const { error } = await supabase
        .from("presentation_creative_approvals")
        .update({ 
          status: "rejected", 
          rejection_reason: reason,
          approved_at: null 
        })
        .eq("meeting_id", meetingId)
        .eq("creative_id", currentRejectionCreativeId);

      if (error) throw error;

      setApprovals(prev => prev.map(a => 
        a.creativeId === currentRejectionCreativeId 
          ? { ...a, status: "rejected" as const, rejectionReason: reason }
          : a
      ));

      setRejectionModalOpen(false);
      setCurrentRejectionCreativeId(null);
      toast.success("Criativo reprovado");
    } catch (err: any) {
      console.error("Error rejecting:", err);
      toast.error("Erro ao reprovar criativo");
    } finally {
      setIsSavingApproval(false);
    }
  };

  const handleFinalizeMeeting = async () => {
    if (!meetingId || !presentation) return;

    setIsFinalizingMeeting(true);
    try {
      // Update meeting status
      const { error: meetingError } = await supabase
        .from("presentation_meetings")
        .update({ 
          status: "completed", 
          completed_at: new Date().toISOString(),
          summary_sent: true 
        })
        .eq("id", meetingId);

      if (meetingError) throw meetingError;

      // Send email summary
      const { error: emailError } = await supabase.functions.invoke("send-presentation-summary", {
        body: {
          meetingId,
          presentationName: presentation.name,
          clientName: presentation.client.name,
          participants,
          creatives: approvals.map(a => ({
            headline: a.headline,
            creativeType: a.creativeType,
            status: a.status,
            rejectionReason: a.rejectionReason,
          })),
          meetingDate: meetingDate.toISOString(),
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.error("Reunião finalizada, mas houve erro ao enviar emails");
      } else {
        toast.success("Reunião finalizada e resumo enviado!");
      }

      setMeetingCompleted(true);
    } catch (err: any) {
      console.error("Error finalizing meeting:", err);
      toast.error("Erro ao finalizar reunião");
    } finally {
      setIsFinalizingMeeting(false);
    }
  };

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
    // Cover slide (index 0)
    if (currentSlide === 0) {
      const hasBgImage = !!presentation.client.presentation_bg_image;
      const overlayColor = presentation.client.presentation_overlay_color || primaryColor;
      const overlayOpacity = presentation.client.presentation_overlay_opacity ?? 0.7;

      return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center text-white p-12 relative overflow-hidden"
          style={{ 
            backgroundImage: hasBgImage ? `url(${presentation.client.presentation_bg_image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            background: !hasBgImage ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` : undefined
          }}
        >
          {/* Overlay */}
          {hasBgImage && (
            <div 
              className="absolute inset-0"
              style={{ 
                backgroundColor: overlayColor,
                opacity: overlayOpacity
              }}
            />
          )}
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Logo or Avatar */}
            {presentation.client.presentation_logo ? (
              <img 
                src={presentation.client.presentation_logo} 
                alt={presentation.client.name} 
                className="max-h-32 md:max-h-40 max-w-[300px] md:max-w-[400px] object-contain mb-8"
              />
            ) : presentation.client.avatar ? (
              <img 
                src={presentation.client.avatar} 
                alt={presentation.client.name} 
                className="w-24 h-24 rounded-full object-cover border-4 border-white/30 mb-8"
              />
            ) : null}
            
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 drop-shadow-lg">
              {presentation.name}
            </h1>
            <p className="text-xl md:text-2xl opacity-90 text-center mb-2 drop-shadow">
              {presentation.client.name}
            </p>
            <p className="text-lg opacity-75 drop-shadow">
              {MONTHS[presentation.month - 1]} de {presentation.year}
            </p>
            <div className="mt-12 text-sm opacity-60">
              {presentation.creatives.length} criativos
            </div>
          </div>
        </div>
      );
    }

    // Participants slide (index 1)
    if (currentSlide === 1) {
      return (
        <ParticipantsForm
          participants={participants}
          onAddParticipant={handleAddParticipant}
          onRemoveParticipant={handleRemoveParticipant}
          onStartPresentation={handleStartPresentation}
          isLoading={isCreatingMeeting}
          primaryColor={primaryColor}
        />
      );
    }

    // Summary slide (last)
    if (currentSlide === totalSlides - 1) {
      return (
        <MeetingSummarySlide
          clientName={presentation.client.name}
          presentationName={presentation.name}
          meetingDate={meetingDate}
          participants={participants}
          approvals={approvals}
          onFinalizeMeeting={handleFinalizeMeeting}
          isLoading={isFinalizingMeeting}
          isCompleted={meetingCompleted}
          primaryColor={primaryColor}
        />
      );
    }

    // Creative slides (index 2 to totalSlides - 2)
    const creativeIndex = currentSlide - 2;
    const creative = presentation.creatives[creativeIndex];

    if (!creative) return null;

    const isCarousel = creative.creative_type === "carrossel" && creative.creative_media.length > 1;
    const currentMediaIndex = isCarousel ? currentCarouselIndex : 0;
    const currentMedia = creative.creative_media[currentMediaIndex];
    const approval = approvals.find(a => a.creativeId === creative.id);

    return (
      <div className="w-full h-full bg-background flex overflow-hidden">
        {/* Left side - Instagram Frame */}
        <div className="w-1/2 h-full bg-muted flex items-center justify-center p-2">
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

            {/* Media Container */}
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

              {/* Carousel navigation */}
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {creative.headline}
            </h2>
          )}

          {/* Subheadline */}
          {creative.subheadline && (
            <p className="text-xl md:text-2xl text-muted-foreground mb-6">
              {creative.subheadline}
            </p>
          )}

          {/* Schedule info */}
          {creative.scheduled_date && (
            <div className="flex items-center gap-2 text-base text-muted-foreground mb-5">
              <Calendar className="w-5 h-5" />
              <span>
                {new Date(creative.scheduled_date).toLocaleDateString("pt-BR")}
                {creative.scheduled_time && ` às ${creative.scheduled_time.slice(0, 5)}`}
              </span>
            </div>
          )}

          {/* Objective */}
          {creative.objective && (
            <div className="mb-5">
              <div className="flex items-center gap-2 text-base font-medium text-foreground mb-2">
                <Target className="w-5 h-5" />
                Objetivo
              </div>
              <p className="text-muted-foreground text-base">{creative.objective}</p>
            </div>
          )}

          {/* Caption */}
          {creative.caption && (
            <div className="mb-5">
              <div className="text-base font-medium text-foreground mb-2">Legenda</div>
              <p className="text-base text-muted-foreground whitespace-pre-wrap line-clamp-6">
                {creative.caption}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {creative.hashtags && (
            <div className="flex items-center gap-2 text-base text-primary">
              <Hash className="w-5 h-5" />
              <span className="line-clamp-1">{creative.hashtags}</span>
            </div>
          )}

          {/* Approval buttons - only show if meeting started */}
          {meetingStarted && approval && (
            <ApprovalButtons
              status={approval.status}
              onApprove={() => handleApprove(creative.id)}
              onReject={() => handleRejectClick(creative.id)}
              isLoading={isSavingApproval}
              rejectionReason={approval.rejectionReason}
            />
          )}
        </div>
      </div>
    );
  };

  const currentCreative = currentSlide >= 2 && currentSlide < totalSlides - 1
    ? presentation.creatives[currentSlide - 2]
    : null;

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
              disabled={i > 1 && !meetingStarted}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentSlide === i 
                  ? "bg-white w-4" 
                  : i > 1 && !meetingStarted
                    ? "bg-white/10"
                    : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1 || (currentSlide === 1 && !meetingStarted)}
          className="text-white hover:bg-white/10"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Slide counter */}
      <div className="text-center text-white/50 text-sm pb-4">
        {currentSlide + 1} / {totalSlides}
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setCurrentRejectionCreativeId(null);
        }}
        onConfirm={handleRejectConfirm}
        creativeName={currentCreative?.headline || undefined}
        isLoading={isSavingApproval}
      />
    </div>
  );
}
