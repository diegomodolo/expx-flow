import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Image, Video, Layers, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreativeThumbnailProps {
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  body?: string;
  type?: string;
}

export function CreativeThumbnail({
  imageUrl,
  videoUrl,
  title,
  body,
  type,
}: CreativeThumbnailProps) {
  const mediaUrl = imageUrl || videoUrl;
  const isVideo = !!videoUrl && !imageUrl;

  const getTypeIcon = () => {
    switch (type?.toUpperCase()) {
      case "VIDEO":
        return <Video className="w-3 h-3" />;
      case "CAROUSEL":
        return <Layers className="w-3 h-3" />;
      case "IMAGE":
        return <Image className="w-3 h-3" />;
      default:
        return <FileQuestion className="w-3 h-3" />;
    }
  };

  const getTypeBadge = () => {
    switch (type?.toUpperCase()) {
      case "VIDEO":
        return "Vídeo";
      case "CAROUSEL":
        return "Carrossel";
      case "IMAGE":
        return "Imagem";
      default:
        return type || "Outro";
    }
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center cursor-pointer",
            "border border-border hover:border-primary/50 transition-colors"
          )}
        >
          {mediaUrl ? (
            isVideo ? (
              <div className="relative w-full h-full">
                <video
                  src={mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Video className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <img
                src={mediaUrl}
                alt={title || "Creative"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<div class="w-full h-full flex items-center justify-center"><svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg></div>';
                }}
              />
            )
          ) : (
            getTypeIcon()
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80">
        <div className="space-y-3">
          {mediaUrl && (
            <div className="rounded-lg overflow-hidden bg-muted">
              {isVideo ? (
                <video
                  src={mediaUrl}
                  className="w-full h-48 object-contain"
                  controls
                  muted
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={title || "Creative preview"}
                  className="w-full h-48 object-contain"
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {getTypeIcon()}
                <span className="ml-1">{getTypeBadge()}</span>
              </Badge>
            </div>

            {title && (
              <div>
                <p className="text-xs text-muted-foreground">Título</p>
                <p className="text-sm font-medium line-clamp-2">{title}</p>
              </div>
            )}

            {body && (
              <div>
                <p className="text-xs text-muted-foreground">Texto</p>
                <p className="text-sm line-clamp-4">{body}</p>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
