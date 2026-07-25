"use client";

import { useEffect, useState } from "react";
import type { MousePosition } from "@/lib/hero-webgl/config";

export function useHeroInteraction() {
  const [mouse, setMouse] = useState<MousePosition>({ x: 0, y: 0 });
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setInteractive(!reducedMotion && !coarsePointer);
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!interactive) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    });
  };

  const onPointerLeave = () => {
    setMouse({ x: 0, y: 0 });
  };

  return { mouse, interactive, onPointerMove, onPointerLeave };
}
