import { Group, Stack } from "@mantine/core";
import { CollectionCreatedBy } from "@/components/collection/CollectionCreatedBy.tsx";
import { CollectionDescriptionEditor } from "@/components/collection/CollectionDescriptionEditor.tsx";
import { CollectionNameEditor } from "@/components/collection/CollectionNameEditor.tsx";
import { CollectionVisibilityToggle } from "@/components/collection/CollectionVisibilityToggle.tsx";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";

export default function CollectionHeader() {
  const { collection } = useCollectionContext();
  return (
    <Stack gap={4}>
      <Group justify="space-between" align="center" wrap="wrap">
        <CollectionNameEditor />
        <CollectionVisibilityToggle />
      </Group>

      {collection.collection?.userDisplayName && <CollectionCreatedBy name={collection.collection.userDisplayName} />}

      <CollectionDescriptionEditor />
    </Stack>
  );
}
