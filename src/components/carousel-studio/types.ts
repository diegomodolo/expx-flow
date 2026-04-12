// src/components/carousel-studio/types.ts

export type CarouselStyle = "minimalist" | "profile";
export type ImageMode = "none" | "background" | "grid" | "both";
export type OverlayStyle = "base" | "top_strong" | "base_strong" | "none";
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
  status: ProjectStatus;
  thumbnail_url: string | null;
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
  exported_image_url: string | null;
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

export const OVERLAY_GRADIENTS: Record<OverlayStyle, string> = {
  none: "none",
  base: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
  top_strong:
    "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
  base_strong:
    "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
};
