import type { CollectionModel, CollectionModelStatus } from "@/generated";
import type { SortOrder } from "@/types/ModelSort.ts";

export type CollectionModelsToolbarProps = {
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
};
