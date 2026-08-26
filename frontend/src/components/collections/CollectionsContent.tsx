import { closestCenter, DndContext, type DragEndEvent, type SensorDescriptor, type SensorOptions } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Alert, Loader, Stack, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { SortableCollectionCard } from "@/components/collections/SortableCollectionCard.tsx";
import type { ArmyCollection } from "@/generated";
import type { CollectionsState } from "@/hooks/collections/useCollections.tsx";

export type CollectionsContentProps = Readonly<{
  state: CollectionsState;
  collections: ArmyCollection[];
  dragSensors: SensorDescriptor<SensorOptions>[];
  handleDragEnd: (event: DragEndEvent) => void;
}>;

export function CollectionsContent({ state, collections, dragSensors, handleDragEnd }: CollectionsContentProps) {
  if (state === "auth-loading") return <Loader />;

  if (state === "unauthenticated")
    return (
      <Alert color="blue" icon={<IconAlertCircle size={16} />}>
        Sign in with Google (top right) to view and manage your collections.
      </Alert>
    );

  if (state === "collections-loading") return <Loader />;

  if (state === "empty") return <Text c="dimmed">You haven't created any collections yet.</Text>;

  return (
    <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={collections.map((c) => c.id ?? "")} strategy={verticalListSortingStrategy}>
        <Stack gap="md">
          {collections.map((c) => (
            <SortableCollectionCard key={c.id} collection={c} />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}
