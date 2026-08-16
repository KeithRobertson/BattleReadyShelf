import type { CollectionModelStatus } from "../generated";

/**
 * Statuses in painting-pipeline order, for consistent display/filtering across the app.
 * The "-ING" statuses are interstitial/in-progress markers between the completed milestones
 * (e.g. ASSEMBLING sits between BOXED and ASSEMBLED).
 */
export const COLLECTION_MODEL_STATUSES: CollectionModelStatus[] = [
  "BOXED",
  "ASSEMBLING",
  "ASSEMBLED",
  "PRIMING",
  "PRIMED",
  "PAINTING",
  "PAINTED",
];

export const COLLECTION_MODEL_STATUS_LABELS: Record<CollectionModelStatus, string> = {
  BOXED: "Boxed",
  ASSEMBLING: "Assembling",
  ASSEMBLED: "Assembled",
  PRIMING: "Priming",
  PRIMED: "Primed",
  PAINTING: "Painting",
  PAINTED: "Painted",
};

/**
 * A red-to-green gradient across the 7 pipeline stages, evenly spaced across the hue range
 * from red (0°, still in the box) to green (120°, fully painted/battle-ready), so the badge
 * colour itself visually communicates progress at a glance.
 */
export const COLLECTION_MODEL_STATUS_COLORS: Record<CollectionModelStatus, string> = {
  BOXED: "#b12525",
  ASSEMBLING: "#b15425",
  ASSEMBLED: "#b18225",
  PRIMING: "#b1b125",
  PRIMED: "#82b125",
  PAINTING: "#54b125",
  PAINTED: "#25b125",
};

/**
 * Very light/dark background tint per status, used for subtle card colouration. Each value uses the
 * CSS `light-dark()` function so the correct variant is picked automatically based on the active
 * Mantine colour scheme (Mantine keeps the standard `color-scheme` CSS property in sync with the
 * user's light/dark/auto preference) — components never need to branch on colour scheme themselves.
 */
export const COLLECTION_MODEL_STATUS_BACKGROUNDS: Record<CollectionModelStatus, string> = {
  BOXED: "light-dark(#fce9e9, #3a2323)",
  ASSEMBLING: "light-dark(#fcefe9, #3a2c23)",
  ASSEMBLED: "light-dark(#fcf5e9, #3a3423)",
  PRIMING: "light-dark(#fcfce9, #383a23)",
  PRIMED: "light-dark(#f5fce9, #2f3a23)",
  PAINTING: "light-dark(#effce9, #283a23)",
  PAINTED: "light-dark(#e9fce9, #233a23)",
};

export const COLLECTION_MODEL_STATUS_OPTIONS = COLLECTION_MODEL_STATUSES.map((status) => ({
  value: status,
  label: COLLECTION_MODEL_STATUS_LABELS[status],
}));
