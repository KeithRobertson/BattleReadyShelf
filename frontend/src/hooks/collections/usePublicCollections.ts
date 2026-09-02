import { useQuery } from "@tanstack/react-query";
import { type ArmyCollection, getPublicArmyCollections } from "@/generated";
import { PUBLIC_COLLECTIONS_KEY } from "@/queryKeys.ts";
import isInitialLoad from "@/utils/isInitialLoad.ts";

export function usePublicCollections() {
  const query = useQuery<ArmyCollection[]>({
    queryKey: [PUBLIC_COLLECTIONS_KEY],
    queryFn: async () => {
      const response = await getPublicArmyCollections();
      return response.data ?? [];
    },
    placeholderData: [],
  });

  return {
    collections: query.data ?? [],
    isLoading: query.isLoading || isInitialLoad(query),
    isError: query.isError,
    error: query.error,
  };
}
