import type { CollectionModel, PaintRecipe } from "@/generated";

/**
 * Paint recipes that apply to this model, broadest first: collection-wide, then its type, then
 * the miniature itself. Matches how {@link effectivePaintIds} unions paints, but keeps each recipe
 * as a distinct block so the inspector can label where a colour came from.
 */
export default function effectivePaintRecipes(model: CollectionModel, recipes: PaintRecipe[]): PaintRecipe[] {
  const collection: PaintRecipe[] = [];
  const modelType: PaintRecipe[] = [];
  const own: PaintRecipe[] = [];

  for (const recipe of recipes) {
    switch (recipe.scope) {
      case "COLLECTION":
        collection.push(recipe);
        break;
      case "MODEL_TYPE":
        if (recipe.modelDefinitionId === model.modelDefinitionId) {
          modelType.push(recipe);
        }
        break;
      case "MODEL":
        if (recipe.collectionModelId === model.id) {
          own.push(recipe);
        }
        break;
    }
  }

  return [...collection, ...modelType, ...own];
}
