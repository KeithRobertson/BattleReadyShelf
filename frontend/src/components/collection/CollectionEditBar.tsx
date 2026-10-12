import { Affix, Button, Group, Paper, Text } from "@mantine/core";
import { IconCheck, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";

export type CollectionEditBarProps = Readonly<{
  onAddModel: () => void;
  onDone: () => void;
}>;

/**
 * Stays on screen while the collection scrolls. View is the list; this bar is only for the actions
 * that change it (add, reorder, bulk delete). Editing one miniature happens in the aside.
 */
export function CollectionEditBar({ onAddModel, onDone }: CollectionEditBarProps) {
  const { collection, isEditMode, setIsEditMode, selection, deletion } = useCollectionContext();
  if (!collection.isOwner) return null;

  const selectedCount = selection.selectedModelIds.size;
  const withinMainColumn =
    "calc(100vw - var(--app-shell-navbar-offset, 0px) - var(--app-shell-aside-offset, 0px) - 32px)";

  return (
    <Affix
      withinPortal={false}
      zIndex={120}
      position={{ bottom: 16, right: "calc(var(--app-shell-aside-offset, 0px) + 16px)" }}
    >
      {isEditMode ? (
        <Paper withBorder shadow="md" p="xs" radius="md" maw={withinMainColumn}>
          <Group gap="xs" wrap="wrap" justify="flex-end">
            <Text size="sm">{selectedCount === 0 ? "None selected" : `${selectedCount} selected`}</Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={onAddModel}>
              Add model
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              leftSection={<IconTrash size={14} />}
              disabled={selectedCount === 0}
              onClick={() => deletion.requestBulkDelete(selection.selectedModelIds)}
            >
              Delete selected
            </Button>
            <Button size="xs" variant="default" leftSection={<IconCheck size={14} />} onClick={onDone}>
              Done
            </Button>
          </Group>
        </Paper>
      ) : (
        <Button size="sm" leftSection={<IconPencil size={16} />} onClick={() => setIsEditMode(true)}>
          Edit collection
        </Button>
      )}
    </Affix>
  );
}
