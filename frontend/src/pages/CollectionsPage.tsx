import { Stack } from "@mantine/core";
import { useAuth } from "@/auth/useAuth.ts";
import { CollectionsContent } from "@/components/collections/CollectionsContent.tsx";
import { CollectionsError } from "@/components/collections/CollectionsError.tsx";
import { CollectionsHeader } from "@/components/collections/CollectionsHeader.tsx";
import { CreateCollectionModal } from "@/components/collections/CreateCollectionModal.tsx";
import { useCollections } from "@/hooks/collections/useCollections.tsx";

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

  return (
    <Stack gap="md">
      <CollectionsHeader isAuthenticated={isAuthenticated} isUser={isUser} open={open} />

      <CollectionsError error={error} />

      <CollectionsContent
        state={collectionsState}
        collections={collections}
        dragSensors={dragSensors}
        handleDragEnd={handleDragEnd}
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
    </Stack>
  );
}
