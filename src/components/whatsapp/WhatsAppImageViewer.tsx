import { useState, useCallback, useEffect } from "react";
import { Image as ImageIcon, Download, Loader2, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { downloadAndCacheMedia, hasCachedMedia } from "@/hooks/useWhatsAppMediaCache";

interface WhatsAppImageViewerProps {
  mediaUrl: string | null;
  messageId: string | null; // external_id (UazapiGO)
  supabaseMessageId: string | null; // Supabase message ID for caching
  instanceId: string | null;
  isOutgoing: boolean;
  cachedMediaUrl?: string | null;
}

export function WhatsAppImageViewer({
  mediaUrl,
  messageId,
  supabaseMessageId,
  instanceId,
  isOutgoing,
  cachedMediaUrl,
}: WhatsAppImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if we have cached media on mount
  useEffect(() => {
    if (hasCachedMedia(cachedMediaUrl)) {
      console.log("[WhatsAppImageViewer] Using cached image URL:", cachedMediaUrl);
      setImageSrc(cachedMediaUrl!);
      setImageLoaded(true);
    }
  }, [cachedMediaUrl]);

  const handleDownload = useCallback(async () => {
    if (imageSrc) {
      // Image already loaded, just open modal
      setIsModalOpen(true);
      return;
    }

    if (!instanceId || !messageId) {
      // Try direct URL as fallback
      if (mediaUrl) {
        try {
          const testResponse = await fetch(mediaUrl, { method: "HEAD" }).catch(() => null);
          if (testResponse?.ok) {
            setImageSrc(mediaUrl);
            setImageLoaded(true);
            return;
          }
        } catch {
          // Continue to error
        }
      }
      setError("Imagem não disponível");
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      console.log("[WhatsAppImageViewer] Downloading and caching image...");

      const result = await downloadAndCacheMedia({
        instanceId,
        externalMessageId: messageId,
        supabaseMessageId: supabaseMessageId || "",
        fileName: "image.jpg",
        shouldCache: !!supabaseMessageId,
      });

      if (!result) {
        throw new Error("Falha ao baixar imagem");
      }

      const { blob, cachedUrl } = result;

      // If we got a cached URL, use it directly. Otherwise create blob URL
      if (cachedUrl) {
        setImageSrc(cachedUrl);
      } else {
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
      }

      setImageLoaded(true);
      console.log("[WhatsAppImageViewer] Image ready, cached:", !!cachedUrl);
    } catch (err: any) {
      console.error("[WhatsAppImageViewer] Error:", err);
      setError(err.message || "Erro ao carregar imagem");
    } finally {
      setIsDownloading(false);
    }
  }, [imageSrc, instanceId, messageId, supabaseMessageId, mediaUrl]);

  const handleSaveImage = useCallback(() => {
    if (!imageSrc) return;
    
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = `whatsapp_image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageSrc]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // Show thumbnail if image is loaded
  if (imageLoaded && imageSrc) {
    return (
      <>
        <div 
          className="relative cursor-pointer group"
          onClick={() => setIsModalOpen(true)}
        >
          <img
            src={imageSrc}
            alt="Imagem do WhatsApp"
            className="rounded-lg max-w-full max-h-60 object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Modal for full-size image */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
            <DialogClose className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors">
              <X className="h-5 w-5" />
            </DialogClose>
            
            <div className="relative flex items-center justify-center w-full h-full min-h-[50vh]">
              <img
                src={imageSrc}
                alt="Imagem do WhatsApp"
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>

            <div className="absolute bottom-4 right-4 z-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveImage}
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
          <ImageIcon className={cn(
            "h-8 w-8",
            isOutgoing ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        )}
      </div>
      
      <span className={cn(
        "text-sm font-medium mb-2",
        isOutgoing ? "text-primary-foreground" : "text-foreground"
      )}>
        Imagem
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
            Baixar imagem
          </>
        )}
      </Button>
    </div>
  );
}
