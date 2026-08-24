import { Alert, Loader, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import CollectionCard from "@/components/collections/CollectionCard.tsx";
import type { ArmyCollection } from "@/generated";
import { getPublicArmyCollections } from "@/generated";

export default function PublicCollectionsPage() {
  const {
    data: collections = [],
    isLoading,
    isError,
    error,
  } = useQuery<ArmyCollection[]>({
    queryKey: ["publicCollections"],
    queryFn: async () => {
      const response = await getPublicArmyCollections();
      return response.data ?? [];
    },
  });

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Public Collections</Title>
        <Text c="dimmed">Explore miniature collections shared by the community.</Text>
      </div>

      {isLoading && <Loader />}

      {isError && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {String(error)}
        </Alert>
      )}

      {!isLoading && !isError && collections.length === 0 && <Text c="dimmed">No public collections found.</Text>}

      {!isLoading && !isError && collections.length > 0 && (
        <Stack gap="md">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} showCreator />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
