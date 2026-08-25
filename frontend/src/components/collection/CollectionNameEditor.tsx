import { ActionIcon, Group, TextInput, Title } from "@mantine/core";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";

export function CollectionNameEditor() {
  const { collection, editing } = useCollectionContext();
  if (collection.isOwner && editing.isEditingName) {
    return (
      <Group gap={4} wrap="nowrap">
        <TextInput
          autoFocus
          value={editing.nameDraft}
          onChange={(e) => editing.setNameDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") editing.commitEditingName();
            if (e.key === "Escape") editing.cancelEditingName();
          }}
          disabled={editing.savingName}
          style={{ flex: 1, maxWidth: 400 }}
        />

        <ActionIcon
          variant="subtle"
          color="green"
          onClick={editing.commitEditingName}
          disabled={editing.savingName}
          loading={editing.savingName}
        >
          <IconCheck size={16} />
        </ActionIcon>

        <ActionIcon variant="subtle" color="gray" onClick={editing.cancelEditingName} disabled={editing.savingName}>
          <IconX size={16} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Title order={2}>{collection.collection?.name}</Title>

      {collection.isOwner && (
        <ActionIcon variant="subtle" color="gray" onClick={editing.startEditingName}>
          <IconPencil size={16} />
        </ActionIcon>
      )}
    </Group>
  );
}
