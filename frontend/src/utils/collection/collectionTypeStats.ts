import type { CollectionModel } from "@/generated";

export type TypeCountItem = { key: string; label: string; current: number; max: number };

function increment(map: Map<string, TypeCountItem>, key: string, label: string, field: "current" | "max") {
  const existing = map.get(key);
  if (existing) {
    existing[field] += 1;
    if (!existing.label && label) {
      existing.label = label;
    }
    return;
  }
  map.set(key, { key, label, current: field === "current" ? 1 : 0, max: field === "max" ? 1 : 0 });
}

export function modelIdentityIds(model: CollectionModel): string[] {
  const ids = new Set<string>();
  if (model.modelDefinitionId) {
    ids.add(model.modelDefinitionId);
  }
  for (const id of model.alternateModelDefinitionIds ?? []) {
    ids.add(id);
  }
  return [...ids];
}

export function modelMatchesTypeFilter(model: CollectionModel, typeFilter: string[]): boolean {
  if (typeFilter.length === 0) {
    return true;
  }
  return modelIdentityIds(model).some((id) => typeFilter.includes(id));
}

export function formatTypeCount(item: TypeCountItem): string {
  return item.current === item.max ? String(item.max) : `${item.current}–${item.max}`;
}

export function typeCounts(models: CollectionModel[], order: string[]): TypeCountItem[] {
  const byType = new Map<string, TypeCountItem>();
  for (const model of models) {
    const currentId = model.modelDefinitionId ?? "unknown";
    increment(byType, currentId, model.modelDefinition?.name ?? "Unknown type", "current");
    increment(byType, currentId, model.modelDefinition?.name ?? "Unknown type", "max");
    const alternateNames = new Map(
      (model.alternateModelDefinitions ?? []).map((definition) => [
        definition.id ?? "",
        definition.name ?? "Unknown type",
      ]),
    );
    for (const id of model.alternateModelDefinitionIds ?? []) {
      increment(byType, id, alternateNames.get(id) ?? "Unknown type", "max");
    }
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
