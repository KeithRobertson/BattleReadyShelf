import type { PaintRecipeScope } from "@/generated";

/** How each scope is described to the user. Kept here so the badge and the editor agree. */
export const PAINT_RECIPE_SCOPE_LABELS: Record<PaintRecipeScope, string> = {
  COLLECTION: "Whole collection",
  MODEL_TYPE: "All of this type",
  MODEL: "This model",
};

export const PAINT_RECIPE_SCOPE_COLOURS: Record<PaintRecipeScope, string> = {
  COLLECTION: "grape",
  MODEL_TYPE: "teal",
  MODEL: "blue",
};
