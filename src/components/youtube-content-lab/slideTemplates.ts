/**
 * HTML Slide Templates for YouTube Content Lab
 *
 * Design reference: modern corporate deck style (Greener-like)
 * - Alternating dark (#1a1a2e) and light (#ffffff) backgrounds
 * - Split 50/50 layouts with accent color blocks
 * - Very large bold titles with period "."
 * - Small uppercase category labels above titles
 * - Generous whitespace (80-120px padding)
 * - Stats with large numbers
 * - Numbered outline slide
 * - Clean sans-serif typography
 */

export interface SlideTemplateData {
  title: string;
  content: string | null;
  slideOrder: number;
  totalSlides: number;
  videoTitle: string;
  thumbnailUrl?: string | null;
  colors: SlideColors;
  allSlideTitles?: string[];
}

export interface SlideColors {
  primary: string;
  secondary: string;
  background: string;
  backgroundEnd: string;
  text: string;
  textSecondary: string;
  accent: string;
}

const DEFAULT_COLORS: SlideColors = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  background: "#1a1a2e",
  backgroundEnd: "#16213e",
  text: "#ffffff",
  textSecondary: "#94a3b8",
  accent: "#38bdf8",
};

// ── Color extraction ──────────────────────────────────────────────

export async function extractColorsFromThumbnail(
  thumbnailUrl: string,
): Promise<SlideColors> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(DEFAULT_COLORS);
          return;
        }

        canvas.width = 50;
        canvas.height = 28;
        ctx.drawImage(img, 0, 0, 50, 28);
        const imageData = ctx.getImageData(0, 0, 50, 28).data;

        const regions = {
          topLeft: sampleRegion(imageData, 50, 0, 0, 15, 10),
          topRight: sampleRegion(imageData, 50, 35, 0, 50, 10),
          center: sampleRegion(imageData, 50, 15, 8, 35, 20),
          bottomLeft: sampleRegion(imageData, 50, 0, 18, 15, 28),
          bottomRight: sampleRegion(imageData, 50, 35, 18, 50, 28),
        };

        const allRegions = Object.values(regions);
        const sorted = [...allRegions].sort(
          (a, b) => getLuminance(a) - getLuminance(b),
        );

        const darkest = sorted[0];
        const brightest = sorted[sorted.length - 1];
        const mid = sorted[Math.floor(sorted.length / 2)];

        // Pick the most saturated color as primary
        const bySaturation = [...allRegions].sort(
          (a, b) => getSaturation(b) - getSaturation(a),
        );
        const mostSaturated = bySaturation[0];

        const primaryColor =
          getSaturation(mostSaturated) > 0.15 ? mostSaturated : brightest;

        const primary = rgbToHex(primaryColor);

        resolve({
          primary,
          secondary: rgbToHex(mid),
          background: darken(rgbToHex(darkest), 0.4),
          backgroundEnd: darken(rgbToHex(sorted[1] || darkest), 0.3),
          text: "#ffffff",
          textSecondary: "#94a3b8",
          accent: saturate(primary, 1.2),
        });
      } catch {
        resolve(DEFAULT_COLORS);
      }
    };
    img.onerror = () => resolve(DEFAULT_COLORS);
    img.src = thumbnailUrl;
  });
}

// ── Color utilities ───────────────────────────────────────────────

function sampleRegion(
  data: Uint8ClampedArray,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): [number, number, number] {
  let r = 0,
    g = 0,
    b = 0,
    count = 0;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const i = (y * width + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  return count > 0
    ? [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
    : [0, 0, 0];
}

function getLuminance([r, g, b]: [number, number, number]): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getSaturation([r, g, b]: [number, number, number]): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  ]);
}

function lighten(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([
    Math.min(255, Math.round(r + (255 - r) * factor)),
    Math.min(255, Math.round(g + (255 - g) * factor)),
    Math.min(255, Math.round(b + (255 - b) * factor)),
  ]);
}

function saturate(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return rgbToHex([
    Math.min(255, Math.round(gray + (r - gray) * factor)),
    Math.min(255, Math.round(gray + (g - gray) * factor)),
    Math.min(255, Math.round(gray + (b - gray) * factor)),
  ]);
}

// ── Shared styles ─────────────────────────────────────────────────

const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const DARK_BG = "#1a1a2e";
const LIGHT_BG = "#ffffff";
const DARK_TEXT = "#1a1a2e";
const LIGHT_TEXT = "#ffffff";
const MUTED_DARK = "#64748b";
const MUTED_LIGHT = "#94a3b8";

function baseSlide(bg: string): string {
  return `width:1920px;height:1080px;background:${bg};font-family:${FONT};position:relative;overflow:hidden;box-sizing:border-box;`;
}

// ── Slide Templates ───────────────────────────────────────────────

/**
 * Slide 1: COVER
 * Large bold title with period, subtitle, minimal dark background
 * Inspired by the "Greener." cover slide
 */
function getCoverSlide(data: SlideTemplateData): string {
  const { title, content, colors, videoTitle } = data;
  const subtitle = parseBullets(content)[0] || "";

  return `<div style="${baseSlide(DARK_BG)}display:flex;flex-direction:column;justify-content:center;padding:120px;">
    <!-- Top bar -->
    <div style="position:absolute;top:0;left:0;right:0;height:6px;background:${colors.primary};"></div>

    <!-- Brand label -->
    <p style="color:${colors.primary};font-size:22px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 40px 0;">
      ${escapeHtml(videoTitle)}
    </p>

    <!-- Main title -->
    <h1 style="color:${LIGHT_TEXT};font-size:96px;font-weight:800;margin:0 0 32px 0;line-height:1.05;letter-spacing:-2px;max-width:1200px;">
      ${escapeHtml(addPeriod(title))}
    </h1>

    <!-- Subtitle -->
    ${
      subtitle
        ? `
      <p style="color:${MUTED_LIGHT};font-size:28px;font-weight:400;margin:0;line-height:1.5;max-width:800px;">
        ${escapeHtml(subtitle)}
      </p>
    `
        : ""
    }

    <!-- Accent line bottom -->
    <div style="position:absolute;bottom:80px;left:120px;width:80px;height:4px;background:${colors.primary};border-radius:2px;"></div>
  </div>`;
}

/**
 * Slide 2: OUTLINE / TABLE OF CONTENTS
 * Numbered list of topics, light background
 * Inspired by the "Outline Presentation" slide
 */
function getOutlineSlide(data: SlideTemplateData): string {
  const { colors, videoTitle, allSlideTitles } = data;

  // Use remaining slide titles (skip cover + outline + closing)
  const topics = (allSlideTitles || []).slice(2, -1);

  return `<div style="${baseSlide(LIGHT_BG)}display:flex;">
    <!-- Left section -->
    <div style="flex:1;padding:100px 80px;display:flex;flex-direction:column;justify-content:center;">
      <!-- Category label -->
      <p style="color:${MUTED_DARK};font-size:18px;font-weight:500;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px 0;">
        Conteúdo
      </p>

      <h2 style="color:${DARK_TEXT};font-size:64px;font-weight:800;margin:0 0 60px 0;line-height:1.1;letter-spacing:-1px;">
        Visão Geral da<br>Apresentação.
      </h2>

      <!-- Numbered items -->
      <div style="display:flex;flex-direction:column;gap:28px;">
        ${topics
          .map(
            (t, i) => `
          <div style="display:flex;align-items:center;gap:24px;">
            <span style="color:${colors.primary};font-size:24px;font-weight:700;min-width:40px;">
              ${String(i + 1).padStart(2, "0")}
            </span>
            <span style="color:${DARK_TEXT};font-size:26px;font-weight:500;">
              ${escapeHtml(t)}
            </span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <!-- Right accent block -->
    <div style="width:420px;background:${colors.primary};display:flex;flex-direction:column;justify-content:flex-end;padding:60px;">
      <p style="color:${LIGHT_TEXT};font-size:20px;font-weight:500;margin:0;opacity:0.8;">
        ${escapeHtml(videoTitle)}
      </p>
    </div>
  </div>`;
}

/**
 * Content A: SPLIT — Big title left, bullets right
 * Dark background. Inspired by "The Problem" and "A Glimpse" slides
 */
function getContentSplitDark(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${baseSlide(DARK_BG)}display:flex;">
    <!-- Left: Title area -->
    <div style="flex:1;padding:100px 60px 100px 120px;display:flex;flex-direction:column;justify-content:center;">
      <!-- Accent dot -->
      <div style="width:12px;height:12px;border-radius:50%;background:${colors.primary};margin-bottom:32px;"></div>

      <h2 style="color:${LIGHT_TEXT};font-size:72px;font-weight:800;margin:0;line-height:1.1;letter-spacing:-1.5px;">
        ${escapeHtml(addPeriod(title))}
      </h2>
    </div>

    <!-- Right: Content area -->
    <div style="flex:1;padding:100px 120px 100px 60px;display:flex;flex-direction:column;justify-content:center;">
      ${
        bullets.length > 0
          ? `
        <div style="display:flex;flex-direction:column;gap:28px;">
          ${bullets
            .map(
              (b) => `
            <div style="display:flex;align-items:flex-start;gap:16px;">
              <div style="width:6px;height:6px;border-radius:50%;background:${colors.primary};margin-top:14px;flex-shrink:0;"></div>
              <p style="color:${MUTED_LIGHT};font-size:26px;margin:0;line-height:1.6;font-weight:400;">
                ${escapeHtml(b)}
              </p>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : `
        <p style="color:${MUTED_LIGHT};font-size:26px;margin:0;line-height:1.6;">
          ${escapeHtml(content || "")}
        </p>
      `
      }
    </div>

    <!-- Bottom line separator -->
    <div style="position:absolute;bottom:80px;left:120px;right:120px;height:1px;background:#ffffff12;"></div>
  </div>`;
}

/**
 * Content B: FULL WIDTH with stats — Light background
 * Inspired by the "A Glimpse of the product" stats area
 */
function getContentStatsLight(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  // Try to extract stats-like items (numbers, percentages)
  const stats = bullets.slice(0, 3);

  return `<div style="${baseSlide(LIGHT_BG)}display:flex;flex-direction:column;padding:100px 120px;">
    <!-- Category label -->
    <p style="color:${colors.primary};font-size:18px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px 0;">
      Destaque
    </p>

    <!-- Title -->
    <h2 style="color:${DARK_TEXT};font-size:64px;font-weight:800;margin:0 0 48px 0;line-height:1.1;letter-spacing:-1px;max-width:1000px;">
      ${escapeHtml(addPeriod(title))}
    </h2>

    <!-- Separator -->
    <div style="width:80px;height:4px;background:${colors.primary};border-radius:2px;margin-bottom:56px;"></div>

    <!-- Stats / bullet cards in row -->
    <div style="display:flex;gap:48px;flex:1;align-items:flex-start;">
      ${stats
        .map(
          (s, i) => `
        <div style="flex:1;padding:36px 0;${i > 0 ? `border-left:1px solid #e2e8f0;padding-left:48px;` : ""}">
          <p style="color:${DARK_TEXT};font-size:24px;margin:0;line-height:1.6;font-weight:400;">
            ${escapeHtml(s)}
          </p>
        </div>
      `,
        )
        .join("")}
    </div>

    <!-- Bottom accent -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:${colors.primary};"></div>
  </div>`;
}

/**
 * Content C: SPLIT with accent block right
 * Dark left, colored right. Inspired by "Building our market." split
 */
function getContentSplitAccent(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${baseSlide(DARK_BG)}display:flex;">
    <!-- Left: Content -->
    <div style="flex:1;padding:100px 60px 100px 120px;display:flex;flex-direction:column;justify-content:center;">
      <!-- Small label -->
      <p style="color:${MUTED_LIGHT};font-size:16px;font-weight:500;letter-spacing:2px;text-transform:uppercase;margin:0 0 28px 0;">
        Tópico
      </p>

      <h2 style="color:${LIGHT_TEXT};font-size:56px;font-weight:800;margin:0 0 40px 0;line-height:1.15;letter-spacing:-1px;">
        ${escapeHtml(addPeriod(title))}
      </h2>

      ${
        bullets.length > 0
          ? `
        <div style="display:flex;flex-direction:column;gap:20px;">
          ${bullets
            .map(
              (b) => `
            <p style="color:${MUTED_LIGHT};font-size:22px;margin:0;line-height:1.6;">
              ${escapeHtml(b)}
            </p>
          `,
            )
            .join("")}
        </div>
      `
          : `
        <p style="color:${MUTED_LIGHT};font-size:22px;margin:0;line-height:1.6;max-width:700px;">
          ${escapeHtml(content || "")}
        </p>
      `
      }
    </div>

    <!-- Right: Accent color block -->
    <div style="width:560px;background:${colors.primary};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;">
      <h3 style="color:${LIGHT_TEXT};font-size:48px;font-weight:800;text-align:center;margin:0;line-height:1.2;letter-spacing:-0.5px;">
        ${escapeHtml(addPeriod(getShortTitle(title)))}
      </h3>
    </div>
  </div>`;
}

/**
 * Content D: FEATURE LIST — Light background
 * Inspired by "Help your team track and monitor market"
 */
function getContentFeatureList(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${baseSlide(LIGHT_BG)}display:flex;flex-direction:column;padding:100px 120px;">
    <!-- Category label -->
    <p style="color:${MUTED_DARK};font-size:16px;font-weight:500;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px 0;">
      Pontos-chave
    </p>

    <!-- Title -->
    <h2 style="color:${DARK_TEXT};font-size:56px;font-weight:800;margin:0 0 60px 0;line-height:1.15;letter-spacing:-1px;max-width:1100px;">
      ${escapeHtml(addPeriod(title))}
    </h2>

    <!-- Feature items -->
    <div style="display:flex;flex-direction:column;gap:36px;flex:1;">
      ${bullets
        .map(
          (b, i) => `
        <div style="display:flex;align-items:flex-start;gap:24px;">
          <!-- Icon circle -->
          <div style="width:48px;height:48px;border-radius:12px;background:${colors.primary}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <div style="width:10px;height:10px;border-radius:50%;background:${colors.primary};"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p style="color:${DARK_TEXT};font-size:24px;margin:0;line-height:1.5;font-weight:500;">
              ${escapeHtml(b)}
            </p>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>

    <!-- Left accent bar -->
    <div style="position:absolute;top:0;left:0;bottom:0;width:6px;background:${colors.primary};"></div>
  </div>`;
}

/**
 * Content E: QUOTE / HIGHLIGHT — Dark background, centered large text
 * Inspired by the quote slide with large italic text
 */
function getContentQuote(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const firstBullet = parseBullets(content)[0] || "";

  return `<div style="${baseSlide(DARK_BG)}display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px 160px;">
    <!-- Quote mark -->
    <div style="color:${colors.primary};font-size:120px;font-weight:800;line-height:0.6;margin-bottom:24px;opacity:0.4;">"</div>

    <!-- Quote text (use title as main message) -->
    <h2 style="color:${LIGHT_TEXT};font-size:52px;font-weight:700;text-align:center;margin:0 0 40px 0;line-height:1.35;letter-spacing:-0.5px;max-width:1400px;">
      ${escapeHtml(title)}
    </h2>

    ${
      firstBullet
        ? `
      <p style="color:${MUTED_LIGHT};font-size:22px;text-align:center;margin:0;max-width:900px;line-height:1.6;">
        ${escapeHtml(firstBullet)}
      </p>
    `
        : ""
    }

    <!-- Bottom accent line -->
    <div style="position:absolute;bottom:80px;width:80px;height:4px;background:${colors.primary};border-radius:2px;"></div>
  </div>`;
}

/**
 * Content F: SPLIT with colored LEFT, content RIGHT — inverted split
 * Inspired by "Things that maters" split slide
 */
function getContentSplitInverted(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${baseSlide("#f0f0f0")}display:flex;">
    <!-- Left: Dark block with title -->
    <div style="width:640px;background:${DARK_BG};display:flex;flex-direction:column;justify-content:center;padding:100px 80px;">
      <h2 style="color:${LIGHT_TEXT};font-size:56px;font-weight:800;margin:0;line-height:1.15;letter-spacing:-1px;">
        ${escapeHtml(addPeriod(title))}
      </h2>
      <div style="width:60px;height:4px;background:${colors.primary};border-radius:2px;margin-top:32px;"></div>
    </div>

    <!-- Right: Feature list on light bg -->
    <div style="flex:1;background:${LIGHT_BG};padding:100px 80px;display:flex;flex-direction:column;justify-content:center;">
      <div style="display:flex;flex-direction:column;gap:36px;">
        ${bullets
          .map(
            (b, i) => `
          <div style="display:flex;align-items:flex-start;gap:20px;${i > 0 ? `padding-top:36px;border-top:1px solid #e2e8f0;` : ""}">
            <div style="width:40px;height:40px;border-radius:10px;background:${colors.primary};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="color:white;font-size:18px;font-weight:700;">${i + 1}</span>
            </div>
            <p style="color:${DARK_TEXT};font-size:24px;margin:0;line-height:1.5;font-weight:400;">
              ${escapeHtml(b)}
            </p>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

/**
 * CLOSING / THANKS slide
 * Inspired by the "Thanks" slide — minimal, light background
 */
function getClosingSlide(data: SlideTemplateData): string {
  const { title, content, colors, videoTitle } = data;
  const bullets = parseBullets(content);
  const subtitle = bullets[0] || "";

  return `<div style="${baseSlide(LIGHT_BG)}display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px;">
    <!-- Top line -->
    <div style="position:absolute;top:0;left:0;right:0;height:6px;background:${colors.primary};"></div>

    <!-- Main title -->
    <h1 style="color:${colors.primary};font-size:96px;font-weight:800;margin:0 0 32px 0;line-height:1.05;letter-spacing:-2px;">
      ${escapeHtml(addPeriod(title))}
    </h1>

    <!-- Separator -->
    <div style="width:100px;height:2px;background:#e2e8f0;margin-bottom:32px;"></div>

    ${
      subtitle
        ? `
      <p style="color:${MUTED_DARK};font-size:24px;text-align:center;margin:0 0 48px 0;max-width:800px;line-height:1.5;">
        ${escapeHtml(subtitle)}
      </p>
    `
        : ""
    }

    <!-- CTA button -->
    <div style="padding:18px 56px;border-radius:50px;background:${colors.primary};margin-bottom:24px;">
      <span style="color:white;font-size:22px;font-weight:700;letter-spacing:0.5px;">INSCREVA-SE NO CANAL</span>
    </div>

    <!-- Brand at bottom -->
    <div style="position:absolute;bottom:60px;display:flex;align-items:center;gap:16px;">
      <div style="width:36px;height:36px;border-radius:8px;background:${colors.primary};display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:16px;font-weight:800;">▶</span>
      </div>
      <span style="color:${MUTED_DARK};font-size:18px;font-weight:500;">${escapeHtml(videoTitle)}</span>
    </div>
  </div>`;
}

// ── Helpers ────────────────────────────────────────────────────────

function parseBullets(content: string | null): string[] {
  if (!content) return [];
  return content
    .split(/[\n•\-\*]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Add period at end of title if not already present */
function addPeriod(text: string): string {
  const trimmed = text.trim();
  if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) {
    return trimmed;
  }
  return trimmed + ".";
}

/** Get first 3-4 words for accent block */
function getShortTitle(title: string): string {
  const words = title.split(/\s+/);
  return words.slice(0, Math.min(4, words.length)).join(" ");
}

// ── Layout cycle ──────────────────────────────────────────────────

/**
 * Content slide layouts cycle in this order to create visual variety
 * while alternating between dark and light backgrounds:
 *
 * Pattern: dark → light → dark → light → dark → light → dark
 */
const CONTENT_LAYOUTS = [
  getContentSplitDark, // dark - split title/bullets
  getContentStatsLight, // light - stats/cards
  getContentSplitAccent, // dark - content + accent block
  getContentFeatureList, // light - feature list
  getContentQuote, // dark - quote/highlight
  getContentSplitInverted, // light - inverted split
] as const;

// ── Main export ───────────────────────────────────────────────────

export function generateSlideHTML(data: SlideTemplateData): string {
  const { slideOrder, totalSlides } = data;

  // Slide 1 = Cover
  if (slideOrder === 1) {
    return getCoverSlide(data);
  }

  // Slide 2 = Outline (only if 6+ slides)
  if (slideOrder === 2 && totalSlides >= 6) {
    return getOutlineSlide(data);
  }

  // Last slide = Closing
  if (slideOrder === totalSlides) {
    return getClosingSlide(data);
  }

  // Content slides: cycle through layouts
  const contentIndex =
    totalSlides >= 6
      ? slideOrder - 3 // skip cover + outline
      : slideOrder - 2; // skip cover only

  const layoutIndex = Math.max(0, contentIndex) % CONTENT_LAYOUTS.length;
  return CONTENT_LAYOUTS[layoutIndex](data);
}

export { DEFAULT_COLORS };
