import type { MousePosition } from "@/lib/hero-webgl/config";

export type LanyardPalette = {
  /** Woven webbing base tone. */
  strap: string;
  /** Colour of the branding printed onto the webbing. */
  strapPrint: string;
  /** Thread colour of the stitched strap edges. */
  strapEdge: string;
  /** Brushed nickel hardware. */
  hardware: string;
  /** Unprinted PVC core visible on the card edge. */
  cardCore: string;
  /** Card artwork background. */
  cardBackground: string;
  cardBackgroundEdge: string;
  /** Brand accent used for header/footer bands. */
  accent: string;
  accentDeep: string;
  /** Text tones. */
  ink: string;
  inkMuted: string;
  inkFaint: string;
  hairline: string;
  /** Portrait panel gradient. */
  photoTop: string;
  photoBottom: string;
  photoFigure: string;
  /** Reverse-side details. */
  magStripe: string;
  signatureStrip: string;
  /** Projected shadow tint. */
  shadow: string;
  /** Base tone of the baked studio environment, driving metal reflections. */
  environment: string;
};

/**
 * Card proportions follow ISO/IEC 7810 ID-1 (54 x 85.6 x 0.76 mm) held in
 * portrait, scaled so that 1 unit ~= 47 mm. Everything else is measured
 * against that so the hardware and webbing stay believable next to it.
 */
export const lanyardConfig = {
  camera: {
    position: [0.12, -0.35, 7.6] as [number, number, number],
    /**
     * Aimed low and left so the badge sits upper-right in the tall side
     * canvas: straps run off the top edge, and the soft shadow has room to
     * fall away left and down without hitting the frame.
     */
    lookAt: [-0.02, -0.45, 0] as [number, number, number],
    fov: 27,
  },
  card: {
    width: 1.16,
    height: 1.84,
    thickness: 0.028,
    corner: 0.075,
    bevel: 0.0035,
    slot: {
      width: 0.34,
      height: 0.052,
      /** Distance from the top edge down to the slot centre. */
      inset: 0.085,
    },
    /** Holographic overlay patch, sat over the corner of the portrait. */
    hologram: {
      radius: 0.085,
      x: 0.26,
      y: -0.19,
    },
  },
  webbing: {
    /** Pinned ends sit just above the viewport so the strands run off-frame. */
    anchorY: 2.85,
    anchorSpread: 0.82,
    anchorZ: -0.03,
    /** Where the strands meet at rest; sets the overall rope length. */
    crimpRestY: 0.62,
    /** 12 mm flat woven polyester at the card's 54 mm reference width. */
    width: 0.26,
    thickness: 0.014,
    /** Rope resolution: must stay even so the junction lands on a vertex. */
    segments: 44,
    /** Extra length over the straight-line run, giving the strands their sag. */
    slack: 1.035,
    /** World length covered by one repeat of the webbing texture. */
    textureRepeatLength: 1.04,
  },
  hardware: {
    /** Crimp centre down to the top edge of the card. */
    drop: 0.22,
    crimpWidth: 0.28,
    crimpHeight: 0.13,
    crimpDepth: 0.055,
    /**
     * Local +Y of the hardware group where the webbing enters the crimp.
     * Matches the top face of the RoundedBox crimp mesh.
     */
    crimpEntryY: 0.035,
    /**
     * Half-spacing of the two strap ends across the crimp mouth. Keeps the
     * weave from covering the barrel face the way a single shared tip would.
     */
    crimpEntrySpread: 0.048,
    /**
     * Push the metal slightly in front of the strap centreline so the clasp
     * always reads as clamping onto the weave, not sitting inside it.
     */
    crimpFrontBias: 0.024,
    stemRadius: 0.024,
    hookRadius: 0.05,
    hookTube: 0.016,
    ringRadius: 0.058,
    ringTube: 0.015,
  },
  physics: {
    /**
     * True-scale gravity here would be ~215 u/s². Pulled back so the badge
     * swings with a little more weight and grace than a real one.
     */
    gravity: -128,
    /** Fraction of velocity retained after one second. */
    ropeRetention: 0.09,
    cardRetention: 0.2,
    substep: 1 / 120,
    maxSubsteps: 5,
    iterations: 16,
    /** Rope points are light, the laminated card is comparatively heavy. */
    ropeInvMass: 1,
    cardInvMass: 0.4,
    /** How strongly the slot resists rolling on its hook (0–1). */
    rollStiffness: 0.22,
    /** Lateral/depth push from the pointer. */
    pointerForce: 34,
    pointerDepthForce: 22,
    /**
     * The card turns to face the pointer. Nothing in a free hinge restores
     * yaw, so this is driven as a servo toward a target angle instead of a
     * raw torque, which would just spin the badge forever.
     */
    maxYaw: 0.75,
    yawGain: 105,
    yawDamping: 9,
    /** How quickly the raw pointer position is followed. */
    pointerLerp: 4.2,
    /** Idle air current so the badge is never perfectly still. */
    breeze: 2.4,
    /** Simulation steps run before the first frame so it starts settled. */
    warmupSteps: 320,
  },
} as const;

export const lanyardPalettes = {
  dark: {
    strap: "#3730a3",
    strapPrint: "#c7d2fe",
    strapEdge: "#1e1b4b",
    hardware: "#b9bec9",
    cardCore: "#e8eaf0",
    cardBackground: "#171826",
    cardBackgroundEdge: "#0d0e18",
    accent: "#6366f1",
    accentDeep: "#3730a3",
    ink: "#f5f6fb",
    inkMuted: "#a5b0d0",
    inkFaint: "#6b7392",
    hairline: "#2b2d44",
    photoTop: "#2e3150",
    photoBottom: "#191b2c",
    photoFigure: "#535a86",
    magStripe: "#0a0a12",
    signatureStrip: "#e6e3da",
    shadow: "#05060c",
    environment: "#20232f",
  },
  light: {
    strap: "#4338ca",
    strapPrint: "#dfe3ff",
    strapEdge: "#312e81",
    hardware: "#aeb4c0",
    cardCore: "#ffffff",
    cardBackground: "#f7f8fc",
    cardBackgroundEdge: "#e6e9f4",
    accent: "#4f46e5",
    accentDeep: "#312e81",
    ink: "#111428",
    inkMuted: "#5b6280",
    inkFaint: "#9aa1bb",
    hairline: "#d8dcea",
    photoTop: "#d3daf0",
    photoBottom: "#a3adcb",
    photoFigure: "#737c9e",
    magStripe: "#14151d",
    signatureStrip: "#fbf9f2",
    shadow: "#1b2340",
    environment: "#9aa3ba",
  },
} satisfies Record<"dark" | "light", LanyardPalette>;

export type PointerInput = { x: number; y: number };

export function getPointerInput(
  mouse: MousePosition,
  interactive: boolean,
  pointerActive: boolean
): PointerInput {
  if (!interactive || !pointerActive) return { x: 0, y: 0 };
  return { x: mouse.x, y: mouse.y };
}
