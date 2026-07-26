import * as THREE from "three";
import { lanyardConfig } from "@/lib/hero-webgl/lanyard-config";

/** Lower fraction of each strand (toward the clasp) with branding removed. */
const PLAIN_STRAP_FRACTION = 0.42;
/** Soft blend rings between printed and plain weave. */
const PRINT_BLEND_RINGS = 3;

function roundedRectShape(width: number, height: number, radius: number) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const shape = new THREE.Shape();

  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w, h - r);
  shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w + r, h);
  shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w, -h + r);
  shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  shape.closePath();

  return shape;
}

/** Fully radiused slot, the standard punch used for lanyard clips. */
function slotPath(cx: number, cy: number, width: number, height: number) {
  const r = height / 2;
  const half = width / 2;
  const path = new THREE.Path();

  path.moveTo(cx - half + r, cy - r);
  path.lineTo(cx + half - r, cy - r);
  path.absarc(cx + half - r, cy, r, -Math.PI / 2, Math.PI / 2, false);
  path.lineTo(cx - half + r, cy + r);
  path.absarc(cx - half + r, cy, r, Math.PI / 2, Math.PI * 1.5, false);
  path.closePath();

  return path;
}

function cardOutline(inset: number) {
  const { card } = lanyardConfig;
  const shape = roundedRectShape(
    card.width - inset * 2,
    card.height - inset * 2,
    card.corner - inset
  );
  shape.holes.push(
    slotPath(
      0,
      card.height / 2 - card.slot.inset,
      card.slot.width + inset * 2,
      card.slot.height + inset * 2
    )
  );
  return shape;
}

/** The PVC core: extruded outline with a small bevel on both faces. */
export function createCardBodyGeometry() {
  const { card } = lanyardConfig;
  const depth = card.thickness - card.bevel * 2;

  const geometry = new THREE.ExtrudeGeometry(cardOutline(0), {
    depth,
    bevelEnabled: true,
    bevelThickness: card.bevel,
    bevelSize: card.bevel,
    bevelOffset: 0,
    bevelSegments: 3,
    curveSegments: 18,
    steps: 1,
  });

  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Flat print surface sitting just proud of the core. UVs are mapped against
 * the card's full outer bounds so artwork stays registered despite the inset.
 */
export function createCardFaceGeometry() {
  const { card } = lanyardConfig;
  const geometry = new THREE.ShapeGeometry(cardOutline(card.bevel), 18);

  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    uv[i * 2] = position.getX(i) / card.width + 0.5;
    uv[i * 2 + 1] = position.getY(i) / card.height + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

  return geometry;
}

const VERTS_PER_RING = 8;

/** Allocates the flat-band mesh; positions are filled in every frame. */
export function createBandGeometry(segments: number) {
  const rings = segments + 1;
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(rings * VERTS_PER_RING * 3), 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(rings * VERTS_PER_RING * 3), 3)
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(rings * VERTS_PER_RING * 2), 2)
  );
  // 1 = show branding, 0 = plain weave (lower strap near the clasp).
  geometry.setAttribute(
    "printMix",
    new THREE.BufferAttribute(new Float32Array(rings * VERTS_PER_RING), 1)
  );

  const indices: number[] = [];
  for (let i = 0; i < segments; i += 1) {
    const a = i * VERTS_PER_RING;
    const b = (i + 1) * VERTS_PER_RING;
    for (let face = 0; face < 4; face += 1) {
      const pA = a + face * 2;
      const qA = pA + 1;
      const pB = b + face * 2;
      const qB = pB + 1;
      indices.push(pA, pB, qA, qA, pB, qB);
    }
  }
  geometry.setIndex(indices);

  return geometry;
}

const tangent = new THREE.Vector3();
const previousTangent = new THREE.Vector3();
const faceNormal = new THREE.Vector3();
const binormal = new THREE.Vector3();
const rotationAxis = new THREE.Vector3();
const transport = new THREE.Quaternion();
const corner = new THREE.Vector3();
const seedNormal = new THREE.Vector3();
const viewAxis = new THREE.Vector3(0, 0, 1);

function ringPoint(
  points: THREE.Vector3[],
  index: number,
  endOverride?: THREE.Vector3
) {
  if (endOverride && index === points.length - 1) return endOverride;
  return points[index];
}

/** Cross-section shrinks into the crimp mouth over the last few rings. */
function endTaper(index: number, rings: number, taperRings: number) {
  if (taperRings <= 0) return 1;
  const fromEnd = rings - 1 - index;
  if (fromEnd >= taperRings) return 1;
  const t = fromEnd / taperRings;
  // Keep a little thickness so the strap still reads as entering the barrel.
  return 0.12 + 0.88 * t * t;
}

/** Branding weight by ring: plain near the clasp, printed on the upper run. */
function printMixForRing(index: number, rings: number) {
  const fromEnd = rings - 1 - index;
  const plainRings = Math.max(
    PRINT_BLEND_RINGS + 1,
    Math.ceil((rings - 1) * PLAIN_STRAP_FRACTION)
  );
  if (fromEnd <= plainRings - PRINT_BLEND_RINGS) return 0;
  if (fromEnd >= plainRings) return 1;
  return (fromEnd - (plainRings - PRINT_BLEND_RINGS)) / PRINT_BLEND_RINGS;
}

/**
 * Sweeps a rectangular cross-section along the point list using parallel
 * transport frames, so the band never spins about its own axis between frames.
 *
 * `endOverride` replaces the final ring (the crimp junction) so the woven
 * band can terminate inside the metal clasp instead of sharing its centre.
 */
export function updateBandGeometry(
  geometry: THREE.BufferGeometry,
  points: THREE.Vector3[],
  width: number,
  thickness: number,
  repeatLength: number,
  vOffset = 0,
  endOverride?: THREE.Vector3,
  taperRings = 5
) {
  const rings = points.length;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const printMix = geometry.attributes.printMix as THREE.BufferAttribute;
  const halfWidth = width / 2;
  const halfThickness = thickness / 2;
  const edgeU = Math.min(0.5, thickness / width);

  let arcLength = vOffset;

  for (let i = 0; i < rings; i += 1) {
    const point = ringPoint(points, i, endOverride);
    const prev = i > 0 ? ringPoint(points, i - 1, endOverride) : point;
    const next =
      i < rings - 1 ? ringPoint(points, i + 1, endOverride) : point;

    if (i === 0) {
      tangent.copy(next).sub(point).normalize();
      // Seed the frame facing the viewer, then transport it down the strand.
      seedNormal
        .copy(viewAxis)
        .addScaledVector(tangent, -viewAxis.dot(tangent));
      if (seedNormal.lengthSq() < 1e-6) seedNormal.set(1, 0, 0);
      faceNormal.copy(seedNormal).normalize();
    } else {
      if (i === rings - 1) {
        tangent.copy(point).sub(prev).normalize();
      } else {
        tangent.copy(next).sub(prev).normalize();
      }

      rotationAxis.crossVectors(previousTangent, tangent);
      const sin = rotationAxis.length();
      if (sin > 1e-6) {
        rotationAxis.divideScalar(sin);
        const angle = Math.atan2(sin, previousTangent.dot(tangent));
        transport.setFromAxisAngle(rotationAxis, angle);
        faceNormal.applyQuaternion(transport);
      }
      faceNormal.addScaledVector(tangent, -faceNormal.dot(tangent)).normalize();
      arcLength += point.distanceTo(prev);
    }

    previousTangent.copy(tangent);
    binormal.crossVectors(faceNormal, tangent).normalize();

    // Negated because flipY puts v=0 at the bottom of the source canvas,
    // which would otherwise run the printed branding up the strap mirrored.
    const v = -arcLength / repeatLength;
    const mix = printMixForRing(i, rings);
    const base = i * VERTS_PER_RING;
    const taper = endTaper(i, rings, taperRings);
    const ringHalfWidth = halfWidth * taper;
    const ringHalfThickness = halfThickness * taper;

    // Cross-section corners, walked so each face gets its own vertex pair.
    const c0 = [ringHalfWidth, ringHalfThickness] as const;
    const c1 = [-ringHalfWidth, ringHalfThickness] as const;
    const c2 = [-ringHalfWidth, -ringHalfThickness] as const;
    const c3 = [ringHalfWidth, -ringHalfThickness] as const;

    const layout: Array<readonly [readonly [number, number], number]> = [
      [c1, 0],
      [c0, 1],
      [c0, 1],
      [c3, 1 - edgeU],
      [c3, 1],
      [c2, 0],
      [c2, edgeU],
      [c1, 0],
    ];

    for (let slot = 0; slot < VERTS_PER_RING; slot += 1) {
      const [[alongWidth, alongThickness], u] = layout[slot];
      corner
        .copy(point)
        .addScaledVector(binormal, alongWidth)
        .addScaledVector(faceNormal, alongThickness);
      position.setXYZ(base + slot, corner.x, corner.y, corner.z);
      uv.setXY(base + slot, u, v);
      printMix.setX(base + slot, mix);
    }
  }

  position.needsUpdate = true;
  uv.needsUpdate = true;
  printMix.needsUpdate = true;
  geometry.computeVertexNormals();
}
