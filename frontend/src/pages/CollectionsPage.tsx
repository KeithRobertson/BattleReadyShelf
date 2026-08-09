import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import CollectionCard from "../components/CollectionCard";
import type { ArmyCollection } from "../generated";
import { createArmyCollection, getArmyCollections, getCollectionModels } from "../generated";

export default function CollectionsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [collections, setCollections] = useState<ArmyCollection[]>([]);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setCollections([]);
      setModelCounts({});
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    getArmyCollections({ signal: ac.signal })
      .then(async (r) => {
        if (ac.signal.aborted || !r.data) return;
        setCollections(r.data);
        const counts = await Promise.all(
          r.data.map(async (c) => {
            if (!c.id) return [c.id, 0] as const;
            try {
              const models = (await getCollectionModels({ path: { armyCollectionId: c.id }, signal: ac.signal })).data;
              return [c.id, models?.length ?? 0] as const;
            } catch {
              return [c.id, 0] as const;
            }
          }),
        );
        if (!ac.signal.aborted) {
          setModelCounts(Object.fromEntries(counts.filter(([id]) => id)) as Record<string, number>);
        }
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [isAuthenticated]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = (await createArmyCollection({ body: { name, description } })).data;
      if (!created) {
        throw new Error("Failed to create collection");
      }
      setCollections((s) => [created, ...s]);
      setName("");
      setDescription("");
      close();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Collections</Title>
          <Text c="dimmed">Create and manage your miniature collections.</Text>
        </div>
        {isAuthenticated && (
          <Button leftSection={<IconPlus size={16} />} onClick={open}>
            Create collection
          </Button>
        )}
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {isAuthLoading ? (
        <Loader />
      ) : !isAuthenticated ? (
        <Alert color="blue" icon={<IconAlertCircle size={16} />}>
          Sign in with Google (top right) to view and manage your collections.
        </Alert>
      ) : loading ? (
        <Loader />
      ) : collections.length === 0 ? (
        <Text c="dimmed">You haven't created any collections yet.</Text>
      ) : (
        <Stack gap="md">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} modelCount={c.id ? modelCounts[c.id] : undefined} />
          ))}
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title="Create collection">
        <form onSubmit={handleCreate}>
          <Stack>
            <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
            <Group justify="flex-end">
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
