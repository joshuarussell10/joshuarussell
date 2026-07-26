import * as THREE from "three";
import type { FontStacks } from "@/lib/hero-webgl/badge-textures";

export type WebbingTextureSet = {
  /** Weave with branding printed along the strap. */
  map: THREE.CanvasTexture;
  /** Same weave with no branding — used near the clasp. */
  plainMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
};

const WIDTH = 256;
const HEIGHT = 1024;
/** Woven cell size in pixels — sets the visible tightness of the weave. */
const CELL = 8;

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

/** Sobel-filters a greyscale height field into a tangent-space normal map. */
function heightToNormal(
  height: HTMLCanvasElement,
  strength: number
): HTMLCanvasElement {
  const width = height.width;
  const rows = height.height;
  const sourceCtx = height.getContext("2d");
  const target = createCanvas(width, rows);
  const targetCtx = target.getContext("2d");
  if (!sourceCtx || !targetCtx) return target;

  const source = sourceCtx.getImageData(0, 0, width, rows).data;
  const output = targetCtx.createImageData(width, rows);
  const data = output.data;

  // Wrapping sample keeps the tiling seamless in both directions.
  const sample = (x: number, y: number) => {
    const sx = ((x % width) + width) % width;
    const sy = ((y % rows) + rows) % rows;
    return source[(sy * width + sx) * 4] / 255;
  };

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = tl + 2 * l + bl - (tr + 2 * r + br);
      const dy = tl + 2 * t + tr - (bl + 2 * b + br);

      let nx = dx * strength;
      let ny = dy * strength;
      let nz = 1;
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length;
      ny /= length;
      nz /= length;

      const index = (y * width + x) * 4;
      data[index] = (nx * 0.5 + 0.5) * 255;
      data[index + 1] = (ny * 0.5 + 0.5) * 255;
      data[index + 2] = (nz * 0.5 + 0.5) * 255;
      data[index + 3] = 255;
    }
  }

  targetCtx.putImageData(output, 0, 0);
  return target;
}

/**
 * Plain-weave grid: warp threads run along the strap, weft across it, and each
 * crossing alternates which thread sits on top.
 */
function drawWeave(
  ctx: CanvasRenderingContext2D,
  overThread: (over: boolean, shade: number) => string,
  seed: number
) {
  const random = createRandom(seed);
  const cols = Math.ceil(WIDTH / CELL);
  const rows = Math.ceil(HEIGHT / CELL);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const warpOnTop = (row + col) % 2 === 0;
      // Slight per-thread variation stops the weave looking machine-perfect.
      const shade = 0.86 + random() * 0.28;
      ctx.fillStyle = overThread(warpOnTop, shade);
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);

      // Rounded highlight along the raised thread.
      const gradient = warpOnTop
        ? ctx.createLinearGradient(col * CELL, 0, col * CELL + CELL, 0)
        : ctx.createLinearGradient(0, row * CELL, 0, row * CELL + CELL);
      gradient.addColorStop(0, "rgba(0,0,0,0.28)");
      gradient.addColorStop(0.5, "rgba(255,255,255,0.16)");
      gradient.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = gradient;
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }
}

/**
 * Woven tape is never perfectly flat — it bows slightly across its width.
 * Baking that falloff in gives the strap volume the flat geometry can't.
 */
function drawCurvature(ctx: CanvasRenderingContext2D) {
  const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
  shade.addColorStop(0, "rgba(0,0,0,0.34)");
  shade.addColorStop(0.18, "rgba(0,0,0,0.1)");
  shade.addColorStop(0.42, "rgba(255,255,255,0.09)");
  shade.addColorStop(0.62, "rgba(0,0,0,0)");
  shade.addColorStop(0.86, "rgba(0,0,0,0.12)");
  shade.addColorStop(1, "rgba(0,0,0,0.36)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawEdges(ctx: CanvasRenderingContext2D, edgeColor: string) {
  const edge = CELL * 1.5;

  const left = ctx.createLinearGradient(0, 0, edge, 0);
  left.addColorStop(0, edgeColor);
  left.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, edge, HEIGHT);

  const right = ctx.createLinearGradient(WIDTH - edge, 0, WIDTH, 0);
  right.addColorStop(0, "rgba(0,0,0,0)");
  right.addColorStop(1, edgeColor);
  ctx.fillStyle = right;
  ctx.fillRect(WIDTH - edge, 0, edge, HEIGHT);

  // Overlocked stitching just inside each selvedge.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 7]);
  for (const x of [edge * 0.75, WIDTH - edge * 0.75]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPrint(
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  alpha: number,
  mono: string
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.round(WIDTH * 0.14)}px ${mono}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Rotate so the branding runs lengthwise down the strap.
  ctx.translate(WIDTH / 2, 0);
  ctx.rotate(Math.PI / 2);

  const label = `${text}   ·   `;
  const spacing = 3;
  const chars = [...label];
  const runWidth =
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
    spacing * chars.length;

  let cursor = 0;
  while (cursor < HEIGHT) {
    let x = cursor;
    for (const char of chars) {
      ctx.fillText(char, x, 0);
      x += ctx.measureText(char).width + spacing;
    }
    cursor += runWidth;
  }
  ctx.restore();
}

function toTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  repeatY: number
) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, repeatY);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export type HardwareTextureSet = {
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  dispose: () => void;
};

const HARDWARE_SIZE = 256;

/**
 * Fine directional grain for the clasp. Nickel-plated hardware is polished
 * but never optically flat, and a perfectly uniform roughness is what makes
 * small metal parts read as chrome-plated CG rather than pressed metal.
 */
export function createHardwareTextures(): HardwareTextureSet {
  const random = createRandom(90210);
  const height = createCanvas(HARDWARE_SIZE, HARDWARE_SIZE);
  const ctx = height.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, HARDWARE_SIZE, HARDWARE_SIZE);

    ctx.lineWidth = 1;
    for (let i = 0; i < 900; i += 1) {
      const y = random() * HARDWARE_SIZE;
      const x = random() * HARDWARE_SIZE;
      const run = 12 + random() * 90;
      const shade = Math.round(118 + random() * 78);
      ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.5)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Wrapped so the grain still tiles once the strokes run off the edge.
      ctx.lineTo(x + run, y + (random() - 0.5) * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - HARDWARE_SIZE, y);
      ctx.lineTo(x - HARDWARE_SIZE + run, y);
      ctx.stroke();
    }

    // Sparse pitting from casting and handling.
    for (let i = 0; i < 260; i += 1) {
      const radius = 0.4 + random() * 1.4;
      ctx.fillStyle = `rgba(70,70,70,${0.1 + random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(
        random() * HARDWARE_SIZE,
        random() * HARDWARE_SIZE,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  const roughnessCanvas = createCanvas(HARDWARE_SIZE, HARDWARE_SIZE);
  const roughnessCtx = roughnessCanvas.getContext("2d");
  if (roughnessCtx) {
    // Compress the grain into a narrow band around a low base roughness.
    roughnessCtx.fillStyle = "#3a3a3a";
    roughnessCtx.fillRect(0, 0, HARDWARE_SIZE, HARDWARE_SIZE);
    roughnessCtx.globalAlpha = 0.35;
    roughnessCtx.drawImage(height, 0, 0);
  }

  const normalCanvas = heightToNormal(height, 0.35);

  const roughnessMap = toTexture(roughnessCanvas, THREE.NoColorSpace, 1);
  const normalMap = toTexture(normalCanvas, THREE.NoColorSpace, 1);
  roughnessMap.repeat.set(2, 2);
  normalMap.repeat.set(2, 2);

  return {
    roughnessMap,
    normalMap,
    dispose: () => {
      roughnessMap.dispose();
      normalMap.dispose();
    },
  };
}

export function createWebbingTextures(
  baseColor: string,
  printColor: string,
  edgeColor: string,
  brand: string,
  fonts: FontStacks
): WebbingTextureSet {
  const base = new THREE.Color(baseColor);

  const paintWeave = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawWeave(
      ctx,
      (warpOnTop, shade) => {
        const tint = base.clone().multiplyScalar(warpOnTop ? shade : shade * 0.9);
        return `rgb(${Math.round(tint.r * 255)},${Math.round(
          tint.g * 255
        )},${Math.round(tint.b * 255)})`;
      },
      1337
    );
  };

  const plainCanvas = createCanvas(WIDTH, HEIGHT);
  const plainCtx = plainCanvas.getContext("2d");
  if (plainCtx) {
    paintWeave(plainCtx);
    drawCurvature(plainCtx);
    drawEdges(plainCtx, edgeColor);
  }

  const colorCanvas = createCanvas(WIDTH, HEIGHT);
  const colorCtx = colorCanvas.getContext("2d");
  if (colorCtx) {
    paintWeave(colorCtx);
    drawPrint(colorCtx, brand, printColor, 0.82, fonts.mono);
    drawCurvature(colorCtx);
    drawEdges(colorCtx, edgeColor);
  }

  const heightCanvas = createCanvas(WIDTH, HEIGHT);
  const heightCtx = heightCanvas.getContext("2d");
  if (heightCtx) {
    heightCtx.fillStyle = "#808080";
    heightCtx.fillRect(0, 0, WIDTH, HEIGHT);
    drawWeave(
      heightCtx,
      (warpOnTop, shade) => {
        const value = Math.round((warpOnTop ? 190 : 96) * shade);
        return `rgb(${value},${value},${value})`;
      },
      1337
    );
    // Selvedges sit slightly proud of the field.
    heightCtx.fillStyle = "rgba(255,255,255,0.35)";
    heightCtx.fillRect(0, 0, CELL, HEIGHT);
    heightCtx.fillRect(WIDTH - CELL, 0, CELL, HEIGHT);
  }
  const normalCanvas = heightToNormal(heightCanvas, 1.7);

  const roughnessCanvas = createCanvas(WIDTH, HEIGHT);
  const roughnessCtx = roughnessCanvas.getContext("2d");
  if (roughnessCtx) {
    roughnessCtx.drawImage(heightCanvas, 0, 0);
    // Invert: raised threads catch light, recesses stay matte.
    roughnessCtx.globalCompositeOperation = "difference";
    roughnessCtx.fillStyle = "#ffffff";
    roughnessCtx.fillRect(0, 0, WIDTH, HEIGHT);
    roughnessCtx.globalCompositeOperation = "source-over";
    roughnessCtx.fillStyle = "rgba(190,190,190,0.55)";
    roughnessCtx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const map = toTexture(colorCanvas, THREE.SRGBColorSpace, 1);
  const plainMap = toTexture(plainCanvas, THREE.SRGBColorSpace, 1);
  const normalMap = toTexture(normalCanvas, THREE.NoColorSpace, 1);
  const roughnessMap = toTexture(roughnessCanvas, THREE.NoColorSpace, 1);

  return {
    map,
    plainMap,
    normalMap,
    roughnessMap,
    dispose: () => {
      map.dispose();
      plainMap.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}
