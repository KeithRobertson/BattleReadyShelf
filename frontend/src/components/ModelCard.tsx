import { ActionIcon, Badge, Card, Checkbox, Group, Image, Loader, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { IconCheck, IconPencil, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { CollectionModel } from "../generated";

type ModelCardProps = {
  model: CollectionModel;
  onUploadImage: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  onRename: (newName: string) => void;
  onDeleteModel: () => void;
  isUploading: boolean;
  deletingImageId: string | null;
  isRenaming: boolean;
  isDeleting: boolean;
  selected: boolean;
  onToggleSelected: (selected: boolean) => void;
};

export default function ModelCard({
  model,
  onUploadImage,
  onDeleteImage,
  onRename,
  onDeleteModel,
  isUploading,
  deletingImageId,
  isRenaming,
  isDeleting,
  selected,
  onToggleSelected,
}: ModelCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const images = model.images ?? [];
  const displayName = model.name?.trim();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName ?? "");

  function startEditing() {
    setNameDraft(displayName ?? "");
    setIsEditingName(true);
  }

  function commitEditing() {
    setIsEditingName(false);
    if (nameDraft.trim() !== (displayName ?? "")) {
      onRename(nameDraft.trim());
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
                    if (e.key === "Enter") commitEditing();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  disabled={isRenaming}
                  style={{ flex: 1 }}
                />
                <ActionIcon size="sm" variant="subtle" onClick={commitEditing} disabled={isRenaming}>
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
                <ActionIcon size="sm" variant="subtle" title="Rename" onClick={startEditing}>
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

        {model.description && (
          <Text size="sm" c="dimmed">
            {model.description}
          </Text>
        )}

        {images.length > 0 && (
          <SimpleGrid cols={{ base: 3, xs: 4 }} spacing="xs">
            {images.map((img) => (
              <div key={img.id} style={{ position: "relative" }}>
                <Image src={img.thumbnailUrl} alt={displayName || "Model image"} radius="sm" h={80} fit="cover" />
                {img.id && (
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
                    {deletingImageId === img.id ? <Loader size={12} color="white" /> : <IconTrash size={12} />}
                  </ActionIcon>
                )}
              </div>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Card>
  );
}
