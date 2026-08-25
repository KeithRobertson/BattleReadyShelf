import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";

export default function getSelectedInGroup(group: ModelGroup, selectedIds: Set<string>) {
  return group.models.reduce((count, model) => (model.id && selectedIds.has(model.id) ? count + 1 : count), 0);
}
