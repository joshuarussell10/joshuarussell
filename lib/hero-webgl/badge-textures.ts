import * as THREE from "three";
import { lanyardConfig, type LanyardPalette } from "@/lib/hero-webgl/lanyard-config";

export type BadgeIdentity = {
  name: string;
  title: string;
  organisation: string;
  department: string;
  idNumber: string;
  clearance: string;
  issued: string;
  expires: string;
  email: string;
};

export type BadgeTextureSet = {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  /** Varying clearcoat roughness — handling smudges across the laminate. */
  gloss: THREE.CanvasTexture;
  dispose: () => void;
};

const CARD_TEXTURE_WIDTH = 1024;
const CARD_TEXTURE_HEIGHT = 1624;

/**
 * Deterministic noise so barcodes, weave slubs and smudges are identical on
 * every render and between server/client mounts.
 */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Reads the real Geist stacks off the document so the print matches the site. */
export function resolveFontStacks() {
  const fallbackSans =
    '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
  const fallbackMono = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

  if (typeof window === "undefined") {
    return { sans: fallbackSans, mono: fallbackMono };
  }

  const styles = getComputedStyle(document.documentElement);
  const sans = styles.getPropertyValue("--font-geist-sans").trim();
  const mono = styles.getPropertyValue("--font-geist-mono").trim();

  return {
    sans: sans ? `${sans}, ${fallbackSans}` : fallbackSans,
    mono: mono ? `${mono}, ${fallbackMono}` : fallbackMono,
  };
}

function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left"
) {
  const chars = [...text];
  const total =
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
    spacing * Math.max(0, chars.length - 1);

  let cursor = x;
  if (align === "center") cursor = x - total / 2;
  if (align === "right") cursor = x - total;

  const previousAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (const char of chars) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
  ctx.textAlign = previousAlign;
  return total;
}

/** Interlocking sine loops, the pattern used as anti-copy art on real IDs. */
function drawGuilloche(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  for (let ring = 0; ring < 5; ring += 1) {
    const petals = 7 + ring * 2;
    const amplitude = radius * (0.1 + ring * 0.022);
    const base = radius * (0.45 + ring * 0.11);
    ctx.beginPath();
    for (let i = 0; i <= 720; i += 1) {
      const t = (i / 720) * Math.PI * 2;
      const r = base + Math.sin(t * petals) * amplitude;
      const px = cx + Math.cos(t) * r;
      const py = cy + Math.sin(t) * r * 0.62;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Print grain. Built as a tile and stamped through a pattern because
 * putImageData bypasses composite modes and would overwrite the artwork.
 */
function drawNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  seed: number
) {
  const tile = 256;
  const noiseCanvas = createCanvas(tile, tile);
  const noiseCtx = noiseCanvas.getContext("2d");
  if (!noiseCtx) return;

  const random = createRandom(seed);
  const image = noiseCtx.createImageData(tile, tile);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const value = 128 + (random() - 0.5) * amount * 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  noiseCtx.putImageData(image, 0, 0);

  const pattern = ctx.createPattern(noiseCanvas, "repeat");
  if (!pattern) return;

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  seed: number
) {
  const random = createRandom(seed);
  ctx.save();
  ctx.fillStyle = color;
  let cursor = x;
  // Quiet zone, then alternating bar/space runs of 1–4 modules.
  while (cursor < x + width - 6) {
    const bar = 2 + Math.floor(random() * 4) * 2;
    const gap = 2 + Math.floor(random() * 3) * 2;
    if (cursor + bar > x + width) break;
    ctx.fillRect(cursor, y, bar, height);
    cursor += bar + gap;
  }
  ctx.restore();
}

function drawQrCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  seed: number
) {
  const modules = 25;
  const cell = size / modules;
  const random = createRandom(seed);

  const isFinder = (col: number, row: number) =>
    (col < 7 && row < 7) ||
    (col >= modules - 7 && row < 7) ||
    (col < 7 && row >= modules - 7);

  ctx.save();
  ctx.fillStyle = color;

  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (isFinder(col, row)) continue;
      if (random() > 0.52) {
        ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
      }
    }
  }

  const drawFinder = (col: number, row: number) => {
    ctx.fillRect(x + col * cell, y + row * cell, cell * 7, cell * 7);
    ctx.clearRect(x + (col + 1) * cell, y + (row + 1) * cell, cell * 5, cell * 5);
    ctx.fillRect(x + (col + 2) * cell, y + (row + 2) * cell, cell * 3, cell * 3);
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);
  ctx.restore();
}

/**
 * Standard filled user glyph (head + shoulders), in a 24×24 viewBox —
 * the same mark UI kits use for empty avatars.
 */
function drawUserGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) {
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);

  // Head.
  ctx.beginPath();
  ctx.arc(12, 8, 4.25, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders / torso — rounded top, clipped by the photo frame below.
  ctx.beginPath();
  ctx.moveTo(4, 21.5);
  ctx.lineTo(4, 19.25);
  ctx.bezierCurveTo(4, 16.35, 7.15, 14.25, 12, 14.25);
  ctx.bezierCurveTo(16.85, 14.25, 20, 16.35, 20, 19.25);
  ctx.lineTo(20, 21.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Printed portrait window with a clean standard profile mark. */
function drawPortrait(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  palette: LanyardPalette
) {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, width * 0.05);
  ctx.clip();

  const backdrop = ctx.createLinearGradient(x, y, x + width * 0.35, y + height);
  backdrop.addColorStop(0, palette.photoTop);
  backdrop.addColorStop(1, palette.photoBottom);
  ctx.fillStyle = backdrop;
  ctx.fillRect(x, y, width, height);

  // Soft studio falloff behind the mark.
  const spot = ctx.createRadialGradient(
    x + width * 0.5,
    y + height * 0.36,
    width * 0.06,
    x + width * 0.5,
    y + height * 0.5,
    width * 0.85
  );
  spot.addColorStop(0, "rgba(255,255,255,0.14)");
  spot.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = spot;
  ctx.fillRect(x, y, width, height);

  const cx = x + width * 0.5;
  const cy = y + height * 0.55;
  const glyphSize = width * 1.02;

  ctx.fillStyle = palette.photoFigure;
  drawUserGlyph(ctx, cx, cy, glyphSize);

  // Gentle side key so the mark sits in the same light as the rest of the card.
  const rim = ctx.createLinearGradient(x + width * 0.15, 0, x + width * 0.85, 0);
  rim.addColorStop(0, "rgba(255,255,255,0.1)");
  rim.addColorStop(0.5, "rgba(255,255,255,0)");
  rim.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = rim;
  ctx.fillRect(x, y, width, height);

  ctx.restore();

  // Printed keyline around the portrait window.
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, width * 0.05);
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/**
 * Diffraction foil printed into the artwork. The 3D patch on top supplies the
 * angular shift; this supplies the colour, which a single film thickness on a
 * near-flat surface can't.
 */
function drawHologram(ctx: CanvasRenderingContext2D) {
  const { card } = lanyardConfig;
  const cx = (card.hologram.x / card.width + 0.5) * CARD_TEXTURE_WIDTH;
  const cy = (0.5 - card.hologram.y / card.height) * CARD_TEXTURE_HEIGHT;
  const radius = (card.hologram.radius / card.width) * CARD_TEXTURE_WIDTH;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Normal compositing, not screen: screened over a near-white card the foil
  // would clip straight back to white.
  ctx.globalAlpha = 0.55;

  // Conic rainbow approximated with wedges.
  const wedges = 72;
  for (let i = 0; i < wedges; i += 1) {
    const from = (i / wedges) * Math.PI * 2;
    const to = ((i + 1.4) / wedges) * Math.PI * 2;
    ctx.fillStyle = `hsl(${(i / wedges) * 360}, 72%, 60%)`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, from, to);
    ctx.closePath();
    ctx.fill();
  }

  // Interference rings across the wedges.
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = radius * 0.07;
  for (let ring = 1; ring <= 9; ring += 1) {
    ctx.strokeStyle = ring % 2 === 0 ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(cx, cy, (ring / 9) * radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Falloff so the patch sits into the card rather than on top of it.
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const falloff = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
  falloff.addColorStop(0, "rgba(255,255,255,0)");
  falloff.addColorStop(1, "rgba(255,255,255,0.1)");
  ctx.fillStyle = falloff;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCardFront(
  ctx: CanvasRenderingContext2D,
  palette: LanyardPalette,
  identity: BadgeIdentity,
  fonts: { sans: string; mono: string }
) {
  const W = CARD_TEXTURE_WIDTH;
  const H = CARD_TEXTURE_HEIGHT;

  const background = ctx.createLinearGradient(0, 0, W * 0.6, H);
  background.addColorStop(0, palette.cardBackground);
  background.addColorStop(1, palette.cardBackgroundEdge);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  drawGuilloche(ctx, W * 0.5, H * 0.56, W * 0.78, palette.accent, 0.07);

  // Header band, held below the punch slot.
  const headerTop = H * 0.128;
  const headerHeight = H * 0.085;
  const headerFill = ctx.createLinearGradient(0, headerTop, W, headerTop + headerHeight);
  headerFill.addColorStop(0, palette.accentDeep);
  headerFill.addColorStop(1, palette.accent);
  ctx.fillStyle = headerFill;
  ctx.fillRect(0, headerTop, W, headerHeight);

  // Logo mark.
  const markSize = headerHeight * 0.52;
  const markX = W * 0.062;
  const markY = headerTop + (headerHeight - markSize) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundedRectPath(ctx, markX, markY, markSize, markSize, markSize * 0.28);
  ctx.fill();
  ctx.fillStyle = palette.accentDeep;
  ctx.font = `700 ${Math.round(markSize * 0.5)}px ${fonts.sans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JR", markX + markSize / 2, markY + markSize * 0.54);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `600 ${Math.round(H * 0.021)}px ${fonts.mono}`;
  ctx.textAlign = "left";
  tracked(
    ctx,
    identity.organisation.toUpperCase(),
    markX + markSize * 1.42,
    headerTop + headerHeight * 0.52,
    2.6
  );

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `500 ${Math.round(H * 0.0165)}px ${fonts.mono}`;
  tracked(
    ctx,
    identity.department.toUpperCase(),
    W * 0.938,
    headerTop + headerHeight * 0.52,
    2.4,
    "right"
  );

  // Portrait.
  const photoW = W * 0.46;
  const photoH = photoW * 1.25;
  const photoX = (W - photoW) / 2;
  const photoY = H * 0.253;
  drawPortrait(ctx, photoX, photoY, photoW, photoH, palette);

  // Name and role.
  const nameY = photoY + photoH + H * 0.058;
  ctx.textAlign = "center";
  ctx.fillStyle = palette.ink;
  ctx.font = `600 ${Math.round(H * 0.048)}px ${fonts.sans}`;
  ctx.fillText(identity.name, W / 2, nameY);

  ctx.fillStyle = palette.accent;
  ctx.font = `500 ${Math.round(H * 0.0203)}px ${fonts.sans}`;
  const titleLines = wrapText(ctx, identity.title, W * 0.82);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, W / 2, nameY + H * 0.04 + index * H * 0.026);
  });

  // Hairline above the data block.
  const dataTop = nameY + H * 0.04 + titleLines.length * H * 0.026 + H * 0.022;
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.1, dataTop);
  ctx.lineTo(W * 0.9, dataTop);
  ctx.stroke();

  // Two-column data grid.
  const rows: Array<[string, string, string, string]> = [
    ["ID NO.", identity.idNumber, "CLEARANCE", identity.clearance],
    ["ISSUED", identity.issued, "EXPIRES", identity.expires],
  ];

  rows.forEach(([labelA, valueA, labelB, valueB], index) => {
    const rowY = dataTop + H * 0.034 + index * H * 0.048;
    ctx.textAlign = "left";
    ctx.font = `500 ${Math.round(H * 0.0135)}px ${fonts.mono}`;
    ctx.fillStyle = palette.inkFaint;
    tracked(ctx, labelA, W * 0.1, rowY, 1.8);
    ctx.font = `500 ${Math.round(H * 0.0183)}px ${fonts.mono}`;
    ctx.fillStyle = palette.ink;
    ctx.fillText(valueA, W * 0.1, rowY + H * 0.024);

    ctx.textAlign = "right";
    ctx.font = `500 ${Math.round(H * 0.0135)}px ${fonts.mono}`;
    ctx.fillStyle = palette.inkFaint;
    tracked(ctx, labelB, W * 0.9, rowY, 1.8, "right");
    ctx.font = `500 ${Math.round(H * 0.0183)}px ${fonts.mono}`;
    ctx.fillStyle = palette.ink;
    ctx.fillText(valueB, W * 0.9, rowY + H * 0.024);
  });

  // Microprint security line.
  ctx.textAlign = "center";
  ctx.fillStyle = palette.inkFaint;
  ctx.font = `400 ${Math.round(H * 0.0078)}px ${fonts.mono}`;
  ctx.globalAlpha = 0.7;
  tracked(
    ctx,
    `${identity.organisation.toUpperCase()} · `.repeat(9),
    W / 2,
    H * 0.878,
    0.5,
    "center"
  );
  ctx.globalAlpha = 1;

  // Barcode.
  drawBarcode(ctx, W * 0.1, H * 0.893, W * 0.8, H * 0.038, palette.ink, 20260726);
  ctx.fillStyle = palette.inkMuted;
  ctx.font = `500 ${Math.round(H * 0.0124)}px ${fonts.mono}`;
  tracked(ctx, identity.idNumber.replace(/[^A-Z0-9]/gi, ""), W / 2, H * 0.945, 4, "center");

  // Footer accent band.
  const footerTop = H * 0.962;
  const footerFill = ctx.createLinearGradient(0, footerTop, W, H);
  footerFill.addColorStop(0, palette.accent);
  footerFill.addColorStop(1, palette.accentDeep);
  ctx.fillStyle = footerFill;
  ctx.fillRect(0, footerTop, W, H - footerTop);

  drawHologram(ctx);
  drawNoise(ctx, W, H, 0.5, 7717);
}

function drawCardBack(
  ctx: CanvasRenderingContext2D,
  palette: LanyardPalette,
  identity: BadgeIdentity,
  fonts: { sans: string; mono: string }
) {
  const W = CARD_TEXTURE_WIDTH;
  const H = CARD_TEXTURE_HEIGHT;

  const background = ctx.createLinearGradient(0, 0, W * 0.6, H);
  background.addColorStop(0, palette.cardBackgroundEdge);
  background.addColorStop(1, palette.cardBackground);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  // Magnetic stripe.
  const stripeY = H * 0.135;
  const stripeH = H * 0.082;
  const stripeFill = ctx.createLinearGradient(0, stripeY, 0, stripeY + stripeH);
  stripeFill.addColorStop(0, "rgba(255,255,255,0.1)");
  stripeFill.addColorStop(0.12, palette.magStripe);
  stripeFill.addColorStop(0.9, palette.magStripe);
  stripeFill.addColorStop(1, "rgba(255,255,255,0.06)");
  ctx.fillStyle = palette.magStripe;
  ctx.fillRect(0, stripeY, W, stripeH);
  ctx.fillStyle = stripeFill;
  ctx.fillRect(0, stripeY, W, stripeH);

  // Signature panel.
  const signY = stripeY + stripeH + H * 0.038;
  const signH = H * 0.062;
  ctx.fillStyle = palette.signatureStrip;
  ctx.fillRect(W * 0.06, signY, W * 0.88, signH);
  ctx.save();
  ctx.strokeStyle = "rgba(120,130,170,0.35)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i += 1) {
    ctx.beginPath();
    ctx.moveTo(W * 0.06, signY + i * 5);
    ctx.lineTo(W * 0.94, signY + i * 5 - 22);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(30,35,60,0.72)";
  ctx.font = `500 ${Math.round(H * 0.0109)}px ${fonts.mono}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  tracked(ctx, "AUTHORISED SIGNATURE", W * 0.075, signY + signH * 0.82, 1.6);

  // Handwritten-looking signature stroke.
  ctx.save();
  ctx.strokeStyle = "rgba(28,36,72,0.75)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(W * 0.12, signY + signH * 0.58);
  ctx.bezierCurveTo(
    W * 0.2,
    signY + signH * 0.12,
    W * 0.28,
    signY + signH * 0.86,
    W * 0.38,
    signY + signH * 0.4
  );
  ctx.bezierCurveTo(
    W * 0.47,
    signY + signH * 0.02,
    W * 0.5,
    signY + signH * 0.78,
    W * 0.62,
    signY + signH * 0.46
  );
  ctx.stroke();
  ctx.restore();

  // QR block plus terms.
  const qrSize = W * 0.3;
  const qrX = W * 0.07;
  const qrY = signY + signH + H * 0.055;
  ctx.fillStyle = palette.cardCore;
  ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
  drawQrCode(ctx, qrX, qrY, qrSize, "#11131f", 903211);

  const textX = qrX + qrSize + W * 0.06;
  ctx.textAlign = "left";
  ctx.fillStyle = palette.inkFaint;
  ctx.font = `500 ${Math.round(H * 0.0123)}px ${fonts.mono}`;
  tracked(ctx, "VERIFY", textX, qrY + H * 0.008, 1.8);

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `400 ${Math.round(H * 0.0144)}px ${fonts.sans}`;
  const verifyLines = wrapText(
    ctx,
    `Scan to confirm this credential at ${identity.organisation}.`,
    W * 0.44
  );
  verifyLines.forEach((line, index) => {
    ctx.fillText(line, textX, qrY + H * 0.036 + index * H * 0.022);
  });

  // Fine print.
  const termsY = qrY + qrSize + H * 0.06;
  ctx.fillStyle = palette.inkFaint;
  ctx.font = `500 ${Math.round(H * 0.0116)}px ${fonts.mono}`;
  tracked(ctx, "CONDITIONS OF USE", W * 0.07, termsY, 1.8);

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `400 ${Math.round(H * 0.0137)}px ${fonts.sans}`;
  const terms = wrapText(
    ctx,
    "This card remains the property of the issuer and is non-transferable. It must be worn visibly at all times on site and surrendered on request.",
    W * 0.86
  );
  terms.forEach((line, index) => {
    ctx.fillText(line, W * 0.07, termsY + H * 0.03 + index * H * 0.021);
  });

  const foundY = termsY + H * 0.03 + terms.length * H * 0.021 + H * 0.022;
  ctx.fillStyle = palette.inkFaint;
  ctx.font = `400 ${Math.round(H * 0.0127)}px ${fonts.sans}`;
  ctx.fillText(`If found, return to ${identity.email}`, W * 0.07, foundY);

  drawBarcode(ctx, W * 0.07, H * 0.905, W * 0.86, H * 0.03, palette.inkMuted, 55123);

  ctx.fillStyle = palette.inkFaint;
  ctx.font = `500 ${Math.round(H * 0.0109)}px ${fonts.mono}`;
  ctx.textAlign = "center";
  tracked(
    ctx,
    `${identity.idNumber} · REV C`,
    W / 2,
    H * 0.958,
    2.2,
    "center"
  );

  drawNoise(ctx, W, H, 0.5, 3391);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Soft blotches of varying gloss. Fed to clearcoatRoughnessMap so the laminate
 * catches light unevenly the way a handled badge does.
 */
function drawGlossMap(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#141414";
  ctx.fillRect(0, 0, width, height);

  const random = createRandom(48271);
  try {
    ctx.filter = `blur(${Math.round(width * 0.03)}px)`;
  } catch {
    /* No filter support — the smudges stay hard-edged but still subtle. */
  }

  for (let i = 0; i < 26; i += 1) {
    const x = random() * width;
    const y = random() * height;
    const r = width * (0.05 + random() * 0.16);
    const value = Math.round(40 + random() * 90);
    ctx.fillStyle = `rgb(${value},${value},${value})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + random() * 0.8), random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wear concentrated along the lower edge where the card is grabbed.
  ctx.fillStyle = "rgba(150,150,150,0.55)";
  ctx.fillRect(0, height * 0.86, width, height * 0.14);
  ctx.filter = "none";
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export type FontStacks = { sans: string; mono: string };

/**
 * Varying thin-film thickness for the security patch. Without this the film is
 * a single thickness everywhere, which reads as one flat colour rather than
 * the angular rainbow real OVD foil produces.
 */
export function createHologramThicknessTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  if (!ctx) return texture;

  const image = ctx.createImageData(size, size);
  const { data } = image;
  const centre = size / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - centre) / centre;
      const dy = (y - centre) / centre;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      // Interference rings crossed with a radial sweep, as embossed foil has.
      const rings = Math.sin(radius * 13 - angle * 2.5);
      const sweep = Math.sin(angle * 4 + radius * 3);
      const value = Math.round(((rings * 0.65 + sweep * 0.35) * 0.5 + 0.5) * 255);

      const index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  texture.needsUpdate = true;
  return texture;
}

export function createBadgeTextures(
  palette: LanyardPalette,
  identity: BadgeIdentity,
  fonts: FontStacks
): BadgeTextureSet {
  const frontCanvas = createCanvas(CARD_TEXTURE_WIDTH, CARD_TEXTURE_HEIGHT);
  const backCanvas = createCanvas(CARD_TEXTURE_WIDTH, CARD_TEXTURE_HEIGHT);
  const glossCanvas = createCanvas(512, 812);

  const frontCtx = frontCanvas.getContext("2d");
  const backCtx = backCanvas.getContext("2d");
  const glossCtx = glossCanvas.getContext("2d");

  if (frontCtx) drawCardFront(frontCtx, palette, identity, fonts);
  if (backCtx) drawCardBack(backCtx, palette, identity, fonts);
  if (glossCtx) drawGlossMap(glossCtx, glossCanvas.width, glossCanvas.height);

  const front = toTexture(frontCanvas, true);
  const back = toTexture(backCanvas, true);
  const gloss = toTexture(glossCanvas, false);

  return {
    front,
    back,
    gloss,
    dispose: () => {
      front.dispose();
      back.dispose();
      gloss.dispose();
    },
  };
}
