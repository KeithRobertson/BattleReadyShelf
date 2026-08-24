import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CollectionCard from "@/components/collections/CollectionCard.tsx";
import type { ArmyCollection } from "@/generated";

export function SortableCollectionCard({ collection }: Readonly<{ collection: ArmyCollection }>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id ?? "",
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <CollectionCard collection={collection} dragHandleProps={{ attributes, listeners }} />
    </div>
  );
}
