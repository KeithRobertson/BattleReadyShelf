import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ArmyCollection } from "@/generated";
import { deleteArmyCollection } from "@/generated";
import {
  COLLECTION_KEY,
  COLLECTION_MODELS_KEY,
  COLLECTIONS_KEY,
  PAINT_RECIPES_KEY,
  PUBLIC_COLLECTIONS_KEY,
} from "@/queryKeys.ts";

export type CollectionDeletion = ReturnType<typeof useDeleteCollection>;

export default function useDeleteCollection(onDeleted?: () => void) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<ArmyCollection | null>(null);

  const mutation = useMutation({
    mutationFn: async (armyCollectionId: string) => {
      await deleteArmyCollection({
        path: { armyCollectionId },
        throwOnError: true,
      });
      return armyCollectionId;
    },
    onSuccess: (armyCollectionId) => {
      queryClient.setQueryData<ArmyCollection[]>([COLLECTIONS_KEY], (prev) =>
        (prev ?? []).filter((collection) => collection.id !== armyCollectionId),
      );
      queryClient.removeQueries({ queryKey: [COLLECTION_KEY, armyCollectionId] });
      queryClient.removeQueries({ queryKey: [COLLECTION_MODELS_KEY, armyCollectionId] });
      queryClient.removeQueries({ queryKey: [PAINT_RECIPES_KEY, armyCollectionId] });
      queryClient.invalidateQueries({ queryKey: [PUBLIC_COLLECTIONS_KEY] });
      setPending(null);
      onDeleted?.();
    },
  });

  return {
    pending,
    requestDelete: (collection: ArmyCollection | null | undefined) => {
      if (collection?.id) {
        setPending(collection);
      }
    },
    close: () => setPending(null),
    confirm: () => {
      if (pending?.id) {
        mutation.mutate(pending.id);
      }
    },
    deleting: mutation.isPending,
    error: mutation.error ? String(mutation.error) : null,
  };
}
