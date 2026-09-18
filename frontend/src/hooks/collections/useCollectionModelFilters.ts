import { useCallback, useMemo, useState } from "react";
import type { CollectionModel, Paint, PaintRecipe } from "@/generated";
import describePaint from "@/utils/collection/describePaint.ts";
import effectivePaintIds from "@/utils/collection/effectivePaintIds.ts";
import wargearNamesOnModel, { normalizeWargearName } from "@/utils/collection/wargearNamesOnModel.ts";

export type CollectionModelFilters = ReturnType<typeof useCollectionModelFilters>;

function paintsByIdFromRecipes(recipes: PaintRecipe[]): Map<string, Paint> {
  const paintsById = new Map<string, Paint>();
  for (const recipe of recipes) {
    for (const entry of recipe.paints ?? []) {
      if (entry.paintId && entry.paint && !paintsById.has(entry.paintId)) {
        paintsById.set(entry.paintId, entry.paint);
      }
    }
  }
  return paintsById;
}

function matchesTypeFilter(model: CollectionModel, typeFilter: string[]): boolean {
  if (typeFilter.length === 0) {
    return true;
  }
  return typeFilter.includes(model.modelDefinitionId ?? "unknown");
}

function matchesPaintFilter(model: CollectionModel, paintFilter: string[], recipes: PaintRecipe[]): boolean {
  if (paintFilter.length === 0) {
    return true;
  }
  const ids = effectivePaintIds(model, recipes);
  return paintFilter.some((paintId) => ids.has(paintId));
}

function matchesWargearFilter(model: CollectionModel, wargearFilter: string[]): boolean {
  if (wargearFilter.length === 0) {
    return true;
  }
  const names = new Set(wargearNamesOnModel(model).map(normalizeWargearName));
  return wargearFilter.some((name) => names.has(name));
}

export default function useCollectionModelFilters(models: CollectionModel[], recipes: PaintRecipe[]) {
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [paintFilter, setPaintFilter] = useState<string[]>([]);
  const [wargearFilter, setWargearFilter] = useState<string[]>([]);

  const typeOptions = useMemo(() => {
    const byType = new Map<string, { label: string; count: number }>();
    for (const model of models) {
      const value = model.modelDefinitionId ?? "unknown";
      const existing = byType.get(value);
      if (existing) {
        existing.count += 1;
      } else {
        byType.set(value, { label: model.modelDefinition?.name ?? "Unknown type", count: 1 });
      }
    }
    return [...byType.entries()]
      .map(([value, { label, count }]) => ({ value, label: `${label} (${count})`, name: label }))
      .toSorted((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [models]);

  const paintOptions = useMemo(() => {
    const paintsById = paintsByIdFromRecipes(recipes);
    const modelCounts = new Map<string, number>();

    for (const model of models) {
      for (const paintId of effectivePaintIds(model, recipes)) {
        modelCounts.set(paintId, (modelCounts.get(paintId) ?? 0) + 1);
      }
    }

    return [...modelCounts.entries()]
      .map(([value, count]) => {
        const paint = paintsById.get(value);
        const name = paint ? describePaint(paint) : "Unknown paint";
        return { value, label: `${name} (${count})`, name };
      })
      .toSorted((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [models, recipes]);

  const wargearOptions = useMemo(() => {
    const instanceCounts = new Map<string, { label: string; count: number }>();

    for (const model of models) {
      for (const name of wargearNamesOnModel(model)) {
        const key = normalizeWargearName(name);
        const existing = instanceCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          instanceCounts.set(key, { label: name, count: 1 });
        }
      }
    }

    return [...instanceCounts.entries()]
      .map(([value, { label, count }]) => ({
        value,
        label: `${label} (${count})`,
        name: label,
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [models]);

  const modelMatchesFilters = useCallback(
    (model: CollectionModel) =>
      matchesTypeFilter(model, typeFilter) &&
      matchesPaintFilter(model, paintFilter, recipes) &&
      matchesWargearFilter(model, wargearFilter),
    [paintFilter, recipes, typeFilter, wargearFilter],
  );

  const isFiltered = typeFilter.length > 0 || paintFilter.length > 0 || wargearFilter.length > 0;

  return {
    typeFilter,
    setTypeFilter,
    paintFilter,
    setPaintFilter,
    wargearFilter,
    setWargearFilter,
    typeOptions,
    paintOptions,
    wargearOptions,
    modelMatchesFilters,
    isFiltered,
  };
}
