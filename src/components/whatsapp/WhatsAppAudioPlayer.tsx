import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { downloadAndCacheMedia, hasCachedMedia } from "@/hooks/useWhatsAppMediaCache";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppAudioPlayerProps {
  mediaUrl: string | null;
  messageId: string | null; // external_id (UazapiGO)
  supabaseMessageId: string | null; // Supabase message ID for caching
  instanceId: string | null;
  isOutgoing: boolean;
  cachedMediaUrl?: string | null;
  audioTranscription?: string | null;
  transcriptionStatus?: string | null;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2];

export function WhatsAppAudioPlayer({
  mediaUrl,
  messageId,
  supabaseMessageId,
  instanceId,
  isOutgoing,
  cachedMediaUrl,
  audioTranscription,
  transcriptionStatus,
}: WhatsAppAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Transcription state
  const [transcription, setTranscription] = useState<string | null>(audioTranscription || null);
  const [isTranscribing, setIsTranscribing] = useState(transcriptionStatus === "processing");
  const [showTranscription, setShowTranscription] = useState(!!audioTranscription);

  // Update transcription when prop changes
  useEffect(() => {
    if (audioTranscription) {
      setTranscription(audioTranscription);
      setShowTranscription(true);
    }
  }, [audioTranscription]);

  // Check if we have cached media on mount
  useEffect(() => {
    if (hasCachedMedia(cachedMediaUrl)) {
      console.log("[WhatsAppAudioPlayer] Using cached audio URL:", cachedMediaUrl);
      setAudioSrc(cachedMediaUrl!);
    }
  }, [cachedMediaUrl]);

  // Auto-transcribe incoming audio messages
  useEffect(() => {
    // Only auto-transcribe incoming messages (not outgoing)
    // Only if not already transcribed and has required IDs
    if (
      !isOutgoing &&
      !audioTranscription &&
      transcriptionStatus !== "processing" &&
      transcriptionStatus !== "completed" &&
      transcriptionStatus !== "error" &&
      supabaseMessageId &&
      instanceId &&
      messageId
    ) {
      console.log("[WhatsAppAudioPlayer] Auto-triggering transcription for incoming audio");
      triggerTranscription();
    }
  }, [isOutgoing, audioTranscription, transcriptionStatus, supabaseMessageId, instanceId, messageId]);

  const triggerTranscription = async () => {
    if (!supabaseMessageId || !instanceId || !messageId) {
      console.log("[WhatsAppAudioPlayer] Missing IDs for transcription");
      return;
    }

    setIsTranscribing(true);
    setShowTranscription(true);

    try {
      console.log("[WhatsAppAudioPlayer] Calling transcribe-audio edge function...");
      
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: {
          messageId: supabaseMessageId,
          instanceId,
          externalMessageId: messageId,
        },
      });

      if (error) {
        console.error("[WhatsAppAudioPlayer] Transcription error:", error);
        setTranscription("Erro na transcrição");
      } else if (data?.transcription) {
        console.log("[WhatsAppAudioPlayer] Transcription received:", data.transcription.substring(0, 50));
        setTranscription(data.transcription);
      } else if (data?.status === "processing") {
        // Already processing, poll for result
        pollForTranscription();
      }
    } catch (err) {
      console.error("[WhatsAppAudioPlayer] Transcription failed:", err);
      setTranscription("Erro na transcrição");
    } finally {
      setIsTranscribing(false);
    }
  };

  const pollForTranscription = async () => {
    if (!supabaseMessageId) return;

    // Poll every 2 seconds for up to 60 seconds
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsTranscribing(false);
        setTranscription("Tempo esgotado");
        return;
      }

      const { data: msg } = await supabase
        .from("whatsapp_messages")
        .select("audio_transcription, transcription_status")
        .eq("id", supabaseMessageId)
        .single();

      if (msg?.audio_transcription) {
        setTranscription(msg.audio_transcription);
        setIsTranscribing(false);
        return;
      }

      if (msg?.transcription_status === "error") {
        setTranscription("Erro na transcrição");
        setIsTranscribing(false);
        return;
      }

      attempts++;
      setTimeout(poll, 2000);
    };

    poll();
  };

  // Fetch audio URL via edge function proxy and cache it
  const loadAudio = useCallback(async () => {
    if (audioSrc) return; // Already loaded
    
    setIsLoading(true);
    setError(null);

    try {
      // Need instanceId and messageId for UazapiGO download
      if (!instanceId || !messageId) {
        // Try direct URL as fallback
        if (mediaUrl) {
          const testResponse = await fetch(mediaUrl, { method: "HEAD" }).catch(() => null);
          if (testResponse?.ok) {
            setAudioSrc(mediaUrl);
            setIsLoading(false);
            return;
          }
        }
        setError("Áudio não disponível");
        setIsLoading(false);
        return;
      }

      console.log("[WhatsAppAudioPlayer] Downloading and caching audio...");

      const result = await downloadAndCacheMedia({
        instanceId,
        externalMessageId: messageId,
        supabaseMessageId: supabaseMessageId || "",
        fileName: "audio.mp3",
        shouldCache: !!supabaseMessageId,
      });

      if (!result) {
        throw new Error("Falha ao baixar áudio");
      }

      const { blob, cachedUrl } = result;

      // If we got a cached URL, use it directly. Otherwise create blob URL
      if (cachedUrl) {
        setAudioSrc(cachedUrl);
      } else {
        const objectUrl = URL.createObjectURL(blob);
        setAudioSrc(objectUrl);
      }

      console.log("[WhatsAppAudioPlayer] Audio ready, cached:", !!cachedUrl);
    } catch (err: any) {
      console.error("[WhatsAppAudioPlayer] Error loading audio:", err);
      setError("Erro ao carregar áudio");
    } finally {
      setIsLoading(false);
    }
  }, [mediaUrl, instanceId, messageId, supabaseMessageId, audioSrc]);

  // Cleanup object URL on unmount (only if it's a blob URL)
  useEffect(() => {
    return () => {
      if (audioSrc && audioSrc.startsWith("blob:")) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioSrc]);

  // Update time display
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioSrc]);

  const togglePlay = async () => {
    if (!audioSrc) {
      await loadAudio();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    
    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 w-full min-w-[240px]">
      {/* Audio Player */}
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg w-full",
        isOutgoing ? "bg-primary-foreground/10" : "bg-background/50"
      )}>
        {audioSrc && (
          <audio ref={audioRef} src={audioSrc} preload="metadata" />
        )}

        {/* Play/Pause button */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-10 w-10 rounded-full shrink-0",
            isOutgoing 
              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
              : "bg-primary/10 hover:bg-primary/20 text-primary"
          )}
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Progress and controls */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {/* Slider */}
          <div className="px-1 py-1">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              disabled={!audioSrc || duration === 0}
              className={cn(
                "cursor-pointer w-full",
                isOutgoing ? "[&_[role=slider]]:bg-primary-foreground" : ""
              )}
            />
          </div>

          {/* Time and speed */}
          <div className="flex items-center justify-between text-xs gap-2">
            <span className={cn(
              "truncate",
              isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-5 px-1.5 text-xs font-medium shrink-0",
                isOutgoing 
                  ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={cyclePlaybackSpeed}
              disabled={!audioSrc}
            >
              {playbackSpeed}x
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <span className="text-xs text-destructive shrink-0">{error}</span>
        )}
      </div>

      {/* Transcription Section - Only for incoming messages */}
      {!isOutgoing && showTranscription && (
        <div className={cn(
          "flex items-start gap-2 px-3 py-2 rounded-lg text-sm",
          "bg-muted/50 border border-border/50"
        )}>
          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {isTranscribing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Transcrevendo áudio...</span>
              </div>
            ) : transcription ? (
              <p className="text-foreground/90 whitespace-pre-wrap break-words text-xs leading-relaxed">
                {transcription}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
