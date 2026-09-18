import { type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { CollectionStatsPanel } from "@/components/collections/CollectionStatsPanel.tsx";
import type { ArmyCollection, CollectionModelStatus } from "@/generated";
import { createArmyCollection, getArmyCollections, reorderArmyCollections } from "@/generated";
import { useAsideContent } from "@/hooks/useAsideContent.ts";
import { COLLECTIONS_KEY } from "@/queryKeys.ts";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus";
import isInitialLoad from "@/utils/isInitialLoad.ts";

export type CollectionsState =
  | "auth-loading"
  | "unauthenticated"
  | "collections-loading"
  | "load-failed"
  | "empty"
  | "ready";

/**
 * One instance rather than `data ?? []`, because a query in an error state has no data to fall back
 * on: the literal would be a different array on every render, and the aside-panel effect below is
 * keyed on it. That effect sets state in AppLayout, which renders again, which makes another array,
 * so a failed load used to spin the page in an endless render loop.
 */
const NO_COLLECTIONS: ArmyCollection[] = [];

export function useCollections() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const isUser = user?.role === "USER" || user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const collectionsQuery = useQuery<ArmyCollection[]>({
    queryKey: [COLLECTIONS_KEY],
    queryFn: async () => {
      // throwOnError, or a failed request resolves as an empty list and the page says "you haven't
      // created any collections yet" about collections it simply could not load.
      const response = await getArmyCollections({ throwOnError: true });
      return response.data ?? [];
    },
    enabled: isAuthenticated,
    placeholderData: NO_COLLECTIONS,
  });
  const { data: collections = NO_COLLECTIONS, isLoading: collectionsLoading, error } = collectionsQuery;

  const aside = useMemo(() => {
    const totalModels = collections.reduce((sum, c) => sum + (c.modelCount ?? 0), 0);

    const totalCountsByStatus = COLLECTION_MODEL_STATUSES.reduce(
      (acc, status) => {
        acc[status] = collections.reduce((sum, c) => sum + (c.modelCountsByStatus?.[status] ?? 0), 0);
        return acc;
      },
      {} as Record<CollectionModelStatus, number>,
    );

    return (
      <Stack>
        <Title order={4}>All Collections</Title>
        <Text c="dimmed">Totals across all your collections.</Text>
        <CollectionStatsPanel totalCount={totalModels} countsByStatus={totalCountsByStatus} />
      </Stack>
    );
  }, [collections]);
  useAsideContent(aside);

  const createCollection = useMutation({
    mutationFn: async () =>
      (await createArmyCollection({ body: { name, description, isPublic }, throwOnError: true })).data,
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
    if (collectionsLoading || isInitialLoad(collectionsQuery)) return "collections-loading";
    // Before "empty", or a failed load looks like an account with no collections in it.
    if (error) return "load-failed";
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
