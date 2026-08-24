import {
  ActionIcon,
  Badge,
  Card,
  Checkbox,
  Group,
  Image,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconCalendar, IconCheck, IconPencil, IconPhoto, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type { CollectionModel, CollectionModelStatus } from "@/generated";
import {
  COLLECTION_MODEL_STATUS_BACKGROUNDS,
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUS_OPTIONS,
} from "@/utils/collectionModelStatus";

const MAX_VISIBLE_THUMBNAILS = 4;
const CUSTOM_WARGEAR_VALUE = "__custom__";

type ModelCardProps = {
  model: CollectionModel;
  editMode: boolean;
  onUploadImage: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  isUploading: boolean;
  deletingImageId: string | null;

  onRename: (newName: string) => Promise<void> | void;
  onDeleteModel: () => void;
  onUpdateFinishedOn: (finishedOn: string | null) => Promise<void> | void;
  onUpdateDescription: (description: string) => Promise<void> | void;
  onUpdateWargearSelection: (
    attachmentSlotId: string,
    update: { wargearOptionId?: string | null; customLabel?: string | null },
  ) => Promise<void> | void;
  onUpdateStatus: (status: CollectionModelStatus) => Promise<void> | void;

  isDeleting: boolean;

  selected: boolean;
  onToggleSelected: (selected: boolean) => void;
};

export default function ModelCard({
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

  async function commitEditingName() {
    setIsEditingName(false);

    if (nameDraft.trim() !== (displayName ?? "")) {
      setIsRenaming(true);
      await onRename(nameDraft.trim());
      setIsRenaming(false);
    }
  }

  function startEditingFinishedOn() {
    setFinishedOnDraft(model.finishedOn ?? null);
    setIsEditingFinishedOn(true);
  }

  async function commitEditingFinishedOn() {
    setIsEditingFinishedOn(false);

    if (finishedOnDraft !== (model.finishedOn ?? null)) {
      setIsUpdatingFinishedOn(true);
      await onUpdateFinishedOn(finishedOnDraft);
      setIsUpdatingFinishedOn(false);
    }
  }

  function startEditingDescription() {
    setDescriptionDraft(description ?? "");
    setIsEditingDescription(true);
  }

  async function commitEditingDescription() {
    setIsEditingDescription(false);

    if (descriptionDraft.trim() !== (description ?? "")) {
      setIsUpdatingDescription(true);
      await onUpdateDescription(descriptionDraft.trim());
      setIsUpdatingDescription(false);
    }
  }

  async function commitStatus(status: CollectionModelStatus) {
    setIsUpdatingStatus(true);
    await onUpdateStatus(status);
    setIsUpdatingStatus(false);
  }

  async function commitWargear(
    slotId: string,
    update: { wargearOptionId?: string | null; customLabel?: string | null },
  ) {
    setUpdatingWargearSlotId(slotId);
    await onUpdateWargearSelection(slotId, update);
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
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            {editMode && (
              <Checkbox
                checked={selected}
                onChange={(e) => onToggleSelected(e.currentTarget.checked)}
                aria-label="Select model"
              />
            )}
            <Badge variant="light">{model.modelDefinition?.name ?? "Unknown type"}</Badge>
            {isEditingName ? (
              <Group gap={4} wrap="nowrap" style={{ flex: 1 }}>
                <TextInput
                  size="xs"
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEditingName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  disabled={isRenaming}
                  style={{ flex: 1 }}
                />
                <ActionIcon size="sm" variant="subtle" onClick={commitEditingName} disabled={isRenaming}>
                  {isRenaming ? <Loader size={12} /> : <IconCheck size={14} />}
                </ActionIcon>
                <ActionIcon size="sm" variant="subtle" onClick={() => setIsEditingName(false)} disabled={isRenaming}>
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ) : (
              <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <Text fw={500} fs={displayName ? undefined : "italic"} c={displayName ? undefined : "dimmed"} truncate>
                  {displayName || "Unnamed"}
                </Text>
                {editMode && (
                  <ActionIcon size="sm" variant="subtle" title="Rename" onClick={startEditingName}>
                    <IconPencil size={14} />
                  </ActionIcon>
                )}
              </Group>
            )}
          </Group>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
              e.target.value = "";
            }}
          />
          {editMode && (
            <ActionIcon variant="subtle" color="red" title="Delete model" onClick={onDeleteModel} disabled={isDeleting}>
              {isDeleting ? <Loader size={16} /> : <IconTrash size={16} stroke={1.5} />}
            </ActionIcon>
          )}
        </Group>

        <Group align="flex-start" wrap="nowrap" gap="sm">
          <div style={{ width: 100, flexShrink: 0, position: "relative" }}>
            {images.length > 0 ? (
              <SimpleGrid cols={imageGridCols} spacing={imageGridSpacing}>
                {visibleImages.map((img, index) => {
                  const isLastVisible = index === visibleImages.length - 1;
                  return (
                    <div key={img.id} style={{ position: "relative" }}>
                      <Image
                        src={img.thumbnailUrl}
                        alt={displayName || "Model image"}
                        radius="sm"
                        h={imageCellHeight}
                        w="100%"
                        fit="cover"
                      />
                      {isLastVisible && hiddenImageCount > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0, 0, 0, 0.55)",
                            borderRadius: "var(--mantine-radius-sm)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text size="xs" fw={700} c="white">
                            +{hiddenImageCount}
                          </Text>
                        </div>
                      )}
                      {img.id && editMode && !(isLastVisible && hiddenImageCount > 0) && (
                        <ActionIcon
                          size="sm"
                          variant="filled"
                          color="red"
                          radius="xl"
                          title="Delete image"
                          onClick={() => img.id && onDeleteImage(img.id)}
                          disabled={deletingImageId === img.id}
                          style={{ position: "absolute", top: -6, right: -6 }}
                        >
                          {deletingImageId === img.id ? <Loader size={10} color="white" /> : <IconTrash size={10} />}
                        </ActionIcon>
                      )}
                    </div>
                  );
                })}
              </SimpleGrid>
            ) : (
              // Reserve the same footprint as a populated image grid so cards stay a
              // consistent height whether or not they have images.
              <Group
                justify="center"
                align="center"
                h={100}
                onClick={() => editMode && !isUploading && fileInputRef.current?.click()}
                style={{
                  border: "1px dashed var(--mantine-color-gray-4)",
                  borderRadius: "var(--mantine-radius-sm)",
                  cursor: editMode && !isUploading ? "pointer" : "default",
                }}
              >
                {isUploading ? <Loader size={20} /> : <IconPhoto size={20} color="var(--mantine-color-gray-5)" />}
              </Group>
            )}
            {editMode && (
              <ActionIcon
                size="sm"
                variant="filled"
                title="Upload image"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{ position: "absolute", bottom: -6, right: -6 }}
              >
                {isUploading ? <Loader size={10} color="white" /> : <IconUpload size={12} stroke={1.5} />}
              </ActionIcon>
            )}
          </div>

          <Stack gap={6} align="flex-end" style={{ flex: 1, minWidth: 0 }}>
            {editMode ? (
              <Select
                size="xs"
                data={COLLECTION_MODEL_STATUS_OPTIONS}
                value={model.status ?? null}
                onChange={(value) => value && commitStatus(value as CollectionModelStatus)}
                allowDeselect={false}
                disabled={isUpdatingStatus}
                rightSection={isUpdatingStatus ? <Loader size={12} /> : undefined}
                style={{ width: "100%" }}
              />
            ) : (
              <Badge color={model.status ? COLLECTION_MODEL_STATUS_COLORS[model.status] : "gray"} variant="light">
                {model.status ? COLLECTION_MODEL_STATUS_LABELS[model.status] : "Unknown"}
              </Badge>
            )}

            {isEditingDescription ? (
              <Stack gap={4} style={{ width: "100%" }}>
                <Textarea
                  size="xs"
                  autoFocus
                  autosize
                  minRows={2}
                  maxRows={4}
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsEditingDescription(false);
                  }}
                  disabled={isUpdatingDescription}
                  placeholder="Description"
                />
                <Group gap={4} justify="flex-end">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={commitEditingDescription}
                    disabled={isUpdatingDescription}
                  >
                    {isUpdatingDescription ? <Loader size={12} /> : <IconCheck size={14} />}
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => setIsEditingDescription(false)}
                    disabled={isUpdatingDescription}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              </Stack>
            ) : (
              <Group gap={4} wrap="nowrap" justify="flex-end" style={{ width: "100%" }}>
                <Tooltip label={description} disabled={!description} multiline maw={280} withArrow>
                  <Text
                    size="sm"
                    c="dimmed"
                    ta="right"
                    fs={description ? undefined : "italic"}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {description || "No description"}
                  </Text>
                </Tooltip>
                {editMode && (
                  <ActionIcon size="sm" variant="subtle" title="Edit description" onClick={startEditingDescription}>
                    <IconPencil size={12} />
                  </ActionIcon>
                )}
              </Group>
            )}

            {isEditingFinishedOn ? (
              <Group gap={4} wrap="nowrap" justify="flex-end">
                <DateInput
                  size="xs"
                  autoFocus
                  value={finishedOnDraft}
                  onChange={(value) => setFinishedOnDraft(value)}
                  valueFormat="DD MMM YYYY"
                  placeholder="Finished on"
                  clearable
                  leftSection={<IconCalendar size={14} />}
                  disabled={isUpdatingFinishedOn}
                  style={{ flex: 1, maxWidth: 160 }}
                />
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={commitEditingFinishedOn}
                  disabled={isUpdatingFinishedOn}
                >
                  {isUpdatingFinishedOn ? <Loader size={12} /> : <IconCheck size={14} />}
                </ActionIcon>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => setIsEditingFinishedOn(false)}
                  disabled={isUpdatingFinishedOn}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ) : (
              <Group gap={4} wrap="nowrap" justify="flex-end">
                <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                  {model.finishedOn ? `Finished ${model.finishedOn}` : "Not finished"}
                </Text>
                {editMode && (
                  <ActionIcon size="sm" variant="subtle" title="Set finished date" onClick={startEditingFinishedOn}>
                    <IconPencil size={12} />
                  </ActionIcon>
                )}
              </Group>
            )}

            {attachmentSlots.length > 0 &&
              (isEditingWargear ? (
                <Stack gap={4} align="flex-end" style={{ width: "100%" }}>
                  {attachmentSlots.map((slot) => {
                    const slotOptions = wargearOptions.filter((option) =>
                      option.attachmentSlotIds?.includes(slot.id ?? ""),
                    );
                    const currentSelection = model.wargearSelections?.find((s) => s.attachmentSlotId === slot.id);
                    const isUpdatingThisSlot = updatingWargearSlotId === slot.id;
                    const slotId = slot.id ?? "";
                    const isCustom = customWargearModeBySlot[slotId] ?? !!currentSelection?.customLabel;
                    const selectData = [
                      ...slotOptions.map((option) => ({ value: option.id ?? "", label: option.name ?? "" })),
                      { value: CUSTOM_WARGEAR_VALUE, label: "Custom..." },
                    ];
                    const selectValue = isCustom ? CUSTOM_WARGEAR_VALUE : (currentSelection?.wargearOptionId ?? null);

                    function commitCustomLabel() {
                      const label = (customLabelDraftsBySlot[slotId] ?? "").trim();
                      commitWargear(slotId, {
                        wargearOptionId: null,
                        customLabel: label.length > 0 ? label : null,
                      });
                    }

                    return (
                      <Stack key={slot.id} gap={2} style={{ width: "100%" }}>
                        <Select
                          size="xs"
                          label={slot.name}
                          placeholder="Unassigned"
                          clearable
                          data={selectData}
                          value={selectValue}
                          onChange={(value) => {
                            if (!slotId) return;
                            if (value === CUSTOM_WARGEAR_VALUE) {
                              setCustomWargearModeBySlot((m) => ({ ...m, [slotId]: true }));
                              setCustomLabelDraftsBySlot((m) => ({
                                ...m,
                                [slotId]: currentSelection?.customLabel ?? "",
                              }));
                              return;
                            }
                            setCustomWargearModeBySlot((m) => ({ ...m, [slotId]: false }));
                            commitWargear(slotId, { wargearOptionId: value, customLabel: null });
                          }}
                          disabled={isUpdatingThisSlot}
                          rightSection={isUpdatingThisSlot ? <Loader size={12} /> : undefined}
                          style={{ width: "100%" }}
                        />
                        {isCustom && (
                          <TextInput
                            size="xs"
                            placeholder="Describe the wargear you modeled"
                            value={customLabelDraftsBySlot[slotId] ?? currentSelection?.customLabel ?? ""}
                            onChange={(e) => {
                              const newValue = e.currentTarget.value;
                              setCustomLabelDraftsBySlot((m) => ({ ...m, [slotId]: newValue }));
                            }}
                            onBlur={commitCustomLabel}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitCustomLabel();
                            }}
                            disabled={isUpdatingThisSlot}
                          />
                        )}
                      </Stack>
                    );
                  })}
                  <Group gap={4} justify="flex-end">
                    <ActionIcon size="sm" variant="subtle" title="Done" onClick={() => setIsEditingWargear(false)}>
                      <IconCheck size={14} />
                    </ActionIcon>
                  </Group>
                </Stack>
              ) : (
                <Group gap={4} wrap="nowrap" justify="flex-end" style={{ width: "100%" }}>
                  <Group gap={4} justify="flex-end" wrap="wrap" style={{ flex: 1 }}>
                    {attachmentSlots.map((slot) => {
                      const currentSelection = model.wargearSelections?.find((s) => s.attachmentSlotId === slot.id);
                      const optionName = wargearOptions.find(
                        (option) => option.id === currentSelection?.wargearOptionId,
                      )?.name;
                      const displayLabel = optionName ?? currentSelection?.customLabel;
                      return (
                        <Badge
                          key={slot.id}
                          variant="light"
                          color={optionName ? "blue" : currentSelection?.customLabel ? "grape" : "gray"}
                          size="sm"
                          title={currentSelection?.customLabel ? "Custom..." : undefined}
                        >
                          {slot.name}: {displayLabel ?? "Unassigned"}
                        </Badge>
                      );
                    })}
                  </Group>
                  {editMode && (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      title="Edit loadout"
                      onClick={() => setIsEditingWargear(true)}
                    >
                      <IconPencil size={12} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
