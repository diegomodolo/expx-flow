import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppAudioPlayerProps {
  mediaUrl: string | null;
  messageId: string | null;
  instanceId: string | null;
  isOutgoing: boolean;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2];

export function WhatsAppAudioPlayer({
  mediaUrl,
  messageId,
  instanceId,
  isOutgoing,
}: WhatsAppAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch audio URL if needed
  const loadAudio = useCallback(async () => {
    if (audioSrc) return; // Already loaded
    
    setIsLoading(true);
    setError(null);

    try {
      // Try direct URL first
      if (mediaUrl) {
        // Test if URL is accessible
        const testResponse = await fetch(mediaUrl, { method: "HEAD" }).catch(() => null);
        if (testResponse?.ok) {
          setAudioSrc(mediaUrl);
          setIsLoading(false);
          return;
        }
      }

      // Need to fetch via edge function (UazapiGO /message/download)
      if (!instanceId || !messageId) {
        setError("Áudio não disponível");
        setIsLoading(false);
        return;
      }

      const { data: blob, error: fetchError } = await supabase.functions.invoke(
        "download-whatsapp-media",
        {
          body: {
            instanceId,
            messageId,
            fileName: "audio.mp3",
          },
        }
      );

      if (fetchError) throw fetchError;
      if (!(blob instanceof Blob)) throw new Error("Resposta inválida");

      const objectUrl = URL.createObjectURL(blob);
      setAudioSrc(objectUrl);
    } catch (err: any) {
      console.error("[WhatsAppAudioPlayer] Error loading audio:", err);
      setError("Erro ao carregar áudio");
    } finally {
      setIsLoading(false);
    }
  }, [mediaUrl, instanceId, messageId, audioSrc]);

  // Cleanup object URL on unmount
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
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg min-w-[200px] max-w-[280px]",
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
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          disabled={!audioSrc || duration === 0}
          className={cn(
            "cursor-pointer",
            isOutgoing ? "[&_[role=slider]]:bg-primary-foreground" : ""
          )}
        />

        {/* Time and speed */}
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-5 px-1.5 text-xs font-medium",
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
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
