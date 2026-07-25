"use client";

import { Suspense } from "react";
import { useTheme } from "next-themes";
import { Canvas } from "@react-three/fiber";
import { MorphParticlesScene } from "@/components/hero-webgl/morph-particles-scene";
import {
  morphConfig,
  morphPalettes,
  shapeLabels,
  type MousePosition,
} from "@/lib/hero-webgl/config";

type HeroMorphCanvasProps = {
  shapeStep: number;
  mouse: MousePosition;
  interactive: boolean;
};

export function HeroMorphCanvas({
  shapeStep,
  mouse,
  interactive,
}: HeroMorphCanvasProps) {
  const { resolvedTheme } = useTheme();
  const palette =
    resolvedTheme === "light" ? morphPalettes.light : morphPalettes.dark;
  const shapeLabel = shapeLabels[shapeStep % 3];

  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="hero-webgl-glow absolute inset-0" />
      <Canvas
        camera={{
          position: morphConfig.camera.position,
          fov: morphConfig.camera.fov,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <MorphParticlesScene
            shapeStep={shapeStep}
            mouse={mouse}
            interactive={interactive}
            palette={palette}
          />
        </Suspense>
      </Canvas>
      <div className="hero-fade absolute inset-0" />
      <p className="pointer-events-none absolute bottom-24 left-1/2 z-[1] -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.25em] text-site-faint">
        Click to morph · {shapeLabel}
      </p>
    </div>
  );
}
