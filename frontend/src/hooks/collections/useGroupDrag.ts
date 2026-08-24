import { type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import type { ArmyCollection } from "@/generated";
import { reorderModelDefinitionGroups } from "@/generated";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels";

export default function useGroupDrag(
  collectionId: string | undefined,
  groupedModels: ModelGroup[],
  collection: ArmyCollection | null,
  setCollection: (updater: (prev: ArmyCollection | null) => ArmyCollection | null) => void,
  setError: (msg: string | null) => void,
) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [draggingGroupKey, setDraggingGroupKey] = useState<string | null>(null);

  function handleGroupDragStart(event: DragStartEvent) {
    setDraggingGroupKey(String(event.active.id));
  }

  async function handleGroupDragEnd(event: DragEndEvent) {
    setDraggingGroupKey(null);

    const { active, over } = event;
    if (!over || active.id === over.id || !collectionId) return;

    const oldIndex = groupedModels.findIndex((g) => g.key === active.id);
    const newIndex = groupedModels.findIndex((g) => g.key === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedIds = arrayMove(groupedModels, oldIndex, newIndex)
      .map((g) => g.key)
      .filter((key) => key !== "unknown");

    const previousOrder = collection?.modelDefinitionOrder ?? [];

    setCollection((prev) => (prev ? { ...prev, modelDefinitionOrder: reorderedIds } : prev));

    try {
      await reorderModelDefinitionGroups({
        path: { armyCollectionId: collectionId },
        body: { modelDefinitionIds: reorderedIds },
        throwOnError: true,
      });
    } catch (e) {
      setCollection((prev) => (prev ? { ...prev, modelDefinitionOrder: previousOrder } : prev));
      setError(String(e));
    }
  }

  return {
    sensors,
    draggingGroupKey,
    setDraggingGroupKey,
    handleGroupDragStart,
    handleGroupDragEnd,
  };
}
