import { Button } from "@mantine/core";
import { IconPalette } from "@tabler/icons-react";
import { useState } from "react";
import PaintRecipeEditorModal from "@/components/collection/paint/PaintRecipeEditorModal.tsx";
import type { PaintRecipes, RecipeTarget } from "@/hooks/collections/usePaintRecipes.ts";

type PaintRecipeButtonProps = Readonly<{
  paintRecipes: PaintRecipes;
  armyCollectionId: string;
  target: RecipeTarget;
  targetName?: string;
  label: string;
  size?: "xs" | "sm";
}>;

/**
 * Opens the recipe editor for one scope. Used for the collection-wide and per-type recipes, which
 * have no card of their own to hang an inline editor off.
 */
export default function PaintRecipeButton({
  paintRecipes,
  armyCollectionId,
  target,
  targetName,
  label,
  size = "xs",
}: PaintRecipeButtonProps) {
  const [opened, setOpened] = useState(false);
  const recipe = paintRecipes.recipeFor(target);

  return (
    <>
      <Button
        size={size}
        variant={recipe ? "light" : "subtle"}
        color="grape"
        leftSection={<IconPalette size={14} />}
        onClick={() => setOpened(true)}
      >
        {recipe ? label : `${label} (none yet)`}
      </Button>

      <PaintRecipeEditorModal
        opened={opened}
        onClose={() => setOpened(false)}
        target={target}
        armyCollectionId={armyCollectionId}
        targetName={targetName}
        recipe={recipe}
        paints={paintRecipes.paints}
        saving={paintRecipes.saving}
        onSave={paintRecipes.save}
      />
    </>
  );
}
