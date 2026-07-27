"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { MousePosition } from "@/lib/hero-webgl/config";
import {
  getPointerInput,
  lanyardConfig,
  type LanyardPalette,
} from "@/lib/hero-webgl/lanyard-config";
import { LanyardSimulation } from "@/lib/hero-webgl/lanyard-physics";
import {
  cardBowAt,
  cardBowSlopeAt,
  createBandGeometry,
  createCardBodyGeometry,
  createCardFaceGeometry,
  updateBandGeometry,
} from "@/lib/hero-webgl/badge-geometry";
import {
  CLAW_GATE_HINGE,
  createClawBodyGeometry,
  createClawGateGeometry,
  createCrimpGeometry,
  createSwivelCollarGeometry,
  createSwivelStemGeometry,
} from "@/lib/hero-webgl/hardware-geometry";
import {
  createBadgeTextures,
  createHologramThicknessTexture,
  resolveFontStacks,
  type BadgeIdentity,
} from "@/lib/hero-webgl/badge-textures";
import {
  createHardwareTextures,
  createWebbingTextures,
} from "@/lib/hero-webgl/lanyard-texture";

type LanyardBadgeSceneProps = {
  mouse: MousePosition;
  interactive: boolean;
  pointerActive: boolean;
  palette: LanyardPalette;
  identity: BadgeIdentity;
};

const { card, webbing, hardware } = lanyardConfig;
/** The bevelled lid sits at the full half-thickness; print rides just above it. */
const FACE_OFFSET = card.thickness / 2 + 0.0005;
/** Punch centre — the claw hooks through this opening directly. */
const SLOT_LOCAL_Y = card.height / 2 - card.slot.inset;
/** Prefer the clasp face toward the camera when the strap plane is ambiguous. */
const VIEW_AXIS = new THREE.Vector3(0, 0, 1);
/** Barrel dimensions the pressed details are cut against, so the seam and
 *  rivets keep their proportions whatever size the clasp is set to. */
const CRIMP_HEIGHT = hardware.crimpTopY - hardware.swivelTopY;
const CRIMP_FACE_Z = hardware.crimpDepth * 0.47;
const PRESSING_DEPTH = hardware.crimpDepth * 0.13;

/** Soft elliptical wall shadow that never clips at the shadow-map frustum. */
function createSoftShadowTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.46,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(0.35, "rgba(0,0,0,0.22)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.06)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/**
 * Re-resolves the font stacks once webfonts finish loading, so the printed
 * artwork is redrawn in Geist rather than the fallback face.
 */
function useFontStacks() {
  const [stacks, setStacks] = useState(resolveFontStacks);

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) setStacks(resolveFontStacks());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return stacks;
}

type ClaspGeometries = {
  crimp: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  stem: THREE.BufferGeometry;
  clawBody: THREE.BufferGeometry;
  clawGate: THREE.BufferGeometry;
};

/**
 * Crimp barrel, swivel and lobster claw. Everything below `swivelRef` turns
 * with the card while the barrel stays square to the webbing, which is the
 * whole point of a swivel and stops the claw shearing through the punch as
 * the badge yaws.
 */
function Clasp({
  geometries,
  crimpMetal,
  metal,
  swivelRef,
}: {
  geometries: ClaspGeometries;
  crimpMetal: THREE.Material;
  metal: THREE.Material;
  swivelRef: RefObject<THREE.Group | null>;
}) {
  return (
    <>
      {/*
        Barrel sits forward of the cord plane so the braid doesn't paint
        through the pressed face. Stem and claw stay on the hang axis so
        the snap can seat in the card punch at the mid-plane.
      */}
      <group position={[0, 0, hardware.crimpFrontBias]}>
        <mesh geometry={geometries.crimp} material={crimpMetal} />

        {/* Pressed seam across the barrel, and the rivets that close it. */}
        <mesh
          position={[0, hardware.crimpTopY - CRIMP_HEIGHT * 0.235, CRIMP_FACE_Z]}
          material={metal}
        >
          <boxGeometry
            args={[
              hardware.crimpWidth * 0.7,
              CRIMP_HEIGHT * 0.062,
              PRESSING_DEPTH,
            ]}
          />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[
              side * hardware.crimpWidth * 0.24,
              hardware.crimpTopY - CRIMP_HEIGHT * 0.59,
              CRIMP_FACE_Z,
            ]}
            rotation={[Math.PI / 2, 0, 0]}
            material={metal}
          >
            <cylinderGeometry
              args={[
                hardware.crimpWidth * 0.031,
                hardware.crimpWidth * 0.031,
                PRESSING_DEPTH,
                14,
              ]}
            />
          </mesh>
        ))}

        <mesh geometry={geometries.collar} material={metal} />
      </group>

      <group ref={swivelRef}>
        <mesh geometry={geometries.stem} material={metal} />

        {/* Lobster claw: edge-on through the punch so its profile reads. */}
        <group position={[0, hardware.clawApexY, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh geometry={geometries.clawBody} material={metal} />
          <mesh
            geometry={geometries.clawGate}
            position={[0, 0, hardware.clawTube * 0.36]}
            material={metal}
          />

          {/* Hinge pin, and the thumb pad that draws the gate back. */}
          <mesh
            position={[CLAW_GATE_HINGE.x, CLAW_GATE_HINGE.y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={metal}
          >
            <cylinderGeometry
              args={[
                hardware.clawTube * 0.35,
                hardware.clawTube * 0.35,
                hardware.clawTube * 2.6,
                12,
              ]}
            />
          </mesh>
          <mesh
            position={[
              CLAW_GATE_HINGE.x - hardware.clawTube * 0.9,
              CLAW_GATE_HINGE.y + hardware.clawTube * 0.39,
              hardware.clawTube * 0.36,
            ]}
            rotation={[0, 0, -0.6]}
            scale={[1.25, 0.62, 0.4]}
            material={metal}
          >
            <sphereGeometry args={[hardware.clawTube * 0.77, 14, 10]} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export function LanyardBadgeScene({
  mouse,
  interactive,
  pointerActive,
  palette,
  identity,
}: LanyardBadgeSceneProps) {
  const gl = useThree((state) => state.gl);
  const fonts = useFontStacks();

  const cardRef = useRef<THREE.Group>(null);
  const hardwareRef = useRef<THREE.Group>(null);
  const swivelRef = useRef<THREE.Group>(null);
  const softShadowRef = useRef<THREE.Mesh>(null);

  const simulation = useMemo(() => {
    const sim = new LanyardSimulation();
    sim.warmup();
    return sim;
  }, []);

  const anisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const badgeTextures = useMemo(() => {
    const textures = createBadgeTextures(palette, identity, fonts);
    textures.front.anisotropy = anisotropy;
    textures.back.anisotropy = anisotropy;
    return textures;
  }, [palette, identity, anisotropy, fonts]);

  const webbingTextures = useMemo(() => {
    const textures = createWebbingTextures(
      palette.strap,
      palette.strapPrint,
      palette.strapEdge,
      identity.organisation.toUpperCase(),
      fonts
    );
    textures.map.anisotropy = anisotropy;
    textures.plainMap.anisotropy = anisotropy;
    textures.normalMap.anisotropy = anisotropy;
    return textures;
  }, [palette, identity, anisotropy, fonts]);

  const hardwareTextures = useMemo(() => {
    const textures = createHardwareTextures();
    textures.roughnessMap.anisotropy = anisotropy;
    return textures;
  }, [anisotropy]);

  const hologramThickness = useMemo(() => createHologramThicknessTexture(), []);
  const softShadowTexture = useMemo(() => createSoftShadowTexture(), []);

  const metalMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(palette.hardware),
        metalness: 1,
        // The map carries the polish; this only scales it.
        roughness: 0.62,
        roughnessMap: hardwareTextures.roughnessMap,
        normalMap: hardwareTextures.normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        envMapIntensity: 1.9,
      }),
    [palette.hardware, hardwareTextures]
  );

  // The barrel is the one part the cord can reach in a hard pose, so it
  // keeps a depth bias as insurance against a strand sorting in front.
  const crimpMaterial = useMemo(() => {
    const material = metalMaterial.clone();
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
    material.depthWrite = true;
    return material;
  }, [metalMaterial]);

  const webbingMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      map: webbingTextures.map,
      normalMap: webbingTextures.normalMap,
      roughnessMap: webbingTextures.roughnessMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.92,
      metalness: 0,
      sheen: 0.18,
      sheenRoughness: 0.7,
      sheenColor: palette.strapPrint,
      envMapIntensity: 0.28,
    });

    // Lower cord (near the clasp) uses plain braid so branding never
    // compresses or crawls when the rope deforms under the pointer.
    material.onBeforeCompile = (shader) => {
      shader.uniforms.plainMap = { value: webbingTextures.plainMap };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute float printMix;
varying float vPrintMix;`
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
vPrintMix = printMix;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform sampler2D plainMap;
varying float vPrintMix;`
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	vec4 plainDiffuseColor = texture2D( plainMap, vMapUv );
	sampledDiffuseColor = mix( plainDiffuseColor, sampledDiffuseColor, vPrintMix );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`
        );
    };
    material.customProgramCacheKey = () => "lanyard-cord-print-mix";

    return material;
  }, [webbingTextures, palette.strapPrint]);

  useEffect(() => () => badgeTextures.dispose(), [badgeTextures]);
  useEffect(() => () => webbingTextures.dispose(), [webbingTextures]);
  useEffect(() => () => hardwareTextures.dispose(), [hardwareTextures]);
  useEffect(() => () => metalMaterial.dispose(), [metalMaterial]);
  useEffect(() => () => crimpMaterial.dispose(), [crimpMaterial]);
  useEffect(() => () => webbingMaterial.dispose(), [webbingMaterial]);
  useEffect(() => () => hologramThickness.dispose(), [hologramThickness]);
  useEffect(() => () => softShadowTexture.dispose(), [softShadowTexture]);

  const cardBodyGeometry = useMemo(() => createCardBodyGeometry(), []);
  const cardFrontGeometry = useMemo(() => createCardFaceGeometry(1), []);
  const cardBackGeometry = useMemo(() => createCardFaceGeometry(-1), []);
  const leftBandGeometry = useMemo(
    () => createBandGeometry(webbing.segments / 2),
    []
  );
  const rightBandGeometry = useMemo(
    () => createBandGeometry(webbing.segments / 2),
    []
  );

  const claspGeometries = useMemo<ClaspGeometries>(
    () => ({
      crimp: createCrimpGeometry(),
      collar: createSwivelCollarGeometry(),
      stem: createSwivelStemGeometry(),
      clawBody: createClawBodyGeometry(),
      clawGate: createClawGateGeometry(),
    }),
    [
      hardware.clawLength,
      hardware.clawWidth,
      hardware.clawTube,
      hardware.gateTube,
      hardware.clawApexY,
    ]
  );

  useEffect(() => {
    return () => {
      cardBodyGeometry.dispose();
      cardFrontGeometry.dispose();
      cardBackGeometry.dispose();
      leftBandGeometry.dispose();
      rightBandGeometry.dispose();
      for (const geometry of Object.values(claspGeometries)) {
        geometry.dispose();
      }
    };
  }, [
    cardBodyGeometry,
    cardFrontGeometry,
    cardBackGeometry,
    leftBandGeometry,
    rightBandGeometry,
    claspGeometries,
  ]);

  const slotWorld = useMemo(() => new THREE.Vector3(), []);
  const leftBandTip = useMemo(() => new THREE.Vector3(), []);
  const rightBandTip = useMemo(() => new THREE.Vector3(), []);
  const strapLeft = useMemo(() => new THREE.Vector3(), []);
  const strapRight = useMemo(() => new THREE.Vector3(), []);
  const cardForward = useMemo(() => new THREE.Vector3(), []);
  const hardwareBasis = useMemo(
    () => ({
      x: new THREE.Vector3(),
      y: new THREE.Vector3(),
      z: new THREE.Vector3(),
      matrix: new THREE.Matrix4(),
    }),
    []
  );

  // With reduced motion or a coarse pointer the badge is posed once and left
  // alone, rather than idling on the breeze.
  const staticPoseApplied = useRef(false);

  useFrame((_, deltaTime) => {
    if (interactive) {
      const pointer = getPointerInput(mouse, interactive, pointerActive);
      simulation.update(deltaTime, {
        x: pointer.x,
        y: pointer.y,
        active: pointerActive,
      });
    } else {
      if (staticPoseApplied.current) return;
      staticPoseApplied.current = true;
    }

    const cardGroup = cardRef.current;
    if (cardGroup) {
      cardGroup.position.copy(simulation.cardPosition);
      cardGroup.quaternion.copy(simulation.cardQuaternion);
      cardGroup.updateMatrixWorld();
    }

    const hardwareGroup = hardwareRef.current;
    if (hardwareGroup && cardGroup) {
      slotWorld
        .set(0, SLOT_LOCAL_Y, cardBowAt(0))
        .applyMatrix4(cardGroup.matrixWorld);

      const leftStrand = simulation.leftStrand;
      const rightStrand = simulation.rightStrand;
      strapLeft.copy(leftStrand[leftStrand.length - 2]).sub(simulation.crimp);
      strapRight.copy(rightStrand[rightStrand.length - 2]).sub(simulation.crimp);

      const { x, y, z, matrix } = hardwareBasis;
      // Hang axis: crimp above the punch, stem and claw reach down into it.
      y.copy(simulation.crimp).sub(slotWorld).normalize();

      // Barrel faces with the webbing V — same plane the straps approach in —
      // rather than the card, so a yawed badge can't tuck the metal behind the
      // weave the way a free particle at the junction otherwise would.
      x.copy(strapRight).sub(strapLeft);
      x.addScaledVector(y, -x.dot(y));
      if (x.lengthSq() < 1e-8) {
        x.set(1, 0, 0).applyQuaternion(simulation.cardQuaternion);
        x.addScaledVector(y, -x.dot(y));
      }
      x.normalize();

      z.crossVectors(x, y).normalize();
      if (z.dot(VIEW_AXIS) < 0) {
        z.negate();
        x.negate();
      }
      x.crossVectors(y, z).normalize();

      matrix.makeBasis(x, y, z);
      hardwareGroup.quaternion.setFromRotationMatrix(matrix);
      // Hang on the crimp particle — barrel bias is local to the clasp mesh
      // so the claw stays on the punch plane instead of sitting in front.
      hardwareGroup.position.copy(simulation.crimp);

      // The swivel: below the joint the clasp turns to face the same way as
      // the card, so the claw stays square to the punched slot.
      const swivelGroup = swivelRef.current;
      if (swivelGroup) {
        cardForward.set(0, 0, 1).applyQuaternion(simulation.cardQuaternion);
        cardForward.addScaledVector(y, -cardForward.dot(y));
        if (cardForward.lengthSq() > 1e-8) {
          cardForward.normalize();
          swivelGroup.rotation.y = Math.atan2(
            cardForward.dot(x),
            cardForward.dot(z)
          );
        }
      }

      // Cord tips stop at the barrel mouth, still in the rope plane. The
      // barrel itself is shifted forward in clasp-local space, so the pressed
      // face sits clear in front of the braid instead of intersecting it.
      leftBandTip
        .copy(simulation.crimp)
        .addScaledVector(y, hardware.crimpEntryY)
        .addScaledVector(x, -hardware.crimpEntrySpread);
      rightBandTip
        .copy(simulation.crimp)
        .addScaledVector(y, hardware.crimpEntryY)
        .addScaledVector(x, hardware.crimpEntrySpread);
    } else {
      leftBandTip.copy(simulation.crimp);
      rightBandTip.copy(simulation.crimp);
    }

    updateBandGeometry(
      leftBandGeometry,
      simulation.leftStrand,
      leftBandTip,
      webbing.twist
    );
    updateBandGeometry(
      rightBandGeometry,
      simulation.rightStrand,
      rightBandTip,
      -webbing.twist
    );

    const softShadow = softShadowRef.current;
    if (softShadow) {
      softShadow.position.x = simulation.cardPosition.x - 0.08;
      softShadow.position.y = simulation.cardPosition.y - 0.12;
    }
  });

  return (
    <>
      {/* Compact studio rig baked into a cubemap for the metal reflections. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={[palette.environment]} />
        {/* Overhead softbox. */}
        <Lightformer
          intensity={3.2}
          position={[0, 3.4, 3.2]}
          scale={[7, 3.2, 1]}
          target={[0, 0, 0]}
        />
        {/* Broad frontal panel: what the laminate and hologram actually catch. */}
        <Lightformer
          intensity={1.5}
          position={[0.7, 0.9, 5.2]}
          scale={[6, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          intensity={1.2}
          color="#cfd8ff"
          position={[-4, 0.4, 2.2]}
          scale={[3, 5, 1]}
          target={[0, 0, 0]}
        />
        {/* Warm rim down the right edge, to separate the metal from the page. */}
        <Lightformer
          intensity={2}
          color="#ffe9c9"
          position={[4.2, 1.2, -1.6]}
          scale={[1.2, 5, 1]}
          target={[0, 0, 0]}
        />
        {/* Narrow strip that draws a long specular down the clasp. */}
        <Lightformer
          intensity={4}
          position={[1.1, 1.8, 2.4]}
          scale={[0.3, 2.2, 1]}
          target={[0, 0.6, 0]}
        />
        <Lightformer
          form="ring"
          intensity={0.7}
          position={[0, -3.4, 1.6]}
          scale={5}
          target={[0, 0, 0]}
        />
      </Environment>

      <ambientLight intensity={0.18} />
      <hemisphereLight intensity={0.16} groundColor="#1a1c28" />

      <directionalLight position={[1.8, 4.2, 5.8]} intensity={2.4} />
      <directionalLight position={[-3.4, 1.2, 2.6]} intensity={0.5} color="#c7d2fe" />
      <directionalLight position={[-1.2, 0.4, -4]} intensity={0.85} color="#8fa2ff" />

      {/* Painted contact shadow — stays inside the frame and tracks the badge. */}
      <mesh
        ref={softShadowRef}
        position={[0, -0.2, -0.55]}
        scale={[2.35, 3.05, 1]}
        renderOrder={-1}
      >
        <planeGeometry />
        <meshBasicMaterial
          map={softShadowTexture}
          color={palette.shadow}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      <mesh
        geometry={leftBandGeometry}
        frustumCulled={false}
        material={webbingMaterial}
        renderOrder={0}
      />

      <mesh
        geometry={rightBandGeometry}
        frustumCulled={false}
        material={webbingMaterial}
        renderOrder={0}
      />

      <group ref={hardwareRef} renderOrder={1}>
        <Clasp
          geometries={claspGeometries}
          crimpMetal={crimpMaterial}
          metal={metalMaterial}
          swivelRef={swivelRef}
        />
      </group>

      <group ref={cardRef}>
        <mesh geometry={cardBodyGeometry}>
          <meshPhysicalMaterial
            color={palette.cardCore}
            metalness={0}
            roughness={0.42}
            clearcoat={0.7}
            clearcoatRoughness={0.22}
            envMapIntensity={1}
          />
        </mesh>

        <mesh geometry={cardFrontGeometry} position={[0, 0, FACE_OFFSET]}>
          <meshPhysicalMaterial
            map={badgeTextures.front}
            clearcoatRoughnessMap={badgeTextures.gloss}
            metalness={0}
            roughness={0.5}
            clearcoat={1}
            clearcoatRoughness={0.12}
            envMapIntensity={0.8}
          />
        </mesh>

        <mesh
          geometry={cardBackGeometry}
          position={[0, 0, -FACE_OFFSET]}
          rotation={[0, Math.PI, 0]}
        >
          <meshPhysicalMaterial
            map={badgeTextures.back}
            clearcoatRoughnessMap={badgeTextures.gloss}
            metalness={0}
            roughness={0.5}
            clearcoat={1}
            clearcoatRoughness={0.12}
            envMapIntensity={0.8}
          />
        </mesh>

        {/* Holographic security patch — added over the print so it reads as
            foil catching light rather than a grey sticker. Tilted to lie flat
            on the card's curl. */}
        <mesh
          position={[
            card.hologram.x,
            card.hologram.y,
            FACE_OFFSET + cardBowAt(card.hologram.x) + 0.0012,
          ]}
          rotation={[
            0,
            Math.atan(-cardBowSlopeAt(card.hologram.x)),
            Math.PI * 0.12,
          ]}
        >
          <circleGeometry args={[card.hologram.radius, 48]} />
          <meshPhysicalMaterial
            color="#ffffff"
            metalness={1}
            roughness={0.3}
            iridescence={1}
            iridescenceIOR={2.1}
            iridescenceThicknessRange={[120, 880]}
            iridescenceThicknessMap={hologramThickness}
            transparent
            opacity={0.07}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            envMapIntensity={0.9}
          />
        </mesh>
      </group>
    </>
  );
}
