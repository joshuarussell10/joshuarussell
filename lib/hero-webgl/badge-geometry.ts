import * as THREE from "three";
import { lanyardConfig } from "@/lib/hero-webgl/lanyard-config";

const { card, webbing } = lanyardConfig;

/**
 * Lower fraction of each strand (toward the clasp) with branding removed.
 * Sized against the shorter rope the raised crimp gives, so the print still
 * reaches the part of the strap that is actually on screen.
 */
const PLAIN_STRAP_FRACTION = 0.3;
/** Soft blend rings between printed and plain weave. */
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
 * Cross-section of the woven tape, as a superellipse so the selvedges roll
 * over instead of meeting the faces at a hard corner, plus a cup across the
 * width. Sharp extruded corners are the loudest tell that a strap is CG —
 * these rounded edges give the specular somewhere to roll off.
 *
 * `su` is a fraction of the half-width and `sv` a fraction of the
 * half-thickness, so the crimp taper can squash the two axes independently.
 */
type TapeProfilePoint = {
  su: number;
  sv: number;
  nu: number;
  nv: number;
  u: number;
};

function buildTapeProfile(): TapeProfilePoint[] {
  const count = webbing.profileSegments;
  const exponent = webbing.profileExponent;
  const halfWidth = webbing.width / 2;
  const halfThickness = webbing.thickness / 2;
  const curl = webbing.curl / halfThickness;
  const points: TapeProfilePoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const su = Math.sign(cos) * Math.abs(cos) ** (2 / exponent);
    const sv = Math.sign(sin) * Math.abs(sin) ** (2 / exponent);

    // Gradient of |x/a|^n + |y/b|^n = 1 at this point.
    let nu =
      (Math.sign(su) * Math.abs(su) ** (exponent - 1)) / halfWidth;
    let nv =
      (Math.sign(sv) * Math.abs(sv) ** (exponent - 1)) / halfThickness;

    // Rotate the normal by the cup's slope, which shears the section.
    const slope = (-2 * webbing.curl * su) / halfWidth;
    const angle = Math.atan(slope);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    [nu, nv] = [nu * ca - nv * sa, nu * sa + nv * ca];

    const length = Math.hypot(nu, nv) || 1;

    points.push({
      su,
      sv: sv + curl * (1 - su * su),
      nu: nu / length,
      nv: nv / length,
      // Texture u tracks position across the width, so the printed selvedge
      // lands on the rolled edge and the two faces stay in register.
      u: (su + 1) / 2,
    });
  }

  return points;
}

const TAPE_PROFILE = buildTapeProfile();
const VERTS_PER_RING = TAPE_PROFILE.length;

/** Rings over which the tape is squeezed as it disappears into the barrel. */
const TAPER_RINGS = 1;
const TAPER_WIDTH = 0.8;
const TAPER_THICKNESS = 0.55;

/** Allocates the tape mesh; positions are filled in every frame. */
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
    for (let k = 0; k < VERTS_PER_RING; k += 1) {
      const next = (k + 1) % VERTS_PER_RING;
      const a = i * VERTS_PER_RING + k;
      const b = i * VERTS_PER_RING + next;
      const c = (i + 1) * VERTS_PER_RING + k;
      const d = (i + 1) * VERTS_PER_RING + next;
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
const viewAxis = new THREE.Vector3(0, 0, 1);

function ringPoint(
  points: THREE.Vector3[],
  index: number,
  endOverride?: THREE.Vector3
) {
  if (endOverride && index === points.length - 1) return endOverride;
  return points[index];
}

/** Cross-section squeeze as the tape is swallowed by the crimp mouth. */
function endTaper(index: number, rings: number, target: number) {
  const fromEnd = rings - 1 - index;
  if (fromEnd >= TAPER_RINGS) return 1;
  return target + (1 - target) * (fromEnd / TAPER_RINGS);
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
 * Sweeps the tape section along the point list using parallel transport
 * frames, so the band never spins about its own axis between frames.
 *
 * `endOverride` replaces the final ring (the crimp junction) so the woven
 * band can terminate inside the metal barrel instead of sharing its centre.
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
  const halfWidth = webbing.width / 2;
  const halfThickness = webbing.thickness / 2;

  let arcLength = 0;

  for (let i = 0; i < rings; i += 1) {
    const point = ringPoint(points, i, endOverride);
    const prev = i > 0 ? ringPoint(points, i - 1, endOverride) : point;
    const next = i < rings - 1 ? ringPoint(points, i + 1, endOverride) : point;

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

    // Roll is applied to a copy so it can't accumulate through the transport.
    twistedFace.copy(faceNormal);
    twistedBinormal.copy(binormal);
    if (twist !== 0) {
      roll.setFromAxisAngle(tangent, twist * Math.sin((i / (rings - 1)) * Math.PI));
      twistedFace.applyQuaternion(roll);
      twistedBinormal.applyQuaternion(roll);
    }

    // Negated because flipY puts v=0 at the bottom of the source canvas,
    // which would otherwise run the printed branding up the strap mirrored.
    const v = -arcLength / webbing.textureRepeatLength;
    const mix = printMixForRing(i, rings);
    const base = i * VERTS_PER_RING;
    const ringHalfWidth = halfWidth * endTaper(i, rings, TAPER_WIDTH);
    const ringHalfThickness =
      halfThickness * endTaper(i, rings, TAPER_THICKNESS);

    for (let k = 0; k < VERTS_PER_RING; k += 1) {
      const profile = TAPE_PROFILE[k];
      corner
        .copy(point)
        .addScaledVector(twistedBinormal, profile.su * ringHalfWidth)
        .addScaledVector(twistedFace, profile.sv * ringHalfThickness);
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
