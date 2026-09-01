import { type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { type ReactNode, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { CollectionStatsPanel } from "@/components/collections/CollectionStatsPanel.tsx";
import type { ArmyCollection, CollectionModelStatus } from "@/generated";
import { createArmyCollection, getArmyCollections, reorderArmyCollections } from "@/generated";
import { COLLECTIONS_KEY } from "@/queryKeys.ts";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus";

export type CollectionsState = "auth-loading" | "unauthenticated" | "collections-loading" | "empty" | "ready";

export function useCollections() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { setAsideContent } = useOutletContext<{ setAsideContent: (c: ReactNode) => void }>();
  const queryClient = useQueryClient();

  const isUser = user?.role === "USER" || user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const {
    data: collections = [],
    isLoading: collectionsLoading,
    error,
  } = useQuery<ArmyCollection[]>({
    queryKey: [COLLECTIONS_KEY],
    queryFn: async () => {
      const response = await getArmyCollections();
      return response.data ?? [];
    },
    enabled: isAuthenticated,
    placeholderData: [],
  });

  useEffect(() => {
    if (!collections) return;

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

  const createCollection = useMutation({
    mutationFn: async () => (await createArmyCollection({ body: { name, description, isPublic } })).data,
    onSuccess: (created) => {
      if (!created) return;
      queryClient.setQueryData<ArmyCollection[]>(["collections"], (prev = []) => [...prev, created]);
      setName("");
      setDescription("");
      setIsPublic(false);
      close();
    },
  });

  function handleCreate(e: React.SubmitEvent) {
    e.preventDefault();
    createCollection.mutate();
  }

  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const reorderMutation = useMutation<
    AxiosResponse<ArmyCollection[]>,
    Error,
    ArmyCollection[],
    { previous: ArmyCollection[] | undefined }
  >({
    mutationFn: async (newOrder) =>
      reorderArmyCollections({
        body: { armyCollectionIds: newOrder.map((c) => c.id as string) },
        throwOnError: true,
      }),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: [COLLECTIONS_KEY] });
      const previous = queryClient.getQueryData<ArmyCollection[]>(["collections"]);
      queryClient.setQueryData(["collections"], newOrder);
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["collections"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTIONS_KEY] });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = collections.findIndex((c) => c.id === active.id);
    const newIndex = collections.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(collections, oldIndex, newIndex);
    reorderMutation.mutate(reordered);
  }

  function getCollectionsState(): CollectionsState {
    if (isAuthLoading) return "auth-loading";
    if (!isAuthenticated) return "unauthenticated";
    if (collectionsLoading) return "collections-loading";
    if (collections.length === 0) return "empty";
    return "ready";
  }

  const collectionsState = getCollectionsState();

  return {
    collections,
    collectionsState,
    error,
    isUser,
    opened,
    open,
    close,
    name,
    setName,
    description,
    setDescription,
    isPublic,
    setIsPublic,
    handleCreate,
    handleDragEnd,
    dragSensors,
  };
}
