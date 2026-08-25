import { useMemo } from "react";
import type { ArmyCollection, CollectionModel, CollectionModelStatus } from "@/generated";
import type { SortOrder } from "@/types/ModelSort";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus.ts";

export interface ModelGroup {
  key: string;
  label: string;
  models: CollectionModel[];
}

export type GroupedModels = ReturnType<typeof useGroupedModels>;

export default function useGroupedModels(
  models: CollectionModel[],
  collection: ArmyCollection | null,
  sortOrder: SortOrder,
  statusFilter: CollectionModelStatus[],
  sortModels: (models: CollectionModel[], sortOrder: SortOrder) => CollectionModel[],
) {
  const statusCounts = useMemo(() => {
    const counts = new Map<CollectionModelStatus, number>();

    for (const model of models) {
      if (model.status) {
        counts.set(model.status, (counts.get(model.status) ?? 0) + 1);
      }
    }

    return COLLECTION_MODEL_STATUSES.map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    })).filter((entry) => entry.count > 0);
  }, [models]);

  const groupedModels = useMemo<ModelGroup[]>(() => {
    const filtered =
      statusFilter.length === 0 ? models : models.filter((m) => m.status && statusFilter.includes(m.status));

    const groups = new Map<string, ModelGroup>();

    for (const m of filtered) {
      const key = m.modelDefinitionId ?? "unknown";
      const label = m.modelDefinition?.name ?? "Unknown type";

      const existing = groups.get(key);
      if (existing) {
        existing.models.push(m);
      } else {
        groups.set(key, { key, label, models: [m] });
      }
    }

    const orderIndex = new Map((collection?.modelDefinitionOrder ?? []).map((id, i) => [id, i]));

    const sortedGroups = [...groups.values()].sort((a, b) => {
      const aIndex = orderIndex.get(a.key);
      const bIndex = orderIndex.get(b.key);

      if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
      if (aIndex !== undefined) return -1;
      if (bIndex !== undefined) return 1;

      return a.label.localeCompare(b.label);
    });

    return sortedGroups.map((group) => ({
      ...group,
      models: sortModels(group.models, sortOrder),
    }));
  }, [models, sortOrder, statusFilter, collection?.modelDefinitionOrder, sortModels]);

  return {
    groupedModels,
    statusCounts,
  };
}
