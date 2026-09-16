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

export default function useCollectionModelFilters(models: CollectionModel[], recipes: PaintRecipe[]) {
  const [paintFilter, setPaintFilter] = useState<string[]>([]);
  const [wargearFilter, setWargearFilter] = useState<string[]>([]);

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
    (model: CollectionModel) => {
      if (paintFilter.length > 0) {
        const ids = effectivePaintIds(model, recipes);
        if (!paintFilter.some((paintId) => ids.has(paintId))) {
          return false;
        }
      }

      if (wargearFilter.length > 0) {
        const names = new Set(wargearNamesOnModel(model).map(normalizeWargearName));
        if (!wargearFilter.some((name) => names.has(name))) {
          return false;
        }
      }

      return true;
    },
    [paintFilter, recipes, wargearFilter],
  );

  const isFiltered = paintFilter.length > 0 || wargearFilter.length > 0;

  return {
    paintFilter,
    setPaintFilter,
    wargearFilter,
    setWargearFilter,
    paintOptions,
    wargearOptions,
    modelMatchesFilters,
    isFiltered,
  };
}
