/**
 * HTML Slide Templates for YouTube Content Lab
 * Generates beautiful, modern HTML slides styled with thumbnail colors.
 * These are rendered to JPG via html2canvas — no LLM API calls needed.
 */

export interface SlideTemplateData {
  title: string;
  content: string | null;
  slideOrder: number;
  totalSlides: number;
  videoTitle: string;
  thumbnailUrl?: string | null;
  colors: SlideColors;
}

export interface SlideColors {
  primary: string; // dominant color
  secondary: string; // accent color
  background: string; // gradient start
  backgroundEnd: string; // gradient end
  text: string; // text color
  textSecondary: string; // subtitle color
  accent: string; // highlight color
}

const DEFAULT_COLORS: SlideColors = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  background: "#0f172a",
  backgroundEnd: "#1e293b",
  text: "#ffffff",
  textSecondary: "#cbd5e1",
  accent: "#38bdf8",
};

/**
 * Extract dominant colors from a thumbnail image using canvas sampling
 */
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

        // Sample at small size for performance
        canvas.width = 50;
        canvas.height = 28;
        ctx.drawImage(img, 0, 0, 50, 28);

        const imageData = ctx.getImageData(0, 0, 50, 28).data;

        // Collect color samples from different regions
        const regions = {
          topLeft: sampleRegion(imageData, 50, 0, 0, 15, 10),
          topRight: sampleRegion(imageData, 50, 35, 0, 50, 10),
          center: sampleRegion(imageData, 50, 15, 8, 35, 20),
          bottomLeft: sampleRegion(imageData, 50, 0, 18, 15, 28),
          bottomRight: sampleRegion(imageData, 50, 35, 18, 50, 28),
        };

        // Find the darkest region for background
        const allRegions = Object.values(regions);
        const sorted = allRegions.sort(
          (a, b) => getLuminance(a) - getLuminance(b),
        );

        const darkest = sorted[0];
        const brightest = sorted[sorted.length - 1];
        const mid = sorted[Math.floor(sorted.length / 2)];

        // Determine if thumbnail is mostly dark or light
        const avgLuminance =
          allRegions.reduce((sum, c) => sum + getLuminance(c), 0) /
          allRegions.length;
        const isDark = avgLuminance < 128;

        const primary = rgbToHex(brightest);
        const secondary = rgbToHex(mid);

        resolve({
          primary,
          secondary,
          background: isDark
            ? darken(rgbToHex(darkest), 0.3)
            : darken(rgbToHex(darkest), 0.5),
          backgroundEnd: isDark
            ? darken(rgbToHex(sorted[1] || darkest), 0.2)
            : darken(rgbToHex(sorted[1] || darkest), 0.4),
          text: "#ffffff",
          textSecondary: isDark ? "#e2e8f0" : "#cbd5e1",
          accent: saturate(primary, 1.3),
        });
      } catch {
        resolve(DEFAULT_COLORS);
      }
    };
    img.onerror = () => resolve(DEFAULT_COLORS);
    img.src = thumbnailUrl;
  });
}

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

// --- Slide Layout Templates ---

function getIntroSlideHTML(data: SlideTemplateData): string {
  const { title, content, colors, videoTitle } = data;
  const bullets = parseBullets(content);

  return `
    <div style="
      width: 1920px; height: 1080px;
      background: linear-gradient(135deg, ${colors.background} 0%, ${colors.backgroundEnd} 50%, ${colors.background} 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      position: relative; overflow: hidden;
    ">
      <!-- Decorative circles -->
      <div style="position: absolute; top: -120px; right: -120px; width: 400px; height: 400px; border-radius: 50%; background: ${colors.primary}15;"></div>
      <div style="position: absolute; bottom: -80px; left: -80px; width: 300px; height: 300px; border-radius: 50%; background: ${colors.accent}10;"></div>

      <!-- Accent line -->
      <div style="width: 120px; height: 6px; background: linear-gradient(90deg, ${colors.primary}, ${colors.accent}); border-radius: 3px; margin-bottom: 40px;"></div>

      <h1 style="
        color: ${colors.text}; font-size: 72px; font-weight: 800;
        text-align: center; max-width: 1400px; line-height: 1.15;
        margin: 0 0 30px 0; letter-spacing: -1px;
        text-shadow: 0 4px 30px ${colors.background}80;
      ">${escapeHtml(title)}</h1>

      ${
        bullets.length > 0
          ? `
        <div style="display: flex; flex-direction: column; gap: 16px; max-width: 1000px; margin-top: 20px;">
          ${bullets
            .slice(0, 3)
            .map(
              (b) => `
            <p style="color: ${colors.textSecondary}; font-size: 32px; text-align: center; margin: 0; line-height: 1.4;">
              ${escapeHtml(b)}
            </p>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }

      <!-- Video title badge -->
      <div style="
        position: absolute; bottom: 60px;
        background: ${colors.primary}20; border: 1px solid ${colors.primary}40;
        padding: 12px 32px; border-radius: 40px;
      ">
        <span style="color: ${colors.textSecondary}; font-size: 20px;">${escapeHtml(videoTitle)}</span>
      </div>
    </div>
  `;
}

function getContentSlideHTML(data: SlideTemplateData): string {
  const { title, content, slideOrder, colors } = data;
  const bullets = parseBullets(content);
  const isEven = slideOrder % 2 === 0;

  return `
    <div style="
      width: 1920px; height: 1080px;
      background: linear-gradient(${isEven ? "150deg" : "210deg"}, ${colors.background} 0%, ${colors.backgroundEnd} 100%);
      display: flex; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      position: relative; overflow: hidden;
    ">
      <!-- Side accent bar -->
      <div style="
        position: absolute; left: 0; top: 0; bottom: 0; width: 8px;
        background: linear-gradient(180deg, ${colors.primary}, ${colors.accent});
      "></div>

      <!-- Decorative shape -->
      <div style="position: absolute; top: -100px; right: -100px; width: 500px; height: 500px; border-radius: 50%; background: ${colors.primary}08;"></div>
      <div style="position: absolute; bottom: -150px; right: 200px; width: 400px; height: 400px; border-radius: 50%; background: ${colors.accent}06;"></div>

      <!-- Content area -->
      <div style="display: flex; flex-direction: column; justify-content: center; padding: 80px 100px; width: 100%; position: relative; z-index: 1;">

        <!-- Title with accent -->
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 50px;">
          <div style="width: 60px; height: 60px; border-radius: 16px; background: linear-gradient(135deg, ${colors.primary}, ${colors.accent}); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="color: white; font-size: 28px; font-weight: 800;">${slideOrder}</span>
          </div>
          <h2 style="
            color: ${colors.text}; font-size: 56px; font-weight: 700;
            margin: 0; line-height: 1.2; letter-spacing: -0.5px;
          ">${escapeHtml(title)}</h2>
        </div>

        <!-- Bullets -->
        ${
          bullets.length > 0
            ? `
          <div style="display: flex; flex-direction: column; gap: 24px; padding-left: 80px;">
            ${bullets
              .map(
                (b, i) => `
              <div style="display: flex; align-items: flex-start; gap: 20px;">
                <div style="
                  width: 10px; height: 10px; border-radius: 50%; margin-top: 14px;
                  background: ${colors.accent}; flex-shrink: 0;
                  box-shadow: 0 0 12px ${colors.accent}60;
                "></div>
                <p style="color: ${colors.textSecondary}; font-size: 34px; margin: 0; line-height: 1.5; max-width: 1500px;">
                  ${escapeHtml(b)}
                </p>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : `
          <p style="color: ${colors.textSecondary}; font-size: 34px; padding-left: 80px; line-height: 1.6; max-width: 1500px;">
            ${escapeHtml(content || "")}
          </p>
        `
        }
      </div>
    </div>
  `;
}

function getClosingSlideHTML(data: SlideTemplateData): string {
  const { title, content, colors, videoTitle } = data;
  const bullets = parseBullets(content);

  return `
    <div style="
      width: 1920px; height: 1080px;
      background: linear-gradient(135deg, ${colors.background} 0%, ${colors.primary}30 50%, ${colors.backgroundEnd} 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      position: relative; overflow: hidden;
    ">
      <!-- Large decorative elements -->
      <div style="position: absolute; top: -200px; left: -200px; width: 600px; height: 600px; border-radius: 50%; background: ${colors.primary}12;"></div>
      <div style="position: absolute; bottom: -200px; right: -200px; width: 600px; height: 600px; border-radius: 50%; background: ${colors.accent}10;"></div>

      <h1 style="
        color: ${colors.text}; font-size: 80px; font-weight: 800;
        text-align: center; max-width: 1400px; line-height: 1.15;
        margin: 0 0 40px 0; letter-spacing: -1px;
      ">${escapeHtml(title)}</h1>

      ${
        bullets.length > 0
          ? `
        <div style="display: flex; flex-direction: column; gap: 16px; max-width: 1000px; margin-bottom: 40px;">
          ${bullets
            .slice(0, 3)
            .map(
              (b) => `
            <p style="color: ${colors.textSecondary}; font-size: 30px; text-align: center; margin: 0;">
              ${escapeHtml(b)}
            </p>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }

      <!-- CTA style decoration -->
      <div style="
        margin-top: 20px; padding: 20px 60px; border-radius: 50px;
        background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
        box-shadow: 0 8px 30px ${colors.primary}40;
      ">
        <span style="color: white; font-size: 28px; font-weight: 700; letter-spacing: 1px;">
          INSCREVA-SE NO CANAL
        </span>
      </div>

      <!-- Video title -->
      <p style="
        position: absolute; bottom: 50px;
        color: ${colors.textSecondary}60; font-size: 18px;
      ">${escapeHtml(videoTitle)}</p>
    </div>
  `;
}

// --- Helpers ---

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

// --- Main export ---

export function generateSlideHTML(data: SlideTemplateData): string {
  const { slideOrder, totalSlides } = data;

  // First slide = intro, last slide = closing, rest = content
  if (slideOrder === 1) {
    return getIntroSlideHTML(data);
  }
  if (slideOrder === totalSlides) {
    return getClosingSlideHTML(data);
  }
  return getContentSlideHTML(data);
}

export { DEFAULT_COLORS };
