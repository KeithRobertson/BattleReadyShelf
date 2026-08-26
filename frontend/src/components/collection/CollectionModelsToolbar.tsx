import { Badge, Button, Group, MultiSelect, Select, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import type { CollectionModel, CollectionModelStatus } from "@/generated";
import type { SortOrder } from "@/types/ModelSort.ts";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUS_OPTIONS,
} from "@/utils/collectionModelStatus.ts";

function getSelectionText({
  isEditMode,
  selection,
  statusFilter,
  shownCount,
  collectionModelsCount,
}: {
  isEditMode: boolean;
  selection: { selectedModelIds: Set<string> };
  statusFilter: CollectionModelStatus[];
  shownCount: number;
  collectionModelsCount: number;
}) {
  if (isEditMode) {
    return selection.selectedModelIds.size > 0
      ? `${selection.selectedModelIds.size} selected`
      : "Select models to bulk delete";
  }

  if (statusFilter.length > 0) {
    return `${shownCount} of ${collectionModelsCount} model${collectionModelsCount === 1 ? "" : "s"}`;
  }

  return `${shownCount} model${shownCount === 1 ? "" : "s"}`;
}

export type CollectionModelsToolbarProps = Readonly<{
  isEditMode: boolean;

  statusFilter: CollectionModelStatus[];
  setStatusFilter: (value: CollectionModelStatus[]) => void;

  groupedModels: {
    groupedModels: { models: CollectionModel[] }[];
    statusCounts: { status: CollectionModelStatus; count: number }[];
  };

  collectionModelsCount: number;

  selection: {
    selectedModelIds: Set<string>;
  };

  modelSort: {
    sortOptions: { value: string; label: string }[];
    sortOrder: SortOrder;
    setSortOrder: (order: SortOrder) => void;
  };

  deletion: {
    requestBulkDelete: (ids: Set<string>) => void;
  };
}>;

export function CollectionModelsToolbar({
  isEditMode,
  statusFilter,
  setStatusFilter,
  groupedModels,
  collectionModelsCount,
  selection,
  modelSort,
  deletion,
}: CollectionModelsToolbarProps) {
  const shownCount = groupedModels.groupedModels.reduce((sum, g) => sum + g.models.length, 0);

  const toggleStatusFilter = useCallback(
    (status: CollectionModelStatus) => {
      setStatusFilter(
        statusFilter.includes(status) ? statusFilter.filter((s) => s !== status) : [...statusFilter, status],
      );
    },
    [statusFilter, setStatusFilter],
  );

  return (
    <Group justify="space-between" wrap="wrap">
      <Group gap="xs" wrap="wrap">
        <Text size="sm" c="dimmed">
          {getSelectionText({ isEditMode, selection, statusFilter, shownCount, collectionModelsCount })}
        </Text>

        {!isEditMode &&
          groupedModels.statusCounts.map(({ status, count }) => {
            const isActive = statusFilter.includes(status);

            return (
              <Badge
                key={status}
                color={COLLECTION_MODEL_STATUS_COLORS[status]}
                variant={isActive ? "filled" : "light"}
                size="sm"
                role="button"
                tabIndex={0}
                onClick={() => toggleStatusFilter(status)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleStatusFilter(status);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                {COLLECTION_MODEL_STATUS_LABELS[status]}: {count}
              </Badge>
            );
          })}
      </Group>

      <Group gap="sm" align="flex-end">
        <MultiSelect
          label="Filter by status"
          placeholder={statusFilter.length === 0 ? "All" : undefined}
          data={COLLECTION_MODEL_STATUS_OPTIONS}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as CollectionModelStatus[])}
          w={220}
          size="xs"
          clearable
        />

        <Select
          label="Sort by"
          data={modelSort.sortOptions}
          value={modelSort.sortOrder}
          onChange={(value) => value && modelSort.setSortOrder(value as SortOrder)}
          w={220}
          size="xs"
          allowDeselect={false}
        />

        {isEditMode && (
          <Button
            color="red"
            variant="light"
            size="xs"
            leftSection={<IconTrash size={14} />}
            onClick={() => deletion.requestBulkDelete(selection.selectedModelIds)}
            disabled={selection.selectedModelIds.size === 0}
          >
            Delete selected
          </Button>
        )}
      </Group>
    </Group>
  );
}
