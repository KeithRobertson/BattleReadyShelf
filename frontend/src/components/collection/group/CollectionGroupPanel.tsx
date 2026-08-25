import { Accordion, Checkbox, SimpleGrid, Stack } from "@mantine/core";
import React, { useCallback, useMemo } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import ModelCard from "@/components/ModelCard.tsx";
import type { CollectionModel, CollectionModelStatus } from "@/generated";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";
import getSelectedInGroup from "@/utils/collection/getSelectedInGroup.ts";

export const CollectionGroupPanel = React.memo(function CollectionGroupPanel({
  group,
}: Readonly<{
  group: ModelGroup;
}>) {
  const { isEditMode, selection, deletion, modelImages, collectionModels } = useCollectionContext();
  const selectedInGroup = useMemo(
    () => getSelectedInGroup(group, selection.selectedModelIds),
    [group, selection.selectedModelIds],
  );

  const handleRename = useCallback(
    (id: string | undefined, newName: string) => {
      if (!id) return;
      return collectionModels.renameModel(id, newName);
    },
    [collectionModels],
  );
  const handleUploadImage = useCallback(
    (id: string | undefined, file: File) => id && modelImages.uploadImage(id, file),
    [modelImages],
  );
  const handleDeleteImage = useCallback(
    (id: string | undefined, imageId: string) => id && modelImages.deleteImage(id, imageId),
    [modelImages],
  );
  const handleDeleteModel = useCallback((id: string | undefined) => id && deletion.requestDelete(id), [deletion]);
  const handleUpdateFinishedOn = useCallback(
    (id: string | undefined, finishedOn: string | null) => {
      if (!id) return;
      return collectionModels.updateFinishedOn(id, finishedOn);
    },
    [collectionModels],
  );
  const handleUpdateDescription = useCallback(
    (id: string | undefined, description: string) => {
      if (!id) return;
      return collectionModels.updateDescription(id, description);
    },
    [collectionModels],
  );
  const handleUpdateWargearSelection = useCallback(
    (
      model: CollectionModel,
      slotId: string,
      update: { wargearOptionId?: string | null; customLabel?: string | null },
    ) => collectionModels.updateWargearSelection(model, slotId, update),
    [collectionModels],
  );
  const handleUpdateStatus = useCallback(
    (id: string | undefined, status: CollectionModelStatus) => {
      if (!id) return;
      return collectionModels.updateStatus(id, status);
    },
    [collectionModels],
  );
  const handleToggleSelected = useCallback(
    (id: string | undefined, isSelected: boolean) => id && selection.toggleSelected(id, isSelected),
    [selection],
  );

  return (
    <Accordion.Panel>
      <Stack gap="xs">
        {isEditMode && (
          <Checkbox
            label="Select all in this group"
            checked={selectedInGroup === group.models.length}
            indeterminate={selectedInGroup > 0 && selectedInGroup < group.models.length}
            onChange={(e) => selection.toggleGroupSelected(group, e.currentTarget.checked)}
          />
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {group.models.map((model) => {
            return (
              <ModelCard
                key={model.id}
                model={model}
                editMode={isEditMode}
                onUploadImage={(file: File) => handleUploadImage(model.id, file)}
                onDeleteImage={(imageId: string) => handleDeleteImage(model.id, imageId)}
                onRename={(newName: string) => handleRename(model.id, newName)}
                onDeleteModel={() => handleDeleteModel(model.id)}
                onUpdateFinishedOn={(finishedOn: string | null) => handleUpdateFinishedOn(model.id, finishedOn)}
                onUpdateDescription={(description: string) => handleUpdateDescription(model.id, description)}
                onUpdateWargearSelection={(
                  slotId: string,
                  update: { wargearOptionId?: string | null; customLabel?: string | null },
                ) => handleUpdateWargearSelection(model, slotId, update)}
                onUpdateStatus={(status: CollectionModelStatus) => handleUpdateStatus(model.id, status)}
                isUploading={modelImages.uploadingModelId === model.id}
                deletingImageId={modelImages.deletingImageId}
                isDeleting={deletion.pendingDelete?.modelId === model.id}
                selected={!!model.id && selection.selectedModelIds.has(model.id)}
                onToggleSelected={(isSelected: boolean) => handleToggleSelected(model.id, isSelected)}
              />
            );
          })}
        </SimpleGrid>
      </Stack>
    </Accordion.Panel>
  );
});
