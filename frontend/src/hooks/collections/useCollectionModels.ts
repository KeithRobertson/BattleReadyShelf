import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CollectionModel, CollectionModelStatus } from "@/generated";
import {
  bulkCreateCollectionModels,
  bulkDeleteCollectionModels,
  createCollectionModel,
  deleteCollectionModel,
  getCollectionModels,
  updateCollectionModel,
} from "@/generated";
import { COLLECTION_MODELS_KEY } from "@/queryKeys.ts";
import { applyLoadoutChange, type WargearSlotUpdate } from "@/utils/collection/applyWargearSelection.ts";
import isInitialLoad from "@/utils/isInitialLoad.ts";

// Shared instance, not `data ?? []`: a failed query has no data, and a fresh array every render
// invalidates every memo below it (see the note in useCollections for where that turns into a loop).
const NO_MODELS: CollectionModel[] = [];

export type CollectionModels = ReturnType<typeof useCollectionModels>;

export default function useCollectionModels(collectionId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: models = NO_MODELS,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
  } = useQuery<CollectionModel[]>({
    queryKey: [COLLECTION_MODELS_KEY, collectionId],
    queryFn: async () => {
      if (!collectionId) return [];
      const collectionModelsResponse = await getCollectionModels({
        path: { armyCollectionId: collectionId },
        throwOnError: true,
      });
      return collectionModelsResponse.data ?? [];
    },
    enabled: Boolean(collectionId),
    placeholderData: NO_MODELS,
  });

  function setModels(updater: (prev: CollectionModel[]) => CollectionModel[]) {
    queryClient.setQueryData<CollectionModel[]>([COLLECTION_MODELS_KEY, collectionId], (prev) => updater(prev ?? []));
  }

  const addModelMutation = useMutation({
    mutationFn: async (params: {
      modelDefinitionId: string;
      name?: string;
      description?: string;
      count?: number;
      status?: CollectionModelStatus;
    }) => {
      const { modelDefinitionId, name, description, count = 1, status = "BOXED" } = params;

      if (!collectionId) {
        throw new Error("Collection ID is required");
      }

      if (count > 1) {
        const bulkCreateCollectionModelsResponse = await bulkCreateCollectionModels({
          path: { armyCollectionId: collectionId },
          body: { modelDefinitionId, count, status },
          throwOnError: true,
        });
        return bulkCreateCollectionModelsResponse.data ?? [];
      }

      const createCollectionModelResponse = await createCollectionModel({
        path: { armyCollectionId: collectionId },
        body: { modelDefinitionId, name, description, status },
        throwOnError: true,
      });
      return createCollectionModelResponse.data ? [createCollectionModelResponse.data] : [];
    },

    onSuccess: (created) => {
      setModels((prev) => [...created, ...prev]);
    },
  });

  function addModel(
    modelDefinitionId: string,
    name?: string,
    description?: string,
    count?: number,
    status?: CollectionModelStatus,
  ) {
    addModelMutation.mutate({ modelDefinitionId, name, description, count, status });
  }

  const updateModelMutation = useMutation({
    mutationFn: async (params: { modelId: string; body: Partial<CollectionModel> }) => {
      const res = await updateCollectionModel({
        path: { collectionModelId: params.modelId },
        body: params.body,
        throwOnError: true,
      });
      return res.data;
    },

    onSuccess: (updated) => {
      if (!updated) return;
      setModels((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    },
  });

  function updateModel(modelId: string, body: Partial<CollectionModel>) {
    updateModelMutation.mutate({ modelId, body });
  }

  const renameModel = (id: string, name: string) => updateModel(id, { name });
  const updateFinishedOn = (id: string, finishedOn: string | null) =>
    updateModel(id, { finishedOn: finishedOn ?? undefined });
  const updateDescription = (id: string, description: string) => updateModel(id, { description });
  const updateStatus = (id: string, status: CollectionModelStatus) => updateModel(id, { status });

  /**
   * Moves a model onto a different definition. The backend remaps the loadout onto the new
   * definition's slots, so the wargear selections are deliberately not sent here.
   */
  const changeModelDefinition = (id: string, modelDefinitionId: string) => updateModel(id, { modelDefinitionId });

  function updateAlternateIdentities(modelId: string, alternateModelDefinitionIds: string[]) {
    updateModel(modelId, { alternateModelDefinitionIds });
  }

  function updateWargearSelection(model: CollectionModel, attachmentSlotId: string, update: WargearSlotUpdate) {
    if (!model.id) {
      throw new Error("Model ID is required");
    }
    const patch = applyLoadoutChange(model, attachmentSlotId, update);

    updateModel(model.id, {
      wargearSelections: patch.wargearSelections,
      magnetizedSlotIds: patch.magnetizedSlotIds,
    });
  }

  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      // throwOnError, or a refused delete resolves as a success and the model vanishes from the page
      // while staying in the collection until the next reload.
      await deleteCollectionModel({ path: { collectionModelId: modelId }, throwOnError: true });
      return modelId;
    },

    onSuccess: (modelId) => {
      setModels((prev) => prev.filter((m) => m.id !== modelId));
    },
  });

  function deleteModel(modelId: string) {
    deleteModelMutation.mutate(modelId);
  }

  const bulkDeleteMutation = useMutation({
    mutationFn: async (modelIds: string[]) => {
      if (!collectionId) {
        throw new Error("Collection ID is required");
      }
      await bulkDeleteCollectionModels({
        path: { armyCollectionId: collectionId },
        body: { collectionModelIds: modelIds },
        throwOnError: true,
      });
      return modelIds;
    },

    onSuccess: (deletedIds) => {
      setModels((prev) => prev.filter((m) => !m.id || !deletedIds.includes(m.id)));
    },
  });

  function bulkDeleteModels(modelIds: string[]) {
    bulkDeleteMutation.mutate(modelIds);
  }

  return {
    models,
    loading: isLoading || isInitialLoad({ isFetching, isPlaceholderData }),
    error: isError ? String(error) : null,
    setModels,
    addModel,
    renameModel,
    updateFinishedOn,
    updateDescription,
    updateStatus,
    changeModelDefinition,
    updateAlternateIdentities,
    updateWargearSelection,
    deleteModel,
    bulkDeleteModels,
  };
}
