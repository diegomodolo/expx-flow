/**
 * HTML Slide Templates for YouTube Content Lab
 *
 * Renders slides based on design instructions from LLM.
 * 15 distinct layouts with genuinely different visual structures.
 * Typography is large and impactful — titles 72-110px, body 28-36px.
 */

// ── Types ─────────────────────────────────────────────────────────

export interface SlideDesign {
  slideId: string;
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  highlight?: string;
  accentText?: string;
  bigNumber?: string;
  bigNumberLabel?: string;
  columnsData?: Array<{ heading: string; text: string }>;
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

export interface SlideRenderData {
  design: SlideDesign;
  slideOrder: number;
  totalSlides: number;
  videoTitle: string;
  colors: SlideColors;
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
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}
function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [0, 0, 0];
}
function darken(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([
    Math.round(r * (1 - f)),
    Math.round(g * (1 - f)),
    Math.round(b * (1 - f)),
  ]);
}
function lighten(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([
    Math.min(255, Math.round(r + (255 - r) * f)),
    Math.min(255, Math.round(g + (255 - g) * f)),
    Math.min(255, Math.round(b + (255 - b) * f)),
  ]);
}
function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function saturate(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const gr = 0.299 * r + 0.587 * g + 0.114 * b;
  return rgbToHex([
    Math.min(255, Math.round(gr + (r - gr) * f)),
    Math.min(255, Math.round(gr + (g - gr) * f)),
    Math.min(255, Math.round(gr + (b - gr) * f)),
  ]);
}

// ── HTML helpers ──────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FONT = "'Segoe UI','Helvetica Neue',Arial,sans-serif";

function bg(c: SlideColors, extraStyle = ""): string {
  return `width:1920px;height:1080px;background:linear-gradient(160deg,${c.background} 0%,${c.backgroundEnd} 100%);font-family:${FONT};position:relative;overflow:hidden;box-sizing:border-box;${extraStyle}`;
}

/** Wraps the highlight word in the title with accent color */
function titleHL(
  title: string,
  highlight: string | undefined,
  color: string,
): string {
  if (!highlight) return esc(title);
  const escaped = esc(title);
  const escapedHL = esc(highlight);
  const regex = new RegExp(
    `(${escapedHL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "i",
  );
  return escaped.replace(regex, `<span style="color:${color}">$1</span>`);
}

// ── Layout renderers ──────────────────────────────────────────────

// 1. COVER — Title slide with big typography and brand bar
function renderCover(d: SlideRenderData): string {
  const { design: s, colors: c, videoTitle } = d;
  return `<div style="${bg(c)}display:flex;flex-direction:column;justify-content:center;padding:0 140px;">
    <div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,${c.primary},${c.secondary});"></div>
    <p style="color:${c.primary};font-size:26px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin:0 0 48px 0;">${esc(videoTitle)}</p>
    <h1 style="color:#fff;font-size:110px;font-weight:900;margin:0 0 40px 0;line-height:1.0;letter-spacing:-3px;max-width:1500px;">${titleHL(s.title, s.highlight, c.primary)}</h1>
    ${s.subtitle ? `<p style="color:${c.textSecondary};font-size:36px;font-weight:400;margin:0;line-height:1.5;max-width:1000px;">${esc(s.subtitle)}</p>` : ""}
    <div style="position:absolute;bottom:80px;left:140px;width:100px;height:5px;background:${c.primary};border-radius:3px;"></div>
  </div>`;
}

// 2. OUTLINE — Numbered topics sidebar
function renderOutline(d: SlideRenderData): string {
  const { design: s, colors: c, videoTitle } = d;
  const items = s.bullets || [];
  return `<div style="${bg(c)}display:flex;">
    <div style="flex:1;padding:100px 80px 100px 140px;display:flex;flex-direction:column;justify-content:center;">
      <p style="color:${c.primary};font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px 0;">Conteúdo</p>
      <h2 style="color:#fff;font-size:76px;font-weight:900;margin:0 0 72px 0;line-height:1.05;letter-spacing:-2px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
      <div style="display:flex;flex-direction:column;gap:36px;">
        ${items
          .map(
            (t, i) => `<div style="display:flex;align-items:center;gap:28px;">
          <span style="color:${c.primary};font-size:34px;font-weight:800;min-width:56px;">${String(i + 1).padStart(2, "0")}</span>
          <span style="color:#fff;font-size:34px;font-weight:500;">${esc(t)}</span>
        </div>`,
          )
          .join("")}
      </div>
    </div>
    <div style="width:480px;background:linear-gradient(180deg,${c.primary},${darken(c.primary, 0.3)});display:flex;flex-direction:column;justify-content:flex-end;padding:80px;">
      <p style="color:#fff;font-size:26px;font-weight:600;margin:0;opacity:0.85;">${esc(videoTitle)}</p>
    </div>
  </div>`;
}

// 3. SPLIT-BULLETS — Title left, bullets right with divider
function renderSplitBullets(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const bullets = s.bullets || [];
  return `<div style="${bg(c)}display:flex;">
    <div style="flex:1;padding:100px 48px 100px 140px;display:flex;flex-direction:column;justify-content:center;">
      <div style="width:60px;height:4px;background:${c.primary};margin-bottom:40px;border-radius:2px;"></div>
      <h2 style="color:#fff;font-size:80px;font-weight:900;margin:0;line-height:1.05;letter-spacing:-2px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
    </div>
    <div style="width:2px;background:linear-gradient(180deg,transparent,${alpha(c.primary, 0.4)},transparent);margin:120px 0;"></div>
    <div style="flex:1;padding:100px 140px 100px 60px;display:flex;flex-direction:column;justify-content:center;">
      <div style="display:flex;flex-direction:column;gap:36px;">
        ${bullets
          .map(
            (b) => `<div style="display:flex;align-items:flex-start;gap:20px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${c.primary};margin-top:16px;flex-shrink:0;"></div>
          <p style="color:${c.textSecondary};font-size:32px;margin:0;line-height:1.55;font-weight:400;">${esc(b)}</p>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

// 4. COLUMNS — Content in 2-3 equal columns with headers
function renderColumns(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const colsData =
    s.columnsData || (s.bullets || []).map((b) => ({ heading: "", text: b }));
  const cols = colsData.slice(0, 3);
  return `<div style="${bg(c)}display:flex;flex-direction:column;padding:100px 140px;">
    <h2 style="color:#fff;font-size:72px;font-weight:900;margin:0 0 20px 0;line-height:1.05;letter-spacing:-2px;max-width:1400px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
    <div style="width:80px;height:4px;background:${c.primary};border-radius:2px;margin-bottom:64px;"></div>
    <div style="display:flex;gap:48px;flex:1;align-items:flex-start;">
      ${cols
        .map(
          (
            col,
            i,
          ) => `<div style="flex:1;padding:40px;border-radius:20px;background:${alpha(c.primary, 0.06 + i * 0.03)};border:1px solid ${alpha(c.primary, 0.12)};">
        ${col.heading ? `<p style="color:${c.primary};font-size:28px;font-weight:700;margin:0 0 20px 0;text-transform:uppercase;letter-spacing:1px;">${esc(col.heading)}</p>` : ""}
        <p style="color:${c.textSecondary};font-size:28px;margin:0;line-height:1.6;font-weight:400;">${esc(col.text)}</p>
      </div>`,
        )
        .join("")}
    </div>
  </div>`;
}

// 5. SPLIT-ACCENT — Content left + bold accent block right
function renderSplitAccent(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const bullets = s.bullets || [];
  const accentText =
    s.accentText || s.highlight || s.title.split(/\s+/).slice(0, 4).join(" ");
  return `<div style="${bg(c)}display:flex;">
    <div style="flex:1;padding:100px 60px 100px 140px;display:flex;flex-direction:column;justify-content:center;">
      <p style="color:${c.primary};font-size:22px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 32px 0;">Conceito</p>
      <h2 style="color:#fff;font-size:68px;font-weight:900;margin:0 0 48px 0;line-height:1.1;letter-spacing:-1.5px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
      <div style="display:flex;flex-direction:column;gap:24px;">
        ${bullets.map((b) => `<p style="color:${c.textSecondary};font-size:30px;margin:0;line-height:1.6;">${esc(b)}</p>`).join("")}
      </div>
    </div>
    <div style="width:560px;background:linear-gradient(160deg,${c.primary},${darken(c.primary, 0.25)});display:flex;flex-direction:column;justify-content:center;align-items:center;padding:100px;">
      <h3 style="color:#fff;font-size:56px;font-weight:900;text-align:center;margin:0;line-height:1.15;letter-spacing:-1px;">${esc(accentText)}</h3>
    </div>
  </div>`;
}

// 6. FEATURE-LIST — Numbered items with badges
function renderFeatureList(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const bullets = s.bullets || [];
  return `<div style="${bg(c)}display:flex;flex-direction:column;padding:100px 140px;">
    <h2 style="color:#fff;font-size:72px;font-weight:900;margin:0 0 64px 0;line-height:1.1;letter-spacing:-1.5px;max-width:1300px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
    <div style="display:flex;flex-direction:column;gap:40px;flex:1;">
      ${bullets
        .map(
          (b, i) => `<div style="display:flex;align-items:flex-start;gap:28px;">
        <div style="width:56px;height:56px;border-radius:14px;background:${c.primary};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:#fff;font-size:26px;font-weight:800;">${i + 1}</span>
        </div>
        <p style="color:${c.textSecondary};font-size:32px;margin:0;line-height:1.55;font-weight:400;padding-top:8px;">${esc(b)}</p>
      </div>`,
        )
        .join("")}
    </div>
    <div style="position:absolute;top:0;left:0;bottom:0;width:8px;background:linear-gradient(180deg,${c.primary},${c.secondary});"></div>
  </div>`;
}

// 7. QUOTE — Centered big quote with decorative marks
function renderQuote(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const sub = (s.bullets || [])[0] || s.subtitle || "";
  return `<div style="${bg(c)}display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px 180px;">
    <div style="color:${c.primary};font-size:200px;font-weight:900;line-height:0.4;margin-bottom:40px;opacity:0.25;">&ldquo;</div>
    <h2 style="color:#fff;font-size:64px;font-weight:700;text-align:center;margin:0 0 48px 0;line-height:1.3;letter-spacing:-1px;max-width:1400px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
    ${sub ? `<p style="color:${c.textSecondary};font-size:30px;text-align:center;margin:0;max-width:1100px;line-height:1.6;">${esc(sub)}</p>` : ""}
    <div style="position:absolute;bottom:80px;width:100px;height:5px;background:${c.primary};border-radius:3px;"></div>
  </div>`;
}

// 8. SPLIT-INVERTED — Colored block left with title, list right
function renderSplitInverted(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const bullets = s.bullets || [];
  return `<div style="${bg(c)}display:flex;">
    <div style="width:700px;background:linear-gradient(160deg,${c.primary},${darken(c.primary, 0.3)});display:flex;flex-direction:column;justify-content:center;padding:100px 80px 100px 100px;">
      <h2 style="color:#fff;font-size:68px;font-weight:900;margin:0;line-height:1.1;letter-spacing:-1.5px;">${esc(s.title)}</h2>
      <div style="width:80px;height:5px;background:rgba(255,255,255,0.4);border-radius:3px;margin-top:40px;"></div>
    </div>
    <div style="flex:1;padding:100px;display:flex;flex-direction:column;justify-content:center;">
      <div style="display:flex;flex-direction:column;gap:40px;">
        ${bullets
          .map(
            (
              b,
              i,
            ) => `<div style="display:flex;align-items:flex-start;gap:24px;${i > 0 ? "padding-top:40px;border-top:1px solid rgba(255,255,255,0.08);" : ""}">
          <div style="width:44px;height:44px;border-radius:12px;background:${alpha(c.primary, 0.15)};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:${c.primary};font-size:22px;font-weight:800;">${i + 1}</span>
          </div>
          <p style="color:${c.textSecondary};font-size:30px;margin:0;line-height:1.55;font-weight:400;padding-top:4px;">${esc(b)}</p>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

// 9. BIG-NUMBER — Hero stat/number with context
function renderBigNumber(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const num = s.bigNumber || "?";
  const label = s.bigNumberLabel || s.subtitle || "";
  const bullets = s.bullets || [];
  return `<div style="${bg(c)}display:flex;align-items:center;">
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;">
      <span style="color:${c.primary};font-size:220px;font-weight:900;line-height:1;letter-spacing:-8px;">${esc(num)}</span>
      ${label ? `<p style="color:${c.textSecondary};font-size:32px;margin:20px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:3px;">${esc(label)}</p>` : ""}
    </div>
    <div style="width:2px;height:400px;background:${alpha(c.primary, 0.3)};"></div>
    <div style="flex:1;padding:100px 140px 100px 80px;display:flex;flex-direction:column;justify-content:center;">
      <h3 style="color:#fff;font-size:52px;font-weight:800;margin:0 0 40px;line-height:1.15;">${titleHL(s.title, s.highlight, c.primary)}</h3>
      ${bullets.map((b) => `<p style="color:${c.textSecondary};font-size:28px;margin:0 0 16px;line-height:1.6;">${esc(b)}</p>`).join("")}
    </div>
  </div>`;
}

// 10. ICON-GRID — Grid of items with colored number badges
function renderIconGrid(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const items = (s.bullets || []).slice(0, 6);
  const colCount = items.length <= 4 ? 2 : 3;
  return `<div style="${bg(c)}display:flex;flex-direction:column;padding:90px 140px;">
    <h2 style="color:#fff;font-size:68px;font-weight:900;margin:0 0 16px;line-height:1.1;letter-spacing:-1.5px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
    <div style="width:60px;height:4px;background:${c.primary};border-radius:2px;margin-bottom:56px;"></div>
    <div style="display:grid;grid-template-columns:repeat(${colCount},1fr);gap:32px;flex:1;align-content:start;">
      ${items
        .map(
          (
            item,
            i,
          ) => `<div style="background:${alpha(c.primary, 0.06)};border:1px solid ${alpha(c.primary, 0.1)};border-radius:20px;padding:36px;display:flex;flex-direction:column;gap:16px;">
        <div style="width:52px;height:52px;border-radius:50%;background:${c.primary};display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-size:24px;font-weight:800;">${i + 1}</span>
        </div>
        <p style="color:#fff;font-size:26px;font-weight:600;margin:0;line-height:1.4;">${esc(item)}</p>
      </div>`,
        )
        .join("")}
    </div>
  </div>`;
}

// 11. COMPARISON — Side by side blocks (VS / antes-depois)
function renderComparison(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const colsData = s.columnsData || [];
  const left = colsData[0] || {
    heading: "Antes",
    text: (s.bullets || [])[0] || "",
  };
  const right = colsData[1] || {
    heading: "Depois",
    text: (s.bullets || [])[1] || "",
  };
  return `<div style="${bg(c)}display:flex;flex-direction:column;padding:90px 140px;">
    <h2 style="color:#fff;font-size:68px;font-weight:900;margin:0 0 56px;line-height:1.1;letter-spacing:-1.5px;text-align:center;">${titleHL(s.title, s.highlight, c.primary)}</h2>
    <div style="display:flex;gap:0;flex:1;align-items:stretch;">
      <div style="flex:1;background:${alpha(c.primary, 0.08)};border-radius:24px 0 0 24px;padding:56px;display:flex;flex-direction:column;justify-content:center;border:1px solid ${alpha(c.primary, 0.12)};border-right:none;">
        <p style="color:${c.primary};font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 28px;">${esc(left.heading)}</p>
        <p style="color:${c.textSecondary};font-size:30px;margin:0;line-height:1.6;">${esc(left.text)}</p>
      </div>
      <div style="width:80px;display:flex;align-items:center;justify-content:center;background:${c.primary};z-index:1;">
        <span style="color:#fff;font-size:28px;font-weight:900;">VS</span>
      </div>
      <div style="flex:1;background:${alpha(c.secondary, 0.08)};border-radius:0 24px 24px 0;padding:56px;display:flex;flex-direction:column;justify-content:center;border:1px solid ${alpha(c.secondary, 0.12)};border-left:none;">
        <p style="color:${lighten(c.primary, 0.3)};font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 28px;">${esc(right.heading)}</p>
        <p style="color:${c.textSecondary};font-size:30px;margin:0;line-height:1.6;">${esc(right.text)}</p>
      </div>
    </div>
  </div>`;
}

// 12. TIMELINE — Horizontal steps with connecting line
function renderTimeline(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const steps = (s.bullets || []).slice(0, 5);
  return `<div style="${bg(c)}display:flex;flex-direction:column;padding:100px 140px;">
    <h2 style="color:#fff;font-size:72px;font-weight:900;margin:0 0 24px;line-height:1.1;letter-spacing:-2px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
    ${s.subtitle ? `<p style="color:${c.textSecondary};font-size:28px;margin:0 0 64px;line-height:1.4;">${esc(s.subtitle)}</p>` : `<div style="margin-bottom:64px;"></div>`}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;">
      <div style="position:absolute;top:32px;left:32px;right:32px;height:4px;background:linear-gradient(90deg,${c.primary},${c.secondary});border-radius:2px;"></div>
      <div style="display:flex;justify-content:space-between;position:relative;">
        ${steps
          .map(
            (
              step,
              i,
            ) => `<div style="display:flex;flex-direction:column;align-items:center;width:${Math.floor(1640 / steps.length)}px;">
          <div style="width:64px;height:64px;border-radius:50%;background:${c.primary};display:flex;align-items:center;justify-content:center;border:4px solid ${c.background};z-index:1;">
            <span style="color:#fff;font-size:26px;font-weight:800;">${i + 1}</span>
          </div>
          <p style="color:#fff;font-size:24px;font-weight:600;text-align:center;margin:28px 0 0;line-height:1.4;max-width:280px;">${esc(step)}</p>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

// 13. FULL-GRADIENT — Bold centered title over layered gradient (transition slide)
function renderFullGradient(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  return `<div style="${bg(c, `background:linear-gradient(135deg,${darken(c.background, 0.3)} 0%,${c.background} 30%,${darken(c.primary, 0.7)} 100%);`)}display:flex;flex-direction:column;justify-content:center;align-items:center;padding:140px;">
    <div style="position:absolute;top:50%;left:50%;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,${alpha(c.primary, 0.08)} 0%,transparent 70%);transform:translate(-50%,-50%);"></div>
    <h1 style="color:#fff;font-size:96px;font-weight:900;text-align:center;margin:0 0 40px;line-height:1.1;letter-spacing:-3px;max-width:1400px;position:relative;">${titleHL(s.title, s.highlight, c.accent)}</h1>
    ${s.subtitle ? `<p style="color:${c.textSecondary};font-size:34px;text-align:center;margin:0;max-width:1000px;line-height:1.5;position:relative;">${esc(s.subtitle)}</p>` : ""}
    <div style="position:absolute;bottom:60px;display:flex;gap:12px;">
      <div style="width:48px;height:5px;background:${c.primary};border-radius:3px;"></div>
      <div style="width:48px;height:5px;background:${alpha(c.primary, 0.3)};border-radius:3px;"></div>
      <div style="width:48px;height:5px;background:${alpha(c.primary, 0.15)};border-radius:3px;"></div>
    </div>
  </div>`;
}

// 14. CARD-STACK — Overlapping card-style bullets
function renderCardStack(d: SlideRenderData): string {
  const { design: s, colors: c } = d;
  const bullets = (s.bullets || []).slice(0, 4);
  return `<div style="${bg(c)}display:flex;">
    <div style="width:600px;padding:100px 60px 100px 140px;display:flex;flex-direction:column;justify-content:center;">
      <div style="width:48px;height:48px;border-radius:12px;background:${c.primary};display:flex;align-items:center;justify-content:center;margin-bottom:36px;">
        <span style="color:#fff;font-size:24px;font-weight:900;">&#10003;</span>
      </div>
      <h2 style="color:#fff;font-size:68px;font-weight:900;margin:0;line-height:1.1;letter-spacing:-1.5px;">${titleHL(s.title, s.highlight, c.primary)}</h2>
      ${s.subtitle ? `<p style="color:${c.textSecondary};font-size:26px;margin:28px 0 0;line-height:1.5;">${esc(s.subtitle)}</p>` : ""}
    </div>
    <div style="flex:1;padding:80px 140px 80px 40px;display:flex;flex-direction:column;justify-content:center;gap:20px;">
      ${bullets
        .map(
          (
            b,
            i,
          ) => `<div style="background:${alpha(c.primary, 0.04 + i * 0.03)};border:1px solid ${alpha(c.primary, 0.1 + i * 0.04)};border-radius:16px;padding:28px 36px;display:flex;align-items:center;gap:20px;${i > 0 ? `margin-left:${i * 16}px;` : ""}">
        <div style="width:10px;height:10px;border-radius:50%;background:${c.primary};flex-shrink:0;"></div>
        <p style="color:#fff;font-size:28px;margin:0;font-weight:500;line-height:1.4;">${esc(b)}</p>
      </div>`,
        )
        .join("")}
    </div>
  </div>`;
}

// 15. CLOSING — Final CTA slide
function renderClosing(d: SlideRenderData): string {
  const { design: s, colors: c, videoTitle } = d;
  return `<div style="${bg(c)}display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px;">
    <div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,${c.primary},${c.secondary});"></div>
    <h1 style="color:${c.primary};font-size:100px;font-weight:900;margin:0 0 40px 0;line-height:1.0;letter-spacing:-3px;">${esc(s.title)}</h1>
    <div style="width:120px;height:3px;background:rgba(255,255,255,0.12);margin-bottom:40px;"></div>
    ${s.subtitle ? `<p style="color:${c.textSecondary};font-size:32px;text-align:center;margin:0 0 56px 0;max-width:900px;line-height:1.5;">${esc(s.subtitle)}</p>` : ""}
    <div style="padding:22px 64px;border-radius:50px;background:linear-gradient(135deg,${c.primary},${darken(c.primary, 0.2)});">
      <span style="color:#fff;font-size:28px;font-weight:700;letter-spacing:1px;">INSCREVA-SE NO CANAL</span>
    </div>
    <div style="position:absolute;bottom:60px;display:flex;align-items:center;gap:20px;">
      <div style="width:44px;height:44px;border-radius:10px;background:${c.primary};display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:20px;font-weight:900;">&#9654;</span>
      </div>
      <span style="color:${c.textSecondary};font-size:24px;font-weight:500;">${esc(videoTitle)}</span>
    </div>
  </div>`;
}

// ── Layout map ────────────────────────────────────────────────────

const LAYOUT_MAP: Record<string, (d: SlideRenderData) => string> = {
  cover: renderCover,
  outline: renderOutline,
  "split-bullets": renderSplitBullets,
  columns: renderColumns,
  "split-accent": renderSplitAccent,
  "feature-list": renderFeatureList,
  quote: renderQuote,
  "split-inverted": renderSplitInverted,
  "big-number": renderBigNumber,
  "icon-grid": renderIconGrid,
  comparison: renderComparison,
  timeline: renderTimeline,
  "full-gradient": renderFullGradient,
  "card-stack": renderCardStack,
  closing: renderClosing,
};

// Fallback cycle when layout not recognized
const FALLBACK_CYCLE = [
  renderSplitBullets,
  renderBigNumber,
  renderColumns,
  renderIconGrid,
  renderSplitAccent,
  renderTimeline,
  renderFeatureList,
  renderQuote,
  renderCardStack,
  renderComparison,
  renderSplitInverted,
  renderFullGradient,
];

// ── Main export ───────────────────────────────────────────────────

export function renderSlideHTML(data: SlideRenderData): string {
  const renderer = LAYOUT_MAP[data.design.layout];
  if (renderer) return renderer(data);

  // Fallback: cycle through layouts
  const idx = (data.slideOrder - 1) % FALLBACK_CYCLE.length;
  return FALLBACK_CYCLE[idx](data);
}

export { DEFAULT_COLORS };
