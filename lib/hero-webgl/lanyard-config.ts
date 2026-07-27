import type { MousePosition } from "@/lib/hero-webgl/config";

export type LanyardPalette = {
  /** Round braided cord base tone. */
  strap: string;
  /** Colour of the branding printed onto the cord. */
  strapPrint: string;
  /** Reserved cord accent (unused on round braid; kept for palette parity). */
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
 * against that so the hardware and cord stay believable next to it.
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
    /**
     * Laminated PVC never sits dead flat. A shallow curl across the width
     * makes the highlight sweep the face as the badge turns, instead of the
     * whole card flashing at once the way a perfect plane does.
     */
    bow: 0.017,
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
    /** Keep the pins in the clasp plane so the V reads as straight on screen. */
    anchorZ: 0,
    /** Where the strands meet at rest; sets the overall rope length. */
    crimpRestY: 0.537,
    /**
     * Round braided polyester cord. ~2.6 mm at the card's 54 mm reference
     * width — a typical badge-string diameter, not a flat tape.
     */
    diameter: 0.055,
    /** Points around the circular cross-section. */
    profileSegments: 16,
    /**
     * Gentle helical roll so the braid catches light as the cord swings.
     * Peaks at mid-span and falls to zero at the shoulders and the tip.
     */
    twist: 0.12,
    /** Rope resolution: must stay even so the junction lands on a vertex. */
    segments: 44,
    /**
     * Extra length over the straight-line run. A hair over 1 keeps the cord
     * from buckling under its own constraints while still reading as taut.
     */
    slack: 1.004,
    /**
     * World length covered by one repeat of the cord texture. Sized so the
     * braid diamonds stay roughly square around the circumference.
     */
    textureRepeatLength: 0.18,
  },
  /**
   * The clasp is measured downward from the crimp centre, which sits at the
   * rope's junction particle. Each stage hands its lower edge to the next, so
   * the barrel, swivel and claw stay a single assembly whichever dimension
   * is retuned.
   */
  hardware: {
    /**
     * Crimp centre down to the top edge of the card. The claw throat seats
     * on the punch:
     *   -(clawApexY - clawLength * 0.68) - slot.inset
     */
    drop: 0.138,

    /** Folded sheet-metal tip that clamps both cord ends. */
    crimpWidth: 0.122,
    crimpDepth: 0.056,
    /** Fraction of the width still left where the barrel meets the swivel. */
    crimpWaist: 0.55,
    /** Top of the barrel in hardware-local space. */
    crimpTopY: 0.04,
    /** Bottom of the barrel, and the top of the swivel stack. */
    swivelTopY: -0.062,
    /**
     * Cord tips stop just above the barrel lip. Ending outside the metal
     * volume is what stops the braid painting through the pressed face —
     * round cord is thick enough that any path into the barrel intersects it.
     */
    crimpEntryY: 0.048,
    /**
     * Half-spacing of the two cord ends across the mouth.
     */
    crimpEntrySpread: 0.018,
    /**
     * Unused for tip depth now that tips stay in the cord plane; kept so
     * older call sites that still read it don't go undefined.
     */
    crimpEntryDepth: 0,
    /**
     * Pull the barrel clear in front of the cord plane.
     */
    crimpFrontBias: 0.05,

    swivelRadius: 0.02,
    stemRadius: 0.012,

    /** Lobster claw, hooked through the card's punched slot. */
    clawApexY: -0.155,
    clawLength: 0.1,
    clawWidth: 0.072,
    clawTube: 0.0088,
    gateTube: 0.0048,
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
    iterations: 20,
    /**
     * How strongly each strand is pulled toward the straight chord between
     * its pin and the crimp (0–1). Round cord needs this; flat webbing hid
     * the same bow behind its width.
     */
    straightness: 0.7,
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
    breeze: 0.45,
    /** Simulation steps run before the first frame so it starts settled. */
    warmupSteps: 400,
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
    environment: "#171922",
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
    // Deliberately darker than the page: the studio panels supply the
    // highlights, and the gap between them is what makes the metal read as
    // metal rather than pale plastic.
    environment: "#6d7488",
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
