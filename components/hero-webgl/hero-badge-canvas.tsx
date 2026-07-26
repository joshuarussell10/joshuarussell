"use client";

import { Suspense, useMemo } from "react";
import { useTheme } from "next-themes";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { LanyardBadgeScene } from "@/components/hero-webgl/lanyard-badge-scene";
import type { BadgeIdentity } from "@/lib/hero-webgl/badge-textures";
import type { MousePosition } from "@/lib/hero-webgl/config";
import { lanyardConfig, lanyardPalettes } from "@/lib/hero-webgl/lanyard-config";
import { siteConfig } from "@/lib/data";

type HeroBadgeCanvasProps = {
  mouse: MousePosition;
  interactive: boolean;
  pointerActive: boolean;
};

export function HeroBadgeCanvas({
  mouse,
  interactive,
  pointerActive,
}: HeroBadgeCanvasProps) {
  const { resolvedTheme } = useTheme();
  const palette =
    resolvedTheme === "light" ? lanyardPalettes.light : lanyardPalettes.dark;

  const identity = useMemo<BadgeIdentity>(
    () => ({
      name: siteConfig.name,
      title: siteConfig.title,
      organisation: siteConfig.domain,
      department: "Engineering",
      idNumber: "JR-2018-0447",
      clearance: "LEVEL 3",
      issued: "01 / 18",
      expires: "12 / 28",
      email: siteConfig.email,
    }),
    []
  );

  return (
    <div
      className="hero-badge-canvas animate-fade-up-delay-1 relative h-[min(68vh,560px)] w-full max-w-[360px]"
      aria-hidden
    >
      <div className="hero-webgl-glow absolute inset-0 scale-125 opacity-60" />
      <Canvas
        shadows
        camera={{
          position: lanyardConfig.camera.position,
          fov: lanyardConfig.camera.fov,
        }}
        onCreated={({ camera, gl }) => {
          const [x, y, z] = lanyardConfig.camera.lookAt;
          camera.lookAt(x, y, z);
          camera.updateProjectionMatrix();
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <LanyardBadgeScene
            mouse={mouse}
            interactive={interactive}
            pointerActive={pointerActive}
            palette={palette}
            identity={identity}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
