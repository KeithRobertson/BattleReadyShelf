import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import { CollectionGroupHeader } from "@/components/collection/group/CollectionGroupHeader.tsx";
import { CollectionGroupPanel } from "@/components/collection/group/CollectionGroupPanel.tsx";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";

export type DragProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
};

export function CollectionGroup({
  group,
  dragProps,
}: Readonly<{
  group: ModelGroup;
  dragProps: DragProps;
}>) {
  const { drag } = useCollectionContext();

  return (
    <>
      <CollectionGroupHeader group={group} dragProps={dragProps} />

      {!drag.draggingGroupKey && <CollectionGroupPanel group={group} />}
    </>
  );
}
