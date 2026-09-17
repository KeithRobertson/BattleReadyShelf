import { Badge, Button, Group, Image, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconCalendar, IconPhoto } from "@tabler/icons-react";
import PaintRecipeSummary from "@/components/collection/paint/PaintRecipeSummary.tsx";
import ModelDefinitionOriginBadge from "@/components/modeldefinitions/ModelDefinitionOriginBadge.tsx";
import type { CollectionModel, PaintRecipe } from "@/generated";
import effectivePaintRecipes from "@/utils/collection/effectivePaintRecipes.ts";
import { COLLECTION_MODEL_STATUS_COLORS, COLLECTION_MODEL_STATUS_LABELS } from "@/utils/collectionModelStatus.ts";

export type CollectionModelInspectorProps = Readonly<{
  model: CollectionModel;
  recipes: PaintRecipe[];
  onBack: () => void;
}>;

function wargearBadgeColor(optionName: string | undefined, customLabel: string | null | undefined): string {
  if (optionName) return "blue";
  if (customLabel) return "grape";
  return "gray";
}

export function CollectionModelInspector({ model, recipes, onBack }: CollectionModelInspectorProps) {
  const displayName = model.name?.trim() || "Unnamed";
  const description = model.description?.trim();
  const images = model.images ?? [];
  const attachmentSlots = model.modelDefinition?.attachmentSlots ?? [];
  const wargearOptions = model.modelDefinition?.wargearOptions ?? [];
  const paintRecipes = effectivePaintRecipes(model, recipes);

  return (
    <Stack gap="md">
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconArrowLeft size={14} />}
        onClick={onBack}
        justify="flex-start"
      >
        Back to summary
      </Button>

      <div>
        <Group gap="xs" wrap="wrap" mb={4}>
          <Badge variant="light">{model.modelDefinition?.name ?? "Unknown type"}</Badge>
          {model.modelDefinition && <ModelDefinitionOriginBadge definition={model.modelDefinition} />}
          <Badge color={model.status ? COLLECTION_MODEL_STATUS_COLORS[model.status] : "gray"} variant="light">
            {model.status ? COLLECTION_MODEL_STATUS_LABELS[model.status] : "Unknown"}
          </Badge>
        </Group>
        <Title order={4}>{displayName}</Title>
      </div>

      {images.length > 0 ? (
        <Stack gap="xs">
          {images.map((image) => (
            <Image
              key={image.id}
              src={image.largeUrl ?? image.thumbnailUrl}
              alt={displayName}
              radius="sm"
              fit="contain"
              mah={240}
            />
          ))}
        </Stack>
      ) : (
        <Group
          justify="center"
          align="center"
          h={120}
          style={{
            border: "1px dashed var(--mantine-color-gray-4)",
            borderRadius: "var(--mantine-radius-sm)",
          }}
        >
          <IconPhoto size={24} color="var(--mantine-color-gray-5)" />
        </Group>
      )}

      {description && (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {description}
        </Text>
      )}

      <Group gap={6} wrap="nowrap">
        <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
        <Text size="xs" c="dimmed">
          {model.finishedOn ? `Finished ${model.finishedOn}` : "Not finished"}
        </Text>
      </Group>

      {attachmentSlots.length > 0 && (
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Loadout
          </Text>
          {attachmentSlots.map((slot) => {
            const currentSelection = model.wargearSelections?.find(
              (selection) => selection.attachmentSlotId === slot.id,
            );
            const optionName = wargearOptions.find((option) => option.id === currentSelection?.wargearOptionId)?.name;
            const displayLabel = optionName ?? currentSelection?.customLabel;
            return (
              <Group key={slot.id} justify="space-between" gap={8} wrap="nowrap">
                <Text size="xs" c="dimmed" truncate>
                  {slot.name}
                </Text>
                <Badge
                  variant="light"
                  color={wargearBadgeColor(optionName, currentSelection?.customLabel)}
                  size="sm"
                  title={currentSelection?.customLabel ? "Custom..." : undefined}
                >
                  {displayLabel ?? "Unassigned"}
                </Badge>
              </Group>
            );
          })}
        </Stack>
      )}

      <Stack gap={4}>
        <Text size="sm" fw={600}>
          Paints
        </Text>
        {paintRecipes.length > 0 ? (
          <PaintRecipeSummary recipes={paintRecipes} showScope />
        ) : (
          <Text size="xs" c="dimmed">
            No paints recorded
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
