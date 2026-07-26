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
  const corner = Math.min(0.024, halfWidth * 0.4);
  const bevel = 0.006;

  // Straight-sided sleeve for most of its run, drawn in to the waist only
  // over the bottom third — a barrel rounded all the way up reads as a scoop.
  const shoulder = bottom + height * 0.4;

  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + corner, top);
  shape.lineTo(halfWidth - corner, top);
  shape.quadraticCurveTo(halfWidth, top, halfWidth, top - corner);
  shape.lineTo(halfWidth, shoulder);
  shape.quadraticCurveTo(halfWidth, bottom + 0.012, waist, bottom + 0.01);
  shape.quadraticCurveTo(waist, bottom, waist - 0.012, bottom);
  shape.lineTo(-waist + 0.012, bottom);
  shape.quadraticCurveTo(-waist, bottom, -waist, bottom + 0.01);
  shape.quadraticCurveTo(-halfWidth, bottom + 0.012, -halfWidth, shoulder);
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

/** Turned collar riveted to the barrel — the fixed half of the swivel. */
export function createSwivelCollarGeometry() {
  const r = hardware.swivelRadius;
  const top = hardware.swivelTopY + 0.009;
  const profile = [
    new THREE.Vector2(0, top),
    new THREE.Vector2(r * 0.78, top),
    new THREE.Vector2(r, top - 0.006),
    new THREE.Vector2(r, top - 0.015),
    new THREE.Vector2(r * 0.87, top - 0.02),
    new THREE.Vector2(0, top - 0.02),
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
  const top = hardware.swivelTopY - 0.008;
  const apex = hardware.clawApexY;
  const profile = [
    new THREE.Vector2(0, top),
    new THREE.Vector2(r * 0.9, top),
    new THREE.Vector2(r * 0.94, top - 0.007),
    new THREE.Vector2(stem * 1.12, top - 0.016),
    new THREE.Vector2(stem, top - 0.026),
    new THREE.Vector2(stem, apex + 0.026),
    new THREE.Vector2(stem * 1.28, apex + 0.016),
    new THREE.Vector2(stem * 1.28, apex - 0.002),
    new THREE.Vector2(stem * 0.7, apex - 0.009),
    new THREE.Vector2(0, apex - 0.011),
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

/**
 * Wire wound just over two turns, so the coils sit side by side and the cut
 * ends taper — the detail that separates a split ring from a plain torus.
 */
export function createSplitRingGeometry() {
  const radius = hardware.ringRadius;
  const tube = hardware.ringTube;
  const turns = 2.04;
  const pitch = tube * 1.04;
  const samples = 128;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const angle = Math.PI * 2 * turns * t;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (t - 0.5) * pitch
      )
    );
  }

  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
  return createSweptWire(
    curve,
    (t) => tube * (0.58 + 0.42 * Math.min(1, Math.min(t, 1 - t) * 16)),
    176,
    9,
    3
  );
}
