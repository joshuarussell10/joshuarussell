import * as THREE from "three";
import { lanyardConfig } from "@/lib/hero-webgl/lanyard-config";

const { card, webbing } = lanyardConfig;

/**
 * Lower fraction of each strand (toward the clasp) with branding removed.
 * Sized so the print still reaches the part of the cord that is on screen.
 */
const PLAIN_STRAP_FRACTION = 0.3;
/** Soft blend rings between printed and plain braid. */
const PRINT_BLEND_RINGS = 3;

const CARD_HALF_WIDTH = card.width / 2;

/**
 * Shallow curl across the card's width, centred on z = 0 so the badge still
 * hangs on the flat plane the solver assumes.
 */
export function cardBowAt(x: number) {
  const s = x / CARD_HALF_WIDTH;
  return card.bow * (1 / 3 - s * s);
}

/** d(bow)/dx, for sitting applied decals flush against the curved face. */
export function cardBowSlopeAt(x: number) {
  return (-2 * card.bow * x) / (CARD_HALF_WIDTH * CARD_HALF_WIDTH);
}

function applyCardBow(geometry: THREE.BufferGeometry, sign: number) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    position.setZ(i, position.getZ(i) + sign * cardBowAt(position.getX(i)));
  }
  position.needsUpdate = true;
}

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
  applyCardBow(geometry, 1);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Flat print surface sitting just proud of the core. UVs are mapped against
 * the card's full outer bounds so artwork stays registered despite the inset.
 *
 * `bowSign` is negated for the reverse face, which is mounted with a half turn
 * about Y — without it the two faces would curl away from each other.
 */
export function createCardFaceGeometry(bowSign: 1 | -1 = 1) {
  const geometry = new THREE.ShapeGeometry(cardOutline(card.bevel), 18);

  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  const normal = new Float32Array(position.count * 3);

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    uv[i * 2] = x / card.width + 0.5;
    uv[i * 2 + 1] = position.getY(i) / card.height + 0.5;

    // Analytic normal of z = bow(x): flat in y, tilted by the curl in x.
    const slope = bowSign * cardBowSlopeAt(x);
    const length = Math.hypot(slope, 1);
    normal[i * 3] = -slope / length;
    normal[i * 3 + 1] = 0;
    normal[i * 3 + 2] = 1 / length;
  }

  applyCardBow(geometry, bowSign);
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));

  return geometry;
}

/**
 * Circular cross-section of a round braided cord. `su`/`sv` are unit-circle
 * offsets in the binormal/face frame; normals point radially outward so the
 * braid texture wraps cleanly around the strand.
 *
 * The first point is duplicated at the end with `u = 1` so the wrap seam
 * doesn't interpolate across the whole texture atlas.
 */
type CordProfilePoint = {
  su: number;
  sv: number;
  nu: number;
  nv: number;
  u: number;
};

function buildCordProfile(): CordProfilePoint[] {
  const count = webbing.profileSegments;
  const points: CordProfilePoint[] = [];

  for (let i = 0; i <= count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    const su = Math.cos(theta);
    const sv = Math.sin(theta);
    points.push({
      su,
      sv,
      nu: su,
      nv: sv,
      u: i / count,
    });
  }

  return points;
}

const CORD_PROFILE = buildCordProfile();
const VERTS_PER_RING = CORD_PROFILE.length;
/** Unique samples around the circle (the last ring vertex repeats the first). */
const CORD_SIDES = webbing.profileSegments;

/**
 * How many trailing rope samples to ignore (the crimp particle and its
 * neighbour sit inside the barrel). The visual run finishes at `endOverride`
 * instead, held at the mouth lip.
 */
const ENTRY_SKIP = 2;
/** Rings over which the path eases onto the mouth tip (radius stays full). */
const ENTRY_BLEND_RINGS = 5;

/** Allocates the cord mesh; positions are filled in every frame. */
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
  // 1 = show branding, 0 = plain braid (lower run near the clasp).
  geometry.setAttribute(
    "printMix",
    new THREE.BufferAttribute(new Float32Array(rings * VERTS_PER_RING), 1)
  );

  const indices: number[] = [];
  for (let i = 0; i < segments; i += 1) {
    for (let k = 0; k < CORD_SIDES; k += 1) {
      const a = i * VERTS_PER_RING + k;
      const b = i * VERTS_PER_RING + k + 1;
      const c = (i + 1) * VERTS_PER_RING + k;
      const d = (i + 1) * VERTS_PER_RING + k + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  geometry.setIndex(indices);

  return geometry;
}

const tangent = new THREE.Vector3();
const previousTangent = new THREE.Vector3();
const faceNormal = new THREE.Vector3();
const binormal = new THREE.Vector3();
const twistedFace = new THREE.Vector3();
const twistedBinormal = new THREE.Vector3();
const rotationAxis = new THREE.Vector3();
const transport = new THREE.Quaternion();
const roll = new THREE.Quaternion();
const corner = new THREE.Vector3();
const seedNormal = new THREE.Vector3();
const ringPos = new THREE.Vector3();
const ringPrev = new THREE.Vector3();
const ringNext = new THREE.Vector3();
const viewAxis = new THREE.Vector3(0, 0, 1);

function writeRingPoint(
  out: THREE.Vector3,
  points: THREE.Vector3[],
  index: number,
  endOverride?: THREE.Vector3
) {
  if (!endOverride) return out.copy(points[index]);

  const last = points.length - 1;
  // Anchor the blend on the last sample that still sits outside the barrel,
  // then run from there down to the mouth tip — skipping the crimp particle
  // that lives inside the metal.
  const outside = points[Math.max(0, last - ENTRY_SKIP)];
  const fromEnd = last - index;

  if (fromEnd > ENTRY_BLEND_RINGS) return out.copy(points[index]);
  if (fromEnd <= ENTRY_SKIP) return out.copy(endOverride);

  const t = 1 - (fromEnd - ENTRY_SKIP) / (ENTRY_BLEND_RINGS - ENTRY_SKIP);
  const ease = t * t * (3 - 2 * t);
  return out.copy(outside).lerp(endOverride, ease);
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
 * Sweeps the circular cord section along the point list using parallel
 * transport frames, so the strand never spins about its own axis between
 * frames.
 *
 * `endOverride` replaces the final ring (the crimp junction) so the cord
 * can terminate inside the metal tip instead of sharing its centre.
 * `twist` rolls the section about its own tangent, peaking at mid-span and
 * falling to zero at the pinned shoulder and the clamped end.
 */
export function updateBandGeometry(
  geometry: THREE.BufferGeometry,
  points: THREE.Vector3[],
  endOverride?: THREE.Vector3,
  twist = 0
) {
  const rings = points.length;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const normals = geometry.attributes.normal as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const printMix = geometry.attributes.printMix as THREE.BufferAttribute;
  const radius = webbing.diameter / 2;

  let arcLength = 0;

  for (let i = 0; i < rings; i += 1) {
    writeRingPoint(ringPos, points, i, endOverride);
    if (i > 0) writeRingPoint(ringPrev, points, i - 1, endOverride);
    else ringPrev.copy(ringPos);
    if (i < rings - 1) writeRingPoint(ringNext, points, i + 1, endOverride);
    else ringNext.copy(ringPos);

    if (i === 0) {
      tangent.copy(ringNext).sub(ringPos).normalize();
      // Seed the frame facing the viewer, then transport it down the strand.
      seedNormal
        .copy(viewAxis)
        .addScaledVector(tangent, -viewAxis.dot(tangent));
      if (seedNormal.lengthSq() < 1e-6) seedNormal.set(1, 0, 0);
      faceNormal.copy(seedNormal).normalize();
    } else {
      if (i === rings - 1) {
        tangent.copy(ringPos).sub(ringPrev).normalize();
      } else {
        tangent.copy(ringNext).sub(ringPrev).normalize();
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
      arcLength += ringPos.distanceTo(ringPrev);
    }

    previousTangent.copy(tangent);
    binormal.crossVectors(faceNormal, tangent).normalize();

    // Roll is applied to a copy so it can't accumulate through the transport.
    twistedFace.copy(faceNormal);
    twistedBinormal.copy(binormal);
    if (twist !== 0) {
      roll.setFromAxisAngle(tangent, twist * Math.sin((i / (rings - 1)) * Math.PI));
      twistedFace.applyQuaternion(roll);
      twistedBinormal.applyQuaternion(roll);
    }

    // Negated because flipY puts v=0 at the bottom of the source canvas,
    // which would otherwise run the printed branding up the cord mirrored.
    const v = -arcLength / webbing.textureRepeatLength;
    const mix = printMixForRing(i, rings);
    const base = i * VERTS_PER_RING;
    const ringRadius = radius;

    for (let k = 0; k < VERTS_PER_RING; k += 1) {
      const profile = CORD_PROFILE[k];
      corner
        .copy(ringPos)
        .addScaledVector(twistedBinormal, profile.su * ringRadius)
        .addScaledVector(twistedFace, profile.sv * ringRadius);
      position.setXYZ(base + k, corner.x, corner.y, corner.z);

      corner
        .copy(twistedBinormal)
        .multiplyScalar(profile.nu)
        .addScaledVector(twistedFace, profile.nv);
      normals.setXYZ(base + k, corner.x, corner.y, corner.z);

      uv.setXY(base + k, profile.u, v);
      printMix.setX(base + k, mix);
    }
  }

  position.needsUpdate = true;
  normals.needsUpdate = true;
  uv.needsUpdate = true;
  printMix.needsUpdate = true;
}
