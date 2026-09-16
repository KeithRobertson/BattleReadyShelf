import type { CollectionModel, PaintRecipe } from "@/generated";

function addPaintIds(ids: Set<string>, recipe: PaintRecipe | undefined) {
  for (const entry of recipe?.paints ?? []) {
    if (entry.paintId) {
      ids.add(entry.paintId);
    }
  }
}

/**
 * Paints that apply to this model: collection-wide, its type's recipe, and its own, unioned.
 *
 * Broader recipes are not overridden by more specific ones, so a collection-wide colour still
 * counts on every miniature underneath it.
 */
export default function effectivePaintIds(model: CollectionModel, recipes: PaintRecipe[]): Set<string> {
  const ids = new Set<string>();

  for (const recipe of recipes) {
    switch (recipe.scope) {
      case "COLLECTION":
        addPaintIds(ids, recipe);
        break;
      case "MODEL_TYPE":
        if (recipe.modelDefinitionId === model.modelDefinitionId) {
          addPaintIds(ids, recipe);
        }
        break;
      case "MODEL":
        if (recipe.collectionModelId === model.id) {
          addPaintIds(ids, recipe);
        }
        break;
    }
  }

  return ids;
}
