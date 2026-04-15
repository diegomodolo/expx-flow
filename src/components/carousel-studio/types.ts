// src/components/carousel-studio/types.ts

export type CarouselStyle = "minimalist" | "profile";
export type ImageMode = "none" | "background" | "grid" | "both";
export type OverlayStyle =
  | "none"
  | "base"
  | "top_strong"
  | "base_strong"
  | "left"
  | "right"
  | "left_strong"
  | "right_strong";
export type CornerStyle =
  | "none"
  | "grid"
  | "dots"
  | "horizontal_lines"
  | "diagonal_lines"
  | "diagonal_shadow";
export type TextPosition =
  | "top_left"
  | "top_center"
  | "top_right"
  | "mid_left"
  | "center"
  | "mid_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";

export type ContentImagePosition = "above_title" | "between" | "below_subtitle";
export type BulletIcon =
  | "none"
  | "circle"
  | "square"
  | "dash"
  | "arrow"
  | "check"
  | "star";
export type ContentImageLayout =
  | "1_thumb_16_9"
  | "1_square"
  | "2_vertical"
  | "2_thumb_16_9"
  | "4_square_2x2";

export type BadgePosition =
  | "top_left"
  | "top_center"
  | "top_right"
  | "mid_left"
  | "center"
  | "mid_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";

export type BadgeHandlePosition = "above" | "below" | "left" | "right";
export type TextAlignment = "left" | "center" | "right";
export type ProjectStatus = "draft" | "generating" | "ready";

export type FontPair =
  | "space_inter"
  | "playfair_dmsans"
  | "syne_outfit"
  | "oswald_inter"
  | "raleway_playfair"
  | "outfit_caveat";

export interface StudioProject {
  id: string;
  company_id: string;
  client_id: string | null;
  user_id: string;
  title: string;
  style: CarouselStyle;
  font_pair: FontPair;
  accent_color: string;
  instagram_handle: string | null;
  slides_count: number;
  image_mode: ImageMode;
  prompt: string | null;
  image_style: string | null;
  generate_ai_images: boolean;
  status: ProjectStatus;
  thumbnail_url: string | null;
  clients?: { id: string; name: string } | null;
  shared_bg_image_url: string | null;
  shared_bg_zoom: number;
  shared_bg_position_x: number;
  shared_bg_position_y: number;
  created_at: string;
  updated_at: string;
}

export interface StudioSlide {
  id: string;
  project_id: string;
  slide_number: number;
  headline: string | null;
  subtitle: string | null;
  visual_description: string | null;
  bg_image_url: string | null;
  bg_position_x: number;
  bg_position_y: number;
  bg_zoom: number;
  overlay_style: OverlayStyle;
  overlay_opacity: number;
  text_position: TextPosition;
  text_alignment: TextAlignment;
  font_size_title: number;
  font_size_subtitle: number;
  line_spacing: number;
  corner_style: CornerStyle;
  corner_opacity: number;
  glass_enabled: boolean;
  glass_radius: number;
  badge_enabled: boolean;
  badge_photo_url: string | null;
  badge_position: BadgePosition;
  badge_size: number;
  badge_handle_enabled: boolean;
  badge_handle_position: BadgeHandlePosition;
  badge_handle_font_size: number;
  badge_name_enabled: boolean;
  badge_name_text: string | null;
  badge_name_font_size: number;
  badge_name_font_weight: string;
  text_padding_x: number;
  text_padding_y: number;
  badge_name_line_height: number;
  use_shared_bg: boolean;
  /** Bitmask: bit0=TL, bit1=TR, bit2=BL, bit3=BR. Default 15 = todos os 4 cantos */
  corner_mask: number;
  /** Cor de fundo do slide quando não há imagem (ex: '#1a1a2e'). Default null = cinza escuro */
  bg_color: string | null;
  /** Cor base do overlay. Null = preto (#000000) */
  overlay_color: string | null;
  /** Deslocamento horizontal do badge a partir do canto (px) */
  badge_offset_x: number;
  /** Deslocamento vertical do badge a partir do canto (px) */
  badge_offset_y: number;
  /** Peso da fonte das palavras destacadas (**palavra**). Ex: '700', '900'. Default null = herda do título */
  highlight_weight: string | null;
  /** Cor das palavras destacadas (**palavra**). Null = usa accent_color do projeto */
  highlight_color: string | null;
  /** URL(s) da imagem de conteúdo (até 4, separadas por vírgula) */
  content_image_urls: string | null;
  /** Layout das imagens de conteúdo */
  content_image_layout: ContentImageLayout;
  /** Posição em relação ao texto */
  content_image_position: ContentImagePosition;
  /** Border radius das imagens (px) */
  content_image_radius: number;
  /** Largura em % relativa ao bloco de texto (10-100) */
  content_image_width: number;
  /** Gap entre imagens múltiplas (px) */
  content_image_gap: number;
  /** Margem superior da imagem de conteúdo em relação ao texto (px) */
  content_image_margin_top: number;
  /** Margem inferior da imagem de conteúdo em relação ao texto (px) */
  content_image_margin_bottom: number;
  exported_image_url: string | null;
  /** Habilita bloco de bullet points independente */
  bullets_enabled: boolean;
  /** Array JSON de strings ex: '["Item 1","Item 2"]' */
  bullets_json: string | null;
  /** Icone marcador de cada bullet */
  bullet_icon: BulletIcon;
  /** Cor do icone. Null = usa accent_color do projeto */
  bullet_icon_color: string | null;
  /** Tamanho do icone em px */
  bullet_icon_size: number;
  /** Envolve cada item numa caixa individual */
  bullet_box_enabled: boolean;
  /** Cor de fundo da caixa. Null = accent_color com opacidade */
  bullet_box_color: string | null;
  /** Border-radius da caixa em px */
  bullet_box_radius: number;
  /** Padding horizontal interno da caixa em px */
  bullet_box_padding_x: number;
  /** Padding vertical interno da caixa em px */
  bullet_box_padding_y: number;
  /** Tamanho da fonte dos bullets em px */
  bullet_font_size: number;
  /** Line-height dos bullets */
  bullet_line_height: number;
  /** Espaco entre items em px */
  bullet_gap: number;
  /** Posicao do bloco no slide (grid de 9) */
  bullet_position: TextPosition;
  /** Alinhamento do texto dos bullets */
  bullet_alignment: TextAlignment;
  /** Margem horizontal da borda do slide em px */
  bullet_padding_x: number;
  /** Margem vertical da borda do slide em px */
  bullet_padding_y: number;
  created_at: string;
  updated_at: string;
}

// Wizard config coletada nos 4 passos
export interface WizardConfig {
  style: CarouselStyle;
  useAI: boolean;
  prompt: string;
  referenceImages: string[]; // base64 ou URLs
  slidesCount: number;
  imageMode: ImageMode;
  generateAIImages: boolean;
  imageStyle: string;
  instagramHandle: string;
  fontPair: FontPair;
  accentColor: string;
  clientId: string | null;
}

export const FONT_PAIR_LABELS: Record<
  FontPair,
  { title: string; subtitle: string }
> = {
  space_inter: { title: "Space", subtitle: "Inter" },
  playfair_dmsans: { title: "Playfair", subtitle: "DM Sans" },
  syne_outfit: { title: "Syne", subtitle: "Outfit" },
  oswald_inter: { title: "Oswald", subtitle: "Inter" },
  raleway_playfair: { title: "Raleway", subtitle: "Playfair" },
  outfit_caveat: { title: "Outfit", subtitle: "Caveat" },
};

export const FONT_PAIR_CSS: Record<
  FontPair,
  { titleFont: string; subtitleFont: string }
> = {
  space_inter: {
    titleFont: "'Space Grotesk', sans-serif",
    subtitleFont: "'Inter', sans-serif",
  },
  playfair_dmsans: {
    titleFont: "'Playfair Display', serif",
    subtitleFont: "'DM Sans', sans-serif",
  },
  syne_outfit: {
    titleFont: "'Syne', sans-serif",
    subtitleFont: "'Outfit', sans-serif",
  },
  oswald_inter: {
    titleFont: "'Oswald', sans-serif",
    subtitleFont: "'Inter', sans-serif",
  },
  raleway_playfair: {
    titleFont: "'Raleway', sans-serif",
    subtitleFont: "'Playfair Display', serif",
  },
  outfit_caveat: {
    titleFont: "'Outfit', sans-serif",
    subtitleFont: "'Caveat', cursive",
  },
};

export const BADGE_POSITION_STYLES: Record<
  BadgePosition,
  Record<string, string | number>
> = {
  top_left: { top: 24, left: 24 },
  top_center: { top: 24, left: "50%", transform: "translateX(-50%)" },
  top_right: { top: 24, right: 24 },
  mid_left: { top: "50%", left: 24, transform: "translateY(-50%)" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  mid_right: { top: "50%", right: 24, transform: "translateY(-50%)" },
  bottom_left: { bottom: 64, left: 24 },
  bottom_center: { bottom: 64, left: "50%", transform: "translateX(-50%)" },
  bottom_right: { bottom: 64, right: 24 },
};

export const TEXT_POSITION_CLASSES: Record<TextPosition, string> = {
  top_left: "top-8 left-8",
  top_center: "top-8 left-1/2 -translate-x-1/2",
  top_right: "top-8 right-8",
  mid_left: "top-1/2 left-8 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  mid_right: "top-1/2 right-8 -translate-y-1/2",
  bottom_left: "bottom-16 left-8",
  bottom_center: "bottom-16 left-1/2 -translate-x-1/2",
  bottom_right: "bottom-16 right-8",
};

/** Converte hex (#rrggbb ou #rgb) para "r,g,b" usado no rgba(). */
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "0,0,0";
  return `${r},${g},${b}`;
}

// Returns the CSS gradient string with alpha values scaled by `opacity` (0–100).
// Using inline alpha instead of CSS `opacity` ensures the extreme (100%) is
// truly opaque black even when the slider is at max.
export function getOverlayGradient(
  style: OverlayStyle,
  opacity: number,
  color?: string | null,
): string {
  if (style === "none") return "none";
  const o = opacity / 100;
  const rgb = hexToRgb(color ?? "#000000");
  const r = (a: number) => `rgba(${rgb},${+a.toFixed(3)})`;
  switch (style) {
    case "base":
      return `linear-gradient(to top, ${r(o)} 0%, ${r(o * 0.6)} 40%, ${r(o * 0.2)} 70%, transparent 100%)`;
    case "top_strong":
      return `linear-gradient(to bottom, ${r(o)} 0%, ${r(o * 0.6)} 40%, ${r(o * 0.2)} 70%, transparent 100%)`;
    case "base_strong":
      return `linear-gradient(to top, ${r(o)} 0%, ${r(o * 0.85)} 40%, ${r(o * 0.5)} 65%, ${r(o * 0.15)} 85%, transparent 100%)`;
    case "left":
      return `linear-gradient(to right, ${r(o)} 0%, ${r(o * 0.6)} 40%, ${r(o * 0.2)} 70%, transparent 100%)`;
    case "left_strong":
      return `linear-gradient(to right, ${r(o)} 0%, ${r(o * 0.85)} 40%, ${r(o * 0.5)} 65%, ${r(o * 0.15)} 85%, transparent 100%)`;
    case "right":
      return `linear-gradient(to left, ${r(o)} 0%, ${r(o * 0.6)} 40%, ${r(o * 0.2)} 70%, transparent 100%)`;
    case "right_strong":
      return `linear-gradient(to left, ${r(o)} 0%, ${r(o * 0.85)} 40%, ${r(o * 0.5)} 65%, ${r(o * 0.15)} 85%, transparent 100%)`;
  }
}

// Legacy map kept for any static reference — use getOverlayGradient() at render time
export const OVERLAY_GRADIENTS: Record<OverlayStyle, string> = {
  none: "none",
  base: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
  top_strong:
    "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
  base_strong:
    "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
  left: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
  left_strong:
    "linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
  right:
    "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
  right_strong:
    "linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
};
