import { useState } from "react";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels";

export default function useModelSelection() {
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());

  function toggleSelected(modelId: string, isSelected: boolean) {
    setSelectedModelIds((previouslySelectedModelIds) => {
      const selectedModelIds = new Set(previouslySelectedModelIds);
      if (isSelected) selectedModelIds.add(modelId);
      else selectedModelIds.delete(modelId);
      return selectedModelIds;
    });
  }

  function toggleGroupSelected(group: ModelGroup, isSelected: boolean) {
    setSelectedModelIds((previouslySelectedModelIds) => {
      const selectedModelIds = new Set(previouslySelectedModelIds);
      for (const model of group.models) {
        if (!model.id) continue;
        if (isSelected) selectedModelIds.add(model.id);
        else selectedModelIds.delete(model.id);
      }
      return selectedModelIds;
    });
  }

  function clearSelection() {
    setSelectedModelIds(new Set());
  }

  function isSelected(modelId: string | undefined): boolean {
    return modelId ? selectedModelIds.has(modelId) : false;
  }

  return {
    selectedModelIds,
    toggleSelected,
    toggleGroupSelected,
    clearSelection,
    isSelected,
  };
}
