import { Stack } from "@mantine/core";
import { useState } from "react";
import { useAuth } from "@/auth/useAuth.ts";
import { CollectionsContent } from "@/components/collections/CollectionsContent.tsx";
import { CollectionsError } from "@/components/collections/CollectionsError.tsx";
import { CollectionsHeader } from "@/components/collections/CollectionsHeader.tsx";
import { CreateCollectionModal } from "@/components/collections/CreateCollectionModal.tsx";
import DeleteCollectionModal from "@/components/collections/DeleteCollectionModal.tsx";
import ExportCollectionsModal from "@/components/collections/export/ExportCollectionsModal.tsx";
import { useCollections } from "@/hooks/collections/useCollections.tsx";
import useDeleteCollection from "@/hooks/collections/useDeleteCollection.ts";

export default function CollectionsPage() {
  const { isAuthenticated } = useAuth();
  const {
    collections,
    collectionsState,
    error,
    isUser,
    opened,
    open,
    close,
    name,
    setName,
    description,
    setDescription,
    isPublic,
    setIsPublic,
    handleCreate,
    handleDragEnd,
    dragSensors,
  } = useCollections();
  const deletion = useDeleteCollection();
  const [exportOpened, setExportOpened] = useState(false);
  const canExport = isUser && collections.length > 0;

  return (
    <Stack gap="md">
      <CollectionsHeader
        isAuthenticated={isAuthenticated}
        isUser={isUser}
        open={open}
        onExport={() => setExportOpened(true)}
        canExport={canExport}
      />

      <CollectionsError error={error} />

      <CollectionsContent
        state={collectionsState}
        collections={collections}
        dragSensors={dragSensors}
        handleDragEnd={handleDragEnd}
        onDelete={deletion.requestDelete}
      />

      <CreateCollectionModal
        opened={opened}
        close={close}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        handleCreate={handleCreate}
      />

      <DeleteCollectionModal deletion={deletion} />

      <ExportCollectionsModal
        opened={exportOpened}
        onClose={() => setExportOpened(false)}
        collections={collections}
        showCollectionPicker
      />
    </Stack>
  );
}
