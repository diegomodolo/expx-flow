/**
 * HTML Slide Templates for YouTube Content Lab
 *
 * Design: consistent dark theme, large bold typography, accent color highlights.
 * All slides share the same dark background for visual cohesion.
 * Titles are very large (80-110px), body text is readable (30-36px).
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
  background: "#0c0c1d",
  backgroundEnd: "#141428",
  text: "#ffffff",
  textSecondary: "#b0b8c8",
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

        // Pick most saturated as primary accent
        const bySaturation = [...allRegions].sort(
          (a, b) => getSaturation(b) - getSaturation(a),
        );
        const mostSaturated = bySaturation[0];
        const primaryColor =
          getSaturation(mostSaturated) > 0.15 ? mostSaturated : brightest;
        const primary = rgbToHex(primaryColor);

        resolve({
          primary,
          secondary: rgbToHex(bySaturation[1] || brightest),
          background: darken(rgbToHex(darkest), 0.5),
          backgroundEnd: darken(rgbToHex(darkest), 0.35),
          text: "#ffffff",
          textSecondary: "#b0b8c8",
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

function saturate(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return rgbToHex([
    Math.min(255, Math.round(gray + (r - gray) * factor)),
    Math.min(255, Math.round(gray + (g - gray) * factor)),
    Math.min(255, Math.round(gray + (b - gray) * factor)),
  ]);
}

// ── Shared constants ──────────────────────────────────────────────

const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

function bg(colors: SlideColors): string {
  return `width:1920px;height:1080px;background:linear-gradient(160deg,${colors.background} 0%,${colors.backgroundEnd} 100%);font-family:${FONT};position:relative;overflow:hidden;box-sizing:border-box;`;
}

// ── Slide 1: COVER ────────────────────────────────────────────────

function getCoverSlide(data: SlideTemplateData): string {
  const { title, content, colors, videoTitle } = data;
  const subtitle = parseBullets(content)[0] || "";

  return `<div style="${bg(colors)}display:flex;flex-direction:column;justify-content:center;padding:0 140px;">
    <div style="position:absolute;top:0;left:0;right:0;height:8px;background:${colors.primary};"></div>

    <p style="color:${colors.primary};font-size:24px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin:0 0 48px 0;">
      ${escapeHtml(videoTitle)}
    </p>

    <h1 style="color:#fff;font-size:110px;font-weight:900;margin:0 0 40px 0;line-height:1.0;letter-spacing:-3px;max-width:1500px;">
      ${escapeHtml(addPeriod(title))}
    </h1>

    ${
      subtitle
        ? `
      <p style="color:${colors.textSecondary};font-size:34px;font-weight:400;margin:0;line-height:1.5;max-width:1000px;">
        ${escapeHtml(subtitle)}
      </p>
    `
        : ""
    }

    <div style="position:absolute;bottom:80px;left:140px;width:100px;height:5px;background:${colors.primary};border-radius:3px;"></div>
  </div>`;
}

// ── Slide 2: OUTLINE ──────────────────────────────────────────────

function getOutlineSlide(data: SlideTemplateData): string {
  const { colors, videoTitle, allSlideTitles } = data;
  const topics = (allSlideTitles || []).slice(2, -1);

  return `<div style="${bg(colors)}display:flex;">
    <div style="flex:1;padding:100px 80px 100px 140px;display:flex;flex-direction:column;justify-content:center;">
      <p style="color:${colors.primary};font-size:22px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px 0;">
        Conteúdo
      </p>

      <h2 style="color:#fff;font-size:80px;font-weight:900;margin:0 0 72px 0;line-height:1.05;letter-spacing:-2px;">
        Visão Geral.
      </h2>

      <div style="display:flex;flex-direction:column;gap:36px;">
        ${topics
          .map(
            (t, i) => `
          <div style="display:flex;align-items:center;gap:28px;">
            <span style="color:${colors.primary};font-size:32px;font-weight:800;min-width:56px;">
              ${String(i + 1).padStart(2, "0")}
            </span>
            <span style="color:#fff;font-size:32px;font-weight:500;">
              ${escapeHtml(t)}
            </span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <div style="width:480px;background:${colors.primary};display:flex;flex-direction:column;justify-content:flex-end;padding:80px;">
      <p style="color:#fff;font-size:24px;font-weight:600;margin:0;opacity:0.85;">
        ${escapeHtml(videoTitle)}
      </p>
    </div>
  </div>`;
}

// ── Content A: SPLIT — Big title left, bullets right ──────────────

function getContentSplitBullets(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${bg(colors)}display:flex;">
    <div style="flex:1;padding:100px 48px 100px 140px;display:flex;flex-direction:column;justify-content:center;">
      <div style="width:14px;height:14px;border-radius:50%;background:${colors.primary};margin-bottom:40px;"></div>

      <h2 style="color:#fff;font-size:84px;font-weight:900;margin:0;line-height:1.05;letter-spacing:-2px;">
        ${escapeHtml(addPeriod(title))}
      </h2>
    </div>

    <div style="flex:1;padding:100px 140px 100px 48px;display:flex;flex-direction:column;justify-content:center;">
      ${
        bullets.length > 0
          ? `
        <div style="display:flex;flex-direction:column;gap:36px;">
          ${bullets
            .map(
              (b) => `
            <div style="display:flex;align-items:flex-start;gap:20px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${colors.primary};margin-top:16px;flex-shrink:0;"></div>
              <p style="color:${colors.textSecondary};font-size:32px;margin:0;line-height:1.55;font-weight:400;">
                ${escapeHtml(b)}
              </p>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : `
        <p style="color:${colors.textSecondary};font-size:32px;margin:0;line-height:1.55;">
          ${escapeHtml(content || "")}
        </p>
      `
      }
    </div>

    <div style="position:absolute;bottom:60px;left:140px;right:140px;height:1px;background:rgba(255,255,255,0.06);"></div>
  </div>`;
}

// ── Content B: FULL WIDTH — Title + columns ───────────────────────

function getContentColumns(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);
  const cols = bullets.slice(0, 3);

  return `<div style="${bg(colors)}display:flex;flex-direction:column;padding:100px 140px;">
    <p style="color:${colors.primary};font-size:22px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px 0;">
      Destaque
    </p>

    <h2 style="color:#fff;font-size:80px;font-weight:900;margin:0 0 56px 0;line-height:1.05;letter-spacing:-2px;max-width:1200px;">
      ${escapeHtml(addPeriod(title))}
    </h2>

    <div style="width:100px;height:5px;background:${colors.primary};border-radius:3px;margin-bottom:64px;"></div>

    <div style="display:flex;gap:0;flex:1;align-items:flex-start;">
      ${cols
        .map(
          (s, i) => `
        <div style="flex:1;padding:40px ${i < cols.length - 1 ? "48px" : "0"} 40px ${i > 0 ? "48px" : "0"};${i > 0 ? `border-left:1px solid rgba(255,255,255,0.08);` : ""}">
          <p style="color:#fff;font-size:30px;margin:0;line-height:1.6;font-weight:400;">
            ${escapeHtml(s)}
          </p>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>`;
}

// ── Content C: SPLIT with accent block right ──────────────────────

function getContentSplitAccent(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${bg(colors)}display:flex;">
    <div style="flex:1;padding:100px 60px 100px 140px;display:flex;flex-direction:column;justify-content:center;">
      <p style="color:${colors.primary};font-size:20px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 32px 0;">
        Tópico
      </p>

      <h2 style="color:#fff;font-size:72px;font-weight:900;margin:0 0 48px 0;line-height:1.1;letter-spacing:-1.5px;">
        ${escapeHtml(addPeriod(title))}
      </h2>

      ${
        bullets.length > 0
          ? `
        <div style="display:flex;flex-direction:column;gap:24px;">
          ${bullets
            .map(
              (b) => `
            <p style="color:${colors.textSecondary};font-size:28px;margin:0;line-height:1.6;">
              ${escapeHtml(b)}
            </p>
          `,
            )
            .join("")}
        </div>
      `
          : `
        <p style="color:${colors.textSecondary};font-size:28px;margin:0;line-height:1.6;max-width:800px;">
          ${escapeHtml(content || "")}
        </p>
      `
      }
    </div>

    <div style="width:560px;background:${colors.primary};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:100px;">
      <h3 style="color:#fff;font-size:60px;font-weight:900;text-align:center;margin:0;line-height:1.15;letter-spacing:-1px;">
        ${escapeHtml(addPeriod(getShortTitle(title)))}
      </h3>
    </div>
  </div>`;
}

// ── Content D: FEATURE LIST with numbered items ───────────────────

function getContentFeatureList(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${bg(colors)}display:flex;flex-direction:column;padding:100px 140px;">
    <p style="color:${colors.primary};font-size:20px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px 0;">
      Pontos-chave
    </p>

    <h2 style="color:#fff;font-size:72px;font-weight:900;margin:0 0 64px 0;line-height:1.1;letter-spacing:-1.5px;max-width:1300px;">
      ${escapeHtml(addPeriod(title))}
    </h2>

    <div style="display:flex;flex-direction:column;gap:40px;flex:1;">
      ${bullets
        .map(
          (b, i) => `
        <div style="display:flex;align-items:flex-start;gap:28px;">
          <div style="width:56px;height:56px;border-radius:14px;background:${colors.primary};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:#fff;font-size:24px;font-weight:800;">${i + 1}</span>
          </div>
          <p style="color:${colors.textSecondary};font-size:30px;margin:0;line-height:1.55;font-weight:400;padding-top:8px;">
            ${escapeHtml(b)}
          </p>
        </div>
      `,
        )
        .join("")}
    </div>

    <div style="position:absolute;top:0;left:0;bottom:0;width:8px;background:${colors.primary};"></div>
  </div>`;
}

// ── Content E: QUOTE — centered large text ────────────────────────

function getContentQuote(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const firstBullet = parseBullets(content)[0] || "";

  return `<div style="${bg(colors)}display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px 180px;">
    <div style="color:${colors.primary};font-size:160px;font-weight:900;line-height:0.5;margin-bottom:40px;opacity:0.35;">&ldquo;</div>

    <h2 style="color:#fff;font-size:64px;font-weight:700;text-align:center;margin:0 0 48px 0;line-height:1.3;letter-spacing:-1px;max-width:1500px;">
      ${escapeHtml(title)}
    </h2>

    ${
      firstBullet
        ? `
      <p style="color:${colors.textSecondary};font-size:30px;text-align:center;margin:0;max-width:1100px;line-height:1.6;">
        ${escapeHtml(firstBullet)}
      </p>
    `
        : ""
    }

    <div style="position:absolute;bottom:80px;width:100px;height:5px;background:${colors.primary};border-radius:3px;"></div>
  </div>`;
}

// ── Content F: SPLIT inverted — accent left, bullets right ────────

function getContentSplitInverted(data: SlideTemplateData): string {
  const { title, content, colors } = data;
  const bullets = parseBullets(content);

  return `<div style="${bg(colors)}display:flex;">
    <div style="width:700px;background:${colors.primary};display:flex;flex-direction:column;justify-content:center;padding:100px 80px 100px 100px;">
      <h2 style="color:#fff;font-size:72px;font-weight:900;margin:0;line-height:1.1;letter-spacing:-1.5px;">
        ${escapeHtml(addPeriod(title))}
      </h2>
      <div style="width:80px;height:5px;background:rgba(255,255,255,0.4);border-radius:3px;margin-top:40px;"></div>
    </div>

    <div style="flex:1;padding:100px 100px;display:flex;flex-direction:column;justify-content:center;">
      <div style="display:flex;flex-direction:column;gap:40px;">
        ${bullets
          .map(
            (b, i) => `
          <div style="display:flex;align-items:flex-start;gap:24px;${i > 0 ? `padding-top:40px;border-top:1px solid rgba(255,255,255,0.08);` : ""}">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="color:${colors.primary};font-size:22px;font-weight:800;">${i + 1}</span>
            </div>
            <p style="color:${colors.textSecondary};font-size:30px;margin:0;line-height:1.55;font-weight:400;padding-top:4px;">
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

// ── CLOSING slide ─────────────────────────────────────────────────

function getClosingSlide(data: SlideTemplateData): string {
  const { title, content, colors, videoTitle } = data;
  const subtitle = parseBullets(content)[0] || "";

  return `<div style="${bg(colors)}display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px;">
    <div style="position:absolute;top:0;left:0;right:0;height:8px;background:${colors.primary};"></div>

    <h1 style="color:${colors.primary};font-size:110px;font-weight:900;margin:0 0 40px 0;line-height:1.0;letter-spacing:-3px;">
      ${escapeHtml(addPeriod(title))}
    </h1>

    <div style="width:120px;height:3px;background:rgba(255,255,255,0.12);margin-bottom:40px;"></div>

    ${
      subtitle
        ? `
      <p style="color:${colors.textSecondary};font-size:30px;text-align:center;margin:0 0 56px 0;max-width:900px;line-height:1.5;">
        ${escapeHtml(subtitle)}
      </p>
    `
        : ""
    }

    <div style="padding:22px 64px;border-radius:50px;background:${colors.primary};">
      <span style="color:#fff;font-size:26px;font-weight:700;letter-spacing:1px;">INSCREVA-SE NO CANAL</span>
    </div>

    <div style="position:absolute;bottom:60px;display:flex;align-items:center;gap:20px;">
      <div style="width:44px;height:44px;border-radius:10px;background:${colors.primary};display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:20px;font-weight:900;">&#9654;</span>
      </div>
      <span style="color:${colors.textSecondary};font-size:22px;font-weight:500;">${escapeHtml(videoTitle)}</span>
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

function addPeriod(text: string): string {
  const trimmed = text.trim();
  if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) {
    return trimmed;
  }
  return trimmed + ".";
}

function getShortTitle(title: string): string {
  const words = title.split(/\s+/);
  return words.slice(0, Math.min(4, words.length)).join(" ");
}

// ── Layout cycle ──────────────────────────────────────────────────

const CONTENT_LAYOUTS = [
  getContentSplitBullets, // split: big title left, bullets right
  getContentColumns, // full: title + 3 columns
  getContentSplitAccent, // split: content + accent color block
  getContentFeatureList, // full: numbered feature list
  getContentQuote, // centered: large quote text
  getContentSplitInverted, // split: accent block left, numbered right
] as const;

// ── Main export ───────────────────────────────────────────────────

export function generateSlideHTML(data: SlideTemplateData): string {
  const { slideOrder, totalSlides } = data;

  if (slideOrder === 1) {
    return getCoverSlide(data);
  }

  if (slideOrder === 2 && totalSlides >= 6) {
    return getOutlineSlide(data);
  }

  if (slideOrder === totalSlides) {
    return getClosingSlide(data);
  }

  const contentIndex = totalSlides >= 6 ? slideOrder - 3 : slideOrder - 2;

  const layoutIndex = Math.max(0, contentIndex) % CONTENT_LAYOUTS.length;
  return CONTENT_LAYOUTS[layoutIndex](data);
}

export { DEFAULT_COLORS };
