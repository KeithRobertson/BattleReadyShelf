import { useCallback } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import type { CollectionModel, CollectionModelStatus } from "@/generated";

export function useModelActions() {
  const { selection, deletion, modelImages, collectionModels } = useCollectionContext();

  const rename = useCallback(
    (id: string | undefined, newName: string) => id && collectionModels.renameModel(id, newName),
    [collectionModels],
  );

  const uploadImage = useCallback(
    (id: string | undefined, file: File) => id && modelImages.uploadImage(id, file),
    [modelImages],
  );

  const deleteImage = useCallback(
    (id: string | undefined, imageId: string) => id && modelImages.deleteImage(id, imageId),
    [modelImages],
  );

  const deleteModel = useCallback((id: string | undefined) => id && deletion.requestDelete(id), [deletion]);

  const updateFinishedOn = useCallback(
    (id: string | undefined, finishedOn: string | null) => id && collectionModels.updateFinishedOn(id, finishedOn),
    [collectionModels],
  );

  const updateDescription = useCallback(
    (id: string | undefined, description: string) => id && collectionModels.updateDescription(id, description),
    [collectionModels],
  );

  const updateStatus = useCallback(
    (id: string | undefined, status: CollectionModelStatus) => id && collectionModels.updateStatus(id, status),
    [collectionModels],
  );

  const toggleSelected = useCallback(
    (id: string | undefined, isSelected: boolean) => id && selection.toggleSelected(id, isSelected),
    [selection],
  );

  const updateWargearSelection = useCallback(
    (
      model: CollectionModel,
      slotId: string,
      update: { wargearOptionId?: string | null; customLabel?: string | null },
    ) => collectionModels.updateWargearSelection(model, slotId, update),
    [collectionModels],
  );

  return {
    rename,
    uploadImage,
    deleteImage,
    deleteModel,
    updateFinishedOn,
    updateDescription,
    updateStatus,
    toggleSelected,
    updateWargearSelection,
  };
}
