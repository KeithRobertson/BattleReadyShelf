import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { CollectionDeletion } from "@/hooks/collections/useDeleteCollection.ts";

export type DeleteCollectionModalProps = Readonly<{
  deletion: CollectionDeletion;
}>;

export default function DeleteCollectionModal({ deletion }: DeleteCollectionModalProps) {
  const modelCount = deletion.pending?.modelCount ?? 0;

  return (
    <Modal opened={deletion.pending !== null} onClose={deletion.close} title="Delete collection?">
      <Stack gap="md">
        <Text size="sm">
          This will permanently delete{" "}
          <Text span fw={600}>
            {deletion.pending?.name}
          </Text>
          {modelCount > 0
            ? `, its ${modelCount} model${modelCount === 1 ? "" : "s"}, photos, and paint recipes.`
            : " and any photos or paint recipes in it."}{" "}
          This cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={deletion.close} disabled={deletion.deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={deletion.confirm} loading={deletion.deleting}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
