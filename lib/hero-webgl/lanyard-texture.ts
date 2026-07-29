import * as THREE from "three";
import type { FontStacks } from "@/lib/hero-webgl/badge-textures";

export type WebbingTextureSet = {
  /** Braid with branding printed along the cord. */
  map: THREE.CanvasTexture;
  /** Same braid with no branding — used near the clasp. */
  plainMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
};

const WIDTH = 256;
const HEIGHT = 1024;
/** Braid diamond size in pixels. */
const BRAID = 14;

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
 * Diamond braid typical of round polyester badge cord: two counter-spiraling
 * yarn sets, alternating over/under so the pattern tiles around the tube.
 */
function drawBraid(
  ctx: CanvasRenderingContext2D,
  overThread: (over: boolean, shade: number) => string,
  seed: number
) {
  const random = createRandom(seed);
  const cols = Math.ceil(WIDTH / BRAID) + 2;
  const rows = Math.ceil(HEIGHT / BRAID) + 2;

  ctx.fillStyle = overThread(false, 0.92);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let row = -1; row < rows; row += 1) {
    for (let col = -1; col < cols; col += 1) {
      const shade = 0.84 + random() * 0.3;
      const over = (row + col) % 2 === 0;
      const x = col * BRAID;
      const y = row * BRAID;

      ctx.fillStyle = overThread(over, shade);
      ctx.beginPath();
      if (over) {
        // Strand running bottom-left → top-right.
        ctx.moveTo(x, y + BRAID * 0.5);
        ctx.lineTo(x + BRAID * 0.5, y);
        ctx.lineTo(x + BRAID, y + BRAID * 0.5);
        ctx.lineTo(x + BRAID * 0.5, y + BRAID);
      } else {
        // Counter-strand, bottom-right → top-left.
        ctx.moveTo(x + BRAID * 0.5, y);
        ctx.lineTo(x + BRAID, y + BRAID * 0.5);
        ctx.lineTo(x + BRAID * 0.5, y + BRAID);
        ctx.lineTo(x, y + BRAID * 0.5);
      }
      ctx.closePath();
      ctx.fill();

      // Soft highlight along the raised yarn.
      const gradient = over
        ? ctx.createLinearGradient(x, y + BRAID, x + BRAID, y)
        : ctx.createLinearGradient(x + BRAID, y + BRAID, x, y);
      gradient.addColorStop(0, "rgba(0,0,0,0.22)");
      gradient.addColorStop(0.45, "rgba(255,255,255,0.14)");
      gradient.addColorStop(1, "rgba(0,0,0,0.2)");
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
}

/** Round cord catches a cylindrical shade across its unwrapped width. */
function drawCordShade(ctx: CanvasRenderingContext2D) {
  const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
  shade.addColorStop(0, "rgba(0,0,0,0.38)");
  shade.addColorStop(0.22, "rgba(0,0,0,0.08)");
  shade.addColorStop(0.48, "rgba(255,255,255,0.1)");
  shade.addColorStop(0.72, "rgba(0,0,0,0.06)");
  shade.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
  ctx.font = `600 ${Math.round(WIDTH * 0.11)}px ${mono}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Branding runs lengthwise down one face of the cord.
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
  _edgeColor: string,
  brand: string,
  fonts: FontStacks
): WebbingTextureSet {
  // Parse as sRGB bytes for canvas painting. THREE.Color stores linear, so
  // multiplying its channels and writing them as rgb() would double-encode
  // and push blues toward a dark purple under ACES.
  const baseHex = Number.parseInt(baseColor.replace("#", ""), 16);
  const baseR = (baseHex >> 16) & 255;
  const baseG = (baseHex >> 8) & 255;
  const baseB = baseHex & 255;

  const paintBraid = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBraid(
      ctx,
      (over, shade) => {
        const factor = over ? shade : shade * 0.88;
        return `rgb(${Math.round(Math.min(255, baseR * factor))},${Math.round(
          Math.min(255, baseG * factor)
        )},${Math.round(Math.min(255, baseB * factor))})`;
      },
      1337
    );
  };

  const plainCanvas = createCanvas(WIDTH, HEIGHT);
  const plainCtx = plainCanvas.getContext("2d");
  if (plainCtx) {
    paintBraid(plainCtx);
    drawCordShade(plainCtx);
  }

  const colorCanvas = createCanvas(WIDTH, HEIGHT);
  const colorCtx = colorCanvas.getContext("2d");
  if (colorCtx) {
    paintBraid(colorCtx);
    drawPrint(colorCtx, brand, printColor, 0.78, fonts.mono);
    drawCordShade(colorCtx);
  }

  const heightCanvas = createCanvas(WIDTH, HEIGHT);
  const heightCtx = heightCanvas.getContext("2d");
  if (heightCtx) {
    heightCtx.fillStyle = "#808080";
    heightCtx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBraid(
      heightCtx,
      (over, shade) => {
        const value = Math.round((over ? 198 : 108) * shade);
        return `rgb(${value},${value},${value})`;
      },
      1337
    );
  }
  const normalCanvas = heightToNormal(heightCanvas, 1.35);

  const roughnessCanvas = createCanvas(WIDTH, HEIGHT);
  const roughnessCtx = roughnessCanvas.getContext("2d");
  if (roughnessCtx) {
    roughnessCtx.drawImage(heightCanvas, 0, 0);
    // Invert: raised yarns catch light, recesses stay matte.
    roughnessCtx.globalCompositeOperation = "difference";
    roughnessCtx.fillStyle = "#ffffff";
    roughnessCtx.fillRect(0, 0, WIDTH, HEIGHT);
    roughnessCtx.globalCompositeOperation = "source-over";
    roughnessCtx.fillStyle = "rgba(175,175,175,0.5)";
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
