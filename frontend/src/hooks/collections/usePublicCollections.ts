import { useQuery } from "@tanstack/react-query";
import { type ArmyCollection, getPublicArmyCollections } from "@/generated";

export function usePublicCollections() {
  const query = useQuery<ArmyCollection[]>({
    queryKey: ["publicCollections"],
    queryFn: async () => {
      const response = await getPublicArmyCollections();
      return response.data ?? [];
    },
    placeholderData: [],
  });

  return {
    collections: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
