import { useState, useCallback, useEffect } from "react";
import { Video as VideoIcon, Download, Loader2, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { downloadAndCacheMedia, hasCachedMedia } from "@/hooks/useWhatsAppMediaCache";

interface WhatsAppVideoViewerProps {
  mediaUrl: string | null;
  messageId: string | null; // external_id (UazapiGO)
  supabaseMessageId: string | null; // Supabase message ID for caching
  instanceId: string | null;
  isOutgoing: boolean;
  cachedMediaUrl?: string | null;
}

export function WhatsAppVideoViewer({
  mediaUrl,
  messageId,
  supabaseMessageId,
  instanceId,
  isOutgoing,
  cachedMediaUrl,
}: WhatsAppVideoViewerProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if we have cached media on mount
  useEffect(() => {
    if (hasCachedMedia(cachedMediaUrl)) {
      console.log("[WhatsAppVideoViewer] Using cached video URL:", cachedMediaUrl);
      setVideoSrc(cachedMediaUrl!);
      setVideoLoaded(true);
      // Generate thumbnail from cached video
      generateThumbnail(cachedMediaUrl!);
    }
  }, [cachedMediaUrl]);

  // Generate a thumbnail from video
  const generateThumbnail = useCallback((videoUrl: string) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.src = videoUrl;
    
    video.onloadeddata = () => {
      video.currentTime = 1; // Seek to 1 second for thumbnail
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL("image/jpeg", 0.7);
          setThumbnailSrc(thumbUrl);
        }
      } catch (e) {
        console.log("[WhatsAppVideoViewer] Thumbnail generation failed:", e);
      }
    };
    
    video.onerror = () => {
      console.log("[WhatsAppVideoViewer] Video metadata load failed for thumbnail");
    };
  }, []);

  const handleDownload = useCallback(async () => {
    if (videoSrc) {
      // Video already loaded, just open modal
      setIsModalOpen(true);
      return;
    }

    if (!instanceId || !messageId) {
      // Try direct URL as fallback
      if (mediaUrl) {
        try {
          const testResponse = await fetch(mediaUrl, { method: "HEAD" }).catch(() => null);
          if (testResponse?.ok) {
            setVideoSrc(mediaUrl);
            setVideoLoaded(true);
            generateThumbnail(mediaUrl);
            return;
          }
        } catch {
          // Continue to error
        }
      }
      setError("Vídeo não disponível");
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      console.log("[WhatsAppVideoViewer] Downloading and caching video...");

      const result = await downloadAndCacheMedia({
        instanceId,
        externalMessageId: messageId,
        supabaseMessageId: supabaseMessageId || "",
        fileName: "video.mp4",
        shouldCache: !!supabaseMessageId,
      });

      if (!result) {
        throw new Error("Falha ao baixar vídeo");
      }

      const { blob, cachedUrl } = result;
      let url: string;

      // If we got a cached URL, use it directly. Otherwise create blob URL
      if (cachedUrl) {
        url = cachedUrl;
      } else {
        url = URL.createObjectURL(blob);
      }

      setVideoSrc(url);
      setVideoLoaded(true);
      generateThumbnail(url);
      console.log("[WhatsAppVideoViewer] Video ready, cached:", !!cachedUrl);
    } catch (err: any) {
      console.error("[WhatsAppVideoViewer] Error:", err);
      setError(err.message || "Erro ao carregar vídeo");
    } finally {
      setIsDownloading(false);
    }
  }, [videoSrc, instanceId, messageId, supabaseMessageId, mediaUrl, generateThumbnail]);

  const handleSaveVideo = useCallback(() => {
    if (!videoSrc) return;
    
    const link = document.createElement("a");
    link.href = videoSrc;
    link.download = `whatsapp_video_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [videoSrc]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
        <VideoIcon className="h-5 w-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // Show thumbnail if video is loaded
  if (videoLoaded && videoSrc) {
    return (
      <>
        <div 
          className="relative cursor-pointer group rounded-lg overflow-hidden"
          onClick={() => setIsModalOpen(true)}
        >
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt="Preview do vídeo"
              className="max-w-full max-h-60 object-cover"
            />
          ) : (
            <div className={cn(
              "w-full h-40 flex items-center justify-center",
              isOutgoing ? "bg-primary-foreground/10" : "bg-muted/50"
            )}>
              <VideoIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-7 w-7 text-white fill-white ml-1" />
            </div>
          </div>
        </div>

        {/* Modal for video player */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
            <DialogClose className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors">
              <X className="h-5 w-5" />
            </DialogClose>
            
            <div className="relative flex items-center justify-center w-full h-full min-h-[50vh]">
              <video
                src={videoSrc}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] object-contain"
                playsInline
              />
            </div>

            <div className="absolute bottom-4 right-4 z-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveVideo}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show placeholder with download button
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-lg cursor-pointer transition-colors",
        isOutgoing 
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
          : "bg-muted/50 hover:bg-muted"
      )}
      onClick={handleDownload}
    >
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center mb-3",
        isOutgoing ? "bg-primary-foreground/20" : "bg-muted"
      )}>
        {isDownloading ? (
          <Loader2 className={cn(
            "h-8 w-8 animate-spin",
            isOutgoing ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        ) : (
          <VideoIcon className={cn(
            "h-8 w-8",
            isOutgoing ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        )}
      </div>
      
      <span className={cn(
        "text-sm font-medium mb-2",
        isOutgoing ? "text-primary-foreground" : "text-foreground"
      )}>
        Vídeo
      </span>
      
      <Button
        variant={isOutgoing ? "secondary" : "outline"}
        size="sm"
        disabled={isDownloading}
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Baixando...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Baixar vídeo
          </>
        )}
      </Button>
    </div>
  );
}
