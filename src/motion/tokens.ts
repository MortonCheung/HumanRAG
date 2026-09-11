/** Seconds for Motion/GSAP. DOM uses Motion; camera and spatial timelines use GSAP.
 * Anime remains scoped to teaching SVGs; Lottie only gives deterministic feedback. */
export const MOTION = {
  duration: {
    press: 0.14, micro: 0.20, content: 0.28, panel: 0.34, route: 0.42,
    cameraFocus: 0.72, cameraTravel: 0.82, opening: 2.0,
  },
  ease: {
    out: [0.16, 1, 0.3, 1] as const,
    standard: [0.22, 0.61, 0.36, 1] as const,
  },
  spring: {
    direct: { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.9 },
    soft: { type: 'spring' as const, stiffness: 300, damping: 34, mass: 1 },
  },
} as const;
