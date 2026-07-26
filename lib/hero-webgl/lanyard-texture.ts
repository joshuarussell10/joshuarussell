import * as THREE from "three";

export function createLanyardStrapTexture(
  baseColor: string,
  accentColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 6) {
    ctx.fillStyle = y % 12 === 0 ? accentColor : baseColor;
    ctx.fillRect(0, y, canvas.width, 3);
  }

  for (let x = 0; x < canvas.width; x += 8) {
    ctx.fillStyle = x % 16 === 0 ? accentColor : "rgba(255,255,255,0.06)";
    ctx.fillRect(x, 0, 2, canvas.height);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(2, canvas.height);
  ctx.moveTo(canvas.width - 2, 0);
  ctx.lineTo(canvas.width - 2, canvas.height);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
