import { ActionIcon, Group, Text, Textarea } from "@mantine/core";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";

export function CollectionDescriptionEditor() {
  const { collection, editing } = useCollectionContext();
  if (collection.isOwner && editing.isEditingDescription) {
    return (
      <Group gap={4} wrap="nowrap" align="flex-start">
        <Textarea
          autoFocus
          autosize
          minRows={2}
          maxRows={4}
          value={editing.descriptionDraft}
          onChange={(e) => editing.setDescriptionDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") editing.cancelEditingDescription();
          }}
          disabled={editing.savingDescription}
          placeholder="Description"
          style={{ flex: 1, maxWidth: 500 }}
        />

        <ActionIcon
          variant="subtle"
          color="green"
          onClick={editing.commitEditingDescription}
          disabled={editing.savingDescription}
          loading={editing.savingDescription}
        >
          <IconCheck size={16} />
        </ActionIcon>

        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={editing.cancelEditingDescription}
          disabled={editing.savingDescription}
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Text c="dimmed" fs={collection.collection?.description ? undefined : "italic"}>
        {collection.collection?.description || "No description"}
      </Text>

      {collection.isOwner && (
        <ActionIcon variant="subtle" color="gray" onClick={editing.startEditingDescription}>
          <IconPencil size={16} />
        </ActionIcon>
      )}
    </Group>
  );
}
