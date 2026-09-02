import { ActionIcon, Group, Text } from "@mantine/core";
import { IconPalette } from "@tabler/icons-react";
import React, { useState } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import PaintRecipeEditorModal from "@/components/collection/paint/PaintRecipeEditorModal.tsx";
import PaintRecipeSummary from "@/components/collection/paint/PaintRecipeSummary.tsx";
import type { CollectionModel } from "@/generated";

export type ModelCardPaintsProps = Readonly<{
  model: CollectionModel;
  editMode: boolean;
}>;

/**
 * The paints specific to one miniature.
 *
 * Only this model's own recipe is shown, and only as the swatches marked for the card. The
 * collection-wide and per-type recipes it also inherits are rendered once above their respective
 * groups instead, because they are identical for every card underneath and repeating them would
 * bury whatever is actually different about this model.
 */
export const ModelCardPaints = React.memo(function ModelCardPaints({ model, editMode }: ModelCardPaintsProps) {
  const { paintRecipes, collection } = useCollectionContext();
  const [editing, setEditing] = useState(false);

  const target = { scope: "MODEL" as const, collectionModelId: model.id };
  const recipe = paintRecipes.recipeFor(target);
  const armyCollectionId = collection.collection?.id;

  if (!recipe && !editMode) return null;

  return (
    <>
      <Group gap={4} wrap="nowrap" justify="flex-end" align="center" style={{ width: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {recipe ? (
            <PaintRecipeSummary recipes={[recipe]} align="flex-end" compact />
          ) : (
            <Text size="xs" c="dimmed" ta="right">
              No paints recorded
            </Text>
          )}
        </div>
        {editMode && (
          <ActionIcon size="sm" variant="subtle" title="Edit paints for this model" onClick={() => setEditing(true)}>
            <IconPalette size={14} />
          </ActionIcon>
        )}
      </Group>

      {armyCollectionId && (
        <PaintRecipeEditorModal
          opened={editing}
          onClose={() => setEditing(false)}
          target={target}
          armyCollectionId={armyCollectionId}
          targetName={model.name?.trim() || "This model"}
          recipe={recipe}
          paints={paintRecipes.paints}
          saving={paintRecipes.saving}
          onSave={paintRecipes.save}
        />
      )}
    </>
  );
});
