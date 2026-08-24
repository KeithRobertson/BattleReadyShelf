import { Alert, Loader, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import CollectionCard from "@/components/CollectionCard";
import type { ArmyCollection } from "@/generated";
import { getPublicArmyCollections } from "@/generated";

export default function PublicCollectionsPage() {
  const [collections, setCollections] = useState<ArmyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    getPublicArmyCollections({ signal: ac.signal })
      .then((r) => {
        if (ac.signal.aborted || !r.data) return;
        setCollections(r.data);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Public Collections</Title>
        <Text c="dimmed">Explore miniature collections shared by the community.</Text>
      </div>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : collections.length === 0 ? (
        <Text c="dimmed">No public collections found.</Text>
      ) : (
        <Stack gap="md">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} showCreator />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
