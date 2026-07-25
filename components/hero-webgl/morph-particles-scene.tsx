"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { morphConfig, type MorphPalette } from "@/lib/hero-webgl/config";
import {
  createShapeTargets,
  interpolateShapePositions,
} from "@/lib/hero-webgl/shape-targets";
import type { MousePosition } from "@/lib/hero-webgl/config";

type MorphParticlesSceneProps = {
  shapeStep: number;
  mouse: MousePosition;
  interactive: boolean;
  palette: MorphPalette;
};

export function MorphParticlesScene({
  shapeStep,
  mouse,
  interactive,
  palette,
}: MorphParticlesSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Points>(null);
  const morphProgress = useRef(1);
  const fromIndex = useRef(0);
  const toIndex = useRef(0);
  const mouseSmooth = useRef({ x: 0, y: 0 });

  const targets = useMemo(() => createShapeTargets(), []);
  const workingPositions = useMemo(
    () => new Float32Array(morphConfig.particleCount * 3),
    []
  );

  useEffect(() => {
    workingPositions.set(targets[0]);
  }, [targets, workingPositions]);

  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fromIndex.current = 0;
      toIndex.current = 0;
      morphProgress.current = 1;
      return;
    }

    fromIndex.current = toIndex.current;
    toIndex.current = shapeStep % 3;
    morphProgress.current = 0;
  }, [shapeStep]);

  useFrame((state, delta) => {
    if (document.hidden) return;

    if (morphProgress.current < 1) {
      morphProgress.current = Math.min(
        1,
        morphProgress.current + delta / morphConfig.morph.duration
      );
    }

    mouseSmooth.current.x += (mouse.x - mouseSmooth.current.x) * (
      interactive ? morphConfig.mouse.lerp : 1
    );
    mouseSmooth.current.y += (mouse.y - mouseSmooth.current.y) * (
      interactive ? morphConfig.mouse.lerp : 1
    );

    interpolateShapePositions(
      targets[fromIndex.current],
      targets[toIndex.current],
      morphProgress.current,
      workingPositions
    );

    for (const ref of [glowRef, coreRef]) {
      const geometry = ref.current?.geometry as THREE.BufferGeometry | undefined;
      const attr = geometry?.attributes.position as THREE.BufferAttribute | undefined;
      if (attr) {
        attr.array.set(workingPositions);
        attr.needsUpdate = true;
      }
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * morphConfig.idle.rotationSpeed;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mouseSmooth.current.y * 0.12,
        0.05
      );

      if (interactive) {
        groupRef.current.position.x =
          mouseSmooth.current.x * morphConfig.mouse.parallax;
        groupRef.current.position.y =
          mouseSmooth.current.y * morphConfig.mouse.parallax * 0.6;
      } else {
        groupRef.current.position.x = 0;
        groupRef.current.position.y = 0;
      }
    }
  });

  const { particle } = morphConfig;

  return (
    <group ref={groupRef}>
      <Points ref={glowRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[workingPositions.slice(), 3]}
          />
        </bufferGeometry>
        <PointMaterial
          transparent
          color={palette.glow}
          size={particle.glowSize}
          sizeAttenuation
          depthWrite={false}
          opacity={particle.glowOpacity}
          blending={THREE.AdditiveBlending}
        />
      </Points>

      <Points ref={coreRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[workingPositions.slice(), 3]}
          />
        </bufferGeometry>
        <PointMaterial
          transparent
          color={palette.particle}
          size={particle.size}
          sizeAttenuation
          depthWrite={false}
          opacity={particle.opacity}
        />
      </Points>
    </group>
  );
}
