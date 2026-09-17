import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CollectionCard from "@/components/collections/CollectionCard.tsx";
import type { ArmyCollection } from "@/generated";

export type SortableCollectionCardProps = Readonly<{
  collection: ArmyCollection;
  onDelete?: (collection: ArmyCollection) => void;
}>;

export function SortableCollectionCard({ collection, onDelete }: SortableCollectionCardProps) {
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
      <CollectionCard collection={collection} dragHandleProps={{ attributes, listeners }} onDelete={onDelete} />
    </div>
  );
}
