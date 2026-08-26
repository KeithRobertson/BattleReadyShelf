import { ActionIcon, Badge, Checkbox, Group, Loader, Text, TextInput } from "@mantine/core";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import React from "react";
import type { CollectionModel } from "@/generated";

export type ModelCardHeaderProps = Readonly<{
  model: CollectionModel;
  editMode: boolean;
  selected: boolean;
  isEditingName: boolean;
  nameDraft: string;
  isRenaming: boolean;
  startEditingName: () => void;
  commitEditingName: () => void;
  setNameDraft: (nameDraft: string) => void;
  setIsEditingName: (isEditingName: boolean) => void;
  onToggleSelected: (selected: boolean) => void;
  onUploadImage: (file: File) => void;
  onDeleteModel: () => void;
  isDeleting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}>;

export const ModelCardHeader = React.memo(function ModelCardHeader({
  model,
  editMode,
  selected,
  isEditingName,
  nameDraft,
  isRenaming,
  startEditingName,
  commitEditingName,
  setNameDraft,
  setIsEditingName,
  onToggleSelected,
  onUploadImage,
  onDeleteModel,
  isDeleting,
  fileInputRef,
}: ModelCardHeaderProps) {
  const displayName = model.name?.trim();
  return (
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
        hidden
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
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
  );
});
