import { ActionIcon, Alert, Button, Group, Modal, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconCircleCheck, IconPlus, IconTrash } from "@tabler/icons-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import { DefinitionTransferButtons } from "@/components/admin/DefinitionTransferButtons.tsx";
import type { Faction, FactionImportResult } from "@/generated";
import { createFaction, deleteFaction, exportFactions, getFactions, importFactions } from "@/generated";

export default function FactionDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [newExternalId, setNewExternalId] = useState("");
  const [newParentFactionId, setNewParentFactionId] = useState<string | null>(null);
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
      setNewParentFactionId(null);
      if (!newFaction) throw new Error("Failed to create faction");
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
      setDeletingFactionId("");
    }
  }

  function handleImported(result: FactionImportResult) {
    const created = result.created ?? [];
    const updated = result.updated ?? [];
    // Updated factions are the same rows with new values, so replace by id rather than append.
    setFactions((prev) => {
      const byId = new Map(prev.map((faction) => [faction.id, faction]));
      for (const faction of [...created, ...updated]) {
        byId.set(faction.id, faction);
      }
      return [...byId.values()];
    });
    setImportSummary(
      `Imported ${created.length + updated.length + result.unchanged} faction(s) — ` +
        `${created.length} created, ${updated.length} updated, ${result.unchanged} already up to date.`,
    );
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
            <DefinitionTransferButtons
              fileNamePrefix="factions"
              onStart={() => {
                setError(null);
                setImportSummary(null);
              }}
              onError={setError}
              onExport={async () => (await exportFactions()).data}
              onImport={async (document) => (await importFactions({ body: document })).data}
              onImported={handleImported}
            />
          </Group>
        )}
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ whiteSpace: "pre-line" }}>
          {error}
        </Alert>
      )}

      {importSummary && (
        <Alert color="blue" icon={<IconCircleCheck size={16} />} withCloseButton onClose={() => setImportSummary(null)}>
          {importSummary}
        </Alert>
      )}

      <AdminPageGate isAuthLoading={isAuthLoading} isAuthorised={isAuthenticated && isAdmin} loading={loading}>
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
                              onClick={() => {
                                if (faction.id) {
                                  handleDeleteFaction(faction.id);
                                }
                              }}
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
      </AdminPageGate>

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
              data={[{ value: "", label: "None" }, ...factions.map((f) => ({ value: f.id, label: f.name }))]}
              value={newParentFactionId}
              onChange={(updatedParentFactionId) => {
                setNewParentFactionId(updatedParentFactionId !== "" ? updatedParentFactionId : null);
              }}
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
