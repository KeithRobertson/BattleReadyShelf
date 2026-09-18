import { Divider, Stack, Text, Title } from "@mantine/core";
import { AsideFilterRow } from "@/components/aside/AsideFilterRow.tsx";
import { CollectionStatsPanel } from "@/components/collections/CollectionStatsPanel.tsx";
import type { CollectionModel, CollectionModelStatus, PaintRecipe } from "@/generated";
import describePaint from "@/utils/collection/describePaint.ts";
import effectivePaintIds from "@/utils/collection/effectivePaintIds.ts";
import exclusiveFilterValue from "@/utils/collection/exclusiveFilterValue.ts";
import wargearNamesOnModel, { normalizeWargearName } from "@/utils/collection/wargearNamesOnModel.ts";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus.ts";

export type CollectionAsideFilters = Readonly<{
  statusFilter: CollectionModelStatus[];
  setStatusFilter: (value: CollectionModelStatus[]) => void;
  typeFilter: string[];
  setTypeFilter: (value: string[]) => void;
  paintFilter: string[];
  setPaintFilter: (value: string[]) => void;
  wargearFilter: string[];
  setWargearFilter: (value: string[]) => void;
}>;

export type CollectionAsideSummaryProps = Readonly<{
  collectionName: string;
  models: CollectionModel[];
  recipes: PaintRecipe[];
  modelDefinitionOrder: string[];
  filters: CollectionAsideFilters;
}>;

type CountItem = { key: string; label: string; count: number };

function incrementCount(used: Map<string, CountItem>, key: string, label: string) {
  const existing = used.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }
  used.set(key, { key, label, count: 1 });
}

function countsByStatus(models: CollectionModel[]): Record<CollectionModelStatus, number> {
  const counts = COLLECTION_MODEL_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<CollectionModelStatus, number>,
  );
  for (const model of models) {
    if (model.status) {
      counts[model.status] += 1;
    }
  }
  return counts;
}

function typeCounts(models: CollectionModel[], order: string[]): CountItem[] {
  const byType = new Map<string, CountItem>();
  for (const model of models) {
    incrementCount(byType, model.modelDefinitionId ?? "unknown", model.modelDefinition?.name ?? "Unknown type");
  }

  const orderIndex = new Map(order.map((id, index) => [id, index]));
  return [...byType.values()].toSorted((a, b) => {
    const aIndex = orderIndex.get(a.key);
    const bIndex = orderIndex.get(b.key);
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

function paintLabelsFromRecipes(recipes: PaintRecipe[]): Map<string, string> {
  const paintsById = new Map<string, string>();
  for (const recipe of recipes) {
    for (const entry of recipe.paints ?? []) {
      if (entry.paintId && entry.paint && !paintsById.has(entry.paintId)) {
        paintsById.set(entry.paintId, describePaint(entry.paint));
      }
    }
  }
  return paintsById;
}

function paintCounts(models: CollectionModel[], recipes: PaintRecipe[]): CountItem[] {
  const paintsById = paintLabelsFromRecipes(recipes);
  const used = new Map<string, CountItem>();
  for (const model of models) {
    for (const paintId of effectivePaintIds(model, recipes)) {
      incrementCount(used, paintId, paintsById.get(paintId) ?? "Unknown paint");
    }
  }
  return [...used.values()].toSorted((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

function wargearCounts(models: CollectionModel[]): CountItem[] {
  const used = new Map<string, CountItem>();
  for (const model of models) {
    for (const name of wargearNamesOnModel(model)) {
      incrementCount(used, normalizeWargearName(name), name);
    }
  }
  return [...used.values()].toSorted((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

function CountList({
  title,
  items,
  activeKeys,
  onSelect,
}: Readonly<{
  title: string;
  items: CountItem[];
  activeKeys: string[];
  onSelect: (key: string) => void;
}>) {
  if (items.length === 0) return null;
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {title}
      </Text>
      {items.map((item) => (
        <AsideFilterRow
          key={item.key}
          label={item.label}
          count={item.count}
          active={activeKeys.includes(item.key)}
          onClick={() => onSelect(item.key)}
        />
      ))}
    </Stack>
  );
}

export function CollectionAsideSummary({
  collectionName,
  models,
  recipes,
  modelDefinitionOrder,
  filters,
}: CollectionAsideSummaryProps) {
  function clearAllFilters() {
    filters.setStatusFilter([]);
    filters.setTypeFilter([]);
    filters.setPaintFilter([]);
    filters.setWargearFilter([]);
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={4}>{collectionName}</Title>
        <Text c="dimmed" size="sm">
          Overview of this collection. Click a summary to filter, or a model to inspect it.
        </Text>
      </div>
      <CollectionStatsPanel
        totalCount={models.length}
        countsByStatus={countsByStatus(models)}
        activeStatuses={filters.statusFilter}
        onStatusClick={(status) => filters.setStatusFilter(exclusiveFilterValue(filters.statusFilter, status))}
        onTotalClick={clearAllFilters}
      />
      <Divider />
      <CountList
        title="By type"
        items={typeCounts(models, modelDefinitionOrder)}
        activeKeys={filters.typeFilter}
        onSelect={(key) => filters.setTypeFilter(exclusiveFilterValue(filters.typeFilter, key))}
      />
      <CountList
        title="Paints"
        items={paintCounts(models, recipes)}
        activeKeys={filters.paintFilter}
        onSelect={(key) => filters.setPaintFilter(exclusiveFilterValue(filters.paintFilter, key))}
      />
      <CountList
        title="Wargear"
        items={wargearCounts(models)}
        activeKeys={filters.wargearFilter}
        onSelect={(key) => filters.setWargearFilter(exclusiveFilterValue(filters.wargearFilter, key))}
      />
    </Stack>
  );
}
