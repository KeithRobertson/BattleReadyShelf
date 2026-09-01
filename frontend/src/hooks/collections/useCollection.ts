import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import type { ArmyCollection } from "@/generated";
import { getArmyCollection } from "@/generated";
import { COLLECTION_KEY } from "@/queryKeys.ts";

export type CollectionHook = ReturnType<typeof useCollection>;

export default function useCollection(collectionId: string | undefined) {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const {
    data: collection,
    isLoading,
    isError,
    error,
  } = useQuery<ArmyCollection | null>({
    queryKey: [COLLECTION_KEY, collectionId],
    queryFn: async () => {
      if (!collectionId) return null;
      const response = await getArmyCollection({
        path: { armyCollectionId: collectionId },
        throwOnError: true,
      });
      return response.data ?? null;
    },
    enabled: Boolean(collectionId),
    placeholderData: null,
  });

  const isOwner = Boolean(user && collection && user.id && collection.userId && user.id === collection.userId);

  function setCollection(updater: (prev: ArmyCollection | null) => ArmyCollection | null) {
    queryClient.setQueryData<ArmyCollection | null>(["collection", collectionId], updater);
  }

  return {
    collection,
    isOwner,
    loading: isAuthLoading || isLoading,
    error: isError ? String(error) : null,
    setCollection,
  };
}
