import type { CollectionModelStatus } from "../generated";

/** Statuses in painting-pipeline order, for consistent display/filtering across the app. */
export const COLLECTION_MODEL_STATUSES: CollectionModelStatus[] = ["BOXED", "ASSEMBLED", "PRIMED", "PAINTED"];

export const COLLECTION_MODEL_STATUS_LABELS: Record<CollectionModelStatus, string> = {
  BOXED: "Boxed",
  ASSEMBLED: "Assembled",
  PRIMED: "Primed",
  PAINTED: "Painted",
};

export const COLLECTION_MODEL_STATUS_COLORS: Record<CollectionModelStatus, string> = {
  BOXED: "gray",
  ASSEMBLED: "blue",
  PRIMED: "yellow",
  PAINTED: "green",
};

/** Very light background tint per status, used for subtle card colouration (kept low-contrast so it stays cohesive). */
export const COLLECTION_MODEL_STATUS_BACKGROUNDS: Record<CollectionModelStatus, string> = {
  BOXED: "var(--mantine-color-gray-0)",
  ASSEMBLED: "var(--mantine-color-blue-0)",
  PRIMED: "var(--mantine-color-yellow-0)",
  PAINTED: "var(--mantine-color-green-0)",
};

export const COLLECTION_MODEL_STATUS_OPTIONS = COLLECTION_MODEL_STATUSES.map((status) => ({
  value: status,
  label: COLLECTION_MODEL_STATUS_LABELS[status],
}));
