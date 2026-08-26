import { Card, Group, Stack } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";
import { ModelCardCompletedDate } from "@/components/collection/group/model/ModelCardCompletedDate.tsx";
import { ModelCardDescription } from "@/components/collection/group/model/ModelCardDescription.tsx";
import { ModelCardHeader } from "@/components/collection/group/model/ModelCardHeader.tsx";
import { ModelCardStatus } from "@/components/collection/group/model/ModelCardStatus.tsx";
import { ModelCardWargear } from "@/components/collection/group/model/ModelCardWargear.tsx";
import { ModelImageSection } from "@/components/collection/group/model/ModelImageSection.tsx";
import type { CollectionModel, CollectionModelStatus } from "@/generated";
import { COLLECTION_MODEL_STATUS_BACKGROUNDS } from "@/utils/collectionModelStatus.ts";

const MAX_VISIBLE_THUMBNAILS = 4;

type ModelCardProps = {
  model: CollectionModel;
  editMode: boolean;
  onUploadImage: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  isUploading: boolean;
  deletingImageId: string | null;

  onRename: (newName: string) => void;
  onDeleteModel: () => void;
  onUpdateFinishedOn: (finishedOn: string | null) => void;
  onUpdateDescription: (description: string) => void;
  onUpdateWargearSelection: (
    attachmentSlotId: string,
    update: { wargearOptionId?: string | null; customLabel?: string | null },
  ) => void;
  onUpdateStatus: (status: CollectionModelStatus) => void;

  isDeleting: boolean;

  selected: boolean;
  onToggleSelected: (selected: boolean) => void;
};

function ModelCard({
  model,
  editMode,
  onUploadImage,
  onDeleteImage,
  onRename,
  onDeleteModel,
  onUpdateFinishedOn,
  onUpdateDescription,
  onUpdateWargearSelection,
  onUpdateStatus,
  isUploading,
  deletingImageId,
  isDeleting,
  selected,
  onToggleSelected,
}: Readonly<ModelCardProps>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const images = model.images ?? [];
  const visibleImages = images.slice(0, MAX_VISIBLE_THUMBNAILS);
  const hiddenImageCount = images.length - visibleImages.length;
  const imageGridSpacing = 4;
  const imageGridCols = visibleImages.length <= 1 ? 1 : 2;
  const imageGridRows = Math.ceil(visibleImages.length / imageGridCols) || 1;
  const imageCellHeight = (100 - imageGridSpacing * (imageGridRows - 1)) / imageGridRows;
  const displayName = model.name?.trim();
  const description = model.description?.trim();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName ?? "");
  const [isEditingFinishedOn, setIsEditingFinishedOn] = useState(false);
  const [finishedOnDraft, setFinishedOnDraft] = useState<string | null>(model.finishedOn ?? null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(description ?? "");
  const [isEditingWargear, setIsEditingWargear] = useState(false);
  const [customWargearModeBySlot, setCustomWargearModeBySlot] = useState<Record<string, boolean>>({});
  const [customLabelDraftsBySlot, setCustomLabelDraftsBySlot] = useState<Record<string, string>>({});
  const attachmentSlots = model.modelDefinition?.attachmentSlots ?? [];
  const wargearOptions = model.modelDefinition?.wargearOptions ?? [];
  const [isRenaming, setIsRenaming] = useState(false);
  const [isUpdatingFinishedOn, setIsUpdatingFinishedOn] = useState(false);
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updatingWargearSlotId, setUpdatingWargearSlotId] = useState<string | null>(null);

  // Collapse any open inline editors when the page is switched back to view mode.
  useEffect(() => {
    if (!editMode) {
      setIsEditingName(false);
      setIsEditingFinishedOn(false);
      setIsEditingDescription(false);
      setIsEditingWargear(false);
      setCustomWargearModeBySlot({});
      setCustomLabelDraftsBySlot({});
    }
  }, [editMode]);

  function startEditingName() {
    setNameDraft(displayName ?? "");
    setIsEditingName(true);
  }

  function commitEditingName() {
    setIsEditingName(false);

    if (nameDraft.trim() !== (displayName ?? "")) {
      setIsRenaming(true);
      onRename(nameDraft.trim());
      setIsRenaming(false);
    }
  }

  function startEditingFinishedOn() {
    setFinishedOnDraft(model.finishedOn ?? null);
    setIsEditingFinishedOn(true);
  }

  function commitEditingFinishedOn() {
    setIsEditingFinishedOn(false);

    if (finishedOnDraft !== (model.finishedOn ?? null)) {
      setIsUpdatingFinishedOn(true);
      onUpdateFinishedOn(finishedOnDraft);
      setIsUpdatingFinishedOn(false);
    }
  }

  function startEditingDescription() {
    setDescriptionDraft(description ?? "");
    setIsEditingDescription(true);
  }

  function commitEditingDescription() {
    setIsEditingDescription(false);

    if (descriptionDraft.trim() !== (description ?? "")) {
      setIsUpdatingDescription(true);
      onUpdateDescription(descriptionDraft.trim());
      setIsUpdatingDescription(false);
    }
  }

  function commitStatus(status: CollectionModelStatus) {
    setIsUpdatingStatus(true);
    onUpdateStatus(status);
    setIsUpdatingStatus(false);
  }

  function commitWargear(slotId: string, update: { wargearOptionId?: string | null; customLabel?: string | null }) {
    setUpdatingWargearSlotId(slotId);
    onUpdateWargearSelection(slotId, update);
    setUpdatingWargearSlotId(null);
  }

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      style={{
        backgroundColor: model.status ? COLLECTION_MODEL_STATUS_BACKGROUNDS[model.status] : undefined,
      }}
    >
      <Stack gap="xs">
        <ModelCardHeader
          model={model}
          editMode={editMode}
          selected={selected}
          isEditingName={isEditingName}
          nameDraft={nameDraft}
          isRenaming={isRenaming}
          startEditingName={startEditingName}
          commitEditingName={commitEditingName}
          setNameDraft={setNameDraft}
          setIsEditingName={setIsEditingName}
          onToggleSelected={onToggleSelected}
          onUploadImage={onUploadImage}
          onDeleteModel={onDeleteModel}
          isDeleting={isDeleting}
          fileInputRef={fileInputRef}
        />

        <Group align="flex-start" wrap="nowrap" gap="sm">
          <ModelImageSection
            images={images}
            visibleImages={visibleImages}
            hiddenImageCount={hiddenImageCount}
            imageGridCols={imageGridCols}
            imageGridSpacing={imageGridSpacing}
            imageCellHeight={imageCellHeight}
            displayName={displayName}
            editMode={editMode}
            deletingImageId={deletingImageId}
            onDeleteImage={onDeleteImage}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
          />

          <Stack gap={6} align="flex-end" style={{ flex: 1, minWidth: 0 }}>
            <ModelCardStatus
              model={model}
              editMode={editMode}
              isUpdatingStatus={isUpdatingStatus}
              commitStatus={commitStatus}
            />

            <ModelCardDescription
              description={description}
              descriptionDraft={descriptionDraft}
              isEditingDescription={isEditingDescription}
              isUpdatingDescription={isUpdatingDescription}
              startEditingDescription={startEditingDescription}
              commitEditingDescription={commitEditingDescription}
              setDescriptionDraft={setDescriptionDraft}
              setIsEditingDescription={setIsEditingDescription}
              editMode={editMode}
            />

            <ModelCardCompletedDate
              model={model}
              finishedOnDraft={finishedOnDraft}
              isEditingFinishedOn={isEditingFinishedOn}
              isUpdatingFinishedOn={isUpdatingFinishedOn}
              startEditingFinishedOn={startEditingFinishedOn}
              commitEditingFinishedOn={commitEditingFinishedOn}
              setFinishedOnDraft={setFinishedOnDraft}
              setIsEditingFinishedOn={setIsEditingFinishedOn}
              editMode={editMode}
            />

            <ModelCardWargear
              model={model}
              editMode={editMode}
              wargearOptions={wargearOptions}
              attachmentSlots={attachmentSlots}
              customWargearModeBySlot={customWargearModeBySlot}
              customLabelDraftsBySlot={customLabelDraftsBySlot}
              isEditingWargear={isEditingWargear}
              updatingWargearSlotId={updatingWargearSlotId}
              commitWargear={commitWargear}
              setCustomWargearModeBySlot={setCustomWargearModeBySlot}
              setCustomLabelDraftsBySlot={setCustomLabelDraftsBySlot}
              setIsEditingWargear={setIsEditingWargear}
            />
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}

export default React.memo(ModelCard);
