import { useState } from "react";
import type { CollectionModel } from "@/generated";
import type { SortDirection, SortField, SortOrder } from "@/types/ModelSort.ts";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus.ts";

export type ModelSort = ReturnType<typeof useModelSort>;

function compareStatus(a: CollectionModel, b: CollectionModel): number {
  const rankA = a.status ? COLLECTION_MODEL_STATUSES.indexOf(a.status) : -1;
  const rankB = b.status ? COLLECTION_MODEL_STATUSES.indexOf(b.status) : -1;
  return rankA - rankB;
}

function compareDate(a: CollectionModel, b: CollectionModel): number {
  const dateA = a.finishedOn;
  const dateB = b.finishedOn;
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateA.localeCompare(dateB);
}

function compareName(a: CollectionModel, b: CollectionModel): number {
  const nameA = a.name?.trim();
  const nameB = b.name?.trim();
  if (!nameA && !nameB) return 0;
  if (!nameA) return 1;
  if (!nameB) return -1;
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
}

export function useModelSort() {
  const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
    { value: "name-asc", label: "Name (A–Z)" },
    { value: "name-desc", label: "Name (Z–A)" },
    { value: "status-asc", label: "Status (Boxed → Painted)" },
    { value: "status-desc", label: "Status (Painted → Boxed)" },
    { value: "date-asc", label: "Date finished (oldest first)" },
    { value: "date-desc", label: "Date finished (newest first)" },
  ];

  const [sortOrder, setSortOrder] = useState<SortOrder>("name-asc");

  /** Sorts models by the chosen field/direction; models missing that field's value always sort to the end. */
  function sortModels(models: CollectionModel[], sortOrder: SortOrder): CollectionModel[] {
    const [field, dir] = sortOrder.split("-") as [SortField, SortDirection];
    const direction = dir === "asc" ? 1 : -1;

    const comparators: Record<SortField, (a: CollectionModel, b: CollectionModel) => number> = {
      status: compareStatus,
      date: compareDate,
      name: compareName,
    };

    const compare = comparators[field];

    return [...models].sort((a, b) => direction * compare(a, b));
  }

  return {
    sortOrder,
    setSortOrder,
    sortOptions: SORT_OPTIONS,
    sortModels,
  };
}
