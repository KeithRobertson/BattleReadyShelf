import { Card, Group, Stack, Text } from "@mantine/core";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import PaintRecipeButton from "@/components/collection/paint/PaintRecipeButton.tsx";
import PaintRecipeSummary from "@/components/collection/paint/PaintRecipeSummary.tsx";

/**
 * The collection-wide paint recipe, for the scheme that everything here shares.
 *
 * Shown as its own block near the top rather than repeated on each card: "everything is based
 * Fenrisian Grey" is a statement about the collection, and repeating it on fifty miniatures would
 * bury the per-model detail.
 */
export default function CollectionPaintRecipe() {
  const { collection, paintRecipes, isEditMode } = useCollectionContext();
  const armyCollectionId = collection.collection?.id;
  const recipe = paintRecipes.recipeFor({ scope: "COLLECTION" });

  if (!armyCollectionId) return null;
  // Nothing recorded and no way to record it: a viewer of someone else's collection sees nothing.
  if (!recipe && !(isEditMode && collection.isOwner)) return null;

  return (
    <Card withBorder radius="md" padding="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text fw={500} size="sm">
            Paints used throughout
          </Text>
          {isEditMode && collection.isOwner && (
            <PaintRecipeButton
              paintRecipes={paintRecipes}
              armyCollectionId={armyCollectionId}
              target={{ scope: "COLLECTION" }}
              targetName={collection.collection?.name ?? "Whole collection"}
              label="Edit"
            />
          )}
        </Group>

        {recipe ? (
          <PaintRecipeSummary recipes={[recipe]} />
        ) : (
          <Text size="xs" c="dimmed">
            Record a scheme every model here shares, so it does not have to be repeated on each one.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
