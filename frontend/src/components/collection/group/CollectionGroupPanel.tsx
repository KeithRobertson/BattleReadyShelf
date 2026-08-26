import { Accordion, Checkbox, SimpleGrid, Stack } from "@mantine/core";
import React, { useMemo } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import ModelCard from "@/components/collection/group/model/ModelCard.tsx";
import type { CollectionModelStatus } from "@/generated";
import { useModelActions } from "@/hooks/collections/models/useModelActions.ts";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";
import getSelectedInGroup from "@/utils/collection/getSelectedInGroup.ts";

export const CollectionGroupPanel = React.memo(function CollectionGroupPanel({
  group,
}: Readonly<{
  group: ModelGroup;
}>) {
  const { isEditMode, selection, deletion, modelImages } = useCollectionContext();
  const selectedInGroup = useMemo(
    () => getSelectedInGroup(group, selection.selectedModelIds),
    [group, selection.selectedModelIds],
  );
  const actions = useModelActions();

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
                onUploadImage={(file: File) => actions.uploadImage(model.id, file)}
                onDeleteImage={(imageId: string) => actions.deleteImage(model.id, imageId)}
                onRename={(newName: string) => actions.rename(model.id, newName)}
                onDeleteModel={() => actions.deleteModel(model.id)}
                onUpdateFinishedOn={(finishedOn: string | null) => actions.updateFinishedOn(model.id, finishedOn)}
                onUpdateDescription={(description: string) => actions.updateDescription(model.id, description)}
                onUpdateWargearSelection={(
                  slotId: string,
                  update: { wargearOptionId?: string | null; customLabel?: string | null },
                ) => actions.updateWargearSelection(model, slotId, update)}
                onUpdateStatus={(status: CollectionModelStatus) => actions.updateStatus(model.id, status)}
                isUploading={modelImages.uploadingModelId === model.id}
                deletingImageId={modelImages.deletingImageId}
                isDeleting={deletion.pendingDelete?.modelId === model.id}
                selected={!!model.id && selection.selectedModelIds.has(model.id)}
                onToggleSelected={(isSelected: boolean) => actions.toggleSelected(model.id, isSelected)}
              />
            );
          })}
        </SimpleGrid>
      </Stack>
    </Accordion.Panel>
  );
});
