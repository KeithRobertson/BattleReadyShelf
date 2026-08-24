import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CollectionModel, CollectionModelStatus } from "@/generated";
import {
  bulkCreateCollectionModels,
  bulkDeleteCollectionModels,
  createCollectionModel,
  createCollectionModelImageUploadUrl,
  deleteCollectionModel,
  deleteCollectionModelImage,
  getCollectionModels,
  updateCollectionModel,
} from "@/generated";
import { createImageVariants } from "@/utils/imageVariants";

export default function useCollectionModels(collectionId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: models = [],
    isLoading,
    isError,
    error,
  } = useQuery<CollectionModel[]>({
    queryKey: ["collectionModels", collectionId],
    queryFn: async () => {
      if (!collectionId) return [];
      const collectionModelsResponse = await getCollectionModels({
        path: { armyCollectionId: collectionId },
        throwOnError: true,
      });
      return collectionModelsResponse.data ?? [];
    },
    enabled: Boolean(collectionId),
    placeholderData: [],
  });

  function setModels(updater: (prev: CollectionModel[]) => CollectionModel[]) {
    queryClient.setQueryData<CollectionModel[]>(["collectionModels", collectionId], (prev) => updater(prev ?? []));
  }

  const addModelMutation = useMutation({
    mutationFn: async (params: { modelDefinitionId: string; name?: string; description?: string; count?: number }) => {
      const { modelDefinitionId, name, description, count = 1 } = params;

      if (!collectionId) {
        throw new Error("Collection ID is required");
      }

      if (count > 1) {
        const bulkCreateCollectionModelsResponse = await bulkCreateCollectionModels({
          path: { armyCollectionId: collectionId },
          body: { modelDefinitionId, count },
        });
        return bulkCreateCollectionModelsResponse.data ?? [];
      }

      const createCollectionModelResponse = await createCollectionModel({
        path: { armyCollectionId: collectionId },
        body: { modelDefinitionId, name, description },
      });
      return createCollectionModelResponse.data ? [createCollectionModelResponse.data] : [];
    },

    onSuccess: (created) => {
      setModels((prev) => [...created, ...prev]);
    },
  });

  function addModel(modelDefinitionId: string, name?: string, description?: string, count?: number) {
    addModelMutation.mutate({ modelDefinitionId, name, description, count });
  }

  const updateModelMutation = useMutation({
    mutationFn: async (params: { modelId: string; body: Partial<CollectionModel> }) => {
      const res = await updateCollectionModel({
        path: { collectionModelId: params.modelId },
        body: params.body,
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

  function updateWargearSelection(
    model: CollectionModel,
    attachmentSlotId: string,
    update: { wargearOptionId?: string | null; customLabel?: string | null },
  ) {
    if (!model.id) {
      throw new Error("Model ID is required");
    }
    const otherSelections = (model.wargearSelections ?? []).filter((s) => s.attachmentSlotId !== attachmentSlotId);

    const wargearSelections = [
      ...otherSelections,
      {
        attachmentSlotId,
        wargearOptionId: update.wargearOptionId ?? undefined,
        customLabel: update.customLabel ?? undefined,
      },
    ];

    updateModel(model.id, { wargearSelections });
  }

  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      await deleteCollectionModel({ path: { collectionModelId: modelId } });
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

  const uploadImageMutation = useMutation({
    mutationFn: async (params: { modelId: string; file: File }) => {
      const { modelId, file } = params;

      const variants = await createImageVariants(file);

      const created = (
        await createCollectionModelImageUploadUrl({
          path: { collectionModelId: modelId },
          body: {
            large: {
              contentType: variants.large.type,
              contentLengthBytes: variants.large.size,
            },
            thumbnail: {
              contentType: variants.thumbnail.type,
              contentLengthBytes: variants.thumbnail.size,
            },
          },
        })
      ).data;

      if (!created) throw new Error("Failed to request upload URL");

      const uploads = [
        { url: created.uploadUrls.large, body: variants.large, contentType: variants.large.type },
        {
          url: created.uploadUrls.thumbnail,
          body: variants.thumbnail,
          contentType: variants.thumbnail.type,
        },
      ];

      const responses = await Promise.all(
        uploads.map(({ url, body, contentType }) =>
          fetch(url, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body,
          }),
        ),
      );

      const failed = responses.find((r) => !r.ok);
      if (failed) throw new Error(`Upload failed: ${failed.status}`);

      return { modelId, image: created.image };
    },

    onSuccess: ({ modelId, image }) => {
      setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, images: [...(m.images ?? []), image] } : m)));
    },
  });

  function uploadImage(modelId: string, file: File) {
    uploadImageMutation.mutate({ modelId, file });
  }

  const deleteImageMutation = useMutation({
    mutationFn: async (params: { modelId: string; imageId: string }) => {
      const { modelId, imageId } = params;
      await deleteCollectionModelImage({
        path: { collectionModelId: modelId, imageId },
      });
      return params;
    },

    onSuccess: ({ modelId, imageId }) => {
      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId ? { ...m, images: (m.images ?? []).filter((img) => img.id !== imageId) } : m,
        ),
      );
    },
  });

  function deleteImage(modelId: string, imageId: string) {
    deleteImageMutation.mutate({ modelId, imageId });
  }

  return {
    models,
    loading: isLoading,
    error: isError ? String(error) : null,
    setModels,
    addModel,
    renameModel,
    updateFinishedOn,
    updateDescription,
    updateStatus,
    updateWargearSelection,
    deleteModel,
    bulkDeleteModels,
    uploadImage,
    deleteImage,
  };
}
