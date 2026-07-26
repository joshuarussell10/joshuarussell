"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { MousePosition } from "@/lib/hero-webgl/config";
import {
  getPointerInput,
  lanyardConfig,
  type LanyardPalette,
} from "@/lib/hero-webgl/lanyard-config";
import { LanyardSimulation } from "@/lib/hero-webgl/lanyard-physics";
import {
  createBandGeometry,
  createCardBodyGeometry,
  createCardFaceGeometry,
  updateBandGeometry,
} from "@/lib/hero-webgl/badge-geometry";
import {
  createBadgeTextures,
  createHologramThicknessTexture,
  resolveFontStacks,
  type BadgeIdentity,
} from "@/lib/hero-webgl/badge-textures";
import { createWebbingTextures } from "@/lib/hero-webgl/lanyard-texture";

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
const RING_LOCAL_Y = card.height / 2 - card.slot.inset;

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

/** Crimp, swivel and hook: the metalwork joining the webbing to the slot. */
function Hardware({ material }: { material: THREE.Material }) {
  const gap = 1.05;

  return (
    <>
      <RoundedBox
        args={[hardware.crimpWidth, hardware.crimpHeight, hardware.crimpDepth]}
        radius={0.012}
        smoothness={4}
        position={[0, -hardware.crimpHeight * 0.5 + 0.05, 0]}
        material={material}
      />

      {/* Pressed ridge across the crimp face. */}
      <mesh position={[0, -0.02, hardware.crimpDepth * 0.5]} material={material}>
        <boxGeometry args={[hardware.crimpWidth * 0.82, 0.012, 0.006]} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * hardware.crimpWidth * 0.3, -0.055, hardware.crimpDepth * 0.5]}
          rotation={[Math.PI / 2, 0, 0]}
          material={material}
        >
          <cylinderGeometry args={[0.009, 0.009, 0.006, 12]} />
        </mesh>
      ))}

      {/* Swivel collar and stem down to the hook. */}
      <mesh position={[0, -0.09, 0]} material={material}>
        <cylinderGeometry
          args={[hardware.stemRadius * 1.6, hardware.stemRadius * 1.6, 0.016, 20]}
        />
      </mesh>
      <mesh position={[0, -0.155, 0]} material={material}>
        <cylinderGeometry args={[hardware.stemRadius, hardware.stemRadius, 0.13, 20]} />
      </mesh>

      {/* Hook, rolled so its opening sits at the top where the stem enters. */}
      <mesh
        position={[0, -0.26, 0]}
        rotation={[0, 0, Math.PI / 2 + gap / 2]}
        material={material}
      >
        <torusGeometry
          args={[hardware.hookRadius, hardware.hookTube, 14, 48, Math.PI * 2 - gap]}
        />
      </mesh>
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
    textures.normalMap.anisotropy = anisotropy;
    return textures;
  }, [palette, identity, anisotropy, fonts]);

  const hologramThickness = useMemo(() => createHologramThicknessTexture(), []);
  const softShadowTexture = useMemo(() => createSoftShadowTexture(), []);

  const metalMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(palette.hardware),
        metalness: 1,
        roughness: 0.18,
        envMapIntensity: 1.8,
      }),
    [palette.hardware]
  );

  useEffect(() => () => badgeTextures.dispose(), [badgeTextures]);
  useEffect(() => () => webbingTextures.dispose(), [webbingTextures]);
  useEffect(() => () => metalMaterial.dispose(), [metalMaterial]);
  useEffect(() => () => hologramThickness.dispose(), [hologramThickness]);
  useEffect(() => () => softShadowTexture.dispose(), [softShadowTexture]);

  const cardBodyGeometry = useMemo(() => createCardBodyGeometry(), []);
  const cardFaceGeometry = useMemo(() => createCardFaceGeometry(), []);
  const leftBandGeometry = useMemo(
    () => createBandGeometry(webbing.segments / 2),
    []
  );
  const rightBandGeometry = useMemo(
    () => createBandGeometry(webbing.segments / 2),
    []
  );

  useEffect(() => {
    return () => {
      cardBodyGeometry.dispose();
      cardFaceGeometry.dispose();
      leftBandGeometry.dispose();
      rightBandGeometry.dispose();
    };
  }, [cardBodyGeometry, cardFaceGeometry, leftBandGeometry, rightBandGeometry]);

  const ringWorld = useMemo(() => new THREE.Vector3(), []);
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

    updateBandGeometry(
      leftBandGeometry,
      simulation.leftStrand,
      webbing.width,
      webbing.thickness,
      webbing.textureRepeatLength
    );
    updateBandGeometry(
      rightBandGeometry,
      simulation.rightStrand,
      webbing.width,
      webbing.thickness,
      webbing.textureRepeatLength
    );

    const hardwareGroup = hardwareRef.current;
    if (hardwareGroup && cardGroup) {
      ringWorld.set(0, RING_LOCAL_Y, 0).applyMatrix4(cardGroup.matrixWorld);

      const { x, y, z, matrix } = hardwareBasis;
      y.copy(simulation.crimp).sub(ringWorld).normalize();
      // Keep the hook's plane square to the ring hanging in the card's slot.
      z.set(0, 0, 1).applyQuaternion(simulation.cardQuaternion);
      z.addScaledVector(y, -z.dot(y)).normalize();
      x.crossVectors(y, z).normalize();

      matrix.makeBasis(x, y, z);
      hardwareGroup.quaternion.setFromRotationMatrix(matrix);
      hardwareGroup.position.copy(simulation.crimp);
    }

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

      <mesh geometry={leftBandGeometry} frustumCulled={false}>
        <meshPhysicalMaterial
          map={webbingTextures.map}
          normalMap={webbingTextures.normalMap}
          roughnessMap={webbingTextures.roughnessMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughness={1}
          metalness={0}
          sheen={0.3}
          sheenRoughness={0.8}
          sheenColor={palette.strapPrint}
          envMapIntensity={0.35}
        />
      </mesh>

      <mesh geometry={rightBandGeometry} frustumCulled={false}>
        <meshPhysicalMaterial
          map={webbingTextures.map}
          normalMap={webbingTextures.normalMap}
          roughnessMap={webbingTextures.roughnessMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughness={1}
          metalness={0}
          sheen={0.3}
          sheenRoughness={0.8}
          sheenColor={palette.strapPrint}
          envMapIntensity={0.35}
        />
      </mesh>

      <group ref={hardwareRef}>
        <Hardware material={metalMaterial} />
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

        <mesh geometry={cardFaceGeometry} position={[0, 0, FACE_OFFSET]}>
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
          geometry={cardFaceGeometry}
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
            foil catching light rather than a grey sticker. */}
        <mesh
          position={[card.hologram.x, card.hologram.y, FACE_OFFSET + 0.0006]}
          rotation={[0, 0, Math.PI * 0.12]}
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

        {/* Split ring riding in the punched slot. */}
        <mesh
          position={[0, RING_LOCAL_Y, 0]}
          rotation={[0, Math.PI / 2, 0]}
          material={metalMaterial}
        >
          <torusGeometry args={[hardware.ringRadius, hardware.ringTube, 16, 40]} />
        </mesh>
      </group>
    </>
  );
}
