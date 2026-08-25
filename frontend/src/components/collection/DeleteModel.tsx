import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { CollectionModels } from "@/hooks/collections/useCollectionModels.ts";
import type { ModelDeletion } from "@/hooks/collections/useDeleteConfirmation.ts";

export default function DeleteModel({
  deletion,
  collectionModels,
  selectedModelIds,
}: Readonly<{ deletion: ModelDeletion; collectionModels: CollectionModels; selectedModelIds: Set<string> }>) {
  return (
    <Modal
      opened={deletion.confirmOpened}
      onClose={deletion.closeConfirm}
      title={deletion.pendingDelete?.mode === "bulk" ? "Delete selected models?" : "Delete model?"}
    >
      <Stack gap="md">
        <Text size="sm">
          {deletion.pendingDelete?.mode === "bulk"
            ? `This will permanently delete ${selectedModelIds.size} model(s) and their images. This cannot be undone.`
            : "This will permanently delete this model and its images. This cannot be undone."}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={deletion.closeConfirm}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() =>
              deletion.confirmDelete(collectionModels.deleteModel, collectionModels.bulkDeleteModels, selectedModelIds)
            }
            loading={collectionModels.loading}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
