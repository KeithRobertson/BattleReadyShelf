import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { CollectionModel } from "@/generated";
import { createCollectionModelImageUploadUrl, deleteCollectionModelImage } from "@/generated";
import { createImageVariants } from "@/utils/imageVariants";
import showErrorNotification from "@/utils/showErrorNotification";

export type ModelImages = ReturnType<typeof useModelImages>;

export default function useModelImages(setModels: (updater: (prev: CollectionModel[]) => CollectionModel[]) => void) {
  const uploadImageMutation = useMutation({
    mutationFn: async (params: { modelId: string; file: File }) => {
      const { modelId, file } = params;

      const variants = await createImageVariants(file);

      const created = (
        await createCollectionModelImageUploadUrl({
          throwOnError: true,
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

    // Resizing the image and the PUT to R2 both happen outside axios, so the interceptor never sees
    // those and this is the only chance to say anything about them. An axios failure has already
    // been reported with the server's own message, so saying it again here would only repeat it.
    onError: (error) => {
      if (!isAxiosError(error)) {
        showErrorNotification("That photo could not be uploaded. Please try again.");
      }
    },
  });

  function uploadImage(modelId: string, file: File) {
    uploadImageMutation.mutate({ modelId, file });
  }

  const deleteImageMutation = useMutation({
    mutationFn: async (params: { modelId: string; imageId: string }) => {
      const { modelId, imageId } = params;

      // throwOnError, or a failed delete resolves as a success and the photo disappears from the
      // page while staying in the collection until the next reload.
      await deleteCollectionModelImage({
        path: { collectionModelId: modelId, imageId },
        throwOnError: true,
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
  });

  function deleteImage(modelId: string, imageId: string) {
    deleteImageMutation.mutate({ modelId, imageId });
  }

  return {
    uploadImage,
    deleteImage,
    uploadingModelId: uploadImageMutation.isPending ? (uploadImageMutation.variables?.modelId ?? null) : null,
    deletingImageId: deleteImageMutation.isPending ? (deleteImageMutation.variables?.imageId ?? null) : null,
  };
}
