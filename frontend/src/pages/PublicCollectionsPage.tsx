import { Alert, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useMemo } from "react";
import { AsidePanel } from "@/components/aside/AsidePanel.tsx";
import CollectionCard from "@/components/collections/CollectionCard.tsx";
import { CollectionStatsPanel } from "@/components/collections/CollectionStatsPanel.tsx";
import type { CollectionModelStatus } from "@/generated";
import { usePublicCollections } from "@/hooks/collections/usePublicCollections.ts";
import { useAsideContent } from "@/hooks/useAsideContent.ts";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus.ts";

export default function PublicCollectionsPage() {
  const { collections, isLoading, isError, error } = usePublicCollections();

  const aside = useMemo(() => {
    if (isLoading) return null;
    if (isError) {
      return <AsidePanel title="Public collections" description="Public collections could not be loaded." />;
    }

    const totalModels = collections.reduce((sum, collection) => sum + (collection.modelCount ?? 0), 0);
    const countsByStatus = COLLECTION_MODEL_STATUSES.reduce(
      (acc, status) => {
        acc[status] = collections.reduce((sum, collection) => sum + (collection.modelCountsByStatus?.[status] ?? 0), 0);
        return acc;
      },
      {} as Record<CollectionModelStatus, number>,
    );
    const collectors = new Set(
      collections.map((collection) => collection.userDisplayName).filter((name): name is string => Boolean(name)),
    ).size;

    return (
      <AsidePanel title="Public collections" description="Collections people have chosen to share.">
        <Stack gap="md">
          <Group justify="space-between" gap={8} wrap="nowrap">
            <Text size="xs" c="dimmed">
              Collections
            </Text>
            <Text size="sm" fw={700}>
              {collections.length}
            </Text>
          </Group>
          {collectors > 0 && (
            <Group justify="space-between" gap={8} wrap="nowrap">
              <Text size="xs" c="dimmed">
                Collectors
              </Text>
              <Text size="sm" fw={700}>
                {collectors}
              </Text>
            </Group>
          )}
          <CollectionStatsPanel totalCount={totalModels} countsByStatus={countsByStatus} />
        </Stack>
      </AsidePanel>
    );
  }, [collections, isLoading, isError]);
  useAsideContent(aside);

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
