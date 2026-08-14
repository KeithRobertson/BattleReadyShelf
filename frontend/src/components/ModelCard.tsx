import {
  ActionIcon,
  Badge,
  Card,
  Checkbox,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconCalendar, IconCheck, IconPencil, IconPhoto, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { CollectionModel } from "../generated";

const MAX_VISIBLE_THUMBNAILS = 4;

type ModelCardProps = {
  model: CollectionModel;
  onUploadImage: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  onRename: (newName: string) => void;
  onDeleteModel: () => void;
  onUpdateFinishedOn: (finishedOn: string | null) => void;
  onUpdateDescription: (description: string) => void;
  isUploading: boolean;
  deletingImageId: string | null;
  isRenaming: boolean;
  isDeleting: boolean;
  isUpdatingFinishedOn: boolean;
  isUpdatingDescription: boolean;
  selected: boolean;
  onToggleSelected: (selected: boolean) => void;
};

export default function ModelCard({
  model,
  onUploadImage,
  onDeleteImage,
  onRename,
  onDeleteModel,
  onUpdateFinishedOn,
  onUpdateDescription,
  isUploading,
  deletingImageId,
  isRenaming,
  isDeleting,
  isUpdatingFinishedOn,
  isUpdatingDescription,
  selected,
  onToggleSelected,
}: ModelCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const images = model.images ?? [];
  const visibleImages = images.slice(0, MAX_VISIBLE_THUMBNAILS);
  const hiddenImageCount = images.length - visibleImages.length;
  const displayName = model.name?.trim();
  const description = model.description?.trim();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName ?? "");
  const [isEditingFinishedOn, setIsEditingFinishedOn] = useState(false);
  const [finishedOnDraft, setFinishedOnDraft] = useState<string | null>(model.finishedOn ?? null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(description ?? "");

  function startEditingName() {
    setNameDraft(displayName ?? "");
    setIsEditingName(true);
  }

  function commitEditingName() {
    setIsEditingName(false);
    if (nameDraft.trim() !== (displayName ?? "")) {
      onRename(nameDraft.trim());
    }
  }

  function startEditingFinishedOn() {
    setFinishedOnDraft(model.finishedOn ?? null);
    setIsEditingFinishedOn(true);
  }

  function commitEditingFinishedOn() {
    setIsEditingFinishedOn(false);
    if (finishedOnDraft !== (model.finishedOn ?? null)) {
      onUpdateFinishedOn(finishedOnDraft);
    }
  }

  function startEditingDescription() {
    setDescriptionDraft(description ?? "");
    setIsEditingDescription(true);
  }

  function commitEditingDescription() {
    setIsEditingDescription(false);
    if (descriptionDraft.trim() !== (description ?? "")) {
      onUpdateDescription(descriptionDraft.trim());
    }
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Checkbox
              checked={selected}
              onChange={(e) => onToggleSelected(e.currentTarget.checked)}
              aria-label="Select model"
            />
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
                <ActionIcon size="sm" variant="subtle" title="Rename" onClick={startEditingName}>
                  <IconPencil size={14} />
                </ActionIcon>
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
          <ActionIcon
            variant="subtle"
            title="Upload image"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader size={16} /> : <IconUpload size={16} stroke={1.5} />}
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" title="Delete model" onClick={onDeleteModel} disabled={isDeleting}>
            {isDeleting ? <Loader size={16} /> : <IconTrash size={16} stroke={1.5} />}
          </ActionIcon>
        </Group>

        <Group align="flex-start" wrap="nowrap" gap="sm">
          <div style={{ width: 100, flexShrink: 0 }}>
            {images.length > 0 ? (
              <SimpleGrid cols={2} spacing={4}>
                {visibleImages.map((img, index) => {
                  const isLastVisible = index === visibleImages.length - 1;
                  return (
                    <div key={img.id} style={{ position: "relative" }}>
                      <Image src={img.thumbnailUrl} alt={displayName || "Model image"} radius="sm" h={48} fit="cover" />
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
                      {img.id && !(isLastVisible && hiddenImageCount > 0) && (
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
                style={{ border: "1px dashed var(--mantine-color-gray-4)", borderRadius: "var(--mantine-radius-sm)" }}
              >
                <IconPhoto size={20} color="var(--mantine-color-gray-5)" />
              </Group>
            )}
          </div>

          <Stack gap={6} align="flex-end" style={{ flex: 1, minWidth: 0 }}>
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
                <ActionIcon size="sm" variant="subtle" title="Edit description" onClick={startEditingDescription}>
                  <IconPencil size={12} />
                </ActionIcon>
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
                <ActionIcon size="sm" variant="subtle" onClick={commitEditingFinishedOn} disabled={isUpdatingFinishedOn}>
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
                <ActionIcon size="sm" variant="subtle" title="Set finished date" onClick={startEditingFinishedOn}>
                  <IconPencil size={12} />
                </ActionIcon>
              </Group>
            )}
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
