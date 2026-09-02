import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaintPicker from "@/components/collection/paint/PaintPicker.tsx";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import type { Paint, PaintRecipe, PaintRecipeEntry, SavePaintRecipeRequest } from "@/generated";
import type { RecipeTarget } from "@/hooks/collections/usePaintRecipes.ts";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";
import { PAINT_RECIPE_SCOPE_LABELS } from "@/utils/paintRecipeScope.ts";

/** A step being edited. `paint` is held alongside the id so the swatch renders without a lookup. */
type StepDraft = {
  /** Local only, so React keeps inputs attached to their row when steps are reordered or removed. */
  key: string;
  paint: Paint | null;
  stepLabel: string;
  note: string;
  showOnCard: boolean;
};

type PaintRecipeEditorModalProps = Readonly<{
  opened: boolean;
  onClose: () => void;
  target: RecipeTarget;
  armyCollectionId: string;
  /** What the recipe is attached to, e.g. the model or model type name, for the modal title. */
  targetName?: string;
  recipe: PaintRecipe | null;
  paints: Paint[];
  saving: boolean;
  onSave: (request: SavePaintRecipeRequest) => Promise<unknown>;
}>;

let nextKey = 0;

/**
 * How many steps are marked for the card by default. A card has room for only a few swatches, and
 * the opening steps are usually a recipe's defining colours.
 */
const DEFAULT_CARD_SWATCHES = 3;

function toDraft(entry: PaintRecipeEntry): StepDraft {
  nextKey += 1;
  return {
    key: `step-${nextKey}`,
    paint: entry.paint ?? null,
    stepLabel: entry.stepLabel ?? "",
    note: entry.note ?? "",
    showOnCard: entry.showOnCard !== false,
  };
}

function emptyDraft(showOnCard: boolean): StepDraft {
  nextKey += 1;
  return { key: `step-${nextKey}`, paint: null, stepLabel: "", note: "", showOnCard };
}

export default function PaintRecipeEditorModal({
  opened,
  onClose,
  target,
  armyCollectionId,
  targetName,
  recipe,
  paints,
  saving,
  onSave,
}: PaintRecipeEditorModalProps) {
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset from the stored recipe each time the modal is opened, so cancelling really does discard.
  useEffect(() => {
    if (!opened) return;
    setSteps((recipe?.paints ?? []).map(toDraft));
    setNotes(recipe?.notes ?? "");
    setError(null);
  }, [opened, recipe]);

  function updateStep(key: string, patch: Partial<StepDraft>) {
    setSteps((current) => current.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }

  function moveStep(index: number, delta: number) {
    setSteps((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    // A step with no paint chosen is an unfinished row rather than a deliberate blank, so it is
    // dropped instead of failing the save.
    const chosen = steps.filter((step) => step.paint !== null);
    setError(null);
    try {
      await onSave({
        scope: target.scope,
        armyCollectionId,
        modelDefinitionId: target.modelDefinitionId ?? null,
        collectionModelId: target.collectionModelId ?? null,
        notes: notes.trim() === "" ? null : notes.trim(),
        paints: chosen.map((step) => ({
          paintId: step.paint?.id ?? "",
          stepLabel: step.stepLabel.trim() === "" ? null : step.stepLabel.trim(),
          note: step.note.trim() === "" ? null : step.note.trim(),
          showOnCard: step.showOnCard,
        })),
      });
      onClose();
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  }

  const willClear = steps.every((step) => step.paint === null) && notes.trim() === "";

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={`Paints — ${targetName ?? PAINT_RECIPE_SCOPE_LABELS[target.scope]}`}
      footer={
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {willClear && recipe ? "Remove recipe" : "Save"}
          </Button>
        </Group>
      }
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {target.scope === "COLLECTION"
            ? "These paints apply to every model in the collection, so a shared base coat only has to be recorded once."
            : "These paints are shown alongside anything inherited from the collection."}
        </Text>

        {error && (
          <Alert color="red" title="Could not save">
            {error}
          </Alert>
        )}

        {steps.map((step, index) => (
          <Card key={step.key} withBorder radius="sm" padding="xs">
            <Stack gap="xs">
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <PaintPicker
                    paints={paints}
                    value={step.paint}
                    onChange={(paint) => updateStep(step.key, { paint })}
                  />
                </div>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Move earlier"
                  disabled={index === 0}
                  onClick={() => moveStep(index, -1)}
                >
                  <IconArrowUp size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Move later"
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(index, 1)}
                >
                  <IconArrowDown size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Remove this paint"
                  onClick={() => setSteps((current) => current.filter((s) => s.key !== step.key))}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>

              <Group gap="xs" grow wrap="wrap">
                <TextInput
                  size="xs"
                  placeholder="Step, e.g. Base"
                  value={step.stepLabel}
                  onChange={(e) => updateStep(step.key, { stepLabel: e.currentTarget.value })}
                />
                <TextInput
                  size="xs"
                  placeholder="Note, e.g. thinned 2:1"
                  value={step.note}
                  onChange={(e) => updateStep(step.key, { note: e.currentTarget.value })}
                />
              </Group>

              <Checkbox
                size="xs"
                label="Show on the model card"
                checked={step.showOnCard}
                onChange={(e) => updateStep(step.key, { showOnCard: e.currentTarget.checked })}
              />
            </Stack>
          </Card>
        ))}

        <Group justify="space-between">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={() => setSteps((current) => [...current, emptyDraft(current.length < DEFAULT_CARD_SWATCHES)])}
          >
            Add a paint
          </Button>
          <Anchor component={Link} to="/my/paints" size="xs">
            Manage my paints
          </Anchor>
        </Group>

        <Textarea
          label="How they are used"
          placeholder="Basecoat, wash, then edge highlight..."
          autosize
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />
      </Stack>
    </ResponsiveModal>
  );
}
