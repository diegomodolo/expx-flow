import React, { forwardRef } from "react";
import {
  StudioSlide,
  StudioProject,
  OVERLAY_GRADIENTS,
  TEXT_POSITION_CLASSES,
  BADGE_POSITION_STYLES,
  FONT_PAIR_CSS,
} from "./types";

interface SlideCanvasProps {
  slide: StudioSlide;
  project: StudioProject;
  scale?: number;
  className?: string;
}

export const SlideCanvas = forwardRef<HTMLDivElement, SlideCanvasProps>(
  ({ slide, project, scale = 1, className = "" }, ref) => {
    const fonts = FONT_PAIR_CSS[project.font_pair];
    const overlayGradient = OVERLAY_GRADIENTS[slide.overlay_style];
    const positionClass = TEXT_POSITION_CLASSES[slide.text_position];
    const alignClass =
      slide.text_alignment === "center"
        ? "text-center"
        : slide.text_alignment === "right"
          ? "text-right"
          : "text-left";

    // Parse highlight **palavra** → <span> com accent_color
    const renderWithHighlight = (text: string | null) => {
      if (!text) return null;
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={i} style={{ color: project.accent_color }}>
              {part.slice(2, -2)}
            </span>
          );
        }
        return part;
      });
    };

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden bg-gray-900 ${className}`}
        style={{
          width: 1080,
          height: 1350,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
          flexShrink: 0,
        }}
      >
        {/* Imagem de fundo */}
        {slide.bg_image_url && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${slide.bg_image_url})`,
              backgroundSize: `${slide.bg_zoom}%`,
              backgroundPosition: `${slide.bg_position_x}% ${slide.bg_position_y}%`,
              backgroundRepeat: "no-repeat",
            }}
          />
        )}

        {/* Overlay / Sombra */}
        {overlayGradient !== "none" && (
          <div
            className="absolute inset-0"
            style={{
              background: overlayGradient,
              opacity: slide.overlay_opacity / 100,
            }}
          />
        )}

        {/* Instagram handle no topo esquerdo */}
        {project.instagram_handle && (
          <div
            className="absolute top-6 left-6 text-white/70 text-2xl"
            style={{ fontFamily: fonts.subtitleFont }}
          >
            @{project.instagram_handle}
          </div>
        )}

        {/* Badge de perfil */}
        {slide.badge_enabled && slide.badge_photo_url && (
          <div
            className="absolute"
            style={BADGE_POSITION_STYLES[slide.badge_position ?? "top_right"]}
          >
            <img
              src={slide.badge_photo_url}
              className="rounded-full object-cover"
              style={{
                width: slide.badge_size ?? 80,
                height: slide.badge_size ?? 80,
              }}
              crossOrigin="anonymous"
              alt="perfil"
            />
          </div>
        )}

        {/* Bloco de texto */}
        <div className={`absolute max-w-[85%] ${positionClass} ${alignClass}`}>
          {slide.headline && (
            <h2
              className="font-black text-white leading-none mb-3"
              style={{
                fontFamily: fonts.titleFont,
                fontSize: slide.font_size_title,
                lineHeight: `${slide.line_spacing}%`,
                wordBreak: "break-word",
              }}
            >
              {renderWithHighlight(slide.headline)}
            </h2>
          )}
          {slide.subtitle && (
            <p
              className="text-white/90"
              style={{
                fontFamily: fonts.subtitleFont,
                fontSize: slide.font_size_subtitle,
                lineHeight: `${slide.line_spacing}%`,
              }}
            >
              {slide.subtitle}
            </p>
          )}
        </div>

        {/* Indicadores de slide na base */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-2 h-2 rounded-full ${
                i === slide.slide_number - 1 ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    );
  },
);

SlideCanvas.displayName = "SlideCanvas";
