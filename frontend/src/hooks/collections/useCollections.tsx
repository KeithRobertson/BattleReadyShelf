import { type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { type ReactNode, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { CollectionStatsPanel } from "@/components/CollectionStatsPanel.tsx";
import type { ArmyCollection, CollectionModelStatus } from "@/generated";
import { createArmyCollection, getArmyCollections, reorderArmyCollections } from "@/generated";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus";

export type CollectionsState = "auth-loading" | "unauthenticated" | "collections-loading" | "empty" | "ready";

export function useCollections() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { setAsideContent } = useOutletContext<{ setAsideContent: (c: ReactNode) => void }>();

  const isUser = user?.role === "USER" || user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const [collections, setCollections] = useState<ArmyCollection[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);

  // Fetch collections
  useEffect(() => {
    if (!isAuthenticated) {
      setCollections([]);
      setCollectionsLoading(false);
      return;
    }

    const ac = new AbortController();
    setCollectionsLoading(true);

    getArmyCollections({ signal: ac.signal })
      .then((r) => {
        if (!ac.signal.aborted && r.data) {
          setCollections(r.data);
        }
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setCollectionsLoading(false);
      });

    return () => ac.abort();
  }, [isAuthenticated]);

  // Aside stats
  useEffect(() => {
    const totalModels = collections.reduce((sum, c) => sum + (c.modelCount ?? 0), 0);

    const totalCountsByStatus = COLLECTION_MODEL_STATUSES.reduce(
      (acc, status) => {
        acc[status] = collections.reduce((sum, c) => sum + (c.modelCountsByStatus?.[status] ?? 0), 0);
        return acc;
      },
      {} as Record<CollectionModelStatus, number>,
    );

    setAsideContent(
      <Stack>
        <Title order={4}>All Collections</Title>
        <Text c="dimmed">Totals across all your collections.</Text>
        <CollectionStatsPanel totalCount={totalModels} countsByStatus={totalCountsByStatus} />
      </Stack>,
    );

    return () => setAsideContent(null);
  }, [collections, setAsideContent]);

  // Create collection
  async function handleCreate(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    try {
      const created = (
        await createArmyCollection({
          body: { name, description, isPublic },
        })
      ).data;

      if (!created) {
        setError("Failed to create collection");
        return;
      }

      setCollections((prev) => [...prev, created]);
      setName("");
      setDescription("");
      setIsPublic(false);
      close();
    } catch (e) {
      setError(String(e));
    }
  }

  // Drag sensors
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Drag end handler
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

  // Derived state machine
  function getCollectionsState(): CollectionsState {
    if (isAuthLoading) return "auth-loading";
    if (!isAuthenticated) return "unauthenticated";
    if (collectionsLoading) return "collections-loading";
    if (collections.length === 0) return "empty";
    return "ready";
  }

  const collectionsState = getCollectionsState();

  return {
    // state
    collections,
    collectionsState,
    error,
    isUser,

    // modal
    opened,
    open,
    close,

    // create form fields
    name,
    setName,
    description,
    setDescription,
    isPublic,
    setIsPublic,

    // handlers
    handleCreate,
    handleDragEnd,

    // dnd
    dragSensors,
  };
}
