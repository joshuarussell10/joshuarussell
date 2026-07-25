export type MousePosition = { x: number; y: number };

export type MorphPalette = {
  particle: string;
  glow: string;
};

export const morphConfig = {
  particleCount: 2200,
  text: "JR",
  camera: {
    position: [0, 0, 5.5] as [number, number, number],
    fov: 52,
  },
  shapes: {
    sphereRadius: 1.55,
    torusMajor: 1.15,
    torusMinor: 0.42,
    textSize: 1.15,
  },
  morph: {
    duration: 1.4,
    easePower: 2.2,
  },
  idle: {
    rotationSpeed: 0.08,
  },
  mouse: {
    lerp: 0.06,
    parallax: 0.18,
  },
  particle: {
    size: 0.028,
    opacity: 0.55,
    glowSize: 0.055,
    glowOpacity: 0.12,
  },
} as const;

export const morphPalettes = {
  dark: {
    particle: "#a5b4fc",
    glow: "#818cf8",
  },
  light: {
    particle: "#4338ca",
    glow: "#6366f1",
  },
} satisfies Record<"dark" | "light", MorphPalette>;

export type ShapeIndex = 0 | 1 | 2;

export const shapeLabels = ["Sphere", "Torus", "Initials"] as const;
