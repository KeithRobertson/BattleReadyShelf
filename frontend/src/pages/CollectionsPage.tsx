import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import CollectionCard from "../components/CollectionCard";
import type { ArmyCollection } from "../generated";
import { createArmyCollection, getArmyCollections, reorderArmyCollections } from "../generated";

/** Wraps a single CollectionCard so it can be reordered via drag-and-drop. */
function SortableCollectionCard({ collection }: { collection: ArmyCollection }) {
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
      <CollectionCard
        collection={collection}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

export default function CollectionsPage() {
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isUser = currentUser?.role === "USER" || currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN";
  const [collections, setCollections] = useState<ArmyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setCollections([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    getArmyCollections({ signal: ac.signal })
      .then((r) => {
        if (ac.signal.aborted || !r.data) return;
        setCollections(r.data);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [isAuthenticated]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = (await createArmyCollection({ body: { name, description } })).data;
      if (!created) {
        throw new Error("Failed to create collection");
      }
      setCollections((s) => [...s, created]);
      setName("");
      setDescription("");
      close();
    } catch (e) {
      setError(String(e));
    }
  }

  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = collections.findIndex((c) => c.id === active.id);
    const newIndex = collections.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = collections;
    const reordered = arrayMove(collections, oldIndex, newIndex);
    setCollections(reordered);

    reorderArmyCollections({
      body: { armyCollectionIds: reordered.map((c) => c.id as string) },
      throwOnError: true,
    }).catch((e) => {
      setCollections(previous);
      setError(String(e));
    });
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Collections</Title>
          <Text c="dimmed">Create and manage your miniature collections.</Text>
        </div>
        {isAuthenticated && (
          <Button leftSection={<IconPlus size={16} />} onClick={open} disabled={!isUser} >
            Create collection
          </Button>
        )}
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {isAuthLoading ? (
        <Loader />
      ) : !isAuthenticated ? (
        <Alert color="blue" icon={<IconAlertCircle size={16} />}>
          Sign in with Google (top right) to view and manage your collections.
        </Alert>
      ) : loading ? (
        <Loader />
      ) : collections.length === 0 ? (
        <Text c="dimmed">You haven't created any collections yet.</Text>
      ) : (
        <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={collections.map((c) => c.id ?? "")} strategy={verticalListSortingStrategy}>
            <Stack gap="md">
              {collections.map((c) => (
                <SortableCollectionCard key={c.id} collection={c} />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      <Modal opened={opened} onClose={close} title="Create collection">
        <form onSubmit={handleCreate}>
          <Stack>
            <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
            <Group justify="flex-end">
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
