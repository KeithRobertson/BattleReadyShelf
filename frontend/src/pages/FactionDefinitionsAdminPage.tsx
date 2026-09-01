import { ActionIcon, Alert, Button, Group, Modal, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconCircleCheck, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import { DefinitionTransferButtons } from "@/components/admin/DefinitionTransferButtons.tsx";
import EditFactionModal from "@/components/admin/factions/EditFactionModal.tsx";
import PendingChangesPanel, { type PendingChangeRow } from "@/components/admin/PendingChangesPanel.tsx";
import PublishHistoryModal from "@/components/admin/PublishHistoryModal.tsx";
import usePublishHistory from "@/components/admin/usePublishHistory.ts";
import type { Faction, FactionDraft, FactionImportResult } from "@/generated";
import {
  createFaction,
  deleteFaction,
  discardFactionDraft,
  exportFactions,
  getFactionDrafts,
  getFactionPublishHistory,
  getFactions,
  importFactions,
  proposeFactionChange,
  publishFactionDraft,
} from "@/generated";

/** A pending change rendered as only the fields that actually move. */
function toPendingRow(draft: FactionDraft, nameOf: (factionId?: string | null) => string | null): PendingChangeRow {
  const fields = [];
  if (draft.currentName !== draft.proposedName) {
    fields.push({ label: "Name", before: draft.currentName, after: draft.proposedName });
  }
  if ((draft.currentParentFactionId ?? null) !== (draft.proposedParentFactionId ?? null)) {
    fields.push({
      label: "Parent",
      before: nameOf(draft.currentParentFactionId),
      after: nameOf(draft.proposedParentFactionId),
    });
  }
  return {
    id: draft.id ?? "",
    currentName: draft.currentName,
    externalId: draft.externalId,
    origin: draft.origin,
    usageCount: draft.usageCount,
    fields,
  };
}

export default function FactionDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [factions, setFactions] = useState<Faction[]>([]);
  const [drafts, setDrafts] = useState<FactionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [newExternalId, setNewExternalId] = useState("");
  const [newParentFactionId, setNewParentFactionId] = useState<string | null>(null);
  const [deletingFactionId, setDeletingFactionId] = useState("");
  const [editing, setEditing] = useState<Faction | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      Promise.all([getFactions({ signal }), getFactionDrafts({ signal })])
        .then(([factionsRes, draftsRes]) => {
          if (signal?.aborted) return;
          setFactions(factionsRes.data ?? []);
          setDrafts(draftsRes.data ?? []);
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

  const factionById = useMemo(() => new Map(factions.map((f) => [f.id, f])), [factions]);
  const nameOf = useCallback(
    (factionId?: string | null) => (factionId ? (factionById.get(factionId)?.name ?? factionId) : null),
    [factionById],
  );
  const pendingRows = useMemo(() => drafts.map((draft) => toPendingRow(draft, nameOf)), [drafts, nameOf]);
  const draftById = useMemo(() => new Map(drafts.map((draft) => [draft.id, draft])), [drafts]);
  const usageByFactionId = useMemo(
    () => new Map(drafts.map((draft) => [draft.factionId, draft.usageCount ?? 0])),
    [drafts],
  );

  const history = usePublishHistory(
    useCallback(async (factionId: string) => (await getFactionPublishHistory({ path: { factionId } })).data ?? [], []),
  );

  function handleViewHistory(row: PendingChangeRow) {
    const draft = draftById.get(row.id);
    if (draft?.factionId) history.open(draft.factionId, draft.currentName);
  }

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

  async function handleProposeChange(faction: Faction, name: string, parentFactionId: string | null) {
    if (!faction.id) return;
    setError(null);
    setSaving(true);
    try {
      const staged = (await proposeFactionChange({ path: { factionId: faction.id }, body: { name, parentFactionId } }))
        .data;
      // Nothing is applied until the change is accepted. No body back means the proposal matched
      // what is already published, which also clears any stale pending change.
      setDrafts((prev) => {
        const others = prev.filter((draft) => draft.factionId !== faction.id);
        return staged ? [...others, staged] : others;
      });
      setEditing(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptDraft(row: PendingChangeRow) {
    setError(null);
    setBusyDraftId(row.id);
    try {
      const updated = (await publishFactionDraft({ path: { draftId: row.id } })).data;
      if (!updated) throw new Error("Failed to apply the proposed change");
      setFactions((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleRejectDraft(row: PendingChangeRow) {
    setError(null);
    setBusyDraftId(row.id);
    try {
      await discardFactionDraft({ path: { draftId: row.id } });
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleDeleteFaction(factionId: string) {
    try {
      setDeletingFactionId(factionId);
      await deleteFaction({ path: { factionId } });
      setFactions((prev) => prev.filter((f) => f.id !== factionId));
      setDrafts((prev) => prev.filter((d) => d.factionId !== factionId));
    } finally {
      setDeletingFactionId("");
    }
  }

  function handleImported(result: FactionImportResult) {
    const created = result.created ?? [];
    const pending = result.pendingChanges ?? [];
    setFactions((prev) => [...prev, ...created]);
    // A re-import can clear proposals as well as raise them, so replace rather than merge.
    setDrafts(pending);
    setImportSummary(
      `Imported ${created.length + pending.length + result.unchanged} faction(s) — ` +
        `${created.length} created, ${pending.length} change(s) to review, ` +
        `${result.unchanged} already up to date.`,
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Manage Faction Definitions</Title>
          <Text c="dimmed">
            Factions group model definitions, and a parent faction nests one group inside another. New factions are
            created straight away, but renaming or reparenting an existing one is staged for review first, because it
            moves everything beneath it.
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
          <PendingChangesPanel
            title="Proposed changes"
            description="Nothing here is in effect yet. A faction groups every model definition beneath it, so renaming or reparenting one waits on a decision, whether an import or an admin proposed it."
            usageNoun="model definition"
            rows={pendingRows}
            busyRowId={busyDraftId}
            onAccept={handleAcceptDraft}
            onReject={handleRejectDraft}
            onViewHistory={handleViewHistory}
          />

          <div>
            {factions.length === 0 ? (
              <Text c="dimmed">No faction definitions exist yet.</Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Dataset Id</Table.Th>
                    <Table.Th>Parent Faction</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {factions.map((faction) => (
                    <Table.Tr key={faction.id}>
                      <Table.Td>{faction.name}</Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {faction.externalId ?? "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td>{nameOf(faction.parentFactionId)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap" justify="flex-end">
                          <ActionIcon variant="light" onClick={() => setEditing(faction)} title="Propose a change">
                            <IconPencil size={16} />
                          </ActionIcon>
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
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </div>
        </Stack>
      </AdminPageGate>

      <Modal opened={createOpened} onClose={closeCreate} title="Create new faction definition">
        <form onSubmit={handleCreateNew}>
          <Stack>
            <TextInput label="Name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} required />
            <TextInput
              label="Dataset Id"
              description="Stable identifier used to match this faction on a later import."
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

      <EditFactionModal
        faction={editing}
        factions={factions}
        usageCount={usageByFactionId.get(editing?.id) ?? 0}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleProposeChange}
      />

      <PublishHistoryModal
        opened={history.target !== null}
        definitionName={history.target?.name ?? null}
        entries={history.entries}
        loading={history.loading}
        onClose={history.close}
      />
    </Stack>
  );
}
