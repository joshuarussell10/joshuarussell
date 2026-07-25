"use client";

import { Suspense, useRef } from "react";
import { useTheme } from "next-themes";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function ParticleField({ color }: { color: string }) {
  const ref = useRef<THREE.Points>(null);
  const count = 2800;

  const positions = useRef<Float32Array>(
    (() => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const radius = 2.5 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        arr[i * 3 + 2] = radius * Math.cos(phi);
      }
      return arr;
    })()
  ).current;

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.04;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.015}
        sizeAttenuation
        depthWrite={false}
        opacity={0.65}
      />
    </Points>
  );
}

function WireframeOrb({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.12;
    ref.current.rotation.y = state.clock.elapsedTime * 0.18;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.8, 1]} />
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.18}
      />
    </mesh>
  );
}

function Scene({ particleColor, orbColor }: { particleColor: string; orbColor: string }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <ParticleField color={particleColor} />
      <WireframeOrb color={orbColor} />
    </>
  );
}

export function WebGLBackground() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const particleColor = isDark ? "#8b9cff" : "#6366f1";
  const orbColor = isDark ? "#6ee7ff" : "#0891b2";

  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene particleColor={particleColor} orbColor={orbColor} />
        </Suspense>
      </Canvas>
      <div className="hero-fade absolute inset-0" />
      <div className="hero-grid absolute inset-0 opacity-60" />
    </div>
  );
}
