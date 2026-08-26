import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Accordion } from "@mantine/core";
import React from "react";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";

export type SortableAccordionGroupProps = Readonly<{
  group: ModelGroup;
  children: (dragHandleProps: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
    isDragging: boolean;
  }) => React.ReactNode;
}>;

/**
 * Wraps a single Accordion.Item so it can be reordered via drag-and-drop. The drag handle (not the
 * whole control) carries the dnd-kit listeners, so clicking elsewhere in the header still toggles
 * the accordion section as normal.
 */
const SortableAccordionGroup = React.memo(function SortableAccordionGroup({
  group,
  children,
}: SortableAccordionGroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.key });
  return (
    <Accordion.Item
      value={group.key}
      ref={setNodeRef}
      style={{
        // While dragging, only the transform (not a full-height carry of the expanded panel) moves with
        // the pointer - the panel content is hidden below so the item collapses to just its header height.
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      {children({ attributes, listeners, isDragging })}
    </Accordion.Item>
  );
});

export default SortableAccordionGroup;
