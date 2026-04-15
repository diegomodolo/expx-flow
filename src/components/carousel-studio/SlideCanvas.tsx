import React, { forwardRef } from "react";
import {
  StudioSlide,
  StudioProject,
  TextPosition,
  ContentImageLayout,
  BulletIcon,
  getOverlayGradient,
  BADGE_POSITION_STYLES,
  FONT_PAIR_CSS,
} from "./types";

/** Monta o bloco de imagens de conteúdo */
function ContentImageBlock({
  urls,
  layout,
  radius,
  width,
  gap,
}: {
  urls: string[];
  layout: ContentImageLayout;
  radius: number;
  width: number;
  gap: number;
}) {
  if (urls.length === 0) return null;

  const aspect =
    layout === "1_thumb_16_9" || layout === "2_thumb_16_9"
      ? "16/9"
      : layout === "2_vertical"
        ? "9/16"
        : "1/1";

  const isGrid4 = layout === "4_square_2x2";
  const isDouble = layout === "2_vertical" || layout === "2_thumb_16_9";

  const containerStyle: React.CSSProperties = {
    width: `${width}%`,
    display: "flex",
    flexWrap: isGrid4 ? "wrap" : "nowrap",
    gap,
    marginLeft: "auto",
    marginRight: "auto",
  };

  const slotCount = isGrid4 ? 4 : isDouble ? 2 : 1;
  const slots = Array.from({ length: slotCount });

  return (
    <div style={containerStyle}>
      {slots.map((_, i) => {
        const url = urls[i] ?? null;
        const slotStyle: React.CSSProperties = {
          flex: isGrid4 ? "1 1 calc(50% - " + gap / 2 + "px)" : "1",
          aspectRatio: aspect,
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: "#222",
          flexShrink: 0,
        };
        return (
          <div key={i} style={slotStyle}>
            {url && (
              <img
                src={url}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                crossOrigin="anonymous"
                alt=""
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
      // left+right constrain the block width so the padding slider works
      return { top: v, left: h, right: h };
    case "top_right":
      return { top: v, right: h };
    case "mid_left":
      return { top: "50%", left: h, transform: "translateY(-50%)" };
    case "center":
      return { top: "50%", left: h, right: h, transform: "translateY(-50%)" };
    case "mid_right":
      return { top: "50%", right: h, transform: "translateY(-50%)" };
    case "bottom_left":
      return { bottom: v + 48, left: h };
    case "bottom_center":
      return { bottom: v + 48, left: h, right: h };
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
  /** URL da foto do cliente — usada como fallback quando badge_photo_url está vazio */
  clientBadgeUrl?: string | null;
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
      clientBadgeUrl = null,
    },
    ref,
  ) => {
    const fonts = FONT_PAIR_CSS[project.font_pair];
    const overlayGradient = getOverlayGradient(
      slide.overlay_style,
      slide.overlay_opacity,
      slide.overlay_color,
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

    // Parse highlight **palavra** → <span> com highlight_color (ou accent_color) e highlight_weight
    const highlightColor = slide.highlight_color ?? project.accent_color;
    const highlightWeight = slide.highlight_weight ?? undefined;
    const renderWithHighlight = (text: string | null) => {
      if (!text) return null;
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span
              key={i}
              style={{
                color: highlightColor,
                fontWeight: highlightWeight,
              }}
            >
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
        className={`relative overflow-hidden ${className}`}
        style={{
          width: 1080,
          height: 1350,
          backgroundColor: slide.bg_color ?? "#111111",
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

        {/* Instagram handle fixo (quando badge desativado E handle habilitado) */}
        {project.instagram_handle &&
          !slide.badge_enabled &&
          slide.badge_handle_enabled !== false && (
            <div
              className="absolute top-6 left-6 text-white/70 text-2xl"
              style={{ fontFamily: fonts.subtitleFont }}
            >
              @{project.instagram_handle}
            </div>
          )}

        {/* Badge de perfil + nome + handle juntos */}
        {slide.badge_enabled &&
          (() => {
            const effectiveBadgeUrl =
              slide.badge_photo_url || clientBadgeUrl || null;
            if (!effectiveBadgeUrl) return null;
            const handlePos = slide.badge_handle_position ?? "below";
            const handleFontSize = slide.badge_handle_font_size ?? 28;
            const showHandle =
              slide.badge_handle_enabled && project.instagram_handle;
            const showName =
              slide.badge_name_enabled &&
              (slide.badge_name_text ?? "").trim().length > 0;
            const nameFontSize = slide.badge_name_font_size ?? 32;
            const nameFontWeight = slide.badge_name_font_weight ?? "600";
            const box = slide.badge_offset_x ?? 24;
            const boy = slide.badge_offset_y ?? 24;

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

            const badgePos = slide.badge_position ?? "top_right";
            const badgePosStyle: React.CSSProperties = (() => {
              switch (badgePos) {
                case "top_left":
                  return { top: boy, left: box };
                case "top_center":
                  return {
                    top: boy,
                    left: "50%",
                    transform: "translateX(-50%)",
                  };
                case "top_right":
                  return { top: boy, right: box };
                case "mid_left":
                  return {
                    top: "50%",
                    left: box,
                    transform: "translateY(-50%)",
                  };
                case "center":
                  return {
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  };
                case "mid_right":
                  return {
                    top: "50%",
                    right: box,
                    transform: "translateY(-50%)",
                  };
                case "bottom_left":
                  return { bottom: boy + 48, left: box };
                case "bottom_center":
                  return {
                    bottom: boy + 48,
                    left: "50%",
                    transform: "translateX(-50%)",
                  };
                case "bottom_right":
                  return { bottom: boy + 48, right: box };
              }
            })();

            return (
              <div
                className="absolute"
                style={{
                  ...badgePosStyle,
                  display: "flex",
                  flexDirection:
                    flexDir as React.CSSProperties["flexDirection"],
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <img
                  src={effectiveBadgeUrl}
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
        {(() => {
          const ciUrls = (slide.content_image_urls ?? "")
            .split(",")
            .map((u) => u.trim())
            .filter(Boolean);
          const ciLayout = slide.content_image_layout ?? "1_thumb_16_9";
          const ciPos = slide.content_image_position ?? "below_subtitle";
          const ciRadius = slide.content_image_radius ?? 12;
          const ciWidth = slide.content_image_width ?? 100;
          const ciGap = slide.content_image_gap ?? 12;
          const ciMarginTop = slide.content_image_margin_top ?? 24;
          const ciMarginBottom = slide.content_image_margin_bottom ?? 24;
          const hasContentImage = ciUrls.length > 0;

          const imageBlock = hasContentImage ? (
            <div
              style={{
                marginTop: ciMarginTop,
                marginBottom: ciMarginBottom,
              }}
            >
              <ContentImageBlock
                urls={ciUrls}
                layout={ciLayout}
                radius={ciRadius}
                width={ciWidth}
                gap={ciGap}
              />
            </div>
          ) : null;

          return (
            <div
              className={`absolute ${["top_center", "center", "bottom_center"].includes(slide.text_position) ? "" : "max-w-[85%]"} ${alignClass}`}
              style={textPositionStyle}
            >
              {hasContentImage && ciPos === "above_title" && imageBlock}

              {slide.headline && (
                <h2
                  className="text-white leading-none"
                  style={{
                    fontFamily: fonts.titleFont,
                    fontSize: slide.font_size_title,
                    fontWeight: 900,
                    lineHeight: slide.line_spacing / 100,
                    wordBreak: "break-word",
                    marginBottom: slide.title_subtitle_gap ?? 12,
                  }}
                >
                  {renderWithHighlight(slide.headline)}
                </h2>
              )}

              {hasContentImage && ciPos === "between" && imageBlock}

              {slide.subtitle && (
                <p
                  className="text-white/90"
                  style={{
                    fontFamily: fonts.subtitleFont,
                    fontSize: slide.font_size_subtitle,
                    lineHeight:
                      (slide.line_spacing_subtitle ?? slide.line_spacing) / 100,
                  }}
                >
                  {slide.subtitle}
                </p>
              )}

              {hasContentImage && ciPos === "below_subtitle" && imageBlock}
            </div>
          );
        })()}

        {/* Bloco de bullet points */}
        {slide.bullets_enabled &&
          (() => {
            let items: string[] = [];
            try {
              const parsed = JSON.parse(slide.bullets_json ?? "[]");
              if (Array.isArray(parsed)) items = parsed.filter(Boolean);
            } catch {
              // ignore
            }
            if (items.length === 0) return null;

            const bIcon = slide.bullet_icon ?? "circle";
            const bIconColor = slide.bullet_icon_color ?? project.accent_color;
            const bIconSize = slide.bullet_icon_size ?? 16;
            const bBoxEnabled = slide.bullet_box_enabled ?? false;
            const bBoxColor = slide.bullet_box_color ?? project.accent_color;
            const bBoxRadius = slide.bullet_box_radius ?? 6;
            const bBoxPadX = slide.bullet_box_padding_x ?? 12;
            const bBoxPadY = slide.bullet_box_padding_y ?? 6;
            const bFontSize = slide.bullet_font_size ?? 24;
            const bLineHeight = slide.bullet_line_height ?? 1.4;
            const bGap = slide.bullet_gap ?? 12;
            const bPosition = slide.bullet_position ?? "mid_left";
            const bAlignment = slide.bullet_alignment ?? "left";
            const bPadX = slide.bullet_padding_x ?? 64;
            const bPadY = slide.bullet_padding_y ?? 64;

            const posStyle = getTextPositionStyle(bPosition, bPadX, bPadY);

            const renderBulletIcon = (
              icon: BulletIcon,
              color: string,
              size: number,
            ) => {
              if (icon === "none") return null;
              const s = size;
              switch (icon) {
                case "circle":
                  return (
                    <svg
                      width={s}
                      height={s}
                      viewBox="0 0 16 16"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      <circle cx="8" cy="8" r="5" fill={color} />
                    </svg>
                  );
                case "square":
                  return (
                    <svg
                      width={s}
                      height={s}
                      viewBox="0 0 16 16"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      <rect
                        x="3"
                        y="3"
                        width="10"
                        height="10"
                        rx="1"
                        fill={color}
                      />
                    </svg>
                  );
                case "dash":
                  return (
                    <svg
                      width={s}
                      height={s}
                      viewBox="0 0 16 16"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      <rect
                        x="2"
                        y="7"
                        width="12"
                        height="2"
                        rx="1"
                        fill={color}
                      />
                    </svg>
                  );
                case "arrow":
                  return (
                    <svg
                      width={s}
                      height={s}
                      viewBox="0 0 16 16"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      <path
                        d="M3 8h10M9 4l4 4-4 4"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  );
                case "check":
                  return (
                    <svg
                      width={s}
                      height={s}
                      viewBox="0 0 16 16"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      <path
                        d="M2.5 8.5l4 4 7-7"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  );
                case "star":
                  return (
                    <svg
                      width={s}
                      height={s}
                      viewBox="0 0 16 16"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      <path
                        d="M8 1l1.9 3.9L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.1-.7z"
                        fill={color}
                      />
                    </svg>
                  );
                default:
                  return null;
              }
            };

            const textAlignStyle: React.CSSProperties =
              bAlignment === "center"
                ? { textAlign: "center" }
                : bAlignment === "right"
                  ? { textAlign: "right" }
                  : { textAlign: "left" };

            const justifyContent =
              bAlignment === "center"
                ? "center"
                : bAlignment === "right"
                  ? "flex-end"
                  : "flex-start";

            return (
              <div className="absolute max-w-[80%]" style={{ ...posStyle }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: bGap,
                    alignItems:
                      bAlignment === "center"
                        ? "center"
                        : bAlignment === "right"
                          ? "flex-end"
                          : "flex-start",
                  }}
                >
                  {items.map((item, i) => {
                    const inner = (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap:
                            bIcon !== "none" ? Math.max(8, bIconSize * 0.5) : 0,
                          justifyContent,
                          ...(bBoxEnabled
                            ? {
                                backgroundColor: bBoxColor,
                                borderRadius: bBoxRadius,
                                paddingLeft: bBoxPadX,
                                paddingRight: bBoxPadX,
                                paddingTop: bBoxPadY,
                                paddingBottom: bBoxPadY,
                              }
                            : {}),
                        }}
                      >
                        {renderBulletIcon(bIcon, bIconColor, bIconSize)}
                        <span
                          style={{
                            fontFamily: fonts.subtitleFont,
                            fontSize: bFontSize,
                            lineHeight: bLineHeight,
                            color: "#ffffff",
                            ...textAlignStyle,
                            wordBreak: "break-word",
                          }}
                        >
                          {item}
                        </span>
                      </div>
                    );
                    return inner;
                  })}
                </div>
              </div>
            );
          })()}

        {/* Cantos decorativos */}
        {slide.corner_style !== "none" &&
          (() => {
            const op = (slide.corner_opacity ?? 100) / 100;
            const color = `rgba(255,255,255,${op})`;
            const size = 220; // tamanho do canto em px
            const mask = slide.corner_mask ?? 15; // bit0=TL, bit1=TR, bit2=BL, bit3=BR
            // bit index matches: 0=TL(top/left), 1=TR(top/right), 2=BL(bottom/left), 3=BR(bottom/right)
            const corners: Array<React.CSSProperties> = [
              { top: 0, left: 0 },
              { top: 0, right: 0 },
              { bottom: 0, left: 0 },
              { bottom: 0, right: 0 },
            ];
            return corners.map((pos, ci) => {
              // Skip if this corner's bit is not set
              if (!(mask & (1 << ci))) return null;
              const isRight = "right" in pos;
              const isBottom = "bottom" in pos;
              let svgContent: React.ReactNode = null;

              if (slide.corner_style === "grid") {
                const lines: React.ReactNode[] = [];
                const spacing = 36;
                const count = Math.ceil(size / spacing) + 1;
                for (let i = 0; i < count; i++) {
                  lines.push(
                    <line
                      key={`v${i}`}
                      x1={i * spacing}
                      y1={0}
                      x2={i * spacing}
                      y2={size}
                      stroke={color}
                      strokeWidth={1.5}
                    />,
                    <line
                      key={`h${i}`}
                      x1={0}
                      y1={i * spacing}
                      x2={size}
                      y2={i * spacing}
                      stroke={color}
                      strokeWidth={1.5}
                    />,
                  );
                }
                svgContent = lines;
              } else if (slide.corner_style === "dots") {
                const spacing = 36;
                const count = Math.ceil(size / spacing) + 1;
                const dots: React.ReactNode[] = [];
                for (let row = 0; row < count; row++) {
                  for (let col = 0; col < count; col++) {
                    dots.push(
                      <circle
                        key={`${row}-${col}`}
                        cx={col * spacing}
                        cy={row * spacing}
                        r={3}
                        fill={color}
                      />,
                    );
                  }
                }
                svgContent = dots;
              } else if (slide.corner_style === "horizontal_lines") {
                const lines: React.ReactNode[] = [];
                const spacing = 28;
                const count = Math.ceil(size / spacing) + 1;
                for (let i = 0; i < count; i++) {
                  lines.push(
                    <line
                      key={i}
                      x1={0}
                      y1={i * spacing}
                      x2={size}
                      y2={i * spacing}
                      stroke={color}
                      strokeWidth={1.5}
                    />,
                  );
                }
                svgContent = lines;
              } else if (slide.corner_style === "diagonal_lines") {
                const lines: React.ReactNode[] = [];
                const spacing = 28;
                const count = Math.ceil((size * 2) / spacing) + 2;
                for (let i = -count / 2; i < count; i++) {
                  const offset = i * spacing;
                  lines.push(
                    <line
                      key={i}
                      x1={offset}
                      y1={0}
                      x2={offset + size}
                      y2={size}
                      stroke={color}
                      strokeWidth={1.5}
                    />,
                  );
                }
                svgContent = lines;
              } else if (slide.corner_style === "diagonal_shadow") {
                const stops = [
                  `rgba(0,0,0,${op}) 0%`,
                  `rgba(0,0,0,0) 100%`,
                ].join(", ");
                // Each corner gets a gradient going from corner outward
                const gradX = isRight ? "right" : "left";
                const gradY = isBottom ? "bottom" : "top";
                return (
                  <div
                    key={ci}
                    className="absolute"
                    style={{
                      ...pos,
                      width: size,
                      height: size,
                      background: `radial-gradient(ellipse at ${gradX} ${gradY}, rgba(0,0,0,${op}) 0%, transparent 70%)`,
                      pointerEvents: "none",
                    }}
                  />
                );
              }

              const transform =
                [isRight ? "scaleX(-1)" : "", isBottom ? "scaleY(-1)" : ""]
                  .filter(Boolean)
                  .join(" ") || "none";

              return (
                <svg
                  key={ci}
                  className="absolute"
                  style={{ ...pos, pointerEvents: "none" }}
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  overflow="hidden"
                >
                  <g
                    transform={transform}
                    style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
                  >
                    {svgContent}
                  </g>
                </svg>
              );
            });
          })()}
      </div>
    );
  },
);

SlideCanvas.displayName = "SlideCanvas";
