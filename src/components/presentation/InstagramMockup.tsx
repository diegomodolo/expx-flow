import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Image as ImageIcon,
} from "lucide-react";

interface MediaItem {
  id: string;
  media_url: string;
  media_type: string;
  order_index: number;
  slide_headline?: string | null;
  slide_subheadline?: string | null;
}

interface InstagramMockupProps {
  media: MediaItem[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onDotClick: (index: number) => void;
  profilePicture?: string | null;
  username: string;
  primaryColor: string;
  caption?: string | null;
  isCarousel?: boolean;
}

type AspectRatioType = "square" | "portrait" | "landscape" | "stories" | "reels";

interface AspectRatioConfig {
  containerClass: string;
  label: string;
  ratio: string;
}

const ASPECT_RATIO_CONFIGS: Record<AspectRatioType, AspectRatioConfig> = {
  square: {
    containerClass: "aspect-square",
    label: "1:1",
    ratio: "1:1",
  },
  portrait: {
    containerClass: "aspect-[4/5]",
    label: "4:5",
    ratio: "4:5",
  },
  landscape: {
    containerClass: "aspect-[16/9]",
    label: "16:9",
    ratio: "16:9",
  },
  stories: {
    containerClass: "aspect-[9/16]",
    label: "9:16",
    ratio: "9:16",
  },
  reels: {
    containerClass: "aspect-[9/16]",
    label: "9:16",
    ratio: "9:16",
  },
};

function detectAspectRatioType(width: number, height: number): AspectRatioType {
  const ratio = width / height;

  // Stories/Reels: 9:16 = 0.5625
  if (ratio <= 0.6) {
    return "stories";
  }
  // Portrait: 4:5 = 0.8
  if (ratio <= 0.85) {
    return "portrait";
  }
  // Square: 1:1 = 1
  if (ratio <= 1.15) {
    return "square";
  }
  // Landscape: 16:9 = 1.77+
  return "landscape";
}

export function InstagramMockup({
  media,
  currentIndex,
  onPrev,
  onNext,
  onDotClick,
  profilePicture,
  username,
  primaryColor,
  caption,
  isCarousel = false,
}: InstagramMockupProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("square");
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentMedia = media[currentIndex];
  const config = ASPECT_RATIO_CONFIGS[aspectRatio];

  // Detect aspect ratio when media changes
  useEffect(() => {
    if (!currentMedia) {
      setAspectRatio("square");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (currentMedia.media_type === "video") {
      // For videos, we'll try to get dimensions from the loaded video
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        const detectedRatio = detectAspectRatioType(video.videoWidth, video.videoHeight);
        setAspectRatio(detectedRatio);
        setIsLoading(false);
      };

      video.onerror = () => {
        setAspectRatio("square");
        setIsLoading(false);
      };

      video.src = currentMedia.media_url;
    } else {
      // For images
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const detectedRatio = detectAspectRatioType(img.naturalWidth, img.naturalHeight);
        setAspectRatio(detectedRatio);
        setIsLoading(false);
      };

      img.onerror = () => {
        setAspectRatio("square");
        setIsLoading(false);
      };

      img.src = currentMedia.media_url;
    }
  }, [currentMedia]);

  const isVertical = aspectRatio === "stories" || aspectRatio === "reels";

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
        isVertical ? "w-[320px] h-[95%]" : "w-full max-w-[500px] h-auto"
      )}
    >
      {/* Instagram Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={username}
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{username}</p>
            <p className="text-xs text-gray-500">Patrocinado</p>
          </div>
        </div>
        <MoreHorizontal className="w-6 h-6 text-gray-600" />
      </div>

      {/* Media Container - Dynamic aspect ratio */}
      <div className={cn("relative bg-gray-100 overflow-hidden", config.containerClass)}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : currentMedia ? (
          currentMedia.media_type === "video" ? (
            <video
              ref={videoRef}
              src={currentMedia.media_url}
              controls
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <img
              src={currentMedia.media_url}
              alt=""
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {/* Carousel navigation */}
        {isCarousel && media.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg w-8 h-8 bg-white/90 hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={onNext}
              disabled={currentIndex === media.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg w-8 h-8 bg-white/90 hover:bg-white"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </Button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onDotClick(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === currentIndex ? "bg-blue-500" : "bg-white/70"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Aspect ratio badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 rounded text-white text-xs font-medium">
          {config.ratio}
        </div>
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
        {caption && (
          <p className="text-sm text-gray-800 line-clamp-2">
            <span className="font-semibold">{username}</span> {caption.substring(0, 100)}
            {caption.length > 100 ? "..." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
