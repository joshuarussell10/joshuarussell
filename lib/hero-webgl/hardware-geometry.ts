import * as THREE from "three";
import { lanyardConfig } from "@/lib/hero-webgl/lanyard-config";

const { hardware } = lanyardConfig;

/**
 * Sweeps a circular section of varying radius along a curve and rounds off
 * both ends. Bent-wire hardware is the whole clasp — a torus gives a part of
 * uniform gauge with a flat cut end, which is exactly what real drawn wire
 * never looks like.
 */
export function createSweptWire(
  curve: THREE.Curve<THREE.Vector3>,
  radiusAt: (t: number) => number,
  tubularSegments = 64,
  radialSegments = 10,
  capSegments = 3
) {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const point = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  let ringCount = 0;

  /** `tilt` leans the section's normals off the plane, rounding the caps. */
  const pushRing = (
    frame: number,
    t: number,
    radius: number,
    along: number,
    tilt: number
  ) => {
    const tangentAxis = frames.tangents[frame];
    const normalAxis = frames.normals[frame];
    const binormalAxis = frames.binormals[frame];

    curve.getPointAt(t, point).addScaledVector(tangentAxis, along);
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);

    for (let j = 0; j <= radialSegments; j += 1) {
      const angle = (j / radialSegments) * Math.PI * 2;
      direction
        .copy(normalAxis)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(binormalAxis, Math.sin(angle));

      normal
        .copy(direction)
        .multiplyScalar(cosTilt)
        .addScaledVector(tangentAxis, sinTilt)
        .normalize();
      vertex.copy(point).addScaledVector(direction, radius);

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(t, j / radialSegments);
    }

    ringCount += 1;
  };

  const startRadius = radiusAt(0);
  for (let m = 0; m < capSegments; m += 1) {
    const phi = (Math.PI / 2) * (1 - m / capSegments);
    pushRing(
      0,
      0,
      startRadius * Math.cos(phi),
      -startRadius * Math.sin(phi),
      -phi
    );
  }

  for (let i = 0; i <= tubularSegments; i += 1) {
    const t = i / tubularSegments;
    pushRing(i, t, radiusAt(t), 0, 0);
  }

  const endRadius = radiusAt(1);
  for (let m = 1; m <= capSegments; m += 1) {
    const phi = (Math.PI / 2) * (m / capSegments);
    pushRing(
      tubularSegments,
      1,
      endRadius * Math.cos(phi),
      endRadius * Math.sin(phi),
      phi
    );
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < ringCount - 1; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = i * stride + j;
      const b = a + 1;
      const c = (i + 1) * stride + j;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * The pressed barrel that clamps both strap ends: a wide mouth tapering to a
 * waist where the swivel is riveted through.
 */
export function createCrimpGeometry() {
  const halfWidth = hardware.crimpWidth / 2;
  const waist = halfWidth * hardware.crimpWaist;
  const top = hardware.crimpTopY;
  const bottom = hardware.swivelTopY;
  const height = top - bottom;
  const corner = halfWidth * 0.155;
  const bevel = hardware.crimpDepth * 0.1;
  const fillet = height * 0.082;

  // Straight-sided sleeve for most of its run, drawn in to the waist only
  // over the bottom third — a barrel rounded all the way up reads as a scoop.
  const shoulder = bottom + height * 0.4;

  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + corner, top);
  shape.lineTo(halfWidth - corner, top);
  shape.quadraticCurveTo(halfWidth, top, halfWidth, top - corner);
  shape.lineTo(halfWidth, shoulder);
  shape.quadraticCurveTo(
    halfWidth,
    bottom + fillet,
    waist,
    bottom + fillet * 0.83
  );
  shape.quadraticCurveTo(waist, bottom, waist - fillet, bottom);
  shape.lineTo(-waist + fillet, bottom);
  shape.quadraticCurveTo(-waist, bottom, -waist, bottom + fillet * 0.83);
  shape.quadraticCurveTo(-halfWidth, bottom + fillet, -halfWidth, shoulder);
  shape.lineTo(-halfWidth, top - corner);
  shape.quadraticCurveTo(-halfWidth, top, -halfWidth + corner, top);

  const depth = hardware.crimpDepth - bevel * 2;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 3,
    curveSegments: 14,
    steps: 1,
  });

  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Height the swivel stack has to fill, between the bottom of the barrel and
 * the top of the claw. Both turned parts are cut as fractions of it so the
 * whole clasp keeps its proportions at any size.
 */
const SWIVEL_SPAN = hardware.swivelTopY - hardware.clawApexY;

/** Turned collar riveted to the barrel — the fixed half of the swivel. */
export function createSwivelCollarGeometry() {
  const r = hardware.swivelRadius;
  const top = hardware.swivelTopY + SWIVEL_SPAN * 0.123;
  const profile = [
    new THREE.Vector2(0, top),
    new THREE.Vector2(r * 0.78, top),
    new THREE.Vector2(r, top - SWIVEL_SPAN * 0.082),
    new THREE.Vector2(r, top - SWIVEL_SPAN * 0.205),
    new THREE.Vector2(r * 0.87, top - SWIVEL_SPAN * 0.274),
    new THREE.Vector2(0, top - SWIVEL_SPAN * 0.274),
  ];
  return new THREE.LatheGeometry(profile, 28);
}

/**
 * Barrel and stem below the swivel joint. This half turns with the card, the
 * way a real swivel lets the badge face front while the strap stays put.
 */
export function createSwivelStemGeometry() {
  const r = hardware.swivelRadius;
  const stem = hardware.stemRadius;
  const top = hardware.swivelTopY - SWIVEL_SPAN * 0.11;
  const apex = hardware.clawApexY;
  const profile = [
    new THREE.Vector2(0, top),
    new THREE.Vector2(r * 0.9, top),
    new THREE.Vector2(r * 0.94, top - SWIVEL_SPAN * 0.096),
    new THREE.Vector2(stem * 1.12, top - SWIVEL_SPAN * 0.219),
    new THREE.Vector2(stem, top - SWIVEL_SPAN * 0.356),
    new THREE.Vector2(stem, apex + SWIVEL_SPAN * 0.356),
    new THREE.Vector2(stem * 1.28, apex + SWIVEL_SPAN * 0.219),
    new THREE.Vector2(stem * 1.28, apex - SWIVEL_SPAN * 0.027),
    new THREE.Vector2(stem * 0.7, apex - SWIVEL_SPAN * 0.123),
    new THREE.Vector2(0, apex - SWIVEL_SPAN * 0.15),
  ];
  return new THREE.LatheGeometry(profile, 28);
}

/**
 * Where the gate is pinned to the body. Shared so the hinge pin, the gate and
 * the thumb pad all land on the same point.
 */
export const CLAW_GATE_HINGE = {
  x: -hardware.clawWidth * 0.1,
  y: -hardware.clawLength * 0.09,
};

/** Teardrop body of the lobster claw, open at the upper left. */
export function createClawBodyGeometry() {
  const length = hardware.clawLength;
  const width = hardware.clawWidth;
  const tube = hardware.clawTube;

  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(width * 0.32, -length * 0.12, 0),
      new THREE.Vector3(width * 0.5, -length * 0.4, 0),
      new THREE.Vector3(width * 0.48, -length * 0.72, 0),
      new THREE.Vector3(width * 0.14, -length, 0),
      new THREE.Vector3(-width * 0.26, -length * 0.9, 0),
      new THREE.Vector3(-width * 0.5, -length * 0.64, 0),
      new THREE.Vector3(-width * 0.54, -length * 0.42, 0),
      new THREE.Vector3(-width * 0.5, -length * 0.26, 0),
    ],
    false,
    "centripetal",
    0.5
  );

  return createSweptWire(
    curve,
    (t) => tube * (0.74 + 0.46 * Math.sin(Math.PI * t) - 0.32 * t ** 5),
    88,
    12,
    4
  );
}

/** Sprung gate closing the claw's mouth. */
export function createClawGateGeometry() {
  const length = hardware.clawLength;
  const width = hardware.clawWidth;
  const tube = hardware.gateTube;

  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(CLAW_GATE_HINGE.x, CLAW_GATE_HINGE.y, 0),
      new THREE.Vector3(-width * 0.3, -length * 0.15, 0),
      new THREE.Vector3(-width * 0.45, -length * 0.22, 0),
      new THREE.Vector3(-width * 0.53, -length * 0.28, 0),
    ],
    false,
    "centripetal",
    0.5
  );

  return createSweptWire(curve, () => tube, 28, 8, 3);
}
