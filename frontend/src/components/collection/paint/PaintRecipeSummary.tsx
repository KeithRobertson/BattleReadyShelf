import { Badge, Group, Stack, Text } from "@mantine/core";
import PaintSwatch from "@/components/paints/PaintSwatch.tsx";
import type { PaintRecipe } from "@/generated";
import { PAINT_RECIPE_SCOPE_COLOURS, PAINT_RECIPE_SCOPE_LABELS } from "@/utils/paintRecipeScope.ts";

type PaintRecipeSummaryProps = Readonly<{
  recipes: PaintRecipe[];
  /**
   * Whether to say which scope each block came from. Worth showing on a model card, which stacks
   * up to three inherited recipes, but noise on an editor that is only ever showing one.
   */
  showScope?: boolean;
  /**
   * Swatches only, limited to the steps marked for the card. A model card is a photo with a name
   * under it, so a full recipe read as text crowds out what the card is for - the colours alone
   * still say at a glance what the model is painted in, and the names are a tooltip away.
   */
  compact?: boolean;
  align?: "flex-start" | "flex-end";
}>;

/** What a swatch is called when hovered: the step it is for, then the paint. */
function swatchLabel(entry: PaintRecipe["paints"][number]) {
  const name = entry.paint?.name ?? "Unknown paint";
  return entry.stepLabel ? `${entry.stepLabel}: ${name}` : name;
}

/**
 * Read-only view of one or more paint recipes, broadest first.
 *
 * Recipes are shown stacked rather than merged: a collection-wide "everything is based Fenrisian
 * Grey" and a model's own highlight steps are different statements, and flattening them would lose
 * which one a user has to edit to change it.
 */
export default function PaintRecipeSummary({
  recipes,
  showScope,
  compact,
  align = "flex-start",
}: PaintRecipeSummaryProps) {
  if (recipes.length === 0) return null;

  if (compact) {
    const shown = recipes.flatMap((recipe) => recipe.paints.filter((entry) => entry.showOnCard !== false));
    if (shown.length === 0) return null;
    return (
      <Group gap={4} wrap="wrap" justify={align === "flex-end" ? "flex-end" : "flex-start"}>
        {shown.map((entry, index) => (
          <PaintSwatch
            // The same paint may legitimately appear twice (base and highlight), so the id alone is
            // not unique. This list is read-only, so the index is stable while it is rendered.
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable per-entry id exists
            key={`${entry.paintId}-${index}`}
            hexColour={entry.paint?.hexColour}
            label={swatchLabel(entry)}
            size={16}
          />
        ))}
      </Group>
    );
  }

  return (
    <Stack gap={6} align={align} style={{ width: "100%" }}>
      {recipes.map((recipe) => (
        <Stack key={recipe.id ?? recipe.scope} gap={4} align={align} style={{ width: "100%" }}>
          {showScope && (
            <Badge size="xs" variant="outline" color={PAINT_RECIPE_SCOPE_COLOURS[recipe.scope]}>
              {PAINT_RECIPE_SCOPE_LABELS[recipe.scope]}
            </Badge>
          )}

          {recipe.paints.length > 0 && (
            <Group gap={4} wrap="wrap" justify={align === "flex-end" ? "flex-end" : "flex-start"}>
              {recipe.paints.map((entry, index) => {
                const paint = entry.paint;
                const detail = [entry.stepLabel, entry.note].filter(Boolean).join(" — ");
                return (
                  <Badge
                    // The same paint may legitimately appear twice (base and highlight), so the id
                    // alone is not unique within a recipe. The order is assigned server-side and
                    // this list is read-only, so the index is stable for as long as it is rendered.
                    // biome-ignore lint/suspicious/noArrayIndexKey: no stable per-entry id exists
                    key={`${entry.paintId}-${index}`}
                    size="sm"
                    variant="light"
                    color="gray"
                    leftSection={<PaintSwatch hexColour={paint?.hexColour} label={paint?.name ?? "Paint"} />}
                    title={detail || undefined}
                    styles={{ label: { textTransform: "none" } }}
                  >
                    {entry.stepLabel ? `${entry.stepLabel}: ${paint?.name ?? "Unknown"}` : (paint?.name ?? "Unknown")}
                  </Badge>
                );
              })}
            </Group>
          )}

          {recipe.notes && (
            <Text
              size="xs"
              c="dimmed"
              style={{ whiteSpace: "pre-wrap", textAlign: align === "flex-end" ? "right" : "left" }}
            >
              {recipe.notes}
            </Text>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
