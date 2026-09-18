import { useQuery } from "@tanstack/react-query";
import { type ArmyCollection, getPublicArmyCollections } from "@/generated";
import { PUBLIC_COLLECTIONS_KEY } from "@/queryKeys.ts";
import isInitialLoad from "@/utils/isInitialLoad.ts";

/**
 * One instance rather than `data ?? []`, because a failed query has no data to fall back on: the
 * literal would be a different array on every render, and an aside effect keyed on it would loop.
 */
const NO_COLLECTIONS: ArmyCollection[] = [];

export function usePublicCollections() {
  const query = useQuery<ArmyCollection[]>({
    queryKey: [PUBLIC_COLLECTIONS_KEY],
    queryFn: async () => {
      const response = await getPublicArmyCollections({ throwOnError: true });
      return response.data ?? [];
    },
    placeholderData: NO_COLLECTIONS,
  });

  return {
    collections: query.data ?? NO_COLLECTIONS,
    isLoading: query.isLoading || isInitialLoad(query),
    isError: query.isError,
    error: query.error,
  };
}
