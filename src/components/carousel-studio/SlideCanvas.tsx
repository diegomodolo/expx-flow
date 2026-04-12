import React, { forwardRef } from "react";
import {
  StudioSlide,
  StudioProject,
  TextPosition,
  getOverlayGradient,
  BADGE_POSITION_STYLES,
  FONT_PAIR_CSS,
} from "./types";

function getTextPositionStyle(
  position: TextPosition,
  px: number,
  py: number,
): React.CSSProperties {
  const h = px;
  const v = py;
  switch (position) {
    case "top_left":
      return { top: v, left: h };
    case "top_center":
      return { top: v, left: "50%", transform: "translateX(-50%)" };
    case "top_right":
      return { top: v, right: h };
    case "mid_left":
      return { top: "50%", left: h, transform: "translateY(-50%)" };
    case "center":
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    case "mid_right":
      return { top: "50%", right: h, transform: "translateY(-50%)" };
    case "bottom_left":
      return { bottom: v + 48, left: h };
    case "bottom_center":
      return { bottom: v + 48, left: "50%", transform: "translateX(-50%)" };
    case "bottom_right":
      return { bottom: v + 48, right: h };
  }
}

interface SlideCanvasProps {
  slide: StudioSlide;
  project: StudioProject;
  scale?: number;
  className?: string;
  /** Posição deste slide na sequência de slides que usam a imagem compartilhada (0-based) */
  sharedBgIndex?: number;
  /** Total de slides que usam a imagem compartilhada */
  sharedBgTotal?: number;
}

export const SlideCanvas = forwardRef<HTMLDivElement, SlideCanvasProps>(
  (
    {
      slide,
      project,
      scale = 1,
      className = "",
      sharedBgIndex = 0,
      sharedBgTotal = 1,
    },
    ref,
  ) => {
    const fonts = FONT_PAIR_CSS[project.font_pair];
    const overlayGradient = getOverlayGradient(
      slide.overlay_style,
      slide.overlay_opacity,
    );
    const textPx = slide.text_padding_x ?? 64;
    const textPy = slide.text_padding_y ?? 64;
    const textPositionStyle = getTextPositionStyle(
      slide.text_position,
      textPx,
      textPy,
    );
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
        {(() => {
          const useShared =
            slide.use_shared_bg && !!project.shared_bg_image_url;

          if (useShared) {
            // Panorâmica: a imagem ocupa N slides lado a lado.
            // Cada slide é uma "janela" de 1/N da largura total da imagem.
            // backgroundSize: zoom% relativo a N*1080px de largura → zoom*N% do elemento
            // backgroundPosition X: fatia do slide dentro da imagem total
            const n = Math.max(1, sharedBgTotal);
            const zoom = project.shared_bg_zoom ?? 100;
            const bgY = project.shared_bg_position_y ?? 50;
            // A imagem total tem n colunas de 1080px. O tamanho em % relativo ao elemento (1080px):
            const bgSizeX = zoom * n;
            // posX: qual % da imagem total está alinhado ao início do slide.
            // slide i começa no pixel i*1080 da imagem total → fração = i/n
            // CSS background-position em % não é simplesmente i/n:
            // position% = offset / (imgWidth - containerWidth) * 100
            // imgWidth = bgSizeX/100 * 1080, containerWidth = 1080
            // offset = sharedBgIndex * 1080
            const imgW = (bgSizeX / 100) * 1080;
            const maxOffset = imgW - 1080;
            const posX =
              maxOffset <= 0 ? 0 : ((sharedBgIndex * 1080) / maxOffset) * 100;

            return (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${project.shared_bg_image_url!})`,
                  backgroundSize: `${bgSizeX}% auto`,
                  backgroundPosition: `${posX}% ${bgY}%`,
                  backgroundRepeat: "no-repeat",
                }}
              />
            );
          }

          return slide.bg_image_url ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${slide.bg_image_url})`,
                backgroundSize: `${slide.bg_zoom}%`,
                backgroundPosition: `${slide.bg_position_x}% ${slide.bg_position_y}%`,
                backgroundRepeat: "no-repeat",
              }}
            />
          ) : null;
        })()}

        {/* Overlay / Sombra */}
        {overlayGradient !== "none" && (
          <div
            className="absolute inset-0"
            style={{ background: overlayGradient }}
          />
        )}

        {/* Instagram handle fixo (quando badge desativado) */}
        {project.instagram_handle && !slide.badge_enabled && (
          <div
            className="absolute top-6 left-6 text-white/70 text-2xl"
            style={{ fontFamily: fonts.subtitleFont }}
          >
            @{project.instagram_handle}
          </div>
        )}

        {/* Badge de perfil + nome + handle juntos */}
        {slide.badge_enabled &&
          slide.badge_photo_url &&
          (() => {
            const handlePos = slide.badge_handle_position ?? "below";
            const handleFontSize = slide.badge_handle_font_size ?? 28;
            const showHandle =
              slide.badge_handle_enabled && project.instagram_handle;
            const showName =
              slide.badge_name_enabled &&
              (slide.badge_name_text ?? "").trim().length > 0;
            const nameFontSize = slide.badge_name_font_size ?? 32;
            const nameFontWeight = slide.badge_name_font_weight ?? "600";

            // Direção do flex conforme posição do handle em relação ao badge
            const flexDir =
              handlePos === "above"
                ? "column-reverse"
                : handlePos === "below"
                  ? "column"
                  : handlePos === "left"
                    ? "row-reverse"
                    : "row";

            const nameLineHeight = slide.badge_name_line_height ?? 4;

            // Bloco de texto (nome + @handle empilhados verticalmente)
            const textBlock =
              showName || showHandle ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: nameLineHeight,
                    alignItems:
                      handlePos === "left" || handlePos === "right"
                        ? "flex-start"
                        : "center",
                  }}
                >
                  {showName && (
                    <span
                      className="text-white whitespace-nowrap"
                      style={{
                        fontFamily: fonts.subtitleFont,
                        fontSize: nameFontSize,
                        fontWeight: nameFontWeight,
                      }}
                    >
                      {slide.badge_name_text}
                    </span>
                  )}
                  {showHandle && (
                    <span
                      className="text-white/80 whitespace-nowrap"
                      style={{
                        fontFamily: fonts.subtitleFont,
                        fontSize: handleFontSize,
                        fontWeight: 400,
                      }}
                    >
                      @{project.instagram_handle}
                    </span>
                  )}
                </div>
              ) : null;

            return (
              <div
                className="absolute"
                style={{
                  ...BADGE_POSITION_STYLES[slide.badge_position ?? "top_right"],
                  display: "flex",
                  flexDirection:
                    flexDir as React.CSSProperties["flexDirection"],
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <img
                  src={slide.badge_photo_url}
                  className="rounded-full object-cover flex-shrink-0"
                  style={{
                    width: slide.badge_size ?? 80,
                    height: slide.badge_size ?? 80,
                  }}
                  crossOrigin="anonymous"
                  alt="perfil"
                />
                {textBlock}
              </div>
            );
          })()}

        {/* Bloco de texto */}
        <div
          className={`absolute max-w-[85%] ${alignClass}`}
          style={textPositionStyle}
        >
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
