import { Badge, Box, Checkbox, Group, Image, Table, Text } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";
import React from "react";
import { LoadoutSummary } from "@/components/collection/LoadoutSummary.tsx";
import PaintRecipeSummary from "@/components/collection/paint/PaintRecipeSummary.tsx";
import { StatusHistory } from "@/components/collection/StatusHistory.tsx";
import type { CollectionModel, PaintRecipe } from "@/generated";
import isFromInteractiveTarget from "@/utils/collection/isFromInteractiveTarget.ts";
import { COLLECTION_MODEL_STATUS_COLORS, COLLECTION_MODEL_STATUS_LABELS } from "@/utils/collectionModelStatus.ts";

export type ModelRowProps = Readonly<{
  model: CollectionModel;
  editMode: boolean;
  selected: boolean;
  focused: boolean;
  recipe: PaintRecipe | null;
  onToggleSelected: (selected: boolean) => void;
  onToggleFocus: () => void;
}>;

function StatusBadge({ model }: Readonly<{ model: CollectionModel }>) {
  return (
    <Badge color={model.status ? COLLECTION_MODEL_STATUS_COLORS[model.status] : "gray"} variant="light" size="sm">
      {model.status ? COLLECTION_MODEL_STATUS_LABELS[model.status] : "Unknown"}
    </Badge>
  );
}

function PaintSummary({ recipe }: Readonly<{ recipe: PaintRecipe | null }>) {
  const shown = recipe?.paints.filter((entry) => entry.showOnCard !== false) ?? [];
  if (!recipe || shown.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  }
  return <PaintRecipeSummary recipes={[recipe]} compact />;
}

function Thumbnail({ model }: Readonly<{ model: CollectionModel }>) {
  const thumbnailUrl = model.images?.[0]?.thumbnailUrl;
  if (!thumbnailUrl) {
    return (
      <Box
        w={36}
        h={36}
        style={{
          flexShrink: 0,
          borderRadius: "var(--mantine-radius-sm)",
          border: "1px dashed var(--mantine-color-gray-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconPhoto size={16} color="var(--mantine-color-gray-5)" />
      </Box>
    );
  }

  return <Image src={thumbnailUrl} alt="" w={36} h={36} radius="sm" fit="cover" style={{ flexShrink: 0 }} />;
}

/**
 * One miniature in a type group. A row is the index: photo, name, status, loadout, paints, and
 * finished date. Editing happens in the aside after the row is focused.
 */
export const ModelRow = React.memo(function ModelRow({
  model,
  editMode,
  selected,
  focused,
  recipe,
  onToggleSelected,
  onToggleFocus,
}: ModelRowProps) {
  const displayName = model.name?.trim();
  const name = displayName || "Unnamed";

  return (
    <Table.Tr
      tabIndex={0}
      data-focused={focused || undefined}
      onClick={(event) => {
        if (!isFromInteractiveTarget(event.target)) {
          onToggleFocus();
        }
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleFocus();
        }
      }}
      style={{
        cursor: "pointer",
        backgroundColor: focused ? "var(--mantine-color-blue-light)" : undefined,
      }}
    >
      {editMode && (
        <Table.Td w={40}>
          <Checkbox
            checked={selected}
            onChange={(event) => onToggleSelected(event.currentTarget.checked)}
            aria-label={`Select ${name}`}
          />
        </Table.Td>
      )}
      <Table.Td>
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <Box
            w={4}
            h={28}
            mt={4}
            style={{
              flexShrink: 0,
              borderRadius: 2,
              background: model.status ? COLLECTION_MODEL_STATUS_COLORS[model.status] : "var(--mantine-color-gray-4)",
            }}
          />
          <Thumbnail model={model} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text
              size="sm"
              fw={500}
              truncate
              fs={displayName ? undefined : "italic"}
              c={displayName ? undefined : "dimmed"}
            >
              {name}
            </Text>
            <Group gap={6} mt={4} hiddenFrom="sm">
              <StatusBadge model={model} />
              <LoadoutSummary model={model} />
              <PaintSummary recipe={recipe} />
            </Group>
            <Box hiddenFrom="md">
              <StatusHistory model={model} />
            </Box>
          </div>
        </Group>
      </Table.Td>
      <Table.Td visibleFrom="sm" style={{ minWidth: 0 }}>
        <StatusBadge model={model} />
      </Table.Td>
      <Table.Td visibleFrom="sm" style={{ minWidth: 0 }}>
        <LoadoutSummary model={model} />
      </Table.Td>
      <Table.Td visibleFrom="sm" style={{ minWidth: 0 }}>
        <div style={{ width: "100%", minWidth: 0 }}>
          <PaintSummary recipe={recipe} />
        </div>
      </Table.Td>
      <Table.Td visibleFrom="md">
        <StatusHistory model={model} />
      </Table.Td>
    </Table.Tr>
  );
});
