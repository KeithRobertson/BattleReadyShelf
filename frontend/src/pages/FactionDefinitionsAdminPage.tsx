import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import type { Faction } from "../generated";
import { createFaction, deleteFaction, getFactions } from "../generated";

export default function FactionDefinitionsAdminPage() {
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN";
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [newExternalId, setNewExternalId] = useState("");
  const [newParentFactionId, setNewParentFactionId] = useState("");
  const [deletingFactionId, setDeletingFactionId] = useState("");

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      Promise.all([getFactions({ signal })])
        .then(([factionsRes]) => {
          if (signal?.aborted) return;
          setFactions(factionsRes.data ?? []);
        })
        .catch((e) => {
          if (!signal?.aborted) setError(String(e));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [isAdmin],
  );

  useEffect(() => {
    const ac = new AbortController();
    loadAll(ac.signal);
    return () => ac.abort();
  }, [loadAll]);

  const factionById = useMemo(() => {
    const map = new Map();
    factions.forEach((f) => {
      map.set(f.id, f);
    });
    return map;
  }, [factions]);

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const newFaction = (
        await createFaction({
          body: { name: newName, externalId: newExternalId, parentFactionId: newParentFactionId },
        })
      ).data;
      setNewName("");
      setNewExternalId("");
      setNewParentFactionId("");
      setFactions((prev) => [...prev, newFaction]);
      closeCreate();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDeleteFaction(factionId: string) {
    try {
      setDeletingFactionId(factionId);
      await deleteFaction({ path: { factionId } });
      setFactions((prev) => prev.filter((f) => f.id !== factionId));
    } finally {
      setDeletingFactionId(null);
    }
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Manage Faction Definitions</Title>
          <Text c="dimmed">
            Create and edit factions available to users. WIP screen - the external_id needs explained, and Parent
            Faction
          </Text>
        </div>
        {isAdmin && (
          <Group>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Create new
            </Button>
          </Group>
        )}
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ whiteSpace: "pre-line" }}>
          {error}
        </Alert>
      )}

      {isAuthLoading ? (
        <Loader />
      ) : !isAuthenticated || !isAdmin ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          You do not have permission to view this page.
        </Alert>
      ) : loading ? (
        <Loader />
      ) : (
        <Stack gap="lg">
          <div>
            {factions.length === 0 ? (
              <Text c="dimmed">No faction definitions exist yet.</Text>
            ) : (
              <Stack gap="md">
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>External Id</Table.Th>
                      <Table.Th>Parent Faction</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {factions.map((faction) => {
                      const parent = factionById.get(faction.parentFactionId);
                      return (
                        <Table.Tr key={faction.id}>
                          <Table.Td>{faction.name}</Table.Td>
                          <Table.Td>{faction.externalId}</Table.Td>
                          <Table.Td>{parent ? parent.name : null}</Table.Td>
                          <Table.Td>
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleDeleteFaction(faction.id)}
                              loading={deletingFactionId === faction.id}
                              title="Delete faction"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Stack>
            )}
          </div>
        </Stack>
      )}

      <Modal opened={createOpened} onClose={closeCreate} title="Create new faction definition">
        <form onSubmit={handleCreateNew}>
          <Stack>
            <TextInput label="Name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} required />
            <TextInput
              label="External Faction Id"
              value={newExternalId}
              onChange={(e) => setNewExternalId(e.currentTarget.value)}
              required
            />
            <Select
              label="Parent Faction"
              placeholder="None"
              data={[{ value: null, label: "None" }, ...factions.map((f) => ({ value: f.id, label: f.name }))]}
              value={newParentFactionId}
              onChange={setNewParentFactionId}
            />
            <Group justify="flex-end">
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
