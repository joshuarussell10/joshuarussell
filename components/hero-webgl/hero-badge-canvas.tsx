"use client";

import { Suspense } from "react";
import { useTheme } from "next-themes";
import { Canvas } from "@react-three/fiber";
import { LanyardBadgeScene } from "@/components/hero-webgl/lanyard-badge-scene";
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

  return (
    <div
      className="hero-badge-canvas animate-fade-up-delay-1 relative h-[min(68vh,560px)] w-full max-w-[360px]"
      aria-hidden
    >
      <div className="hero-webgl-glow absolute inset-0 scale-125 opacity-60" />
      <Canvas
        camera={{
          position: lanyardConfig.camera.position,
          fov: lanyardConfig.camera.fov,
        }}
        onCreated={({ camera }) => {
          const [x, y, z] = lanyardConfig.camera.lookAt;
          camera.lookAt(x, y, z);
          camera.updateProjectionMatrix();
        }}
        dpr={[1, 1.75]}
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
            name={siteConfig.name}
            initials="JR"
            title={siteConfig.title}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
