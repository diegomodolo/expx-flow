import { useState, useCallback } from "react";
import { Image as ImageIcon, Download, Loader2, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WhatsAppImageViewerProps {
  mediaUrl: string | null;
  messageId: string | null;
  instanceId: string | null;
  isOutgoing: boolean;
}

export function WhatsAppImageViewer({
  mediaUrl,
  messageId,
  instanceId,
  isOutgoing,
}: WhatsAppImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      // Get Supabase session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setError("Sessão expirada");
        setIsDownloading(false);
        return;
      }

      // Use fetch directly to get binary response as blob
      const functionUrl = `https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/download-whatsapp-media`;

      console.log("[WhatsAppImageViewer] Fetching image via proxy", { instanceId, messageId });

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          instanceId,
          messageId,
          fileName: "image.jpg",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WhatsAppImageViewer] Download failed:", response.status, errorText);
        throw new Error("Falha ao baixar imagem");
      }

      // Get blob from response
      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Arquivo de imagem vazio");
      }

      console.log("[WhatsAppImageViewer] Image loaded, size:", blob.size);

      // Create object URL for image
      const objectUrl = URL.createObjectURL(blob);
      setImageSrc(objectUrl);
      setImageLoaded(true);
    } catch (err: any) {
      console.error("[WhatsAppImageViewer] Error:", err);
      setError(err.message || "Erro ao carregar imagem");
    } finally {
      setIsDownloading(false);
    }
  }, [imageSrc, instanceId, messageId, mediaUrl]);

  const handleSaveImage = useCallback(() => {
    if (!imageSrc) return;
    
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = `whatsapp_image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageSrc]);

  // Cleanup object URL on unmount
  // Note: We don't cleanup here because the image might be viewed multiple times

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
