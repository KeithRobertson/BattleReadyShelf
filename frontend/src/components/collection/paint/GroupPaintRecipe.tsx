import { Card, Group, Stack, Text } from "@mantine/core";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import PaintRecipeButton from "@/components/collection/paint/PaintRecipeButton.tsx";
import PaintRecipeSummary from "@/components/collection/paint/PaintRecipeSummary.tsx";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";

export type GroupPaintRecipeProps = Readonly<{ group: ModelGroup }>;

/**
 * The recipe shared by every model of one type in this collection.
 *
 * It sits at the top of the group rather than on each card because it is identical for all of them;
 * only what differs between individual miniatures belongs on a card.
 */
export default function GroupPaintRecipe({ group }: GroupPaintRecipeProps) {
  const { collection, paintRecipes, isEditMode } = useCollectionContext();
  const armyCollectionId = collection.collection?.id;
  const target = { scope: "MODEL_TYPE" as const, modelDefinitionId: group.key };
  const recipe = paintRecipes.recipeFor(target);

  if (!armyCollectionId) return null;
  if (!recipe && !(isEditMode && collection.isOwner)) return null;

  return (
    <Card withBorder radius="sm" padding="xs">
      <Stack gap={6}>
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="xs" fw={500} c="dimmed">
            Paints for every {group.label}
          </Text>
          {isEditMode && collection.isOwner && (
            <PaintRecipeButton
              paintRecipes={paintRecipes}
              armyCollectionId={armyCollectionId}
              target={target}
              targetName={`All ${group.label}`}
              label="Edit"
            />
          )}
        </Group>

        {recipe && <PaintRecipeSummary recipes={[recipe]} />}
      </Stack>
    </Card>
  );
}
