import type { MousePosition } from "@/lib/hero-webgl/config";

export type LanyardPalette = {
  strap: string;
  strapHighlight: string;
  clip: string;
  card: string;
  cardBorder: string;
  photo: string;
  photoRing: string;
  name: string;
  subtitle: string;
  stripe: string;
  stripeAccent: string;
  lanyardShadow: string;
  strapStitch: string;
};

export const lanyardConfig = {
  anchorY: 2.7,
  strapLength: 2.45,
  physics: {
    mouseForceX: 1.1,
    mouseForceZ: 1.6,
    restore: 18,
    settleRestore: 28,
    damping: 0.9,
    maxAngle: 0.28,
    nudgeImpulse: 0.55,
  },
  camera: {
    position: [0, 0.55, 6.35] as [number, number, number],
    lookAt: [0, 0.55, 0] as [number, number, number],
    fov: 42,
  },
  badge: {
    width: 1.28,
    height: 1.88,
    depth: 0.055,
    radius: 0.1,
    photoRadius: 0.34,
  },
  lanyard: {
    strapWidth: 0.1,
    strapThickness: 0.016,
    strapSpread: 0.088,
    topBarWidth: 0.36,
    topBarHeight: 0.05,
    topBarDepth: 0.035,
  },
} as const;

export const lanyardPalettes = {
  dark: {
    strap: "#6366f1",
    strapHighlight: "#818cf8",
    clip: "#94a3b8",
    card: "#1e1e2e",
    cardBorder: "#312e81",
    photo: "#4338ca",
    photoRing: "#6366f1",
    name: "#f8fafc",
    subtitle: "#a5b4fc",
    stripe: "#312e81",
    stripeAccent: "#818cf8",
    lanyardShadow: "#6366f1",
    strapStitch: "#312e81",
  },
  light: {
    strap: "#4338ca",
    strapHighlight: "#6366f1",
    clip: "#64748b",
    card: "#ffffff",
    cardBorder: "#c7d2fe",
    photo: "#4f46e5",
    photoRing: "#6366f1",
    name: "#0f172a",
    subtitle: "#4338ca",
    stripe: "#e0e7ff",
    stripeAccent: "#6366f1",
    lanyardShadow: "#6366f1",
    strapStitch: "#c7d2fe",
  },
} satisfies Record<"dark" | "light", LanyardPalette>;

export function getMouseForce(
  mouse: MousePosition,
  interactive: boolean,
  pointerActive: boolean
): { x: number; z: number } {
  if (!interactive || !pointerActive) return { x: 0, z: 0 };
  return {
    x: mouse.y * lanyardConfig.physics.mouseForceX,
    z: -mouse.x * lanyardConfig.physics.mouseForceZ,
  };
}
