import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import { CollectionGroupDragOverlay } from "@/components/collection/group/CollectionGroupDragOverlay.tsx";

export function CollectionGroupsDndWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  const { drag, groupedModels } = useCollectionContext();
  return (
    <DndContext
      sensors={drag.sensors}
      collisionDetection={closestCenter}
      onDragStart={drag.handleGroupDragStart}
      onDragEnd={drag.handleGroupDragEnd}
      onDragCancel={() => drag.setDraggingGroupKey(null)}
    >
      <SortableContext items={groupedModels.groupedModels.map((g) => g.key)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>

      <CollectionGroupDragOverlay drag={drag} groupedModels={groupedModels} />
    </DndContext>
  );
}
