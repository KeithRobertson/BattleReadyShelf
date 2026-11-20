import { Button, Group, Stack } from "@mantine/core";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CollectionCreatedBy } from "@/components/collection/CollectionCreatedBy.tsx";
import { CollectionDescriptionEditor } from "@/components/collection/CollectionDescriptionEditor.tsx";
import { CollectionNameEditor } from "@/components/collection/CollectionNameEditor.tsx";
import { CollectionVisibilityToggle } from "@/components/collection/CollectionVisibilityToggle.tsx";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import CollectionPaintRecipe from "@/components/collection/paint/CollectionPaintRecipe.tsx";
import DeleteCollectionModal from "@/components/collections/DeleteCollectionModal.tsx";
import ExportCollectionsModal from "@/components/collections/export/ExportCollectionsModal.tsx";
import useDeleteCollection from "@/hooks/collections/useDeleteCollection.ts";

export default function CollectionHeader() {
  const { collection } = useCollectionContext();
  const navigate = useNavigate();
  const deletion = useDeleteCollection(() => navigate("/"));
  const [exportOpened, setExportOpened] = useState(false);
  const armyCollection = collection.collection;

  return (
    <Stack gap={4}>
      <Group justify="space-between" align="center" wrap="wrap">
        <CollectionNameEditor />
        <Group gap="sm" wrap="nowrap">
          <CollectionVisibilityToggle />
          {collection.isOwner && (
            <>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={() => setExportOpened(true)}
              >
                Export
              </Button>
              <Button
                color="red"
                variant="light"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={() => deletion.requestDelete(collection.collection)}
              >
                Delete
              </Button>
            </>
          )}
        </Group>
      </Group>

      {collection.collection?.userDisplayName && <CollectionCreatedBy name={collection.collection.userDisplayName} />}

      <CollectionDescriptionEditor />

      <CollectionPaintRecipe />

      <DeleteCollectionModal deletion={deletion} />

      {armyCollection && (
        <ExportCollectionsModal
          opened={exportOpened}
          onClose={() => setExportOpened(false)}
          collections={[armyCollection]}
          initialSelectedIds={armyCollection.id ? [armyCollection.id] : undefined}
          showCollectionPicker={false}
        />
      )}
    </Stack>
  );
}
