import { useMutation } from "@tanstack/react-query";
import type { CollectionModel } from "@/generated";
import { createCollectionModelImageUploadUrl, deleteCollectionModelImage } from "@/generated";
import { createImageVariants } from "@/utils/imageVariants";

export type ModelImages = ReturnType<typeof useModelImages>;

export default function useModelImages(
  setModels: (updater: (prev: CollectionModel[]) => CollectionModel[]) => void,
  setError: (msg: string | null) => void,
) {
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
        { url: created.uploadUrls.thumbnail, body: variants.thumbnail, contentType: variants.thumbnail.type },
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

      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(`Upload failed: ${failed.status}`);

      return { modelId, image: created.image };
    },

    onSuccess: ({ modelId, image }) => {
      setModels((prev) =>
        prev.map((model) => (model.id === modelId ? { ...model, images: [...(model.images ?? []), image] } : model)),
      );
    },

    onError: (err) => {
      setError(String(err));
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
        prev.map((model) =>
          model.id === modelId ? { ...model, images: (model.images ?? []).filter((img) => img.id !== imageId) } : model,
        ),
      );
    },

    onError: (err) => {
      setError(String(err));
    },
  });

  function deleteImage(modelId: string, imageId: string) {
    deleteImageMutation.mutate({ modelId, imageId });
  }

  return {
    uploadImage,
    deleteImage,
    uploadingModelId: uploadImageMutation.variables?.modelId ?? null,
    deletingImageId: deleteImageMutation.variables?.imageId ?? null,
  };
}
