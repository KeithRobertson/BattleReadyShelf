import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { Paint, PaintRecipe, PaintRecipeScope, SavePaintRecipeRequest } from "@/generated";
import { getPaintRecipes, getPaints, savePaintRecipe } from "@/generated";
import { PAINT_RECIPES_KEY, PAINTS_KEY } from "@/queryKeys.ts";
import isInitialLoad from "@/utils/isInitialLoad.ts";

export type PaintRecipes = ReturnType<typeof usePaintRecipes>;

/** Identifies a recipe by what it hangs off, mirroring how the API addresses one. */
export type RecipeTarget = Readonly<{
  scope: PaintRecipeScope;
  modelDefinitionId?: string | null;
  collectionModelId?: string | null;
}>;

const EMPTY_RECIPES: PaintRecipe[] = [];
const EMPTY_PAINTS: Paint[] = [];

function matchesTarget(recipe: PaintRecipe, target: RecipeTarget): boolean {
  if (recipe.scope !== target.scope) return false;
  switch (target.scope) {
    case "COLLECTION":
      return true;
    case "MODEL_TYPE":
      return recipe.modelDefinitionId === target.modelDefinitionId;
    case "MODEL":
      return recipe.collectionModelId === target.collectionModelId;
  }
}

/**
 * The paint recipes attached anywhere in one collection, plus the paints available to name in them.
 *
 * Every recipe for the collection is fetched in a single request and matched client-side, because a
 * model card has to show not just its own recipe but the broader ones it inherits, and a per-card
 * request would mean one round trip per miniature on screen.
 */
export default function usePaintRecipes(collectionId: string | undefined) {
  const queryClient = useQueryClient();

  const recipesQuery = useQuery<PaintRecipe[]>({
    queryKey: [PAINT_RECIPES_KEY, collectionId],
    queryFn: async () => {
      if (!collectionId) return EMPTY_RECIPES;
      const response = await getPaintRecipes({
        path: { armyCollectionId: collectionId },
        throwOnError: true,
      });
      return response.data ?? EMPTY_RECIPES;
    },
    enabled: Boolean(collectionId),
    placeholderData: EMPTY_RECIPES,
  });

  const paintsQuery = useQuery<Paint[]>({
    queryKey: [PAINTS_KEY],
    queryFn: async () => (await getPaints({ throwOnError: true })).data ?? EMPTY_PAINTS,
    placeholderData: EMPTY_PAINTS,
  });

  const recipes = recipesQuery.data ?? EMPTY_RECIPES;
  const paints = paintsQuery.data ?? EMPTY_PAINTS;

  const saveMutation = useMutation({
    mutationFn: async (body: SavePaintRecipeRequest) => {
      const response = await savePaintRecipe({ body, throwOnError: true });
      return response.data ?? null;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PAINT_RECIPES_KEY, collectionId] });
    },
  });

  const recipeFor = useCallback(
    (target: RecipeTarget) => recipes.find((recipe) => matchesTarget(recipe, target)) ?? null,
    [recipes],
  );

  const save = useCallback(
    (body: SavePaintRecipeRequest) => saveMutation.mutateAsync(body),
    [saveMutation.mutateAsync],
  );

  const paintsById = useMemo(() => new Map(paints.map((paint) => [paint.id ?? "", paint])), [paints]);

  return {
    recipes,
    paints,
    paintsById,
    recipeFor,
    save,
    saving: saveMutation.isPending,
    loading:
      recipesQuery.isLoading ||
      isInitialLoad({ isFetching: recipesQuery.isFetching, isPlaceholderData: recipesQuery.isPlaceholderData }),
    error: recipesQuery.isError ? String(recipesQuery.error) : null,
  };
}
