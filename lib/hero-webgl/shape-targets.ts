import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import typeface from "three/examples/fonts/helvetiker_regular.typeface.json";
import { morphConfig } from "./config";

export type ShapeTargets = [Float32Array, Float32Array, Float32Array];

function easeInOut(t: number, power: number): number {
  return t < 0.5
    ? 0.5 * Math.pow(2 * t, power)
    : 1 - 0.5 * Math.pow(2 * (1 - t), power);
}

export function morphEase(t: number): number {
  return easeInOut(Math.min(Math.max(t, 0), 1), morphConfig.morph.easePower);
}

function sampleFibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;

    positions[i * 3] = Math.cos(theta) * ring * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * ring * radius;
  }

  return positions;
}

function sampleTorus(count: number, major: number, minor: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;

    positions[i * 3] = (major + minor * Math.cos(v)) * Math.cos(u);
    positions[i * 3 + 1] = minor * Math.sin(v);
    positions[i * 3 + 2] = (major + minor * Math.cos(v)) * Math.sin(u);
  }

  return positions;
}

function sampleTriangle(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  target: THREE.Vector3
): THREE.Vector3 {
  let r1 = Math.random();
  let r2 = Math.random();

  if (r1 + r2 > 1) {
    r1 = 1 - r1;
    r2 = 1 - r2;
  }

  const r0 = 1 - r1 - r2;
  return target
    .copy(a)
    .multiplyScalar(r0)
    .addScaledVector(b, r1)
    .addScaledVector(c, r2);
}

function sampleGeometrySurface(
  geometry: THREE.BufferGeometry,
  count: number
): Float32Array {
  const positions = new Float32Array(count * 3);
  const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const index = geometry.index;

  const triangles: [number, number, number][] = [];

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      triangles.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)]);
    }
  } else {
    for (let i = 0; i < positionAttr.count; i += 3) {
      triangles.push([i, i + 1, i + 2]);
    }
  }

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const point = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const [ia, ib, ic] = triangles[Math.floor(Math.random() * triangles.length)];
    a.fromBufferAttribute(positionAttr, ia);
    b.fromBufferAttribute(positionAttr, ib);
    c.fromBufferAttribute(positionAttr, ic);
    sampleTriangle(a, b, c, point);

    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  }

  return positions;
}

function sampleText(text: string, count: number, size: number): Float32Array {
  const loader = new FontLoader();
  const font = loader.parse(typeface);
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth: 0.05,
    curveSegments: 6,
    bevelEnabled: false,
  });

  geometry.center();
  geometry.computeBoundingBox();

  const sampled = sampleGeometrySurface(geometry, count);
  geometry.dispose();

  return sampled;
}

export function createShapeTargets(count = morphConfig.particleCount): ShapeTargets {
  const { sphereRadius, torusMajor, torusMinor, textSize } = morphConfig.shapes;

  return [
    sampleFibonacciSphere(count, sphereRadius),
    sampleTorus(count, torusMajor, torusMinor),
    sampleText(morphConfig.text, count, textSize),
  ];
}

export function interpolateShapePositions(
  from: Float32Array,
  to: Float32Array,
  progress: number,
  output: Float32Array
): void {
  const eased = morphEase(progress);

  for (let i = 0; i < output.length; i++) {
    output[i] = from[i] + (to[i] - from[i]) * eased;
  }
}
