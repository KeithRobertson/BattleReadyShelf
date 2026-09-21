import { Accordion, Checkbox, SimpleGrid, Stack } from "@mantine/core";
import React, { useMemo } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import ModelCard from "@/components/collection/group/model/ModelCard.tsx";
import GroupPaintRecipe from "@/components/collection/paint/GroupPaintRecipe.tsx";
import type { CollectionModelStatus } from "@/generated";
import { useModelActions } from "@/hooks/collections/models/useModelActions.ts";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";
import { useAppAside } from "@/hooks/useAsideContent.ts";
import type { WargearSlotUpdate } from "@/utils/collection/applyWargearSelection.ts";
import getSelectedInGroup from "@/utils/collection/getSelectedInGroup.ts";

export type CollectionGroupPanelProps = Readonly<{
  group: ModelGroup;
}>;

export const CollectionGroupPanel = React.memo(function CollectionGroupPanel({ group }: CollectionGroupPanelProps) {
  const { isEditMode, selection, focus, deletion, modelImages } = useCollectionContext();
  const { openAside } = useAppAside();
  const selectedInGroup = useMemo(
    () => getSelectedInGroup(group, selection.selectedModelIds),
    [group, selection.selectedModelIds],
  );
  const actions = useModelActions();

  function handleToggleFocus(modelId: string | undefined) {
    if (!modelId) return;
    if (focus.focusedModelId === modelId) {
      focus.clearFocus();
      return;
    }
    focus.setFocus(modelId);
    openAside();
  }

  return (
    <Accordion.Panel>
      <Stack gap="xs">
        <GroupPaintRecipe group={group} />

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
                onUpdateWargearSelection={(slotId: string, update: WargearSlotUpdate) =>
                  actions.updateWargearSelection(model, slotId, update)
                }
                onUpdateAlternateIdentities={(ids: string[]) => {
                  if (model.id) actions.updateAlternateIdentities(model.id, ids);
                }}
                onUpdateStatus={(status: CollectionModelStatus) => actions.updateStatus(model.id, status)}
                onChangeModelDefinition={(modelDefinitionId: string) =>
                  actions.changeModelDefinition(model.id, modelDefinitionId)
                }
                isUploading={modelImages.uploadingModelId === model.id}
                deletingImageId={modelImages.deletingImageId}
                isDeleting={deletion.pendingDelete?.modelId === model.id}
                selected={!!model.id && selection.selectedModelIds.has(model.id)}
                onToggleSelected={(isSelected: boolean) => actions.toggleSelected(model.id, isSelected)}
                focused={focus.isFocused(model.id)}
                onToggleFocus={() => handleToggleFocus(model.id)}
              />
            );
          })}
        </SimpleGrid>
      </Stack>
    </Accordion.Panel>
  );
});
