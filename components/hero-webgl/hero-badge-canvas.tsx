"use client";

import { Suspense, useLayoutEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Canvas, useThree } from "@react-three/fiber";
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

/** Keeps the perspective camera aimed at the framed look-at after resizes. */
function CameraRig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    const [px, py, pz] = lanyardConfig.camera.position;
    const [lx, ly, lz] = lanyardConfig.camera.lookAt;
    camera.position.set(px, py, pz);
    camera.lookAt(lx, ly, lz);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

/** Fires once the Suspense scene has mounted so the wrapper can fade in. */
function SceneReady({ onReady }: { onReady: (ready: boolean) => void }) {
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => onReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [onReady]);

  return null;
}

export function HeroBadgeCanvas({
  mouse,
  interactive,
  pointerActive,
}: HeroBadgeCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
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
    }),
    []
  );

  return (
    <div
      className={`hero-badge-canvas relative h-full w-full${ready ? " is-ready" : ""}`}
      aria-hidden
    >
      <div className="hero-webgl-glow absolute inset-0 scale-125 opacity-60" />
      <Canvas
        camera={{
          position: lanyardConfig.camera.position,
          fov: lanyardConfig.camera.fov,
        }}
        onCreated={({ gl }) => {
          // Neutral keeps blues from shifting magenta the way ACES Filmic does.
          gl.toneMapping = THREE.NeutralToneMapping;
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
        <CameraRig />
        <Suspense fallback={null}>
          <SceneReady onReady={setReady} />
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
